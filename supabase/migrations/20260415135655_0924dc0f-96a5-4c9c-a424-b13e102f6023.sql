
ALTER TABLE public.school_integrations
ADD COLUMN IF NOT EXISTS teaching_reminder_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS teaching_reminder_template text DEFAULT '📋 *Pengingat Jadwal Mengajar*

Bapak/Ibu *{teacher_name}*,

Mata pelajaran *{subject_name}* untuk kelas *{class_name}* akan dimulai dalam 15 menit.

Waktu: {start_time} - {end_time}
Ruangan: {room}

_Pesan otomatis dari ATSkolla_';
