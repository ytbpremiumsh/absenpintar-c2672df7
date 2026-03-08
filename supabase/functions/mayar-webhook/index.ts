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
    console.log('Mayar webhook received:', JSON.stringify(body));

    const event = body.event;
    const data = body.data;

    if (event !== 'payment.received' && event !== 'payment.completed') {
      return new Response(JSON.stringify({ message: 'Event ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const transactionId = data?.id || data?.transaction_id;
    if (!transactionId) {
      return new Response(JSON.stringify({ error: 'No transaction ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the payment transaction
    const { data: payment, error: findError } = await supabaseAdmin
      .from('payment_transactions')
      .select('id, school_id, plan_id')
      .eq('mayar_transaction_id', transactionId)
      .maybeSingle();

    if (!payment) {
      console.log('Transaction not found for ID:', transactionId);
      return new Response(JSON.stringify({ message: 'Transaction not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update payment status to paid
    await supabaseAdmin
      .from('payment_transactions')
      .update({ status: 'paid', paid_at: new Date().toISOString(), payment_method: data?.paymentMethod || 'mayar' })
      .eq('id', payment.id);

    // Create or update school subscription
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    // Check existing subscription
    const { data: existingSub } = await supabaseAdmin
      .from('school_subscriptions')
      .select('id')
      .eq('school_id', payment.school_id)
      .eq('status', 'active')
      .maybeSingle();

    if (existingSub) {
      await supabaseAdmin
        .from('school_subscriptions')
        .update({ plan_id: payment.plan_id, expires_at: expiresAt.toISOString() })
        .eq('id', existingSub.id);
    } else {
      await supabaseAdmin
        .from('school_subscriptions')
        .insert({
          school_id: payment.school_id,
          plan_id: payment.plan_id,
          status: 'active',
          expires_at: expiresAt.toISOString(),
        });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
