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
      .from("platform_settings")
      .select("value")
      .eq("key", "mayar_api_key")
      .maybeSingle();

    if (keyFromDb?.value) mayarApiKey = keyFromDb.value;
    if (!mayarApiKey) throw new Error("MAYAR_API_KEY not configured");

    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    const accessToken = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!accessToken) throw new Error("Unauthorized");

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { plan_id, school_id: requestedSchoolId, addon_type } = body;

    // Handle add-on purchase (custom_domain etc)
    if (addon_type) {
      // Resolve school id
      let schoolId: string | null = requestedSchoolId || null;
      if (!schoolId) {
        const { data: schoolIdFromFn } = await supabaseAdmin.rpc("get_user_school_id", { _user_id: user.id });
        schoolId = schoolIdFromFn || null;
        if (!schoolId) {
          const { data: profile } = await supabaseAdmin.from("profiles").select("school_id").eq("user_id", user.id).limit(1).maybeSingle();
          schoolId = profile?.school_id || null;
        }
      }
      if (!schoolId) throw new Error("Akun Anda belum terhubung ke sekolah.");

      const addonAmount = 200000;
      const { data: school } = await supabaseAdmin.from("schools").select("name").eq("id", schoolId).maybeSingle();

      // Reuse pending addon payment within 5 min window
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: existingAddonPending } = await supabaseAdmin
        .from("payment_transactions")
        .select("id, mayar_payment_url")
        .eq("school_id", schoolId)
        .eq("payment_method", "addon_custom_domain")
        .eq("status", "pending")
        .gte("created_at", fiveMinAgo)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingAddonPending?.mayar_payment_url) {
        return new Response(JSON.stringify({ success: true, payment_url: existingAddonPending.mayar_payment_url }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const siteUrl = "https://absenpintar.lovable.app";
      const redirectUrl = `${siteUrl}/custom-domain?status=success`;

      const mayarRes = await fetch("https://api.mayar.id/hl/v1/payment/create", {
        method: "POST",
        headers: { Authorization: `Bearer ${mayarApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Add-on Custom Domain - ${school?.name || "Sekolah"}`,
          amount: addonAmount,
          description: `Add-on Custom Domain - (${school?.name || "Sekolah"})`,
          email: user.email || "noemail@school.com",
          mobile: "08000000000",
          redirectUrl,
        }),
      });

      const mayarData = await mayarRes.json();
      if (!mayarRes.ok) throw new Error(`Mayar API error: ${mayarData?.message || JSON.stringify(mayarData)}`);
      const paymentLink = mayarData?.data;
      if (!paymentLink?.link) throw new Error("Mayar tidak mengembalikan link pembayaran");

      // Create payment transaction
      const { data: txn } = await supabaseAdmin.from("payment_transactions").insert({
        school_id: schoolId,
        plan_id: (await supabaseAdmin.from("subscription_plans").select("id").limit(1).single()).data?.id || schoolId,
        amount: addonAmount,
        status: "pending",
        mayar_transaction_id: paymentLink?.id || null,
        mayar_payment_url: paymentLink?.link || null,
        payment_method: "addon_custom_domain",
      }).select("id").single();

      // Create addon record
      const subRes = await supabaseAdmin.from("school_subscriptions").select("expires_at").eq("school_id", schoolId).in("status", ["active", "trial"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
      await supabaseAdmin.from("school_addons").upsert({
        school_id: schoolId,
        addon_type: "custom_domain",
        status: "pending",
        amount: addonAmount,
        payment_transaction_id: txn?.id || null,
        expires_at: subRes?.data?.expires_at || null,
      }, { onConflict: "school_id,addon_type" });

      return new Response(JSON.stringify({ success: true, payment_url: paymentLink.link }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!plan_id) throw new Error("plan_id is required");

    const { data: plan, error: planError } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .eq("id", plan_id)
      .single();

    if (planError || !plan) throw new Error("Plan not found");

    // Resolve school id robustly
    let schoolId: string | null = null;

    const { data: schoolIdFromFn } = await supabaseAdmin.rpc("get_user_school_id", {
      _user_id: user.id,
    });

    if (schoolIdFromFn) {
      schoolId = schoolIdFromFn;
    } else {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("school_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      schoolId = profile?.school_id || null;
    }

    // Allow super admin fallback when school_id explicitly passed
    if (!schoolId && requestedSchoolId) {
      const { data: isSuperAdmin } = await supabaseAdmin.rpc("has_role", {
        _user_id: user.id,
        _role: "super_admin",
      });
      if (isSuperAdmin) schoolId = requestedSchoolId;
    }

    if (!schoolId) {
      throw new Error("Akun Anda belum terhubung ke sekolah. Silakan hubungi Super Admin.");
    }

    const { data: school } = await supabaseAdmin
      .from("schools")
      .select("name")
      .eq("id", schoolId)
      .maybeSingle();

    // Free plan: auto-approved
    if (plan.price === 0) {
      await supabaseAdmin.from("payment_transactions").insert({
        school_id: schoolId,
        plan_id: plan.id,
        amount: 0,
        status: "paid",
        paid_at: new Date().toISOString(),
        payment_method: "free",
      });

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const { data: existingSub } = await supabaseAdmin
        .from("school_subscriptions")
        .select("id")
        .eq("school_id", schoolId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingSub) {
        await supabaseAdmin
          .from("school_subscriptions")
          .update({ plan_id: plan.id, expires_at: expiresAt.toISOString() })
          .eq("id", existingSub.id);
      } else {
        await supabaseAdmin.from("school_subscriptions").insert({
          school_id: schoolId,
          plan_id: plan.id,
          status: "active",
          expires_at: expiresAt.toISOString(),
        });
      }

      return new Response(JSON.stringify({ success: true, auto_approved: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reuse pending payment in short window
    const twoMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: existingPending } = await supabaseAdmin
      .from("payment_transactions")
      .select("id, mayar_payment_url")
      .eq("school_id", schoolId)
      .eq("plan_id", plan.id)
      .eq("status", "pending")
      .gte("created_at", twoMinAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPending?.mayar_payment_url) {
      return new Response(
        JSON.stringify({ success: true, payment_url: existingPending.mayar_payment_url }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Keep redirect stable to the published app domain
    const siteUrl = "https://absenpintar.lovable.app";
    const redirectUrl = `${siteUrl}/subscription?status=success`;
    console.log("Redirect URL:", redirectUrl);

    const mayarRes = await fetch("https://api.mayar.id/hl/v1/payment/create", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mayarApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Paket ${plan.name} - ${school?.name || "Sekolah"}`,
        amount: plan.price,
        description: `Paket ${plan.name} - (${school?.name || "Sekolah"})`,
        email: user.email || "noemail@school.com",
        mobile: "08000000000",
        redirectUrl,
      }),
    });

    const mayarData = await mayarRes.json();
    if (!mayarRes.ok) {
      console.error("Mayar API error:", mayarData);
      throw new Error(`Mayar API error: ${mayarData?.message || JSON.stringify(mayarData)}`);
    }

    const paymentLink = mayarData?.data;
    if (!paymentLink?.link) {
      throw new Error("Mayar tidak mengembalikan link pembayaran");
    }

    await supabaseAdmin.from("payment_transactions").insert({
      school_id: schoolId,
      plan_id: plan.id,
      amount: plan.price,
      status: "pending",
      mayar_transaction_id: paymentLink?.id || null,
      mayar_payment_url: paymentLink?.link || null,
    });

    return new Response(JSON.stringify({ success: true, payment_url: paymentLink.link }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-mayar-payment error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
