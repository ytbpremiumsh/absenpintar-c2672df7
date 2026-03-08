import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const schoolId = url.searchParams.get("school_id");
    const filterClass = url.searchParams.get("class");

    if (!schoolId) {
      return new Response(JSON.stringify({ error: "school_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let studentsQuery = supabase
      .from("students")
      .select("id, name, class, parent_name, student_id")
      .eq("school_id", schoolId)
      .order("class")
      .order("name");

    if (filterClass) {
      studentsQuery = studentsQuery.eq("class", filterClass);
    }

    const [studentsRes, logsRes, schoolRes, settingsRes] = await Promise.all([
      studentsQuery,
      supabase.from("pickup_logs").select("student_id, pickup_time, pickup_by").eq("school_id", schoolId).gte("pickup_time", today.toISOString()),
      supabase.from("schools").select("name, logo").eq("id", schoolId).single(),
      supabase.from("pickup_settings").select("is_active, auto_activate_time, auto_deactivate_time").eq("school_id", schoolId).maybeSingle(),
    ]);

    const students = studentsRes.data || [];
    const logs = logsRes.data || [];
    const school = schoolRes.data;
    const settings = settingsRes.data;

    const result = students.map((s) => {
      const log = logs.find((l) => l.student_id === s.id);
      return {
        ...s,
        status: log ? "picked_up" : "waiting",
        pickup_time: log?.pickup_time || null,
        pickup_by: log?.pickup_by || null,
      };
    });

    const grouped: Record<string, typeof result> = {};
    for (const s of result) {
      if (!grouped[s.class]) grouped[s.class] = [];
      grouped[s.class].push(s);
    }

    const pickedCount = result.filter((s) => s.status === "picked_up").length;

    return new Response(
      JSON.stringify({
        school,
        classes: grouped,
        total: students.length,
        picked_up: pickedCount,
        settings: settings || { is_active: true, auto_activate_time: "14:00:00", auto_deactivate_time: "17:00:00" },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
