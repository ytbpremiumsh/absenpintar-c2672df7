import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let mayarApiKey = Deno.env.get("MAYAR_API_KEY");
    const { data: keyFromDb } = await supabaseAdmin
      .from("platform_settings").select("value").eq("key", "mayar_api_key").maybeSingle();
    if (keyFromDb?.value) mayarApiKey = keyFromDb.value;
    if (!mayarApiKey) throw new Error("MAYAR_API_KEY not configured");

    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    const accessToken = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!accessToken) throw new Error("Unauthorized");

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { plan_id, school_id: requestedSchoolId, addon_type, order_id, wa_credit_amount } = body;

    const resolveSchoolId = async (): Promise<string> => {
      let sid: string | null = requestedSchoolId || null;
      if (!sid) {
        const { data } = await supabaseAdmin.rpc("get_user_school_id", { _user_id: user.id });
        sid = data || null;
        if (!sid) {
          const { data: p } = await supabaseAdmin.from("profiles").select("school_id").eq("user_id", user.id).limit(1).maybeSingle();
          sid = p?.school_id || null;
        }
      }
      if (!sid) throw new Error("Akun Anda belum terhubung ke sekolah.");
      return sid;
    };

    const siteUrl = "https://absenpintar.lovable.app";

    const createMayarLink = async (name: string, amount: number, description: string, redirectUrl: string) => {
      const mayarRes = await fetch("https://api.mayar.id/hl/v1/payment/create", {
        method: "POST",
        headers: { Authorization: `Bearer ${mayarApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name, amount, description, email: user.email || "noemail@school.com", mobile: "08000000000", redirectUrl }),
      });
      const mayarData = await mayarRes.json();
      if (!mayarRes.ok) throw new Error(`Mayar API error: ${mayarData?.message || JSON.stringify(mayarData)}`);
      if (!mayarData?.data?.link) throw new Error("Mayar tidak mengembalikan link pembayaran");
      return mayarData.data;
    };

    const findRecentPending = async (filters: Record<string, string>) => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      let q = supabaseAdmin.from("payment_transactions").select("id, mayar_payment_url")
        .eq("status", "pending").gte("created_at", fiveMinAgo).order("created_at", { ascending: false }).limit(1);
      for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
      const { data } = await q.maybeSingle();
      return data;
    };

    const getAnyPlanId = async () => {
      const { data } = await supabaseAdmin.from("subscription_plans").select("id").limit(1).single();
      return data?.id;
    };

    // ═══════════════════════════════════════════
    // 1. ID Card Order Payment
    // ═══════════════════════════════════════════
    if (addon_type === "idcard" && order_id) {
      const schoolId = await resolveSchoolId();
      const { data: order } = await supabaseAdmin.from("id_card_orders").select("*").eq("id", order_id).eq("school_id", schoolId).single();
      if (!order) throw new Error("Pesanan tidak ditemukan");
      if (order.progress !== "waiting_payment") throw new Error("Pesanan sudah dibayar");

      const { data: school } = await supabaseAdmin.from("schools").select("name").eq("id", schoolId).maybeSingle();
      const amount = order.total_amount;

      const existing = await findRecentPending({ school_id: schoolId, payment_method: "addon_idcard" });
      if (existing?.mayar_payment_url) {
        return new Response(JSON.stringify({ success: true, payment_url: existing.mayar_payment_url }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const redirectUrl = `${siteUrl}/order-idcard?status=success`;
      const paymentLink = await createMayarLink(
        `ID Card ${order.total_cards} kartu - ${school?.name || "Sekolah"}`,
        amount,
        `Cetak ID Card ${order.total_cards} kartu - ${school?.name || "Sekolah"}`,
        redirectUrl
      );

      const anyPlanId = await getAnyPlanId();
      const { data: txn } = await supabaseAdmin.from("payment_transactions").insert({
        school_id: schoolId, plan_id: anyPlanId || schoolId, amount, status: "pending",
        mayar_transaction_id: paymentLink?.id || null, mayar_payment_url: paymentLink?.link || null,
        payment_method: "addon_idcard",
      }).select("id").single();

      await supabaseAdmin.from("id_card_orders").update({ payment_transaction_id: txn?.id || null }).eq("id", order_id);

      return new Response(JSON.stringify({ success: true, payment_url: paymentLink.link }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════
    // 2. Custom Domain Add-on Payment
    // ═══════════════════════════════════════════
    if (addon_type === "custom_domain") {
      const schoolId = await resolveSchoolId();
      const addonAmount = 200000;
      const { data: school } = await supabaseAdmin.from("schools").select("name").eq("id", schoolId).maybeSingle();

      const existing = await findRecentPending({ school_id: schoolId, payment_method: "addon_custom_domain" });
      if (existing?.mayar_payment_url) {
        return new Response(JSON.stringify({ success: true, payment_url: existing.mayar_payment_url }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const redirectUrl = `${siteUrl}/custom-domain?status=success`;
      const paymentLink = await createMayarLink(
        `Add-on Custom Domain - ${school?.name || "Sekolah"}`,
        addonAmount,
        `Add-on Custom Domain - (${school?.name || "Sekolah"})`,
        redirectUrl
      );

      const anyPlanId = await getAnyPlanId();
      const { data: txn } = await supabaseAdmin.from("payment_transactions").insert({
        school_id: schoolId, plan_id: anyPlanId || schoolId, amount: addonAmount, status: "pending",
        mayar_transaction_id: paymentLink?.id || null, mayar_payment_url: paymentLink?.link || null,
        payment_method: "addon_custom_domain",
      }).select("id").single();

      const subRes = await supabaseAdmin.from("school_subscriptions").select("expires_at").eq("school_id", schoolId).in("status", ["active", "trial"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
      await supabaseAdmin.from("school_addons").upsert({
        school_id: schoolId, addon_type: "custom_domain", status: "pending", amount: addonAmount,
        payment_transaction_id: txn?.id || null, expires_at: subRes?.data?.expires_at || null,
      }, { onConflict: "school_id,addon_type" });

      return new Response(JSON.stringify({ success: true, payment_url: paymentLink.link }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════
    // 3. WA Credit Top-up Payment
    // ═══════════════════════════════════════════
    if (addon_type === "wa_credit") {
      const schoolId = await resolveSchoolId();
      const { data: school } = await supabaseAdmin.from("schools").select("name").eq("id", schoolId).maybeSingle();

      // Get price from platform_settings
      const { data: priceSetting } = await supabaseAdmin.from("platform_settings").select("value").eq("key", "wa_credit_price").maybeSingle();
      const pricePerPack = parseInt(priceSetting?.value || "50000");
      const { data: creditSetting } = await supabaseAdmin.from("platform_settings").select("value").eq("key", "wa_credit_per_pack").maybeSingle();
      const creditsPerPack = parseInt(creditSetting?.value || "1000");

      const packs = wa_credit_amount || 1;
      const totalAmount = pricePerPack * packs;
      const totalCredits = creditsPerPack * packs;

      const existing = await findRecentPending({ school_id: schoolId, payment_method: "addon_wa_credit" });
      if (existing?.mayar_payment_url) {
        return new Response(JSON.stringify({ success: true, payment_url: existing.mayar_payment_url }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const redirectUrl = `${siteUrl}/addons?status=wa_credit_success`;
      const paymentLink = await createMayarLink(
        `Kredit WA ${totalCredits} pesan - ${school?.name || "Sekolah"}`,
        totalAmount,
        `Top-up Kredit WhatsApp ${totalCredits} pesan - (${school?.name || "Sekolah"})`,
        redirectUrl
      );

      const anyPlanId = await getAnyPlanId();
      await supabaseAdmin.from("payment_transactions").insert({
        school_id: schoolId, plan_id: anyPlanId || schoolId, amount: totalAmount, status: "pending",
        mayar_transaction_id: paymentLink?.id || null, mayar_payment_url: paymentLink?.link || null,
        payment_method: "addon_wa_credit",
      });

      return new Response(JSON.stringify({ success: true, payment_url: paymentLink.link }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════
    // 4. Subscription Plan Payment
    // ═══════════════════════════════════════════
    if (!plan_id) throw new Error("plan_id is required");

    const { data: plan, error: planError } = await supabaseAdmin.from("subscription_plans").select("*").eq("id", plan_id).single();
    if (planError || !plan) throw new Error("Plan not found");

    let schoolId = await resolveSchoolId().catch(() => null);
    if (!schoolId && requestedSchoolId) {
      const { data: isSA } = await supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "super_admin" });
      if (isSA) schoolId = requestedSchoolId;
    }
    if (!schoolId) throw new Error("Akun Anda belum terhubung ke sekolah. Silakan hubungi Super Admin.");

    const { data: school } = await supabaseAdmin.from("schools").select("name").eq("id", schoolId).maybeSingle();

    // Free plan: auto-approved
    if (plan.price === 0) {
      await supabaseAdmin.from("payment_transactions").insert({
        school_id: schoolId, plan_id: plan.id, amount: 0, status: "paid", paid_at: new Date().toISOString(), payment_method: "free",
      });
      const expiresAt = new Date(); expiresAt.setMonth(expiresAt.getMonth() + 1);
      const { data: existingSub } = await supabaseAdmin.from("school_subscriptions").select("id").eq("school_id", schoolId).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (existingSub) {
        await supabaseAdmin.from("school_subscriptions").update({ plan_id: plan.id, expires_at: expiresAt.toISOString() }).eq("id", existingSub.id);
      } else {
        await supabaseAdmin.from("school_subscriptions").insert({ school_id: schoolId, plan_id: plan.id, status: "active", expires_at: expiresAt.toISOString() });
      }
      return new Response(JSON.stringify({ success: true, auto_approved: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const existing = await findRecentPending({ school_id: schoolId, plan_id: plan.id });
    if (existing?.mayar_payment_url) {
      return new Response(JSON.stringify({ success: true, payment_url: existing.mayar_payment_url }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const redirectUrl = `${siteUrl}/subscription?status=success`;
    const paymentLink = await createMayarLink(
      `Paket ${plan.name} - ${school?.name || "Sekolah"}`,
      plan.price,
      `Paket ${plan.name} - (${school?.name || "Sekolah"})`,
      redirectUrl
    );

    await supabaseAdmin.from("payment_transactions").insert({
      school_id: schoolId, plan_id: plan.id, amount: plan.price, status: "pending",
      mayar_transaction_id: paymentLink?.id || null, mayar_payment_url: paymentLink?.link || null,
    });

    return new Response(JSON.stringify({ success: true, payment_url: paymentLink.link }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("create-mayar-payment error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
