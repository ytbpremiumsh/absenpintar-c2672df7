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

    const acceptedEvents = ['payment.received', 'payment.completed', 'payment.success', 'payment.paid'];
    if (!acceptedEvents.includes(event)) {
      return new Response(JSON.stringify({ message: 'Event ignored', event }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const transactionId = data?.id || data?.transaction_id || data?.transactionId;
    const productId = data?.productId;
    
    if (!transactionId && !productId) {
      return new Response(JSON.stringify({ error: 'No transaction ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the payment transaction
    let payment = null;
    
    if (transactionId) {
      const { data: found } = await supabaseAdmin
        .from('payment_transactions')
        .select('id, school_id, plan_id, status, amount, payment_method')
        .eq('mayar_transaction_id', transactionId)
        .maybeSingle();
      payment = found;
    }
    
    if (!payment && productId) {
      const { data: found } = await supabaseAdmin
        .from('payment_transactions')
        .select('id, school_id, plan_id, status, amount, payment_method')
        .eq('mayar_transaction_id', productId)
        .maybeSingle();
      payment = found;
    }
    
    if (!payment && data?.amount) {
      const { data: found } = await supabaseAdmin
        .from('payment_transactions')
        .select('id, school_id, plan_id, status, amount, payment_method')
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

    if (payment.status === 'paid') {
      console.log('Payment already processed:', payment.id);
      return new Response(JSON.stringify({ message: 'Already processed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update payment status to paid
    await supabaseAdmin
      .from('payment_transactions')
      .update({ 
        status: 'paid', 
        paid_at: new Date().toISOString(), 
        payment_method: payment.payment_method || data?.paymentMethod || 'mayar',
        mayar_transaction_id: transactionId || payment.mayar_transaction_id,
      })
      .eq('id', payment.id);

    const { data: schoolRes } = await supabaseAdmin.from('schools').select('name').eq('id', payment.school_id).single();
    const schoolName = schoolRes?.name || 'Sekolah';
    const amountFormatted = `Rp ${(payment.amount || 0).toLocaleString('id-ID')}`;
    const paymentMethod = payment.payment_method || '';

    // ═══════════════════════════════════════════
    // ADDON: ID Card Order — auto confirm
    // ═══════════════════════════════════════════
    if (paymentMethod === 'addon_idcard') {
      // Find the order linked to this payment
      const { data: order } = await supabaseAdmin
        .from('id_card_orders')
        .select('id, total_cards')
        .eq('payment_transaction_id', payment.id)
        .maybeSingle();

      if (order) {
        await supabaseAdmin.from('id_card_orders')
          .update({ progress: 'paid', status: 'paid' })
          .eq('id', order.id);
        console.log(`ID Card order ${order.id} auto-confirmed (${order.total_cards} cards)`);
      }

      await supabaseAdmin.from('notifications').insert({
        school_id: payment.school_id,
        title: 'Pembayaran ID Card Berhasil',
        message: `Pesanan cetak ${order?.total_cards || ''} ID Card sebesar ${amountFormatted} telah dibayar. Pesanan sedang diproses.`,
        type: 'success',
      });
      await supabaseAdmin.from('notifications').insert({
        school_id: null,
        title: 'Pembayaran ID Card Masuk',
        message: `${schoolName} membayar pesanan ID Card sebesar ${amountFormatted}. Pesanan otomatis dikonfirmasi.`,
        type: 'info',
      });

      return new Response(JSON.stringify({ success: true, type: 'idcard' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══════════════════════════════════════════
    // ADDON: WA Credit Top-up — auto confirm
    // ═══════════════════════════════════════════
    if (paymentMethod === 'addon_wa_credit') {
      // Calculate credits from amount
      const { data: priceSetting } = await supabaseAdmin.from('platform_settings').select('value').eq('key', 'wa_credit_price').maybeSingle();
      const { data: creditSetting } = await supabaseAdmin.from('platform_settings').select('value').eq('key', 'wa_credit_per_pack').maybeSingle();
      const pricePerPack = parseInt(priceSetting?.value || '50000');
      const creditsPerPack = parseInt(creditSetting?.value || '1000');
      const packs = Math.max(1, Math.round(payment.amount / pricePerPack));
      const totalCredits = packs * creditsPerPack;

      // Upsert wa_credits
      const { data: existing } = await supabaseAdmin.from('wa_credits')
        .select('id, balance, total_purchased')
        .eq('school_id', payment.school_id)
        .maybeSingle();

      if (existing) {
        await supabaseAdmin.from('wa_credits').update({
          balance: existing.balance + totalCredits,
          total_purchased: existing.total_purchased + totalCredits,
        }).eq('id', existing.id);
      } else {
        await supabaseAdmin.from('wa_credits').insert({
          school_id: payment.school_id,
          balance: totalCredits,
          total_purchased: totalCredits,
          total_used: 0,
        });
      }

      console.log(`WA Credit ${totalCredits} added for school ${payment.school_id}`);

      await supabaseAdmin.from('notifications').insert({
        school_id: payment.school_id,
        title: 'Top-up Kredit WA Berhasil',
        message: `${totalCredits.toLocaleString('id-ID')} kredit pesan WhatsApp telah ditambahkan. Pembayaran sebesar ${amountFormatted}.`,
        type: 'success',
      });
      await supabaseAdmin.from('notifications').insert({
        school_id: null,
        title: 'Top-up Kredit WA Masuk',
        message: `${schoolName} top-up ${totalCredits.toLocaleString('id-ID')} kredit WA sebesar ${amountFormatted}.`,
        type: 'info',
      });

      return new Response(JSON.stringify({ success: true, type: 'wa_credit', credits_added: totalCredits }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══════════════════════════════════════════
    // SUBSCRIPTION Payment — existing logic
    // ═══════════════════════════════════════════
    const { data: planRes } = await supabaseAdmin.from('subscription_plans').select('name').eq('id', payment.plan_id).single();
    const planName = planRes?.name || 'Unknown';

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

    // Auto-provision WhatsApp integration for School/Premium plans
    if (['School', 'Premium'].includes(planName)) {
      const { data: existingInt } = await supabaseAdmin
        .from('school_integrations')
        .select('id')
        .eq('school_id', payment.school_id)
        .eq('integration_type', 'onesender')
        .maybeSingle();

      if (!existingInt) {
        const { data: refInt } = await supabaseAdmin
          .from('school_integrations')
          .select('api_key, api_url')
          .eq('integration_type', 'onesender')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (refInt?.api_key && refInt?.api_url) {
          await supabaseAdmin.from('school_integrations').insert({
            school_id: payment.school_id,
            integration_type: 'onesender',
            api_key: refInt.api_key,
            api_url: refInt.api_url,
            is_active: true,
            wa_enabled: true,
          });
        }
      } else {
        await supabaseAdmin.from('school_integrations')
          .update({ is_active: true })
          .eq('id', existingInt.id);
      }

      // Auto-provision 5000 WA credits for School/Premium
      const { data: existingCredits } = await supabaseAdmin.from('wa_credits')
        .select('id')
        .eq('school_id', payment.school_id)
        .maybeSingle();

      if (!existingCredits) {
        await supabaseAdmin.from('wa_credits').insert({
          school_id: payment.school_id,
          balance: 5000,
          total_purchased: 5000,
          total_used: 0,
        });
        console.log(`WA Credits 5000 auto-provisioned for school ${payment.school_id}`);
      }
    }

    await supabaseAdmin.from('notifications').insert({
      school_id: payment.school_id,
      title: 'Pembayaran Berhasil — Upgrade Sukses',
      message: `Paket ${planName} telah aktif untuk ${schoolName}. Langganan berlaku hingga ${expiresFormatted}. Terima kasih atas pembayaran sebesar ${amountFormatted}.`,
      type: 'success',
    });

    await supabaseAdmin.from('notifications').insert({
      school_id: null,
      title: 'Pembayaran Masuk — Auto Approved',
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
