import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { email, phone, school_id } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email wajib diisi' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify user exists and get stored phone
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      return new Response(JSON.stringify({ error: 'Email tidak ditemukan' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get stored phone from profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('phone')
      .eq('user_id', user.id)
      .maybeSingle();

    const storedPhone = profile?.phone;

    // Determine which phone to use
    // If phone is provided from client, validate it matches stored phone
    let targetPhone = storedPhone;

    if (phone) {
      // Normalize both for comparison
      const normalizePhone = (p: string) => {
        let n = p.replace(/\D/g, '');
        if (n.startsWith('62')) n = '0' + n.substring(2);
        return n;
      };
      const normalizedInput = normalizePhone(phone);
      const normalizedStored = storedPhone ? normalizePhone(storedPhone) : '';

      if (normalizedStored && normalizedInput !== normalizedStored) {
        return new Response(JSON.stringify({ error: 'Nomor WhatsApp tidak sesuai dengan data yang terdaftar' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      targetPhone = phone;
    }

    if (!targetPhone) {
      return new Response(JSON.stringify({ error: 'Nomor WhatsApp belum terdaftar di profil. Silakan hubungi admin.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Mark old OTPs as used
    await supabaseAdmin
      .from('password_reset_otps')
      .update({ used: true })
      .eq('email', email.toLowerCase())
      .eq('used', false);

    // Store new OTP
    await supabaseAdmin.from('password_reset_otps').insert({
      email: email.toLowerCase(),
      otp_code: otpCode,
      phone: targetPhone,
    });

    // Get WA integration
    let integration = null;
    let logSchoolId = school_id;

    if (school_id) {
      const { data: intData } = await supabaseAdmin
        .from('school_integrations')
        .select('api_url, api_key, is_active, school_id')
        .eq('school_id', school_id)
        .eq('integration_type', 'onesender')
        .maybeSingle();
      if (intData?.is_active && intData?.api_url && intData?.api_key) {
        integration = intData;
      }
    }

    if (!integration) {
      const { data: fallback } = await supabaseAdmin
        .from('school_integrations')
        .select('api_url, api_key, is_active, school_id')
        .eq('integration_type', 'onesender')
        .eq('is_active', true)
        .not('api_url', 'is', null)
        .not('api_key', 'is', null)
        .limit(1)
        .maybeSingle();
      if (fallback) {
        integration = fallback;
        logSchoolId = fallback.school_id;
      }
    }

    if (!integration) {
      return new Response(JSON.stringify({ error: 'Tidak ada integrasi WhatsApp yang aktif' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Format phone
    let formattedPhone = targetPhone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.substring(1);
    }

    // Send OTP via WhatsApp
    const message = `🔐 *Kode OTP Reset Password ATSkolla*\n\nKode OTP Anda: *${otpCode}*\n\nKode ini berlaku selama 5 menit.\n⚠️ Jangan bagikan kode ini kepada siapapun.\n\n_Pesan otomatis dari ATSkolla_`;

    const waResponse = await fetch(integration.api_url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${integration.api_key}`,
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
      const errData = await waResponse.json();
      console.error('WhatsApp send error:', errData);
      return new Response(JSON.stringify({ error: 'Gagal mengirim OTP via WhatsApp' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (logSchoolId) {
      await supabaseAdmin.from('wa_message_logs').insert({
        school_id: logSchoolId,
        phone: targetPhone,
        message: 'Kode OTP Reset Password',
        message_type: 'otp',
        status: 'sent',
        student_name: null,
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'OTP berhasil dikirim via WhatsApp' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
