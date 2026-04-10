import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MPWA_BASE = 'https://app.ayopintar.com';

const generateQrRequest = async (apiKey: string, device: string, force?: boolean) => {
  const body: Record<string, unknown> = {
    api_key: apiKey,
    device,
  };

  if (typeof force === 'boolean') {
    body.force = force;
  }

  const res = await fetch(`${MPWA_BASE}/generate-qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return res;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { action, school_id, number, sender } = await req.json();
    const deviceNumber = number || sender;

    if (!action || !school_id) {
      return new Response(JSON.stringify({ error: 'action and school_id are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Resolve API Key: school-level → platform-level
    let apiKey = '';
    const { data: integration } = await supabaseAdmin
      .from('school_integrations')
      .select('mpwa_api_key, mpwa_sender, mpwa_connected, id')
      .eq('school_id', school_id)
      .eq('integration_type', 'onesender')
      .maybeSingle();

    apiKey = integration?.mpwa_api_key || '';

    if (!apiKey) {
      const { data: ps } = await supabaseAdmin
        .from('platform_settings').select('value')
        .eq('key', 'mpwa_platform_api_key').maybeSingle();
      if (ps?.value) apiKey = ps.value;
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'MPWA API Key belum dikonfigurasi.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const safeJson = async (res: Response) => {
      const text = await res.text();
      console.log('MPWA raw response:', text.substring(0, 500));
      try { return JSON.parse(text); }
      catch {
        console.error('Non-JSON response from MPWA');
        return { status: false, msg: 'Invalid API response: ' + text.substring(0, 100) };
      }
    };

    const isConnected = (data: any) =>
      data?.msg === 'Device already connected!' ||
      data?.msg === 'Perangkat sudah terhubung!';

    const markConnected = async (connected: boolean) => {
      if (integration?.id) {
        await supabaseAdmin.from('school_integrations')
          .update({ mpwa_connected: connected })
          .eq('id', integration.id);
      }
    };

    // ═══ GENERATE-QR: Save sender + auto-register device in MPWA + generate QR ═══
    if (action === 'generate-qr') {
      const cleanNumber = (deviceNumber || '').replace(/\D/g, '');
      if (!cleanNumber) {
        return new Response(JSON.stringify({ error: 'Nomor WhatsApp harus diisi' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Save sender number to school_integrations
      if (integration?.id) {
        await supabaseAdmin.from('school_integrations')
          .update({ mpwa_sender: cleanNumber, gateway_type: 'mpwa' })
          .eq('id', integration.id);
      } else {
        // Create integration record if not exists
        await supabaseAdmin.from('school_integrations').insert({
          school_id,
          integration_type: 'onesender',
          mpwa_sender: cleanNumber,
          gateway_type: 'mpwa',
          is_active: false,
        });
      }

      console.log(`[mpwa-proxy] Calling MPWA POST /generate-qr for device: ${cleanNumber}`);

      const res = await generateQrRequest(apiKey, cleanNumber, true);
      const data = await safeJson(res);
      console.log('[mpwa-proxy] MPWA response:', JSON.stringify(data).substring(0, 300));

      // If already connected, mark in DB
      if (isConnected(data)) {
        await markConnected(true);
        return new Response(JSON.stringify({
          connected: true,
          message: 'Device sudah terhubung!',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Extract QR code from response
      const qrcode = data?.qrcode || data?.img || data?.qr || null;
      if (qrcode) {
        return new Response(JSON.stringify({
          connected: false,
          qrcode,
          message: data?.message || 'Scan QR code dengan WhatsApp Anda',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // If we got an error message
      return new Response(JSON.stringify({
        connected: false,
        error: data?.msg || data?.message || 'Gagal generate QR code',
        raw: data,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══ CHECK-STATUS: Poll connection status ═══
    if (action === 'check-status') {
      const cleanNumber = (deviceNumber || integration?.mpwa_sender || '').replace(/\D/g, '');
      if (!cleanNumber) {
        return new Response(JSON.stringify({ connected: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const res = await generateQrRequest(apiKey, cleanNumber);
      const data = await safeJson(res);

      if (isConnected(data)) {
        await markConnected(true);
        return new Response(JSON.stringify({ connected: true, message: 'Device terhubung' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        connected: false,
        qrcode: data?.qrcode || data?.img || null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══ DISCONNECT ═══
    if (action === 'disconnect') {
      const cleanNumber = (deviceNumber || integration?.mpwa_sender || '').replace(/\D/g, '');
      if (!cleanNumber) {
        return new Response(JSON.stringify({ error: 'Sender tidak ditemukan' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Try logout-device via GET as well (MPWA may support both)
      const logoutUrl = `${MPWA_BASE}/logout-device?api_key=${encodeURIComponent(apiKey)}&sender=${encodeURIComponent(cleanNumber)}`;
      console.log(`[mpwa-proxy] Disconnecting: ${logoutUrl.replace(apiKey, '***')}`);

      let data: any;
      try {
        const res = await fetch(logoutUrl);
        data = await safeJson(res);
      } catch (e) {
        // Fallback to POST if GET doesn't work
        console.log('[mpwa-proxy] GET logout failed, trying POST');
        const res = await fetch(`${MPWA_BASE}/logout-device`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: apiKey, sender: cleanNumber }),
        });
        data = await safeJson(res);
      }

      await markConnected(false);

      return new Response(JSON.stringify({
        success: true,
        message: 'Device berhasil di-disconnect',
        raw: data,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action. Use: generate-qr, check-status, disconnect' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[mpwa-proxy] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
