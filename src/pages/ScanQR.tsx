import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScanLine, CheckCircle2, Camera, Search, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

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

  const handleSearch = async () => {
    if (!manualCode.trim() || !profile?.school_id) return;

    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("school_id", profile.school_id)
      .or(`student_id.eq.${manualCode},qr_code.eq.${manualCode}`)
      .maybeSingle();

    if (error || !data) {
      toast.error("Siswa tidak ditemukan");
      return;
    }

    setScannedStudent(data);
    setConfirmed(false);
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
      toast.error("Gagal memproses penjemputan: " + error.message);
      return;
    }

    setConfirmed(true);
    toast.success("Penjemputan berhasil dicatat!");

    setTimeout(() => {
      setScannedStudent(null);
      setConfirmed(false);
      setManualCode("");
    }, 4000);
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Scan QR Code</h1>
        <p className="text-muted-foreground text-sm">Scan kartu QR siswa untuk memproses penjemputan</p>
      </div>

      {/* Camera placeholder */}
      <Card className="shadow-card border-0 overflow-hidden">
        <CardContent className="p-0">
          <div className="aspect-video bg-foreground/5 flex flex-col items-center justify-center gap-3">
            <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center">
              <Camera className="h-8 w-8 text-primary-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center px-4">Kamera scanner akan aktif setelah integrasi html5-qrcode</p>
          </div>
        </CardContent>
      </Card>

      {/* Manual input */}
      <div className="flex gap-2">
        <Input
          placeholder="Masukkan Student ID (cth: STD001)"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="h-11"
        />
        <Button onClick={handleSearch} className="h-11 gradient-primary hover:opacity-90 px-4">
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Result */}
      <AnimatePresence mode="wait">
        {scannedStudent && !confirmed && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
            <Card className="shadow-elevated border-0">
              <CardContent className="p-6 text-center space-y-4">
                <div className="flex items-center justify-center gap-2 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="text-sm font-semibold">Verifikasi Siswa</span>
                </div>
                <div className="h-20 w-20 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-2xl font-bold mx-auto">
                  {scannedStudent.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold">{scannedStudent.name}</h3>
                  <p className="text-sm text-muted-foreground">Kelas: {scannedStudent.class}</p>
                  <p className="text-sm text-muted-foreground">NIS: {scannedStudent.student_id}</p>
                  <p className="text-sm text-muted-foreground">Wali: {scannedStudent.parent_name}</p>
                </div>
                <Button
                  onClick={handleConfirm}
                  disabled={processing}
                  className="w-full h-12 bg-success hover:bg-success/90 text-success-foreground text-base font-semibold"
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Konfirmasi Penjemputan
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {confirmed && scannedStudent && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <Card className="shadow-elevated border-0 bg-success">
              <CardContent className="p-8 text-center space-y-3">
                <CheckCircle2 className="h-16 w-16 text-success-foreground mx-auto" />
                <h2 className="text-xl font-bold text-success-foreground">✅ Siswa Berhasil Dijemput</h2>
                <div className="text-success-foreground/90 space-y-1 text-sm">
                  <p><strong>{scannedStudent.name}</strong></p>
                  <p>Kelas: {scannedStudent.class}</p>
                  <p>Penjemput: {scannedStudent.parent_name}</p>
                  <p>Waktu: {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <p className="text-xs text-success-foreground/60">
                  Notifikasi WhatsApp akan dikirim ke {scannedStudent.parent_phone}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {!scannedStudent && (
        <div className="text-center py-8">
          <ScanLine className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Arahkan kamera ke QR Code siswa atau masukkan Student ID</p>
        </div>
      )}
    </div>
  );
};

export default ScanQR;
