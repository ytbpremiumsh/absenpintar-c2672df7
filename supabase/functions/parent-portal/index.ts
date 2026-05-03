// Parent Dashboard API — handles login (WA OTP), session validation, and data access.
// verify_jwt = false because parents do not have Supabase auth users; we use custom session tokens.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-parent-token",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status: 200, // always 200 to avoid frontend non-2xx crash
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const normalizePhone = (raw: string) => {
  let p = (raw || "").replace(/\D/g, "");
  if (p.startsWith("0")) p = "62" + p.slice(1);
  if (p.startsWith("8")) p = "62" + p;
  return p;
};

const genToken = () => {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
};

const genOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

async function findStudentsByPhone(phone: string) {
  const { data } = await supabase
    .from("students")
    .select("id, name, student_id, class, photo_url, gender, school_id, parent_name, schools(id, name, logo)")
    .eq("parent_phone", phone);
  return data || [];
}

async function getSession(req: Request) {
  const token = req.headers.get("x-parent-token");
  if (!token) return null;
  const { data } = await supabase
    .from("parent_sessions")
    .select("phone, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return { phone: data.phone, token };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || (await req.clone().json().catch(() => ({}))).action;
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    // ---- Public actions ----
    if (action === "request_otp") {
      const phone = normalizePhone(body.phone || "");
      if (!phone || phone.length < 10) return json({ error: "Nomor tidak valid" });
      const students = await findStudentsByPhone(phone);
      if (students.length === 0) {
        return json({ error: "Nomor tidak terdaftar di sekolah manapun. Hubungi admin sekolah." });
      }
      const otp = genOtp();
      await supabase.from("parent_otps").insert({ phone, otp_code: otp });

      // Send via send-whatsapp using first student's school
      const schoolId = students[0].school_id;
      const message = `Kode login Wali Murid ATSkolla Anda: *${otp}*\n\nBerlaku 5 menit. Jangan bagikan kode ini kepada siapapun.`;
      try {
        await supabase.functions.invoke("send-whatsapp", {
          body: { school_id: schoolId, phone, message, message_type: "parent_otp" },
        });
      } catch (e) {
        console.error("send wa otp failed", e);
      }
      return json({ ok: true, phone, students_count: students.length });
    }

    if (action === "verify_otp") {
      const phone = normalizePhone(body.phone || "");
      const code = String(body.otp || "").trim();
      if (!phone || !code) return json({ error: "Data tidak lengkap" });
      const { data: otps } = await supabase
        .from("parent_otps")
        .select("id, expires_at, used")
        .eq("phone", phone)
        .eq("otp_code", code)
        .order("created_at", { ascending: false })
        .limit(1);
      const otp = otps?.[0];
      if (!otp) return json({ error: "Kode salah" });
      if (otp.used) return json({ error: "Kode sudah digunakan" });
      if (new Date(otp.expires_at).getTime() < Date.now()) return json({ error: "Kode kedaluwarsa" });
      await supabase.from("parent_otps").update({ used: true }).eq("id", otp.id);

      const token = genToken();
      await supabase.from("parent_sessions").insert({ token, phone });
      return json({ ok: true, token, phone });
    }

    // ---- Authenticated actions ----
    const session = await getSession(req);
    if (!session) return json({ error: "Sesi tidak valid", code: "UNAUTH" });

    if (action === "logout") {
      await supabase.from("parent_sessions").delete().eq("token", session.token);
      return json({ ok: true });
    }

    if (action === "me") {
      const students = await findStudentsByPhone(session.phone);
      return json({ ok: true, phone: session.phone, students });
    }

    const studentId: string = body.student_id;
    if (!studentId) return json({ error: "student_id wajib" });

    // Verify student belongs to phone
    const { data: studentRow } = await supabase
      .from("students")
      .select("id, name, class, school_id, parent_phone")
      .eq("id", studentId)
      .maybeSingle();
    if (!studentRow || studentRow.parent_phone !== session.phone) {
      return json({ error: "Akses ditolak untuk siswa ini" });
    }
    const schoolId = studentRow.school_id;

    if (action === "attendance") {
      const fromDate = body.from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const toDate = body.to || new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("attendance_logs")
        .select("id, date, time, status, attendance_type, method, notes")
        .eq("student_id", studentId)
        .gte("date", fromDate)
        .lte("date", toDate)
        .order("date", { ascending: false })
        .order("time", { ascending: false });
      return json({ ok: true, attendance: data || [] });
    }

    if (action === "schedule") {
      // Today's class teaching schedule (if teaching_schedules exists)
      const today = new Date();
      const dow = today.getDay(); // 0=Sun
      const { data } = await supabase
        .from("teaching_schedules")
        .select("id, day_of_week, start_time, end_time, room, subjects(name, color), profiles(full_name)")
        .eq("school_id", schoolId)
        .eq("class_name", studentRow.class)
        .eq("day_of_week", dow)
        .order("start_time");
      return json({ ok: true, schedule: data || [], day_of_week: dow });
    }

    if (action === "announcements") {
      const { data } = await supabase
        .from("school_announcements")
        .select("id, title, message, type, is_pinned, created_at")
        .eq("school_id", schoolId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);
      return json({ ok: true, announcements: data || [] });
    }

    if (action === "submit_leave") {
      const type = body.type === "sakit" ? "sakit" : "izin";
      const date = body.date || new Date().toISOString().slice(0, 10);
      const reason = (body.reason || "").toString().slice(0, 500);
      if (!reason) return json({ error: "Alasan wajib diisi" });
      const { data, error } = await supabase
        .from("parent_leave_requests")
        .insert({
          school_id: schoolId,
          student_id: studentId,
          parent_phone: session.phone,
          type,
          date,
          reason,
        })
        .select()
        .single();
      if (error) return json({ error: error.message });
      return json({ ok: true, request: data });
    }

    if (action === "list_leaves") {
      const { data } = await supabase
        .from("parent_leave_requests")
        .select("id, type, date, reason, status, review_note, created_at, reviewed_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(50);
      return json({ ok: true, leaves: data || [] });
    }

    if (action === "grades") {
      const { data } = await supabase
        .from("student_grades")
        .select("id, subject, semester, school_year, term, score, note")
        .eq("student_id", studentId)
        .order("school_year", { ascending: false })
        .order("semester", { ascending: false })
        .order("subject");
      return json({ ok: true, grades: data || [] });
    }

    if (action === "list_messages") {
      const { data } = await supabase
        .from("parent_messages")
        .select("id, sender_type, message, read_at, created_at")
        .eq("student_id", studentId)
        .eq("parent_phone", session.phone)
        .order("created_at", { ascending: true })
        .limit(200);
      // Mark teacher messages as read
      await supabase
        .from("parent_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("student_id", studentId)
        .eq("parent_phone", session.phone)
        .eq("sender_type", "teacher")
        .is("read_at", null);
      return json({ ok: true, messages: data || [] });
    }

    if (action === "send_message") {
      const message = (body.message || "").toString().slice(0, 1000);
      if (!message.trim()) return json({ error: "Pesan kosong" });
      const { data, error } = await supabase
        .from("parent_messages")
        .insert({
          school_id: schoolId,
          student_id: studentId,
          parent_phone: session.phone,
          sender_type: "parent",
          message,
        })
        .select()
        .single();
      if (error) return json({ error: error.message });
      return json({ ok: true, message: data });
    }

    return json({ error: "Action tidak dikenal" });
  } catch (e) {
    console.error("parent-portal error", e);
    return json({ error: (e as Error).message });
  }
});
