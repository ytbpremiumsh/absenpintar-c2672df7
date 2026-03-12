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

    // Get attendance time settings
    const { data: settings } = await supabase
      .from('pickup_settings')
      .select('attendance_start_time, attendance_end_time, departure_start_time, departure_end_time')
      .eq('school_id', school_id)
      .maybeSingle();

    const now = new Date();
    const jakartaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const currentTime = jakartaTime.toTimeString().slice(0, 8);
    const today = jakartaTime.getFullYear() + '-' + String(jakartaTime.getMonth() + 1).padStart(2, '0') + '-' + String(jakartaTime.getDate()).padStart(2, '0');

    const attStart = settings?.attendance_start_time || '06:00:00';
    const attEnd = settings?.attendance_end_time || '12:00:00';
    const depStart = settings?.departure_start_time || '12:00:00';
    const depEnd = settings?.departure_end_time || '17:00:00';

    let attendance_type: string;
    if (currentTime >= attStart && currentTime < attEnd) {
      attendance_type = 'datang';
    } else if (currentTime >= depStart && currentTime <= depEnd) {
      attendance_type = 'pulang';
    } else if (currentTime < attStart) {
      attendance_type = 'datang';
    } else {
      attendance_type = 'pulang';
    }

    // Check if already recorded for this type today
    const { data: existing } = await supabase.from('attendance_logs')
      .select('id').eq('student_id', student.id).eq('date', today).eq('attendance_type', attendance_type).maybeSingle();

    if (existing) {
      const typeLabel = attendance_type === 'datang' ? 'Datang' : 'Pulang';
      return new Response(JSON.stringify({ 
        error: "already_recorded", 
        message: `${student.name} sudah tercatat absensi ${typeLabel} hari ini`,
        student: { id: student.id, name: student.name, class: student.class, student_id: student.student_id, photo_url: student.photo_url },
        attendance_type,
      }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert attendance
    const methodLabel = method === 'face_recognition' ? 'Face Recognition' : method === 'rfid' ? 'Kartu RFID' : 'Barcode Scan';
    const { error: insertError } = await supabase.from('attendance_logs').insert({
      school_id,
      student_id: student.id,
      date: today,
      time: currentTime,
      method: method || 'barcode',
      status: 'hadir',
      recorded_by: 'Scan Publik',
      attendance_type,
    });

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send WhatsApp notification using stored template
    if (student.parent_phone) {
      try {
        // Fetch integration with templates + school name
        const [integrationRes, schoolRes] = await Promise.all([
          supabase
            .from('school_integrations')
            .select('attendance_arrive_template, attendance_depart_template, is_active')
            .eq('school_id', school_id)
            .eq('integration_type', 'onesender')
            .eq('is_active', true)
            .maybeSingle(),
          supabase
            .from('schools')
            .select('name')
            .eq('id', school_id)
            .single(),
        ]);

        const integration = integrationRes.data;
        const schoolName = schoolRes.data?.name || '';

        const timeStr = jakartaTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
        const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const dayName = dayNames[jakartaTime.getDay()];

        const applyReplacements = (tpl: string) =>
          tpl
            .replace(/\{student_name\}/g, student.name)
            .replace(/\{class\}/g, student.class)
            .replace(/\{time\}/g, timeStr)
            .replace(/\{day\}/g, dayName)
            .replace(/\{student_id\}/g, student.student_id)
            .replace(/\{method\}/g, methodLabel)
            .replace(/\{parent_name\}/g, student.parent_name || '')
            .replace(/\{school_name\}/g, schoolName);

        let message: string;
        if (integration) {
          const template = attendance_type === 'datang'
            ? (integration.attendance_arrive_template || '')
            : (integration.attendance_depart_template || '');

          if (template) {
            message = applyReplacements(template);
          } else {
            const typeLabel = attendance_type === 'datang' ? 'Datang (Hadir)' : 'Pulang';
            message = `📋 *Notifikasi Absensi ${typeLabel}*\n\n${schoolName}\n\nAnanda *${student.name}* (Kelas ${student.class}) telah tercatat ${typeLabel.toLowerCase()} pada ${dayName}, pukul ${timeStr}.\n\nMetode: ${methodLabel}\n\n_Pesan otomatis dari Smart School Attendance System_`;
          }
        } else {
          const typeLabel = attendance_type === 'datang' ? 'Datang (Hadir)' : 'Pulang';
          message = `📋 *Notifikasi Absensi ${typeLabel}*\n\n${schoolName}\n\nAnanda *${student.name}* (Kelas ${student.class}) telah tercatat ${typeLabel.toLowerCase()} pada ${dayName}, pukul ${timeStr}.\n\nMetode: ${methodLabel}\n\n_Pesan otomatis dari Smart School Attendance System_`;
        }

        const waUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp`;
        await fetch(waUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({ school_id, phone: student.parent_phone, message }),
        });
      } catch { /* ignore WA errors */ }
    }

    return new Response(JSON.stringify({
      success: true,
      student: { id: student.id, name: student.name, class: student.class, student_id: student.student_id, photo_url: student.photo_url },
      attendance_type,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
