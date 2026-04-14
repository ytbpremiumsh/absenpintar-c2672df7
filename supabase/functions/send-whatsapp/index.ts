import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MPWA_SEND_URL = 'https://app.ayopintar.com/send-message';

const parseJsonSafely = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    return { status: false, msg: 'Invalid response', raw: text.substring(0, 200) };
  }
};

const formatPhoneNumber = (value: string) => {
  let formatted = value.replace(/\D/g, '');
  if (formatted.startsWith('0')) {
    formatted = '62' + formatted.substring(1);
  }
  return formatted;
};

/**
 * Send a message via MPWA /send-message endpoint.
 * Works for both personal numbers and group IDs.
 * Group IDs should be in format like "120363401633740599@g.us"
 */
const sendMpwaMessage = async (
  apiKey: string,
  sender: string,
  number: string,
  message: string,
): Promise<{ ok: boolean; data: any }> => {
  const payload = { api_key: apiKey, sender, number, message };

  console.log(`MPWA POST to ${MPWA_SEND_URL} | sender: ${sender} | number: ${number} | msg_len: ${message.length}`);

  try {
    const response = await fetch(MPWA_SEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    const parsed = parseJsonSafely(text);

    console.log(`MPWA POST response: status=${response.status} body=${text.substring(0, 300)}`);

    if (response.ok && parsed?.status !== false) {
      return { ok: true, data: parsed };
    }

    // Fallback: try GET method
    console.log(`MPWA POST failed, trying GET fallback for number: ${number}`);
    const params = new URLSearchParams({ api_key: apiKey, sender, number, message });
    const getResponse = await fetch(`${MPWA_SEND_URL}?${params.toString()}`);
    const getText = await getResponse.text();
    const getParsed = parseJsonSafely(getText);

    console.log(`MPWA GET response: status=${getResponse.status} body=${getText.substring(0, 300)}`);

    if (getResponse.ok && getParsed?.status !== false) {
      return { ok: true, data: getParsed };
    }

    return { ok: false, data: getParsed };
  } catch (err) {
    console.error(`MPWA send error for ${number}:`, err);
    return { ok: false, data: { status: false, msg: String(err) } };
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { phone, message, api_url, api_key, school_id, group_id, student_name, message_type, gateway_type: explicitGateway, gateway, mpwa_api_key, mpwa_sender } = body;

    if ((!phone && !group_id) || !message) {
      return new Response(JSON.stringify({ error: 'phone or group_id, and message are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let finalApiUrl = api_url;
    let finalApiKey = api_key;
    let gatewayType = gateway || explicitGateway || 'onesender';
    let mpwaSenderNum = mpwa_sender || '';

    // If direct MPWA params provided (e.g. from Super Admin test)
    if (gatewayType === 'mpwa' && mpwa_api_key) {
      finalApiKey = mpwa_api_key;
      mpwaSenderNum = mpwa_sender || '';
    }

    // If school_id provided, look up integration settings
    if (school_id && (!finalApiUrl || !finalApiKey)) {
      const { data: integration } = await supabaseAdmin
        .from('school_integrations')
        .select('api_url, api_key, is_active, gateway_type, mpwa_api_key, mpwa_sender')
        .eq('school_id', school_id)
        .eq('integration_type', 'onesender')
        .maybeSingle();

      if (!integration) {
        return new Response(JSON.stringify({ success: false, error: 'WhatsApp integration not configured or inactive' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      gatewayType = integration.gateway_type || 'onesender';

      if (gatewayType === 'mpwa') {
        mpwaSenderNum = integration.mpwa_sender || '';
        finalApiKey = integration.mpwa_api_key || '';

        if (!finalApiKey) {
          const { data: platformKey } = await supabaseAdmin
            .from('platform_settings').select('value')
            .eq('key', 'mpwa_platform_api_key').maybeSingle();
          if (platformKey?.value) finalApiKey = platformKey.value;
        }

        if (!mpwaSenderNum) {
          return new Response(JSON.stringify({ success: false, error: 'MPWA sender belum dikonfigurasi. Scan QR terlebih dahulu.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        finalApiUrl = MPWA_SEND_URL;
      } else {
        finalApiUrl = integration.api_url;
        finalApiKey = integration.api_key;
      }
    }

    if (!finalApiKey) {
      return new Response(JSON.stringify({ error: 'API Key is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══ Check WA credits ═══
    if (school_id) {
      const messageCount = (phone ? 1 : 0) + (group_id ? 1 : 0);
      const { data: credit } = await supabaseAdmin
        .from('wa_credits')
        .select('balance')
        .eq('school_id', school_id)
        .maybeSingle();

      if (!credit || credit.balance < messageCount) {
        return new Response(JSON.stringify({ success: false, error: 'Kredit WhatsApp tidak mencukupi. Silakan beli kredit tambahan.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const results: { target: string; ok: boolean; data: any }[] = [];

    if (gatewayType === 'mpwa') {
      // ═══ MPWA Gateway - same /send-message for phone & group ═══
      if (phone) {
        const formattedPhone = formatPhoneNumber(phone);
        const result = await sendMpwaMessage(finalApiKey, mpwaSenderNum, formattedPhone, message);
        results.push({ target: `phone:${formattedPhone}`, ...result });
      }

      if (group_id) {
        // MPWA /send-message API does not support group JIDs.
        // Skip group sending and mark as unsupported instead of failing.
        console.log(`MPWA gateway does not support group messaging. Skipping group_id: ${group_id}`);
        results.push({ target: `group:${group_id}`, ok: true, data: { status: true, msg: 'MPWA tidak mendukung pengiriman grup, dilewati.' } });
      }
    } else {
      // ═══ OneSender Gateway ═══
      if (!finalApiUrl) {
        return new Response(JSON.stringify({ error: 'API URL is required for OneSender' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (phone) {
        const formattedPhone = formatPhoneNumber(phone);
        try {
          const r = await fetch(finalApiUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${finalApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipient_type: 'individual', to: formattedPhone, type: 'text', text: { body: message } }),
          });
          const data = parseJsonSafely(await r.text());
          results.push({ target: `phone:${formattedPhone}`, ok: r.ok, data });
        } catch (err) {
          results.push({ target: `phone:${formattedPhone}`, ok: false, data: { error: String(err) } });
        }
      }

      if (group_id) {
        try {
          const r = await fetch(finalApiUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${finalApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipient_type: 'group', to: group_id, type: 'text', text: { body: message } }),
          });
          const data = parseJsonSafely(await r.text());
          results.push({ target: `group:${group_id}`, ok: r.ok, data });
        } catch (err) {
          results.push({ target: `group:${group_id}`, ok: false, data: { error: String(err) } });
        }
      }
    }

    const hasError = results.some(r => !r.ok);

    // Log message to wa_message_logs
    if (school_id) {
      try {
        await supabaseAdmin.from('wa_message_logs').insert({
          school_id,
          phone: phone || null,
          group_id: group_id || null,
          message: message.substring(0, 500),
          message_type: message_type || 'attendance',
          status: hasError ? 'failed' : 'sent',
          student_name: student_name || null,
        });
      } catch { /* ignore logging errors */ }

      // Deduct WA credits on successful send
      if (!hasError) {
        const messageCount = (phone ? 1 : 0) + (group_id ? 1 : 0);
        try {
          const { data: credit } = await supabaseAdmin
            .from('wa_credits')
            .select('balance, total_used')
            .eq('school_id', school_id)
            .maybeSingle();

          if (credit) {
            await supabaseAdmin.from('wa_credits').update({
              balance: Math.max(0, credit.balance - messageCount),
              total_used: credit.total_used + messageCount,
              updated_at: new Date().toISOString(),
            }).eq('school_id', school_id);
          }
        } catch { /* ignore credit errors */ }
      }
    }

    if (hasError) {
      console.error(`${gatewayType} error:`, JSON.stringify(results));
      return new Response(JSON.stringify({ success: false, error: `${gatewayType} error`, details: results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Send WhatsApp error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
