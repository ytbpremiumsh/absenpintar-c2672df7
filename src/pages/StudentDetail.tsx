import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, User, Phone, GraduationCap, Hash, Clock, UserCheck, Calendar, QrCode, Shield, Camera, Loader2, Pencil, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";
import { motion } from "framer-motion";
import { toast } from "sonner";
import QRCodeDisplay from "@/components/QRCodeDisplay";

const STATUS_COLORS: Record<string, string> = {
  hadir: "bg-success/10 text-success",
  izin: "bg-warning/10 text-warning",
  sakit: "bg-blue-100 text-blue-600",
  alfa: "bg-destructive/10 text-destructive",
};

const STATUS_LABELS: Record<string, string> = {
  hadir: "Hadir", izin: "Izin", sakit: "Sakit", alfa: "Alfa",
};

const StudentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const features = useSubscriptionFeatures();
  const [student, setStudent] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", class: "", student_id: "", parent_name: "", parent_phone: "" });
  const [saving, setSaving] = useState(false);
  const [qrInstructions, setQrInstructions] = useState<string[]>([]);

  const fetchData = async () => {
    if (!id || !profile?.school_id) return;
    const [studentRes, logsRes, schoolRes, instrRes] = await Promise.all([
      supabase.from("students").select("*").eq("id", id).eq("school_id", profile.school_id).single(),
      supabase.from("attendance_logs").select("*").eq("student_id", id).eq("school_id", profile.school_id).order("date", { ascending: false }).order("time", { ascending: false }).limit(30),
      supabase.from("schools").select("name, logo, address").eq("id", profile.school_id).single(),
      supabase.from("qr_instructions").select("instruction_text").eq("school_id", profile.school_id).order("sort_order"),
    ]);
    setStudent(studentRes.data);
    setAttendanceHistory(logsRes.data || []);
    setSchool(schoolRes.data);
    if (instrRes.data?.length) setQrInstructions(instrRes.data.map((r: any) => r.instruction_text));
    if (studentRes.data) {
      setEditForm({
        name: studentRes.data.name, class: studentRes.data.class, student_id: studentRes.data.student_id,
        parent_name: studentRes.data.parent_name, parent_phone: studentRes.data.parent_phone,
      });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id, profile?.school_id]);

  const handlePhotoUpload = async (file: File) => {
    if (!features.canUploadPhoto || !student) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${profile?.school_id}/${student.id}.${ext}`;
    const { error } = await supabase.storage.from("student-photos").upload(path, file, { upsert: true });
    if (error) { toast.error("Gagal upload: " + error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("student-photos").getPublicUrl(path);
    await supabase.from("students").update({ photo_url: urlData.publicUrl }).eq("id", student.id);
    toast.success("Foto berhasil diupload!");
    setUploading(false);
    fetchData();
  };

  const handleSaveEdit = async () => {
    if (!student) return;
    setSaving(true);
    const { error } = await supabase.from("students").update({
      name: editForm.name, class: editForm.class, student_id: editForm.student_id,
      parent_name: editForm.parent_name, parent_phone: editForm.parent_phone,
    }).eq("id", student.id);
    setSaving(false);
    if (error) { toast.error("Gagal menyimpan: " + error.message); return; }
    toast.success("Data siswa berhasil diperbarui!");
    setEditing(false);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center mx-auto animate-pulse">
            <User className="h-6 w-6 text-primary-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-muted-foreground">Siswa tidak ditemukan</p>
        <Button variant="outline" onClick={() => navigate("/students")}><ArrowLeft className="h-4 w-4 mr-2" /> Kembali</Button>
      </div>
    );
  }

  // Attendance stats
  const totalHadir = attendanceHistory.filter(l => l.status === "hadir").length;
  const totalIzin = attendanceHistory.filter(l => l.status === "izin").length;
  const totalSakit = attendanceHistory.filter(l => l.status === "sakit").length;
  const totalAlfa = attendanceHistory.filter(l => l.status === "alfa").length;

  const todayLog = attendanceHistory.find(l => l.date === new Date().toISOString().slice(0, 10));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
      </Button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="shadow-elevated border-0 overflow-hidden">
          <div className="gradient-hero h-28 sm:h-32" />
          <CardContent className="relative px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-14">
              <div className="relative group">
                {student.photo_url ? (
                  <img src={student.photo_url} alt={student.name} className="h-24 w-24 rounded-2xl object-cover border-4 border-card bg-card shadow-elevated" />
                ) : (
                  <div className="h-24 w-24 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground text-3xl font-bold border-4 border-card bg-card shadow-elevated shrink-0">
                    {student.name.charAt(0)}
                  </div>
                )}
                {features.canUploadPhoto && (
                  <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => { if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]); }} />
                    {uploading ? <Loader2 className="h-6 w-6 text-white animate-spin" /> : <Camera className="h-6 w-6 text-white" />}
                  </div>
                )}
              </div>
              <div className="text-center sm:text-left flex-1 pb-1">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h1 className="text-2xl font-bold bg-card/80 backdrop-blur-sm px-3 py-1 rounded-lg inline-block">{student.name}</h1>
                  <Button variant="ghost" size="icon" className="h-7 w-7 bg-card/80 backdrop-blur-sm rounded-lg" onClick={() => setEditing(!editing)}>
                    {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
                <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs"><GraduationCap className="h-3 w-3 mr-1" />Kelas {student.class}</Badge>
                  <Badge variant="secondary" className="text-xs"><Hash className="h-3 w-3 mr-1" />NIS: {student.student_id}</Badge>
                  {todayLog ? (
                    <Badge className={`text-xs border-0 ${STATUS_COLORS[todayLog.status]}`}>
                      {STATUS_LABELS[todayLog.status] || todayLog.status}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Belum Absen Hari Ini</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Attendance Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Hadir", value: totalHadir, color: "text-success", bg: "bg-success/10" },
          { label: "Izin", value: totalIzin, color: "text-warning", bg: "bg-warning/10" },
          { label: "Sakit", value: totalSakit, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Alfa", value: totalAlfa, color: "text-destructive", bg: "bg-destructive/10" },
        ].map((s) => (
          <Card key={s.label} className="shadow-card border-0">
            <CardContent className="p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Form */}
      {editing && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
          <Card className="shadow-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2"><Pencil className="h-4 w-4 text-primary" /> Edit Data Siswa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Nama Lengkap</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Kelas</Label><Input value={editForm.class} onChange={(e) => setEditForm({ ...editForm, class: e.target.value })} /></div>
                <div className="space-y-2"><Label>NIS</Label><Input value={editForm.student_id} onChange={(e) => setEditForm({ ...editForm, student_id: e.target.value })} /></div>
                <div className="space-y-2"><Label>Nama Wali</Label><Input value={editForm.parent_name} onChange={(e) => setEditForm({ ...editForm, parent_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>No. HP Wali</Label><Input value={editForm.parent_phone} onChange={(e) => setEditForm({ ...editForm, parent_phone: e.target.value })} /></div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveEdit} disabled={saving} className="gradient-primary hover:opacity-90">
                  <Save className="h-4 w-4 mr-1" /> {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)}>Batal</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="shadow-card border-0 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2"><Shield className="h-4 w-4 text-primary" />Identitas Lengkap</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoItem icon={User} label="Nama Lengkap" value={student.name} />
                <InfoItem icon={GraduationCap} label="Kelas" value={student.class} />
                <InfoItem icon={Hash} label="NIS" value={student.student_id} />
                <InfoItem icon={Calendar} label="Terdaftar" value={new Date(student.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} />
              </div>
              <div className="border-t pt-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data Wali / Orang Tua</p>
                <InfoItem icon={User} label="Nama Wali" value={student.parent_name} />
                <InfoItem icon={Phone} label="No. HP Wali" value={student.parent_phone} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="shadow-card border-0 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2"><QrCode className="h-4 w-4 text-primary" />Barcode Siswa</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-4">
              <QRCodeDisplay data={student.qr_code || student.student_id} size={200}
                studentName={student.name} studentClass={student.class}
                schoolName={school?.name} schoolLogo={school?.logo}
                customInstructions={qrInstructions.length > 0 ? qrInstructions : undefined} />
              <p className="text-xs text-muted-foreground mt-3 text-center">Scan kode ini untuk mencatat kehadiran</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="shadow-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Riwayat Kehadiran</CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceHistory.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Belum ada riwayat kehadiran</p>
            ) : (
              <div className="space-y-3">
                {attendanceHistory.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${STATUS_COLORS[log.status]?.split(" ")[0] || "bg-muted"}`}>
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {new Date(log.date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.time?.slice(0, 5)} • {log.method === "face" ? "Face Recognition" : log.method === "manual" ? "Manual" : "Barcode"}
                        {log.recorded_by && ` • oleh ${log.recorded_by}`}
                      </p>
                    </div>
                    <Badge className={`text-[10px] border-0 shrink-0 ${STATUS_COLORS[log.status] || ""}`}>
                      {STATUS_LABELS[log.status] || log.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

const InfoItem = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="space-y-1">
    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary shrink-0" />
      <span className="text-sm font-medium">{value}</span>
    </div>
  </div>
);

export default StudentDetail;