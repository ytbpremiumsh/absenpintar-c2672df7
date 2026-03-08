import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScanLine, CheckCircle2, Camera, Search, ShieldCheck, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import jsQR from "jsqr";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
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

const ScanQR = () => {
  const { profile } = useAuth();
  const [manualCode, setManualCode] = useState("");
  const [scannedStudent, setScannedStudent] = useState<FoundStudent | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [successPopup, setSuccessPopup] = useState<FoundStudent | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const isLookingUp = useRef(false);
  const scanPaused = useRef(false);

  const lookupStudent = useCallback(async (code: string) => {
    if (!code.trim() || !profile?.school_id || isLookingUp.current || scanPaused.current) return;
    isLookingUp.current = true;

    try {
      const trimmed = code.trim();
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("school_id", profile.school_id)
        .or(`student_id.eq.${trimmed},qr_code.eq.${trimmed}`)
        .maybeSingle();

      if (error || !data) {
        toast.error("Siswa tidak ditemukan untuk kode: " + trimmed);
        return;
      }

      setScannedStudent(data);
      setConfirmed(false);
      scanPaused.current = true;
    } finally {
      isLookingUp.current = false;
    }
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
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (qrCode?.data) {
        lookupStudent(qrCode.data);
      }
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
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } }
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
        });
      }
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err.name === "NotAllowedError") {
        setCameraError("Izin kamera ditolak. Berikan izin kamera di pengaturan browser.");
      } else {
        setCameraError("Gagal mengakses kamera: " + (err.message || "Unknown error"));
      }
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    scanPaused.current = false;
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleSearch = () => {
    scanPaused.current = false;
    lookupStudent(manualCode);
  };

  const handleConfirm = async () => {
    if (!scannedStudent || !profile?.school_id) return;
    setProcessing(true);

    const { error } = await supabase.from("pickup_logs").insert({
      school_id: profile.school_id,
      student_id: scannedStudent.id,
      pickup_by: profile.full_name || "Petugas",
      status: "picked_up",
    });

    setProcessing(false);

    if (error) {
      toast.error("Gagal memproses kepulangan: " + error.message);
      return;
    }

    setConfirmed(true);
    setSuccessPopup(scannedStudent);

    setTimeout(() => {
      setScannedStudent(null);
      setConfirmed(false);
      setManualCode("");
      scanPaused.current = false;
    }, 2000);

    // Auto-close popup after 5 seconds
    setTimeout(() => {
      setSuccessPopup(null);
    }, 5000);
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

      <canvas ref={canvasRef} className="hidden" />

      {/* Camera Scanner */}
      <Card className="shadow-card border-0 overflow-hidden">
        <CardContent className="p-0">
          {cameraActive ? (
            <>
              <div className="relative bg-black" style={{ minHeight: 260 }}>
                {/* @ts-ignore webkit attribute for iOS */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                  // @ts-ignore
                  webkit-playsinline="true"
                  style={{ minHeight: 260, WebkitTransform: "scaleX(1)" }}
                />
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
              {cameraError && (
                <p className="text-destructive text-xs sm:text-sm text-center px-4">{cameraError}</p>
              )}
              <Button onClick={startCamera} className="gradient-primary hover:opacity-90">
                <Camera className="h-4 w-4 mr-2" />
                Aktifkan Kamera
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
            <Input
              placeholder="Masukkan NIS (cth: STD001)"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="h-10 sm:h-11 text-sm"
            />
            <Button onClick={handleSearch} className="h-10 sm:h-11 gradient-primary hover:opacity-90 px-4">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      <AnimatePresence mode="wait">
        {scannedStudent && !confirmed && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
            <Card className="shadow-elevated border-0">
              <CardContent className="p-4 sm:p-6 text-center space-y-3 sm:space-y-4">
                <div className="flex items-center justify-center gap-2 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="text-sm font-semibold">Verifikasi Siswa</span>
                </div>
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xl sm:text-2xl font-bold mx-auto">
                  {scannedStudent.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold">{scannedStudent.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">Kelas: {scannedStudent.class}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">NIS: {scannedStudent.student_id}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Wali: {scannedStudent.parent_name}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCancel} className="flex-1 h-11">
                    Batal
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={processing}
                    className="flex-1 h-11 bg-success hover:bg-success/90 text-success-foreground font-semibold"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Konfirmasi Pulang
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {confirmed && scannedStudent && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <Card className="shadow-elevated border-0 bg-success">
              <CardContent className="p-6 sm:p-8 text-center space-y-2 sm:space-y-3">
                <CheckCircle2 className="h-12 w-12 sm:h-16 sm:w-16 text-success-foreground mx-auto" />
                <h2 className="text-lg sm:text-xl font-bold text-success-foreground">✅ Berhasil Pulang</h2>
                <div className="text-success-foreground/90 space-y-0.5 text-xs sm:text-sm">
                  <p><strong>{scannedStudent.name}</strong></p>
                  <p>Kelas: {scannedStudent.class}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {!scannedStudent && (
        <div className="text-center py-6 sm:py-8">
          <ScanLine className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs sm:text-sm text-muted-foreground">Arahkan kamera ke QR Code atau masukkan NIS manual</p>
        </div>
      )}

      {/* Success Popup Dialog */}
      <Dialog open={!!successPopup} onOpenChange={(open) => !open && setSuccessPopup(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="sr-only">Kepulangan Berhasil</DialogTitle>
          </DialogHeader>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-4 py-4"
          >
            <div className="h-20 w-20 rounded-full bg-success/15 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-success" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-foreground">Berhasil Pulang!</h2>
              <p className="text-lg font-semibold text-primary">{successPopup?.name}</p>
              <p className="text-sm text-muted-foreground">Kelas {successPopup?.class} • NIS: {successPopup?.student_id}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
            <Button onClick={() => setSuccessPopup(null)} variant="outline" className="mt-2">
              Tutup
            </Button>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScanQR;
