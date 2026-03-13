import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScanLine, CheckCircle2, Camera, Search, ShieldCheck, X, Clock, UserCheck, Loader2, Crown, Lock, SwitchCamera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";
import { toast } from "sonner";
import jsQR from "jsqr";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

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
  const features = useSubscriptionFeatures();
  const [manualCode, setManualCode] = useState("");
  const [scannedStudent, setScannedStudent] = useState<FoundStudent | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [alreadyRecorded, setAlreadyRecorded] = useState(false);
  const [scanMethod, setScanMethod] = useState<"barcode" | "face">("barcode");
  const [faceScanning, setFaceScanning] = useState(false);
  const [currentAttType, setCurrentAttType] = useState<"datang" | "pulang">("datang");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const faceIntervalRef = useRef<number | null>(null);
  const isLookingUp = useRef(false);
  const scanPaused = useRef(false);

  const canFace = !features.loading && features.canFaceRecognition;

  // Determine attendance type based on time
  const getAttendanceType = useCallback(async (): Promise<"datang" | "pulang"> => {
    if (!profile?.school_id) return "datang";
    const { data: settings } = await supabase.from("pickup_settings")
      .select("attendance_start_time, attendance_end_time, departure_start_time, departure_end_time")
      .eq("school_id", profile.school_id).maybeSingle();

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 8);
    const attStart = (settings as any)?.attendance_start_time || "06:00:00";
    const attEnd = (settings as any)?.attendance_end_time || "12:00:00";
    const depStart = (settings as any)?.departure_start_time || "12:00:00";
    const depEnd = (settings as any)?.departure_end_time || "17:00:00";

    if (currentTime >= attStart && currentTime < attEnd) return "datang";
    if (currentTime >= depStart && currentTime <= depEnd) return "pulang";
    if (currentTime < attStart) return "datang";
    return "pulang";
  }, [profile?.school_id]);

  const lookupStudent = useCallback(async (code: string) => {
    if (!code.trim() || !profile?.school_id || isLookingUp.current || scanPaused.current) return;
    isLookingUp.current = true;
    try {
      const trimmed = code.trim();
      const { data, error } = await supabase
        .from("students").select("*").eq("school_id", profile.school_id)
        .or(`student_id.eq.${trimmed},qr_code.eq.${trimmed}`).maybeSingle();
      if (error || !data) { toast.error("Siswa tidak ditemukan untuk kode: " + trimmed); return; }

      const attType = await getAttendanceType();
      setCurrentAttType(attType);

      const today = new Date().toISOString().slice(0, 10);
      const { data: existing } = await supabase.from("attendance_logs")
        .select("id").eq("student_id", data.id).eq("date", today).eq("attendance_type", attType).maybeSingle();

      setAlreadyRecorded(!!existing);
      setScannedStudent(data);
      setConfirmed(false);
      setScanMethod("barcode");
      scanPaused.current = true;
    } finally { isLookingUp.current = false; }
  }, [profile?.school_id, getAttendanceType]);

  // Barcode scanning interval
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
      if (qrCode?.data) lookupStudent(qrCode.data);
    }, 300);
  }, [lookupStudent]);

  // Face recognition capture
  const captureAndRecognize = useCallback(async () => {
    if (!videoRef.current || !profile?.school_id || scanPaused.current) return;
    setFaceScanning(true);
    try {
      const video = videoRef.current;
      if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/face-recognition`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ captured_image: dataUrl, school_id: profile.school_id }),
      });

      const data = await res.json();
      if (!res.ok) { console.log("Face scan:", data.error); return; }

      if (data.match && data.student) {
        scanPaused.current = true;
        const attType = await getAttendanceType();
        setCurrentAttType(attType);

        const today = new Date().toISOString().slice(0, 10);
        const { data: existing } = await supabase.from("attendance_logs")
          .select("id").eq("student_id", data.student.id).eq("date", today).eq("attendance_type", attType).maybeSingle();

        setAlreadyRecorded(!!existing);
        setScannedStudent(data.student);
        setConfirmed(false);
        setScanMethod("face");
        toast.success(`Wajah dikenali: ${data.student.name}`);
      }
    } catch (err: any) {
      console.log("Face recognition error:", err.message);
    } finally {
      setFaceScanning(false);
    }
  }, [profile?.school_id, getAttendanceType]);

  const faceTimeoutRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (!cameraActive || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    const startPipelines = () => {
      startBarcodeScanning();
      if (canFace) startFaceScanning();
      else stopFaceScanning();
    };
    video.srcObject = streamRef.current;
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      video.play().then(startPipelines).catch(err => console.error("Video play error:", err));
    } else {
      video.onloadedmetadata = () => {
        video.play().then(startPipelines).catch(err => console.error("Video play error:", err));
      };
    }
    return () => { video.onloadedmetadata = null; stopFaceScanning(); };
  }, [cameraActive, startBarcodeScanning, startFaceScanning, stopFaceScanning, canFace]);

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
      if (err.name === "NotAllowedError") setCameraError("Izin kamera ditolak. Berikan izin kamera di pengaturan browser.");
      else setCameraError("Gagal mengakses kamera: " + (err.message || "Unknown error"));
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

  const handleSearch = () => { scanPaused.current = false; lookupStudent(manualCode); };

  const handleConfirm = async () => {
    if (!scannedStudent || !profile?.school_id) return;
    setProcessing(true);

    const now = new Date();
    const method = scanMethod === "face" ? "face_recognition" : "barcode";
    const { error } = await supabase.from("attendance_logs").insert({
      school_id: profile.school_id,
      student_id: scannedStudent.id,
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 8),
      method,
      status: "hadir",
      recorded_by: profile.full_name || "Petugas",
      attendance_type: currentAttType,
    });

    setProcessing(false);
    if (error) { toast.error("Gagal mencatat absensi: " + error.message); return; }
    setConfirmed(true);
    const typeLabel = currentAttType === "datang" ? "Datang" : "Pulang";
    toast.success(`Absensi ${typeLabel} ${scannedStudent.name} berhasil dicatat!`);

    // Send WA notification based on school delivery settings
    try {
      const [integrationRes, schoolRes, classRes] = await Promise.all([
        supabase
          .from("school_integrations")
          .select("attendance_arrive_template, attendance_depart_template, attendance_group_template, wa_delivery_target, wa_enabled, is_active")
          .eq("school_id", profile.school_id)
          .eq("integration_type", "onesender")
          .maybeSingle(),
        supabase.from("schools").select("name").eq("id", profile.school_id).single(),
        supabase.from("classes").select("wa_group_id").eq("school_id", profile.school_id).eq("name", scannedStudent.class).maybeSingle(),
      ]);

      const integration = integrationRes.data as any;
      if (integration && integration.wa_enabled !== false) {
        const schoolName = schoolRes.data?.name || "";
        const groupId = classRes.data?.wa_group_id || null;
        const deliveryTarget = integration.wa_delivery_target || "parent_only";
        const methodLabel = method === "face_recognition" ? "Face Recognition" : "Barcode Scan";
        const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
        const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const dayName = dayNames[now.getDay()];
        const typeLabel = currentAttType === "datang" ? "Datang (Hadir)" : "Pulang";

        const applyReplacements = (tpl: string) =>
          tpl
            .replace(/\{student_name\}/g, scannedStudent.name)
            .replace(/\{class\}/g, scannedStudent.class)
            .replace(/\{time\}/g, timeStr)
            .replace(/\{day\}/g, dayName)
            .replace(/\{student_id\}/g, scannedStudent.student_id)
            .replace(/\{method\}/g, methodLabel)
            .replace(/\{parent_name\}/g, scannedStudent.parent_name || "")
            .replace(/\{school_name\}/g, schoolName)
            .replace(/\{type\}/g, typeLabel);

        const sendTasks: Promise<any>[] = [];

        if ((deliveryTarget === "parent_only" || deliveryTarget === "both") && scannedStudent.parent_phone) {
          const parentTemplate = currentAttType === "datang"
            ? (integration.attendance_arrive_template || "")
            : (integration.attendance_depart_template || "");
          const parentMessage = parentTemplate
            ? applyReplacements(parentTemplate)
            : `📋 *Notifikasi Absensi ${typeLabel}*\n\n${schoolName}\n\nAnanda *${scannedStudent.name}* (Kelas ${scannedStudent.class}) telah tercatat ${typeLabel.toLowerCase()} pada ${dayName}, pukul ${timeStr}.\n\nMetode: ${methodLabel}\n\n_Pesan otomatis dari Smart School Attendance System_`;

          sendTasks.push(
            supabase.functions.invoke("send-whatsapp", {
              body: {
                school_id: profile.school_id,
                phone: scannedStudent.parent_phone,
                message: parentMessage,
                message_type: "attendance",
                student_name: scannedStudent.name,
              },
            })
          );
        }

        if ((deliveryTarget === "group_only" || deliveryTarget === "both") && groupId) {
          const groupTemplate = integration.attendance_group_template || "";
          const groupMessage = groupTemplate
            ? applyReplacements(groupTemplate)
            : `📋 *Notifikasi Absensi ${typeLabel}*\n\n${schoolName}\n\nSiswa *${scannedStudent.name}* (Kelas ${scannedStudent.class}) telah tercatat ${typeLabel.toLowerCase()} pada ${dayName}, pukul ${timeStr}.\n\nMetode: ${methodLabel}\n\n_Pesan otomatis dari Smart School Attendance System_`;

          sendTasks.push(
            supabase.functions.invoke("send-whatsapp", {
              body: {
                school_id: profile.school_id,
                group_id: groupId,
                message: groupMessage,
                message_type: "attendance_group",
                student_name: scannedStudent.name,
              },
            })
          );
        }

        if (sendTasks.length > 0) {
          await Promise.allSettled(sendTasks);
        }
      }
    } catch {
      // Don't fail attendance if WA fails
    }

    setTimeout(() => {
      setScannedStudent(null);
      setConfirmed(false);
      setManualCode("");
      setAlreadyRecorded(false);
      scanPaused.current = false;
      setScanMethod("barcode");
    }, 2000);
  };

  const handleCancel = () => {
    setScannedStudent(null);
    setConfirmed(false);
    setManualCode("");
    setAlreadyRecorded(false);
    scanPaused.current = false;
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-lg mx-auto px-1">
      <div className="text-center">
        <h1 className="text-xl sm:text-2xl font-bold">Scan Absensi</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">Scan barcode atau wajah siswa untuk mencatat kehadiran</p>
      </div>

      {/* Time status */}
      <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-primary/10">
        <Clock className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-primary">
          {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
        </span>
        <span className="text-xs text-muted-foreground">
          {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" })}
        </span>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Unified Camera */}
      <Card className="shadow-card border-0 overflow-hidden">
        <CardContent className="p-0">
          {cameraActive ? (
            <>
              <div className="relative bg-black" style={{ minHeight: 280 }}>
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted
                  style={{ minHeight: 280, WebkitTransform: "scaleX(1)" }} />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={`w-44 h-44 border-2 rounded-lg transition-colors ${scanPaused.current ? "border-success opacity-100" : "border-primary opacity-70"}`} />
                </div>
                <div className="absolute bottom-2 left-0 right-0 text-center">
                  <span className="text-xs text-white/80 bg-black/50 px-2 py-1 rounded">
                    {scanPaused.current ? "✓ Terdeteksi" : "Arahkan ke Barcode / Wajah..."}
                  </span>
                </div>
              </div>
              <div className="p-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground pl-2">
                  {faceScanning ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /><span className="text-primary font-medium">Mengenali wajah...</span></>
                  ) : (
                    <>
                      <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                      <span>
                        <ScanLine className="h-3 w-3 inline mr-0.5" />Barcode
                        {canFace ? (
                          <> + <UserCheck className="h-3 w-3 inline mx-0.5" />Face</>
                        ) : (
                          <> + <Lock className="h-3 w-3 inline mx-0.5 opacity-50" /><span className="opacity-50">Face</span> <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">(Premium)</span></>
                        )}
                      </span>
                    </>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={stopCamera}>
                  <X className="h-4 w-4 mr-1" /> Tutup
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
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground">
                <ScanLine className="h-3.5 w-3.5" /> Barcode
                {canFace ? (
                  <><span className="text-muted-foreground/50">+</span><UserCheck className="h-3.5 w-3.5" /> Face Recognition</>
                ) : (
                  <><span className="text-muted-foreground/50">+</span><Lock className="h-3 w-3" /> <span className="opacity-60">Face Recognition</span> <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">(Premium)</span></>
                )}
              </div>
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
            <Input placeholder="Masukkan NIS (cth: NIS-001)" value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="h-10 sm:h-11 text-sm" />
            <Button onClick={handleSearch} className="h-10 sm:h-11 gradient-primary hover:opacity-90 px-4">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {!scannedStudent && !cameraActive && (
        <div className="text-center py-6 sm:py-8">
          <ScanLine className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs sm:text-sm text-muted-foreground">Arahkan kamera ke barcode / wajah atau masukkan NIS manual</p>
        </div>
      )}

      {/* POPUP DIALOG for confirmation */}
      <Dialog open={!!scannedStudent && !confirmed} onOpenChange={(open) => { if (!open) handleCancel(); }}>
        <DialogContent className="max-w-[90vw] sm:max-w-md p-0 overflow-hidden">
          <div className="gradient-primary p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
              <DialogTitle className="text-base font-bold text-primary-foreground">Verifikasi Absensi</DialogTitle>
            </div>
            <DialogDescription className="text-primary-foreground/70 text-xs mt-1">
              {scanMethod === "face" ? "Wajah dikenali — konfirmasi kehadiran" : "Konfirmasi kehadiran siswa berikut"}
            </DialogDescription>
            <Badge className="mt-2 bg-white/20 text-white border-0">
              Mode: {currentAttType === "datang" ? "📥 Datang" : "📤 Pulang"}
            </Badge>
          </div>
          {scannedStudent && (
            <div className="p-5 text-center space-y-4">
              {scannedStudent.photo_url ? (
                <img src={scannedStudent.photo_url} alt={scannedStudent.name}
                  className="h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover mx-auto shadow-lg border-4 border-primary/20" />
              ) : (
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-2xl sm:text-3xl font-bold mx-auto shadow-lg">
                  {scannedStudent.name.charAt(0)}
                </div>
              )}
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground">{scannedStudent.name}</h3>
                <p className="text-sm text-muted-foreground">Kelas: {scannedStudent.class}</p>
                <p className="text-sm text-muted-foreground">NIS: {scannedStudent.student_id}</p>
                {scanMethod === "face" && (
                  <span className="inline-flex items-center gap-1 text-xs text-success font-medium mt-1">
                    <UserCheck className="h-3 w-3" /> Dikenali via Face Recognition
                  </span>
                )}
              </div>

              {alreadyRecorded && (
                <div className="bg-warning/10 border border-warning/20 rounded-lg p-2 text-xs text-warning font-medium">
                  ⚠ Siswa ini sudah tercatat absensi {currentAttType === "datang" ? "Datang" : "Pulang"} hari ini
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={handleCancel} className="flex-1 h-11">Batal</Button>
                <Button onClick={handleConfirm} disabled={processing || alreadyRecorded}
                  className="flex-1 h-11 bg-success hover:bg-success/90 text-success-foreground font-semibold">
                  <CheckCircle2 className="h-4 w-4 mr-1" /> {currentAttType === "datang" ? "Hadir ✓" : "Pulang ✓"}
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
            <DialogTitle className="text-lg sm:text-xl font-bold text-success-foreground">✅ Absensi Berhasil</DialogTitle>
            <DialogDescription className="text-success-foreground/90 space-y-0.5 text-sm">
              <p><strong>{scannedStudent?.name}</strong></p>
              <p>Kelas: {scannedStudent?.class} • {currentAttType === "datang" ? "Datang - Hadir" : "Pulang"}</p>
            </DialogDescription>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScanQR;
