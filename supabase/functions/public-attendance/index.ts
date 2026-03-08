import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const school_id = url.searchParams.get("school_id");
    if (!school_id) {
      return new Response(JSON.stringify({ error: "school_id is required" }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const today = new Date().toISOString().slice(0, 10);

    const [schoolRes, studentsRes, logsRes] = await Promise.all([
      supabase.from('schools').select('name, logo').eq('id', school_id).single(),
      supabase.from('students').select('id, name, class, student_id, photo_url, parent_name').eq('school_id', school_id).order('class').order('name'),
      supabase.from('attendance_logs').select('id, student_id, time, status, method, created_at').eq('school_id', school_id).eq('date', today).order('created_at', { ascending: false }),
    ]);

    if (schoolRes.error || !schoolRes.data) {
      return new Response(JSON.stringify({ error: "Sekolah tidak ditemukan" }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const students = studentsRes.data || [];
    const logs = logsRes.data || [];

    // Build per-class data
    const classes: Record<string, any[]> = {};
    for (const s of students) {
      if (!classes[s.class]) classes[s.class] = [];
      const log = logs.find((l: any) => l.student_id === s.id);
      classes[s.class].push({
        id: s.id,
        name: s.name,
        student_id: s.student_id,
        photo_url: s.photo_url,
        status: log?.status || "belum",
        time: log?.time || null,
        method: log?.method || null,
      });
    }

    // Build live feed (recent 50)
    const liveFeed = logs.slice(0, 50).map((log: any) => {
      const student = students.find((s: any) => s.id === log.student_id);
      return {
        id: log.id,
        student_name: student?.name || "Unknown",
        student_class: student?.class || "",
        student_id: student?.student_id || "",
        photo_url: student?.photo_url || null,
        status: log.status,
        method: log.method,
        time: log.time,
        created_at: log.created_at,
      };
    });

    const totalStudents = students.length;
    const totalHadir = logs.filter((l: any) => l.status === "hadir").length;
    const totalIzin = logs.filter((l: any) => l.status === "izin").length;
    const totalSakit = logs.filter((l: any) => l.status === "sakit").length;
    const totalAlfa = logs.filter((l: any) => l.status === "alfa").length;
    const totalBelum = totalStudents - (totalHadir + totalIzin + totalSakit + totalAlfa);

    return new Response(JSON.stringify({
      school: schoolRes.data,
      classes,
      liveFeed,
      stats: { total: totalStudents, hadir: totalHadir, izin: totalIzin, sakit: totalSakit, alfa: totalAlfa, belum: totalBelum },
      date: today,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
