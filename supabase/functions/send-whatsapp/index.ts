import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { phone, message, api_url, api_key, school_id, group_id, student_name, message_type, gateway_type: explicitGateway } = body;

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
    let gatewayType = explicitGateway || 'onesender';
    let mpwaSender = '';

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
        // For MPWA: sender from school_integrations, API key from school or platform_settings
        mpwaSender = integration.mpwa_sender || '';
        finalApiKey = integration.mpwa_api_key || '';

        // Fallback API key to platform_settings
        if (!finalApiKey) {
          const { data: platformKey } = await supabaseAdmin
            .from('platform_settings')
            .select('value')
            .eq('key', 'mpwa_platform_api_key')
            .maybeSingle();
          if (platformKey?.value) finalApiKey = platformKey.value;
        }

        if (!mpwaSender) {
          return new Response(JSON.stringify({ success: false, error: 'MPWA sender belum dikonfigurasi. Scan QR terlebih dahulu.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        finalApiUrl = 'https://app.ayopintar.com/send-message';
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

    const sendRequests: Promise<Response>[] = [];

    if (gatewayType === 'mpwa') {
      // ═══ MPWA Gateway ═══
      const mpwaUrl = 'https://app.ayopintar.com/send-message';

      if (phone) {
        let formattedPhone = phone.replace(/\D/g, '');
        if (formattedPhone.startsWith('0')) {
          formattedPhone = '62' + formattedPhone.substring(1);
        }
        sendRequests.push(
          fetch(mpwaUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: finalApiKey,
              sender: mpwaSender,
              number: formattedPhone,
              message: message,
            }),
          })
        );
      }

      if (group_id) {
        sendRequests.push(
          fetch(mpwaUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: finalApiKey,
              sender: mpwaSender,
              number: group_id,
              message: message,
            }),
          })
        );
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
        let formattedPhone = phone.replace(/\D/g, '');
        if (formattedPhone.startsWith('0')) {
          formattedPhone = '62' + formattedPhone.substring(1);
        }
        sendRequests.push(
          fetch(finalApiUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${finalApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipient_type: 'individual', to: formattedPhone, type: 'text', text: { body: message } }),
          })
        );
      }

      if (group_id) {
        sendRequests.push(
          fetch(finalApiUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${finalApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipient_type: 'group', to: group_id, type: 'text', text: { body: message } }),
          })
        );
      }
    }

    const responses = await Promise.all(sendRequests);

    // Safe JSON parsing for responses
    const results = await Promise.all(responses.map(async (r) => {
      const text = await r.text();
      try {
        return JSON.parse(text);
      } catch {
        return { status: false, msg: 'Invalid response', raw: text.substring(0, 200) };
      }
    }));

    // For MPWA, check status field; for OneSender, check HTTP status
    let hasError: boolean;
    if (gatewayType === 'mpwa') {
      hasError = results.some((r: any) => r.status === false);
    } else {
      hasError = responses.some(r => !r.ok);
    }

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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
