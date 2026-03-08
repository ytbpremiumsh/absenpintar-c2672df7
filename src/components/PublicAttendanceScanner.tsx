import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Camera, X, Search, ScanLine, UserCheck, CheckCircle2,
  ShieldCheck, Loader2, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import jsQR from "jsqr";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

interface ScannedStudent {
  id: string;
  name: string;
  class: string;
  student_id: string;
  photo_url: string | null;
}

interface PublicAttendanceScannerProps {
  schoolId: string;
  onAttendanceRecorded?: () => void;
}

const PublicAttendanceScanner = ({ schoolId, onAttendanceRecorded }: PublicAttendanceScannerProps) => {
  const [manualCode, setManualCode] = useState("");
  const [scannedStudent, setScannedStudent] = useState<ScannedStudent | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [alreadyRecorded, setAlreadyRecorded] = useState(false);
  const [scanMethod, setScanMethod] = useState<"barcode" | "face" | "face_recognition">("barcode");
  const [faceScanning, setFaceScanning] = useState(false);
  

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const faceIntervalRef = useRef<number | null>(null);
  const faceTimeoutRef = useRef<number | null>(null);
  const isLookingUp = useRef(false);
  const scanPaused = useRef(false);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  // Lookup student via public edge function - directly records attendance
  const lookupAndRecord = useCallback(async (code: string, method: string = "barcode", studentId?: string) => {
    if (isLookingUp.current) return;
    if (!code && !studentId) return;
    isLookingUp.current = true;
    scanPaused.current = true;

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/public-scan-attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
        body: JSON.stringify({
          school_id: schoolId,
          ...(studentId ? { student_id: studentId } : { student_code: code }),
          method,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        // Already recorded - show briefly then auto-dismiss
        setAlreadyRecorded(true);
        setScannedStudent(data.student);
        setScanMethod(method as "barcode" | "face" | "face_recognition");
        setConfirmed(false);
        toast.info(`${data.student.name} sudah tercatat hadir hari ini`);
        setTimeout(() => resetState(), 3000);
        return;
      }

      if (!res.ok) {
        toast.error(data.error || "Siswa tidak ditemukan");
        scanPaused.current = false;
        return;
      }

      // Success - attendance auto-verified as hadir
      setAlreadyRecorded(false);
      setScannedStudent(data.student);
      setScanMethod(method as "barcode" | "face" | "face_recognition");
      setConfirmed(true);
      toast.success(`✅ ${data.student.name} - Hadir!`);
      onAttendanceRecorded?.();

      // Auto-dismiss after 3 seconds and resume scanning
      setTimeout(() => resetState(), 3000);
    } catch (err: any) {
      toast.error("Gagal menghubungi server");
      scanPaused.current = false;
    } finally {
      isLookingUp.current = false;
    }
  }, [schoolId, SUPABASE_URL, SUPABASE_KEY, onAttendanceRecorded]);

  // Barcode scanning
  const startBarcodeScanning = useCallback(() => {
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
      if (qrCode?.data) lookupAndRecord(qrCode.data, "barcode");
    }, 300);
  }, [lookupAndRecord]);

  // Face recognition
  const captureAndRecognize = useCallback(async () => {
    if (!videoRef.current || scanPaused.current) return;
    const video = videoRef.current;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    setFaceScanning(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

      const res = await fetch(`${SUPABASE_URL}/functions/v1/face-recognition`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
        body: JSON.stringify({ captured_image: dataUrl, school_id: schoolId }),
      });

      const data = await res.json();
      if (!res.ok) return;

      if (data.match && data.student) {
        toast.success(`Wajah dikenali: ${data.student.name}`);
        // Record attendance - lookupAndRecord handles scanPaused
        await lookupAndRecord("", "face_recognition", data.student.id);
      }
    } catch (err: any) {
      console.log("Face recognition error:", err.message);
    } finally {
      setFaceScanning(false);
    }
  }, [schoolId, SUPABASE_URL, SUPABASE_KEY, lookupAndRecord]);

  const startFaceScanning = useCallback(() => {
    if (faceIntervalRef.current) return;
    faceTimeoutRef.current = window.setTimeout(() => captureAndRecognize(), 2000);
    faceIntervalRef.current = window.setInterval(() => {
      if (!scanPaused.current) captureAndRecognize();
    }, 4000);
  }, [captureAndRecognize]);

  const stopFaceScanning = useCallback(() => {
    if (faceTimeoutRef.current) { clearTimeout(faceTimeoutRef.current); faceTimeoutRef.current = null; }
    if (faceIntervalRef.current) { clearInterval(faceIntervalRef.current); faceIntervalRef.current = null; }
  }, []);

  // Camera start/stop
  useEffect(() => {
    if (!cameraActive || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;

    const startPipelines = () => {
      startBarcodeScanning();
      startFaceScanning();
    };

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      video.play().then(startPipelines).catch(console.error);
    } else {
      video.onloadedmetadata = () => {
        video.play().then(startPipelines).catch(console.error);
      };
    }

    return () => {
      video.onloadedmetadata = null;
      stopFaceScanning();
    };
  }, [cameraActive, startBarcodeScanning, startFaceScanning, stopFaceScanning]);

  const startCamera = async () => {
    setCameraError("");
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } } });
      }
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err: any) {
      if (err.name === "NotAllowedError") setCameraError("Izin kamera ditolak.");
      else setCameraError("Gagal mengakses kamera: " + (err.message || "Unknown"));
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    stopFaceScanning();
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    scanPaused.current = false;
  };

  useEffect(() => { return () => { stopCamera(); }; }, []);

  const resetState = () => {
    setScannedStudent(null);
    setConfirmed(false);
    setManualCode("");
    setAlreadyRecorded(false);
    scanPaused.current = false;
    setScanMethod("barcode");
  };

  const handleSearch = () => {
    if (!manualCode.trim()) return;
    scanPaused.current = false;
    lookupAndRecord(manualCode.trim(), "barcode");
  };


  return (
    <>
      <canvas ref={canvasRef} className="hidden" />

      <Card className="border-0 shadow-card overflow-hidden sticky top-24">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm text-foreground">Scan Absensi</h3>
          </div>
        </div>

        <CardContent className="p-0">
          {cameraActive ? (
            <>
              <div className="relative bg-black" style={{ maxHeight: 200 }}>
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted
                  style={{ maxHeight: 200, WebkitTransform: "scaleX(1)" }} />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={`w-24 h-24 border-2 rounded-lg transition-colors ${scanPaused.current ? "border-success" : "border-primary opacity-70"}`} />
                </div>
                <div className="absolute bottom-1 left-0 right-0 text-center">
                  <span className="text-[10px] text-white/80 bg-black/50 px-2 py-0.5 rounded">
                    {scanPaused.current ? "✓ Terdeteksi" : "Arahkan ke Barcode / Wajah..."}
                  </span>
                </div>
              </div>
              <div className="p-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground pl-2">
                  {faceScanning ? (
                    <><Loader2 className="h-3 w-3 animate-spin text-primary" /><span className="text-primary font-medium text-[10px]">Mengenali wajah...</span></>
                  ) : (
                    <>
                      <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                      <span className="text-[10px]"><ScanLine className="h-2.5 w-2.5 inline mr-0.5" />Barcode + <UserCheck className="h-2.5 w-2.5 inline mx-0.5" />Face</span>
                    </>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={stopCamera} className="h-7 text-xs px-2">
                  <X className="h-3 w-3 mr-1" /> Tutup
                </Button>
              </div>
            </>
          ) : (
            <div className="p-4 flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center">
                <Camera className="h-6 w-6 text-primary-foreground" />
              </div>
              {cameraError && <p className="text-destructive text-xs text-center">{cameraError}</p>}
              <Button onClick={startCamera} size="sm" className="gradient-primary hover:opacity-90">
                <Camera className="h-4 w-4 mr-2" /> Aktifkan Kamera
              </Button>
              <p className="text-[10px] text-muted-foreground">Barcode + Face Recognition</p>
            </div>
          )}
        </CardContent>

        {/* Manual input */}
        <div className="p-3 border-t border-border">
          <div className="flex gap-2">
            <Input placeholder="NIS manual" value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="h-8 text-xs" />
            <Button onClick={handleSearch} className="h-8 gradient-primary hover:opacity-90 px-3">
              <Search className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>
      {/* Already recorded popup - auto-dismisses */}
      <Dialog open={alreadyRecorded && !!scannedStudent} onOpenChange={(open) => { if (!open) resetState(); }}>
        <DialogContent className="max-w-[90vw] sm:max-w-sm p-0 overflow-hidden">
          <div className="bg-warning/10 p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-base font-bold text-warning">Sudah Tercatat</DialogTitle>
            </div>
            <DialogDescription className="text-warning/70 text-xs mt-1">
              Siswa ini sudah tercatat absensi hari ini
            </DialogDescription>
          </div>
          {scannedStudent && (
            <div className="p-5 text-center space-y-3">
              {scannedStudent.photo_url ? (
                <img src={scannedStudent.photo_url} alt={scannedStudent.name}
                  className="h-20 w-20 rounded-full object-cover mx-auto shadow-lg border-4 border-warning/20" />
              ) : (
                <div className="h-20 w-20 rounded-full bg-warning/20 flex items-center justify-center text-warning text-2xl font-bold mx-auto">
                  {scannedStudent.name.charAt(0)}
                </div>
              )}
              <h3 className="text-lg font-bold text-foreground">{scannedStudent.name}</h3>
              <p className="text-sm text-muted-foreground">Kelas: {scannedStudent.class} • NIS: {scannedStudent.student_id}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Success popup - auto-dismisses after 3s */}
      <Dialog open={confirmed && !!scannedStudent} onOpenChange={(open) => { if (!open) resetState(); }}>
        <DialogContent className="max-w-[90vw] sm:max-w-sm border-0 bg-success p-0">
          <div className="p-6 text-center space-y-3">
            <CheckCircle2 className="h-14 w-14 text-success-foreground mx-auto" />
            <DialogTitle className="text-lg font-bold text-success-foreground">✅ Absensi Berhasil</DialogTitle>
            <DialogDescription className="text-success-foreground/90 text-sm">
              <p><strong>{scannedStudent?.name}</strong></p>
              <p>Kelas: {scannedStudent?.class} • Status: Hadir</p>
              <p className="text-xs mt-1">
                {scanMethod === "face_recognition" ? "via Face Recognition" : "via Barcode Scan"}
              </p>
            </DialogDescription>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PublicAttendanceScanner;
