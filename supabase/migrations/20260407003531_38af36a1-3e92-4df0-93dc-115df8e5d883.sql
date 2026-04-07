
UPDATE subscription_plans SET features = '["Maks 2 kelas","Maks 20 siswa","Monitoring realtime","Scan QR Code"]'::jsonb WHERE name = 'Free';
UPDATE subscription_plans SET features = '["Maks 10 kelas","Maks 200 siswa","Monitoring realtime","Scan QR Code","Import & Export data","Upload foto siswa","Export laporan PDF"]'::jsonb WHERE name = 'Basic';
UPDATE subscription_plans SET features = '["Kelas unlimited","Siswa unlimited","Monitoring realtime","Scan QR Code","Import & Export data","Upload foto siswa","Export laporan PDF","Custom logo sekolah","Notifikasi WhatsApp","Multi staff/operator"]'::jsonb WHERE name = 'School';
UPDATE subscription_plans SET features = '["Kelas unlimited","Siswa unlimited","Monitoring realtime","Scan QR Code","Import & Export data","Upload foto siswa","Export laporan PDF","Custom logo sekolah","Notifikasi WhatsApp","Multi staff/operator","Multi cabang sekolah","Face recognition","Prioritas bantuan"]'::jsonb WHERE name = 'Premium';
