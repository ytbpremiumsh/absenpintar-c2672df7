import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { school_id, student_code, student_id, method } = await req.json();

    if (!school_id || (!student_code && !student_id)) {
      return new Response(JSON.stringify({ error: "school_id dan student_code/student_id diperlukan" }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Look up student
    let student;
    if (student_id) {
      const { data } = await supabase
        .from('students').select('*').eq('id', student_id).eq('school_id', school_id).single();
      student = data;
    } else {
      const trimmed = student_code.trim();
      const { data } = await supabase
        .from('students').select('*').eq('school_id', school_id)
        .or(`student_id.eq.${trimmed},qr_code.eq.${trimmed}`).maybeSingle();
      student = data;
    }

    if (!student) {
      return new Response(JSON.stringify({ error: "Siswa tidak ditemukan" }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const today = new Date().toISOString().slice(0, 10);

    // Check if already recorded
    const { data: existing } = await supabase.from('attendance_logs')
      .select('id').eq('student_id', student.id).eq('date', today).maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ 
        error: "already_recorded", 
        message: `${student.name} sudah tercatat absensi hari ini`,
        student: { id: student.id, name: student.name, class: student.class, student_id: student.student_id, photo_url: student.photo_url }
      }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert attendance
    const now = new Date();
    const { error: insertError } = await supabase.from('attendance_logs').insert({
      school_id,
      student_id: student.id,
      date: today,
      time: now.toTimeString().slice(0, 8),
      method: method || 'barcode',
      status: 'hadir',
      recorded_by: 'Scan Publik',
    });

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send WhatsApp notification (fire-and-forget)
    if (student.parent_phone) {
      try {
        const waUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp`;
        await fetch(waUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            school_id,
            phone: student.parent_phone,
            message: `📋 *Notifikasi Absensi*\n\nAnanda *${student.name}* (Kelas ${student.class}) telah tercatat hadir pada pukul ${now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}.\n\nMetode: ${method === 'face_recognition' ? 'Face Recognition' : 'Barcode Scan'}\n\n_Pesan otomatis dari Smart School Attendance System_`,
          }),
        });
      } catch { /* ignore WA errors */ }
    }

    return new Response(JSON.stringify({
      success: true,
      student: { id: student.id, name: student.name, class: student.class, student_id: student.student_id, photo_url: student.photo_url },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
