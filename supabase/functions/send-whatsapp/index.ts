import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MPWA_BASE = 'https://app.ayopintar.com';

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

const normalizeGroupCandidates = (groupId: string) => {
  const trimmed = groupId.trim();
  const compact = trimmed.replace(/\s+/g, '');
  const withoutSuffix = compact.replace(/@g\.us$/i, '');
  const withSuffix = withoutSuffix ? `${withoutSuffix}@g.us` : '';
  const digitsOnly = withoutSuffix.replace(/\D/g, '');

  return [...new Set([compact, withSuffix, withoutSuffix, digitsOnly].filter(Boolean))];
};

const toReplayableResponse = async (response: Response) => {
  const text = await response.text();

  return {
    response: new Response(text, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    }),
    parsed: parseJsonSafely(text),
  };
};

const sendMpwaGroupMessage = async ({
  url,
  apiKey,
  sender,
  groupId,
  message,
}: {
  url: string;
  apiKey: string;
  sender: string;
  groupId: string;
  message: string;
}) => {
  const candidates = normalizeGroupCandidates(groupId);
  const attempts = candidates.flatMap((candidate) => ([
    { label: `number:${candidate}`, payload: { api_key: apiKey, sender, number: candidate, message } },
    { label: `group_id:${candidate}`, payload: { api_key: apiKey, sender, group_id: candidate, message } },
  ]));

  console.log(`MPWA sending to group: ${groupId}, sender: ${sender}, attempts: ${attempts.map((attempt) => attempt.label).join(', ')}`);

  let lastResponse: Response | null = null;

  for (const attempt of attempts) {
    const { response, parsed } = await toReplayableResponse(
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attempt.payload),
      })
    );

    if (response.ok && parsed?.status !== false) {
      console.log(`MPWA group send succeeded with payload ${attempt.label}`);
      return response;
    }

    console.warn(`MPWA group send failed with payload ${attempt.label}: ${JSON.stringify(parsed).substring(0, 200)}`);
    lastResponse = response;
  }

  return lastResponse || new Response(JSON.stringify({ status: false, msg: 'Gagal mengirim pesan grup' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
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

    // ═══ Check & deduct WA credits ═══
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

    const sendRequests: Promise<Response>[] = [];

    if (gatewayType === 'mpwa') {
      // ═══ MPWA Gateway ═══
      const mpwaSendUrl = finalApiUrl || `${MPWA_BASE}/send-message`;

      if (phone) {
        const formattedPhone = formatPhoneNumber(phone);
        console.log(`MPWA sending to phone: ${formattedPhone}, sender: ${mpwaSenderNum}`);
        sendRequests.push(
          fetch(mpwaSendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: finalApiKey,
              sender: mpwaSenderNum,
              number: formattedPhone,
              message: message,
            }),
          })
        );
      }

      if (group_id) {
        sendRequests.push(
          sendMpwaGroupMessage({
            url: mpwaSendUrl,
            apiKey: finalApiKey,
            sender: mpwaSenderNum,
            groupId: group_id,
            message,
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
        const formattedPhone = formatPhoneNumber(phone);
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
    const results = await Promise.all(responses.map(async (r) => parseJsonSafely(await r.text())));

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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
