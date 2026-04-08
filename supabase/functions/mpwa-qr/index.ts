import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { action, school_id, sender, number } = await req.json();

    if (!action || !school_id) {
      return new Response(JSON.stringify({ error: 'action and school_id are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // API Key: first check school_integrations, then platform_settings
    let finalApiKey = '';
    const { data: integration } = await supabaseAdmin
      .from('school_integrations')
      .select('mpwa_api_key, mpwa_sender')
      .eq('school_id', school_id)
      .eq('integration_type', 'onesender')
      .maybeSingle();

    if (integration?.mpwa_api_key) {
      finalApiKey = integration.mpwa_api_key;
    }

    if (!finalApiKey) {
      const { data: platformSettings } = await supabaseAdmin
        .from('platform_settings')
        .select('key, value')
        .eq('key', 'mpwa_platform_api_key')
        .maybeSingle();

      if (platformSettings?.value) {
        finalApiKey = platformSettings.value;
      }
    }

    if (!finalApiKey) {
      return new Response(JSON.stringify({ error: 'MPWA API Key belum dikonfigurasi. Hubungi administrator.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sender: from request body or from school_integrations
    let finalSender = sender || integration?.mpwa_sender || '';

    // Helper to safely parse JSON from external API
    const safeJson = async (res: Response) => {
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        console.error('MPWA API returned non-JSON:', text.substring(0, 200));
        return { status: false, msg: 'MPWA API returned invalid response', raw: text.substring(0, 200) };
      }
    };

    if (action === 'generate-qr') {
      if (!finalSender) {
        return new Response(JSON.stringify({ error: 'Nomor WhatsApp (sender) harus diisi terlebih dahulu' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Save sender to school_integrations
      await supabaseAdmin
        .from('school_integrations')
        .update({ mpwa_sender: finalSender })
        .eq('school_id', school_id)
        .eq('integration_type', 'onesender');

      const qrUrl = `https://app.ayopintar.com/generate-qr?api_key=${encodeURIComponent(finalApiKey)}&device=${encodeURIComponent(finalSender)}`;
      const res = await fetch(qrUrl, { method: 'GET' });
      const data = await safeJson(res);

      // Update connected status
      if (data.msg === 'Device already connected!' || data.msg === 'Perangkat sudah terhubung!' || data.status === true) {
        await supabaseAdmin
          .from('school_integrations')
          .update({ mpwa_connected: true })
          .eq('school_id', school_id)
          .eq('integration_type', 'onesender');
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'disconnect') {
      if (!finalSender) {
        return new Response(JSON.stringify({ error: 'Sender tidak ditemukan' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const res = await fetch('https://app.ayopintar.com/logout-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: finalApiKey, sender: finalSender }),
      });
      const data = await safeJson(res);

      await supabaseAdmin
        .from('school_integrations')
        .update({ mpwa_connected: false })
        .eq('school_id', school_id)
        .eq('integration_type', 'onesender');

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'check-number') {
      if (!finalSender || !number) {
        return new Response(JSON.stringify({ error: 'sender and number are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const res = await fetch('https://app.ayopintar.com/check-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: finalApiKey, sender: finalSender, number }),
      });
      const data = await safeJson(res);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('MPWA QR error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
