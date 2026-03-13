import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Try platform_settings first, then fall back to env var
    let MAYAR_API_KEY = Deno.env.get('MAYAR_API_KEY');
    const tempAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: keyFromDb } = await tempAdmin.from('platform_settings').select('value').eq('key', 'mayar_api_key').maybeSingle();
    if (keyFromDb?.value) MAYAR_API_KEY = keyFromDb.value;
    if (!MAYAR_API_KEY) throw new Error('MAYAR_API_KEY not configured');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { plan_id } = await req.json();
    if (!plan_id) throw new Error('plan_id is required');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get plan details
    const { data: plan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .single();
    if (planError || !plan) throw new Error('Plan not found');

    // Get user profile for school_id
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('school_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!profile?.school_id) throw new Error('No school associated with your account');

    // Get school name
    const { data: school } = await supabaseAdmin
      .from('schools')
      .select('name')
      .eq('id', profile.school_id)
      .maybeSingle();

    // For free plans (price = 0), auto-approve immediately
    if (plan.price === 0) {
      await supabaseAdmin.from('payment_transactions').insert({
        school_id: profile.school_id,
        plan_id: plan.id,
        amount: 0,
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_method: 'free',
      });

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const { data: existingSub } = await supabaseAdmin
        .from('school_subscriptions')
        .select('id')
        .eq('school_id', profile.school_id)
        .eq('status', 'active')
        .maybeSingle();

      if (existingSub) {
        await supabaseAdmin.from('school_subscriptions')
          .update({ plan_id: plan.id, expires_at: expiresAt.toISOString() })
          .eq('id', existingSub.id);
      } else {
        await supabaseAdmin.from('school_subscriptions').insert({
          school_id: profile.school_id,
          plan_id: plan.id,
          status: 'active',
          expires_at: expiresAt.toISOString(),
        });
      }

      return new Response(JSON.stringify({ success: true, auto_approved: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for existing pending payment for the same plan within the last 2 minutes
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: existingPending } = await supabaseAdmin
      .from('payment_transactions')
      .select('id, mayar_payment_url')
      .eq('school_id', profile.school_id)
      .eq('plan_id', plan.id)
      .eq('status', 'pending')
      .gte('created_at', twoMinAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPending?.mayar_payment_url) {
      return new Response(JSON.stringify({ success: true, payment_url: existingPending.mayar_payment_url }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For paid plans, create Mayar payment link — DO NOT auto-approve
    const projectId = Deno.env.get('SUPABASE_URL')?.split('//')[1]?.split('.')[0] || '';
    const siteUrl = projectId ? `https://${projectId}.lovable.app` : 'https://smartschoolattendance.lovable.app';
    console.log('Redirect URL:', `${siteUrl}/subscription?status=success`);
    const mayarRes = await fetch('https://api.mayar.id/hl/v1/payment/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MAYAR_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Paket ${plan.name} - ${school?.name || 'Sekolah'}`,
        amount: plan.price,
        description: `Paket ${plan.name} - (${school?.name || 'Sekolah'})`,
        email: user.email || 'noemail@school.com',
        mobile: '08000000000',
        redirectUrl: `${siteUrl}/subscription?status=success`,
      }),
    });

    const mayarData = await mayarRes.json();
    if (!mayarRes.ok) throw new Error(`Mayar API error: ${JSON.stringify(mayarData)}`);

    const paymentLink = mayarData.data;

    // Save transaction as pending — wait for webhook to confirm payment
    await supabaseAdmin.from('payment_transactions').insert({
      school_id: profile.school_id,
      plan_id: plan.id,
      amount: plan.price,
      status: 'pending',
      mayar_transaction_id: paymentLink?.id || null,
      mayar_payment_url: paymentLink?.link || null,
    });

    return new Response(JSON.stringify({ success: true, payment_url: paymentLink?.link }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
