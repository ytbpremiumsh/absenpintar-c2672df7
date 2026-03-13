ALTER TABLE public.school_integrations 
  ADD COLUMN IF NOT EXISTS attendance_group_template text DEFAULT '📋 *Notifikasi Absensi {type}*

{school_name}

Siswa *{student_name}* (Kelas {class}) telah tercatat {type} pada {day}, pukul {time}.

Metode: {method}

_Pesan otomatis dari Smart School Attendance System_',
  ADD COLUMN IF NOT EXISTS wa_delivery_target text DEFAULT 'parent_only',
  ADD COLUMN IF NOT EXISTS wa_enabled boolean DEFAULT true;