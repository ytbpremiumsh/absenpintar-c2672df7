import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { phone, message, api_url, api_key, school_id } = await req.json();

    if (!phone || !message) {
      return new Response(JSON.stringify({ error: 'phone and message are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let finalApiUrl = api_url;
    let finalApiKey = api_key;

    // If school_id provided, look up integration settings
    if (school_id && (!finalApiUrl || !finalApiKey)) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const { data: integration } = await supabaseAdmin
        .from('school_integrations')
        .select('api_url, api_key, is_active')
        .eq('school_id', school_id)
        .eq('integration_type', 'onesender')
        .eq('is_active', true)
        .maybeSingle();

      if (!integration) {
        return new Response(JSON.stringify({ success: false, error: 'WhatsApp integration not configured or inactive' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      finalApiUrl = integration.api_url;
      finalApiKey = integration.api_key;
    }

    if (!finalApiUrl || !finalApiKey) {
      return new Response(JSON.stringify({ error: 'API URL and API Key are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Format phone number
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.substring(1);
    }

    // Send via OneSender API
    const response = await fetch(finalApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${finalApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: { body: message },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OneSender error:', JSON.stringify(data));
      return new Response(JSON.stringify({ success: false, error: `OneSender error: ${JSON.stringify(data)}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
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
