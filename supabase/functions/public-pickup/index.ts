import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { school_id, student_id, pickup_by } = await req.json();

    if (!school_id || !student_id) {
      return new Response(JSON.stringify({ error: "school_id and student_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify student belongs to school
    const { data: student, error: studentErr } = await supabase
      .from("students")
      .select("id, name, class")
      .eq("id", student_id)
      .eq("school_id", school_id)
      .maybeSingle();

    if (studentErr || !student) {
      return new Response(JSON.stringify({ error: "Student not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already picked up today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: existingLog } = await supabase
      .from("pickup_logs")
      .select("id")
      .eq("student_id", student_id)
      .eq("school_id", school_id)
      .gte("pickup_time", today.toISOString())
      .maybeSingle();

    if (existingLog) {
      return new Response(JSON.stringify({ error: "Siswa sudah dijemput hari ini" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insertErr } = await supabase.from("pickup_logs").insert({
      school_id,
      student_id,
      pickup_by: pickup_by || "Wali Murid (Publik)",
      status: "picked_up",
    });

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, student }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
