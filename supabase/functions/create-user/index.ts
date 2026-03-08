import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { email, password, full_name, role, school_id, npsn, school_name, school_address, phone } = await req.json();

    // Determine school_id: use provided or create new school from NPSN
    let resolvedSchoolId = school_id;

    if (!resolvedSchoolId && npsn && school_name) {
      const { data: existingSchool } = await supabaseAdmin
        .from('schools')
        .select('id')
        .ilike('name', school_name)
        .maybeSingle();

      if (existingSchool) {
        resolvedSchoolId = existingSchool.id;
      } else {
        const { data: newSchool, error: schoolError } = await supabaseAdmin
          .from('schools')
          .insert({
            name: school_name,
            address: school_address || null,
          })
          .select('id')
          .single();

        if (schoolError) throw new Error('Gagal membuat sekolah: ' + schoolError.message);
        resolvedSchoolId = newSchool.id;
      }
    }

    // Create user
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (userError) throw userError;

    const userId = userData.user.id;

    // Update profile with school_id
    if (resolvedSchoolId) {
      await supabaseAdmin
        .from('profiles')
        .update({ school_id: resolvedSchoolId, full_name })
        .eq('user_id', userId);
    }

    // Assign role
    if (role) {
      await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: userId, role });
    }

    // Create pickup_settings and auto-assign Free subscription for new school
    if (resolvedSchoolId && npsn) {
      const { data: existingSettings } = await supabaseAdmin
        .from('pickup_settings')
        .select('id')
        .eq('school_id', resolvedSchoolId)
        .maybeSingle();

      if (!existingSettings) {
        await supabaseAdmin
          .from('pickup_settings')
          .insert({ school_id: resolvedSchoolId, is_active: false });
      }

      // Auto-assign Free plan subscription
      const { data: freePlan } = await supabaseAdmin
        .from('subscription_plans')
        .select('id')
        .eq('price', 0)
        .eq('is_active', true)
        .maybeSingle();

      if (freePlan) {
        const { data: existingSub } = await supabaseAdmin
          .from('school_subscriptions')
          .select('id')
          .eq('school_id', resolvedSchoolId)
          .maybeSingle();

        if (!existingSub) {
          await supabaseAdmin.from('school_subscriptions').insert({
            school_id: resolvedSchoolId,
            plan_id: freePlan.id,
            status: 'active',
            expires_at: null,
          });
        }
      }
    }

    // Send WhatsApp registration notification
    if (phone) {
      try {
        // Fetch platform WA settings
        const { data: settings } = await supabaseAdmin
          .from('platform_settings')
          .select('key, value')
          .in('key', ['wa_registration_enabled', 'wa_api_url', 'wa_api_key', 'wa_registration_message']);

        const settingsMap: Record<string, string> = {};
        (settings || []).forEach((s: any) => { settingsMap[s.key] = s.value; });

        if (settingsMap.wa_registration_enabled === 'true' && settingsMap.wa_api_url && settingsMap.wa_api_key) {
          // Format phone number
          let formattedPhone = phone.replace(/\D/g, '');
          if (formattedPhone.startsWith('0')) {
            formattedPhone = '62' + formattedPhone.substring(1);
          }

          // Build message with placeholders
          const message = (settingsMap.wa_registration_message || 'Selamat datang, {name}!')
            .replace(/{name}/g, full_name || '')
            .replace(/{school}/g, school_name || '')
            .replace(/{email}/g, email || '');

          // Send via OneSender API
          const waResponse = await fetch(settingsMap.wa_api_url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${settingsMap.wa_api_key}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              recipient_type: 'individual',
              to: formattedPhone,
              type: 'text',
              text: { body: message },
            }),
          });

          if (!waResponse.ok) {
            const waError = await waResponse.text();
            console.error('WA registration notification failed:', waError);
          } else {
            console.log('WA registration notification sent to', formattedPhone);
          }
        }
      } catch (waErr) {
        // Don't fail registration if WA fails
        console.error('WA notification error:', waErr);
      }
    }

    return new Response(JSON.stringify({ success: true, user_id: userId, school_id: resolvedSchoolId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
