import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const MAYAR_API_KEY = Deno.env.get('MAYAR_API_KEY');
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

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .single();
    if (planError || !plan) throw new Error('Plan not found');

    // Get user profile for school_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('user_id', user.id)
      .single();
    if (!profile?.school_id) throw new Error('No school associated');

    // Get school name
    const { data: school } = await supabase
      .from('schools')
      .select('name')
      .eq('id', profile.school_id)
      .single();

    // Create Mayar payment link
    const mayarRes = await fetch('https://api.mayar.id/hl/v1/payment/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MAYAR_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Langganan ${plan.name} - ${school?.name || 'Sekolah'}`,
        amount: plan.price,
        description: `Paket ${plan.name} untuk ${school?.name || 'Sekolah'}`,
        email: user.email || 'noemail@school.com',
        mobile: '08000000000',
        redirectUrl: `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app')}/subscription?status=success`,
      }),
    });

    const mayarData = await mayarRes.json();
    if (!mayarRes.ok) throw new Error(`Mayar API error: ${JSON.stringify(mayarData)}`);

    const paymentLink = mayarData.data;

    // Create admin client for inserting payment record
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Save transaction
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
