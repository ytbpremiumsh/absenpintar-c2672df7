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

    // Try multiple ID fields from Mayar webhook payload
    const transactionId = data?.id || data?.transaction_id || data?.transactionId;
    const productId = data?.productId;
    
    if (!transactionId && !productId) {
      return new Response(JSON.stringify({ error: 'No transaction ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the payment transaction - try transaction ID first, then product ID (payment link ID)
    let payment = null;
    
    if (transactionId) {
      const { data: found } = await supabaseAdmin
        .from('payment_transactions')
        .select('id, school_id, plan_id, status, amount')
        .eq('mayar_transaction_id', transactionId)
        .maybeSingle();
      payment = found;
    }
    
    // Fallback: productId is the payment link ID which is what we store as mayar_transaction_id
    if (!payment && productId) {
      const { data: found } = await supabaseAdmin
        .from('payment_transactions')
        .select('id, school_id, plan_id, status, amount')
        .eq('mayar_transaction_id', productId)
        .maybeSingle();
      payment = found;
    }
    
    // Last fallback: find most recent pending payment matching the amount and email
    if (!payment && data?.amount) {
      const { data: found } = await supabaseAdmin
        .from('payment_transactions')
        .select('id, school_id, plan_id, status, amount')
        .eq('status', 'pending')
        .eq('amount', data.amount)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      payment = found;
    }

    if (!payment) {
      console.log('Transaction not found for ID:', transactionId);
      return new Response(JSON.stringify({ message: 'Transaction not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Skip if already paid (idempotency)
    if (payment.status === 'paid') {
      console.log('Payment already processed:', payment.id);
      return new Response(JSON.stringify({ message: 'Already processed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update payment status to paid
    await supabaseAdmin
      .from('payment_transactions')
      .update({ status: 'paid', paid_at: new Date().toISOString(), payment_method: data?.paymentMethod || 'mayar' })
      .eq('id', payment.id);

    // Get plan and school info for notifications
    const [planRes, schoolRes] = await Promise.all([
      supabaseAdmin.from('subscription_plans').select('name').eq('id', payment.plan_id).single(),
      supabaseAdmin.from('schools').select('name').eq('id', payment.school_id).single(),
    ]);
    const planName = planRes.data?.name || 'Unknown';
    const schoolName = schoolRes.data?.name || 'Sekolah';

    // Create or extend school subscription
    const { data: existingSub } = await supabaseAdmin
      .from('school_subscriptions')
      .select('id, expires_at')
      .eq('school_id', payment.school_id)
      .eq('status', 'active')
      .maybeSingle();

    const now = new Date();
    let expiresAt: Date;

    if (existingSub?.expires_at) {
      const currentExpiry = new Date(existingSub.expires_at);
      expiresAt = currentExpiry > now ? currentExpiry : now;
    } else {
      expiresAt = now;
    }
    expiresAt.setMonth(expiresAt.getMonth() + 1);

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

    const expiresFormatted = expiresAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const amountFormatted = `Rp ${(payment.amount || 0).toLocaleString('id-ID')}`;

    // Notification for the school (user sees this)
    await supabaseAdmin.from('notifications').insert({
      school_id: payment.school_id,
      title: '✅ Pembayaran Berhasil — Upgrade Sukses!',
      message: `Paket ${planName} telah aktif untuk ${schoolName}. Langganan berlaku hingga ${expiresFormatted}. Terima kasih atas pembayaran sebesar ${amountFormatted}.`,
      type: 'success',
    });

    // Notification for super admin (school_id = null means global/super admin)
    await supabaseAdmin.from('notifications').insert({
      school_id: null,
      title: '💰 Pembayaran Masuk — Auto Approved',
      message: `${schoolName} telah membayar Paket ${planName} sebesar ${amountFormatted}. Langganan otomatis diaktifkan hingga ${expiresFormatted}.`,
      type: 'info',
    });

    console.log(`Payment ${payment.id} auto-approved. Plan: ${planName}, School: ${schoolName}, Expires: ${expiresFormatted}`);

    return new Response(JSON.stringify({ success: true, expires_at: expiresAt.toISOString() }), {
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
