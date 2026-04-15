const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    // Get current day_of_week (0=Mon, 6=Sun for the app)
    const jsDay = now.getDay();
    const dayIdx = jsDay === 0 ? 6 : jsDay - 1;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const targetMinutes = currentMinutes + 15;

    // Format target time as HH:MM
    const targetHour = Math.floor(targetMinutes / 60);
    const targetMin = targetMinutes % 60;
    const targetTime = `${String(targetHour).padStart(2, "0")}:${String(targetMin).padStart(2, "0")}`;

    // Find schedules starting at target time (±2 min window)
    const { data: schedules } = await supabase
      .from("teaching_schedules")
      .select("id, teacher_id, subject_id, class_id, start_time, end_time, room, school_id")
      .eq("day_of_week", dayIdx)
      .eq("is_active", true)
      .gte("start_time", `${String(targetHour).padStart(2, "0")}:${String(Math.max(0, targetMin - 2)).padStart(2, "0")}`)
      .lte("start_time", `${String(targetHour).padStart(2, "0")}:${String(Math.min(59, targetMin + 2)).padStart(2, "0")}`);

    if (!schedules || schedules.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No schedules to remind" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by school
    const schoolIds = [...new Set(schedules.map((s) => s.school_id))];

    // Get integrations for schools with reminder enabled
    const { data: integrations } = await supabase
      .from("school_integrations")
      .select("school_id, teaching_reminder_enabled, teaching_reminder_template, gateway_type, mpwa_api_key, mpwa_sender, api_key, api_url")
      .in("school_id", schoolIds)
      .eq("teaching_reminder_enabled", true)
      .eq("is_active", true);

    if (!integrations || integrations.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No schools with reminder enabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const enabledSchoolIds = integrations.map((i) => i.school_id);
    const relevantSchedules = schedules.filter((s) => enabledSchoolIds.includes(s.school_id));

    // Get teacher profiles, subjects, classes
    const teacherIds = [...new Set(relevantSchedules.map((s) => s.teacher_id))];
    const subjectIds = [...new Set(relevantSchedules.map((s) => s.subject_id))];
    const classIds = [...new Set(relevantSchedules.map((s) => s.class_id))];

    const [teachersRes, subjectsRes, classesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, phone").in("user_id", teacherIds),
      supabase.from("subjects").select("id, name").in("id", subjectIds),
      supabase.from("classes").select("id, name").in("id", classIds),
    ]);

    const teacherMap = Object.fromEntries((teachersRes.data || []).map((t) => [t.user_id, t]));
    const subjectMap = Object.fromEntries((subjectsRes.data || []).map((s) => [s.id, s]));
    const classMap = Object.fromEntries((classesRes.data || []).map((c) => [c.id, c]));
    const integrationMap = Object.fromEntries(integrations.map((i) => [i.school_id, i]));

    let sent = 0;
    for (const schedule of relevantSchedules) {
      const teacher = teacherMap[schedule.teacher_id];
      const subject = subjectMap[schedule.subject_id];
      const cls = classMap[schedule.class_id];
      const integration = integrationMap[schedule.school_id];

      if (!teacher?.phone || !integration) continue;

      const template = integration.teaching_reminder_template || "";
      const message = template
        .replace(/\{teacher_name\}/g, teacher.full_name || "")
        .replace(/\{subject_name\}/g, subject?.name || "")
        .replace(/\{class_name\}/g, cls?.name || "")
        .replace(/\{start_time\}/g, schedule.start_time?.slice(0, 5) || "")
        .replace(/\{end_time\}/g, schedule.end_time?.slice(0, 5) || "")
        .replace(/\{room\}/g, schedule.room || "-");

      // Send via MPWA
      if (integration.gateway_type === "mpwa" && integration.mpwa_api_key && integration.mpwa_sender) {
        try {
          const phone = teacher.phone.replace(/\D/g, "").replace(/^0/, "62");
          await fetch(`${supabaseUrl}/functions/v1/mpwa-proxy`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({
              school_id: schedule.school_id,
              phone,
              message,
            }),
          });
          sent++;
        } catch (e) {
          console.error("Failed to send reminder:", e);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, sent, total: relevantSchedules.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Teaching reminder error:", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
