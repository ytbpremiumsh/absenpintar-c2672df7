

## Menggabungkan Kamera Barcode + Face Recognition

### Konsep
Saat ini barcode scan dan face recognition menggunakan **tab terpisah** dengan **kamera terpisah**. Rencana ini menggabungkan keduanya menjadi **satu kamera** yang secara simultan:
- Scan barcode via jsQR (setiap 300ms)
- Scan wajah via edge function (setiap 4 detik)

Kamera belakang digunakan utama (fallback ke depan). Jika paket sekolah tidak Premium, hanya barcode yang aktif.

### Perubahan

**File: `src/pages/ScanQR.tsx`**

1. **Hapus sistem tab** — ganti dengan satu tombol "Aktifkan Kamera" yang membuka satu stream video
2. **Gabungkan logic** — satu `videoRef`, satu `streamRef`, satu `cameraActive` state
3. **Jalankan keduanya bersamaan:**
   - Interval barcode scan (300ms) tetap berjalan seperti sekarang
   - Interval face recognition (4 detik) berjalan paralel **hanya jika** `features.canFaceRecognition === true`
4. **UI indikator** — tampilkan badge/status di bawah kamera menunjukkan mode aktif: "Barcode + Face Recognition" atau "Barcode Only"
5. **Deteksi method** — ketika barcode terdeteksi duluan, set `scanMethod = "barcode"`. Ketika wajah terdeteksi duluan, set `scanMethod = "face"`
6. **Input NIS manual** tetap tersedia di bawah kamera
7. **Hapus state duplikat** — `faceVideoRef`, `faceStreamRef`, `faceCamera`, `faceCameraError` tidak lagi diperlukan karena menggunakan satu kamera

### Alur User
1. Klik "Aktifkan Kamera" → satu kamera terbuka
2. Arahkan ke barcode → terdeteksi otomatis via jsQR
3. Atau arahkan ke wajah siswa → terdeteksi otomatis via face recognition (Premium only)
4. Dialog konfirmasi muncul → klik "Hadir"
5. Selesai, kamera siap scan berikutnya

### Detail Teknis
- Kamera preferensi: `environment` (belakang) dengan fallback `user` (depan)
- Face recognition hanya aktif jika `features.canFaceRecognition` dan `!features.loading`
- Kedua interval di-pause saat `scanPaused.current = true` (siswa ditemukan)
- Cleanup: stop semua interval dan stream saat unmount

