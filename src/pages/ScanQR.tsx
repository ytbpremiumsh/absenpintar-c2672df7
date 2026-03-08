import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScanLine, CheckCircle2, Camera, Search, ShieldCheck, X, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";
import { motion } from "framer-motion";
import { toast } from "sonner";
import jsQR from "jsqr";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

interface FoundStudent {
  id: string;
  name: string;
  class: string;
  student_id: string;
  parent_name: string;
  parent_phone: string;
  photo_url: string | null;
}

interface SchoolHours {
  school_start_time: string | null;
  school_end_time: string | null;
}

const ScanQR = () => {
  const { profile } = useAuth();
  const features = useSubscriptionFeatures();
  const [manualCode, setManualCode] = useState("");
  const [scannedStudent, setScannedStudent] = useState<FoundStudent | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [schoolHours, setSchoolHours] = useState<SchoolHours>({ school_start_time: null, school_end_time: null });
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const isLookingUp = useRef(false);
  const scanPaused = useRef(false);

  // Fetch school hours
  useEffect(() => {
    if (!profile?.school_id) return;
    supabase.from("pickup_settings").select("school_start_time, school_end_time")
      .eq("school_id", profile.school_id).maybeSingle()
      .then(({ data }) => {
        if (data) setSchoolHours(data as any);
      });
  }, [profile?.school_id]);

  const isPickupTime = useCallback(() => {
    if (!schoolHours.school_end_time) return true;
    const now = new Date();
    const [h, m] = schoolHours.school_end_time.split(":").map(Number);
    const endTime = new Date();
    endTime.setHours(h, m, 0, 0);
    // Allow pickup 30 min before end time
    const earlyTime = new Date(endTime.getTime() - 30 * 60 * 1000);
    return now >= earlyTime;
  }, [schoolHours.school_end_time]);

  const getCurrentTimeStatus = () => {
    if (!schoolHours.school_start_time || !schoolHours.school_end_time) return null;
    const now = new Date();
    const [sh, sm] = schoolHours.school_start_time.split(":").map(Number);
    const [eh, em] = schoolHours.school_end_time.split(":").map(Number);
    const startTime = new Date(); startTime.setHours(sh, sm, 0, 0);
    const endTime = new Date(); endTime.setHours(eh, em, 0, 0);
    
    if (now < startTime) return { label: "Belum Masuk", color: "text-muted-foreground", bg: "bg-muted" };
    if (now >= startTime && now < endTime) return { label: "Jam Sekolah", color: "text-primary", bg: "bg-primary/10" };
    return { label: "Waktu Pulang", color: "text-success", bg: "bg-success/10" };
  };

  const timeStatus = getCurrentTimeStatus();

  const lookupStudent = useCallback(async (code: string) => {
    if (!code.trim() || !profile?.school_id || isLookingUp.current || scanPaused.current) return;
    isLookingUp.current = true;
    try {
      const trimmed = code.trim();
      const { data, error } = await supabase
        .from("students").select("*").eq("school_id", profile.school_id)
        .or(`student_id.eq.${trimmed},qr_code.eq.${trimmed}`).maybeSingle();
      if (error || !data) { toast.error("Siswa tidak ditemukan untuk kode: " + trimmed); return; }
      setScannedStudent(data);
      setConfirmed(false);
      scanPaused.current = true;
    } finally { isLookingUp.current = false; }
  }, [profile?.school_id]);

  const startScanning = useCallback(() => {
    if (scanIntervalRef.current) return;
    scanIntervalRef.current = window.setInterval(() => {
      if (scanPaused.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
      if (qrCode?.data) lookupStudent(qrCode.data);
    }, 300);
  }, [lookupStudent]);

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.onloadedmetadata = () => {
        video.play().then(() => startScanning()).catch(err => console.error("Video play error:", err));
      };
    }
  }, [cameraActive, startScanning]);

  const startCamera = async () => {
    setCameraError("");
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } } });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } });
      }
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err: any) {
      if (err.name === "NotAllowedError") setCameraError("Izin kamera ditolak. Berikan izin kamera di pengaturan browser.");
      else setCameraError("Gagal mengakses kamera: " + (err.message || "Unknown error"));
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    scanPaused.current = false;
  };

  useEffect(() => { return () => stopCamera(); }, []);

  const handleSearch = () => { scanPaused.current = false; lookupStudent(manualCode); };

  const handleConfirm = async () => {
    if (!scannedStudent || !profile?.school_id) return;
    setProcessing(true);
    const { error } = await supabase.from("pickup_logs").insert({
      school_id: profile.school_id, student_id: scannedStudent.id,
      pickup_by: profile.full_name || "Petugas", status: "picked_up",
    });
    setProcessing(false);
    if (error) { toast.error("Gagal memproses kepulangan: " + error.message); return; }
    setConfirmed(true);
    toast.success(`${scannedStudent.name} berhasil ditandai pulang!`);

    if (scannedStudent.parent_phone) {
      // Fetch custom message template from school integration
      const now = new Date();
      const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      const defaultTemplate = `📢 *Notifikasi Penjemputan*\n\nAnanda *{student_name}* (Kelas {class}) telah dijemput pada pukul {time}.\n\nDijemput oleh: {pickup_by}\n\n_Pesan otomatis dari Smart School Pickup System_`;

      let template = defaultTemplate;
      try {
        const { data: integration } = await supabase
          .from("school_integrations")
          .select("message_template")
          .eq("school_id", profile.school_id)
          .eq("integration_type", "onesender")
          .eq("is_active", true)
          .maybeSingle();
        if (integration?.message_template) {
          template = integration.message_template;
        }
      } catch {}

      const msg = template
        .replace(/{student_name}/g, scannedStudent.name)
        .replace(/{class}/g, scannedStudent.class)
        .replace(/{time}/g, timeStr)
        .replace(/{pickup_by}/g, profile.full_name || "Petugas")
        .replace(/{parent_name}/g, scannedStudent.parent_name)
        .replace(/{student_id}/g, scannedStudent.student_id);

      supabase.functions.invoke("send-whatsapp", {
        body: { phone: scannedStudent.parent_phone, message: msg, school_id: profile.school_id },
      }).then((res) => {
        if (res.data && (res.data as any).success) toast.success("Notifikasi WhatsApp terkirim ke orang tua");
      }).catch(() => {});
    }

    setTimeout(() => {
      setScannedStudent(null);
      setConfirmed(false);
      setManualCode("");
      scanPaused.current = false;
    }, 2000);
  };

  const handleCancel = () => {
    setScannedStudent(null);
    setConfirmed(false);
    setManualCode("");
    scanPaused.current = false;
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-lg mx-auto px-1">
      <div className="text-center">
        <h1 className="text-xl sm:text-2xl font-bold">Scan QR / Input NIS</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">Scan kartu QR siswa atau masukkan NIS</p>
      </div>

      {/* School Hours Status */}
      {timeStatus && (
        <div className={`flex items-center justify-center gap-2 py-2 px-4 rounded-xl ${timeStatus.bg}`}>
          <Clock className={`h-4 w-4 ${timeStatus.color}`} />
          <span className={`text-sm font-semibold ${timeStatus.color}`}>{timeStatus.label}</span>
          <span className="text-xs text-muted-foreground">
            ({schoolHours.school_start_time?.slice(0,5)} - {schoolHours.school_end_time?.slice(0,5)})
          </span>
          {!isPickupTime() && (
            <span className="text-[10px] text-warning font-medium ml-1">⚠ Belum waktunya pulang</span>
          )}
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {/* Camera Scanner */}
      <Card className="shadow-card border-0 overflow-hidden">
        <CardContent className="p-0">
          {cameraActive ? (
            <>
              <div className="relative bg-black" style={{ minHeight: 260 }}>
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted
                  // @ts-ignore
                  webkit-playsinline="true" style={{ minHeight: 260, WebkitTransform: "scaleX(1)" }} />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={`w-44 h-44 border-2 rounded-lg transition-colors ${scanPaused.current ? "border-success opacity-100" : "border-primary opacity-70"}`} />
                </div>
                <div className="absolute bottom-2 left-0 right-0 text-center">
                  <span className="text-xs text-white/80 bg-black/50 px-2 py-1 rounded">
                    {scanPaused.current ? "✓ QR Terdeteksi" : "Arahkan ke QR Code..."}
                  </span>
                </div>
              </div>
              <div className="p-2 flex justify-center">
                <Button variant="outline" size="sm" onClick={stopCamera}>
                  <X className="h-4 w-4 mr-1" /> Tutup Kamera
                </Button>
              </div>
            </>
          ) : (
            <div className="aspect-video bg-foreground/5 flex flex-col items-center justify-center gap-3 p-4">
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl gradient-primary flex items-center justify-center">
                <Camera className="h-7 w-7 sm:h-8 sm:w-8 text-primary-foreground" />
              </div>
              {cameraError && <p className="text-destructive text-xs sm:text-sm text-center px-4">{cameraError}</p>}
              <Button onClick={startCamera} className="gradient-primary hover:opacity-90">
                <Camera className="h-4 w-4 mr-2" /> Aktifkan Kamera
              </Button>
              <p className="text-[11px] sm:text-xs text-muted-foreground">Atau gunakan input NIS manual di bawah</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual NIS input */}
      <Card className="shadow-card border-0">
        <CardContent className="p-3 sm:p-4">
          <p className="text-sm font-semibold mb-2">Input NIS Manual</p>
          <div className="flex gap-2">
            <Input placeholder="Masukkan NIS (cth: STD001)" value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="h-10 sm:h-11 text-sm" />
            <Button onClick={handleSearch} className="h-10 sm:h-11 gradient-primary hover:opacity-90 px-4">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {!scannedStudent && (
        <div className="text-center py-6 sm:py-8">
          <ScanLine className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs sm:text-sm text-muted-foreground">Arahkan kamera ke QR Code atau masukkan NIS manual</p>
        </div>
      )}

      {/* POPUP DIALOG for confirmation */}
      <Dialog open={!!scannedStudent && !confirmed} onOpenChange={(open) => { if (!open) handleCancel(); }}>
        <DialogContent className="max-w-[90vw] sm:max-w-md p-0 overflow-hidden">
          <div className="gradient-primary p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
              <DialogTitle className="text-base font-bold text-primary-foreground">Verifikasi Siswa</DialogTitle>
            </div>
            <DialogDescription className="text-primary-foreground/70 text-xs mt-1">
              Konfirmasi kepulangan siswa berikut
            </DialogDescription>
          </div>
          {scannedStudent && (
            <div className="p-5 text-center space-y-4">
              {/* Photo (Premium with canUploadPhoto) */}
              {features.canUploadPhoto && scannedStudent.photo_url ? (
                <img src={scannedStudent.photo_url} alt={scannedStudent.name}
                  className="h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover mx-auto border-4 border-primary/20 shadow-lg" />
              ) : (
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-2xl sm:text-3xl font-bold mx-auto shadow-lg">
                  {scannedStudent.name.charAt(0)}
                </div>
              )}
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground">{scannedStudent.name}</h3>
                <p className="text-sm text-muted-foreground">Kelas: {scannedStudent.class}</p>
                <p className="text-sm text-muted-foreground">NIS: {scannedStudent.student_id}</p>
                <p className="text-sm text-muted-foreground">Wali: {scannedStudent.parent_name}</p>
              </div>

              {!isPickupTime() && (
                <div className="bg-warning/10 border border-warning/20 rounded-lg p-2 text-xs text-warning font-medium">
                  ⚠ Belum waktunya pulang (selesai pukul {schoolHours.school_end_time?.slice(0,5)})
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={handleCancel} className="flex-1 h-11">Batal</Button>
                <Button onClick={handleConfirm} disabled={processing}
                  className="flex-1 h-11 bg-success hover:bg-success/90 text-success-foreground font-semibold">
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Konfirmasi Pulang
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={confirmed && !!scannedStudent} onOpenChange={() => {}}>
        <DialogContent className="max-w-[90vw] sm:max-w-sm border-0 bg-success p-0">
          <div className="p-6 sm:p-8 text-center space-y-3">
            <CheckCircle2 className="h-14 w-14 sm:h-16 sm:w-16 text-success-foreground mx-auto" />
            <DialogTitle className="text-lg sm:text-xl font-bold text-success-foreground">✅ Berhasil Pulang</DialogTitle>
            <DialogDescription className="text-success-foreground/90 space-y-0.5 text-sm">
              <p><strong>{scannedStudent?.name}</strong></p>
              <p>Kelas: {scannedStudent?.class}</p>
            </DialogDescription>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScanQR;
