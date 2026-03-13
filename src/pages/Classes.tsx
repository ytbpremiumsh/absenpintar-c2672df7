import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { GraduationCap, Users, UserCheck, UserX, ChevronRight, Plus, Trash2, Loader2, Clock, AlertTriangle, Pencil, MessageCircle, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const Classes = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const features = useSubscriptionFeatures();
  const { canWhatsApp, loading: subscriptionLoading } = features;
  const [students, setStudents] = useState<any[]>([]);
  const [todayLogs, setTodayLogs] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [saving, setSaving] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; oldName: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [groupIdDialogOpen, setGroupIdDialogOpen] = useState(false);
  const [groupIdTarget, setGroupIdTarget] = useState<{ id: string; name: string; waGroupId: string } | null>(null);
  const [groupIdValue, setGroupIdValue] = useState("");
  const [savingGroupId, setSavingGroupId] = useState(false);

  const fetchData = async () => {
    if (!profile?.school_id) return;
    const today = new Date().toISOString().slice(0, 10);

    const [studentsRes, logsRes, classesRes] = await Promise.all([
      supabase.from("students").select("*").eq("school_id", profile.school_id).order("class").order("name"),
      supabase.from("attendance_logs").select("*").eq("school_id", profile.school_id).eq("date", today),
      supabase.from("classes").select("*").eq("school_id", profile.school_id).order("name"),
    ]);

    setStudents(studentsRes.data || []);
    setTodayLogs(logsRes.data || []);
    setClasses(classesRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [profile?.school_id]);

  const handleAddClass = async () => {
    if (!profile?.school_id || !newClassName.trim()) { toast.error("Nama kelas wajib diisi"); return; }
    // Check class limit
    if (features.maxClasses < 999 && classes.length >= features.maxClasses) {
      toast.error(`Batas maksimal ${features.maxClasses} kelas untuk paket ${features.planName}. Silakan upgrade paket untuk menambah kelas.`);
      navigate("/subscription");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("classes").insert({ school_id: profile.school_id, name: newClassName.trim() });
    setSaving(false);
    if (error) { toast.error("Gagal menambah kelas: " + error.message); return; }
    toast.success("Kelas berhasil ditambahkan!");
    setDialogOpen(false);
    setNewClassName("");
    fetchData();
  };

  const handleDeleteClass = async (id: string, name: string) => {
    const hasStudents = students.some(s => s.class === name);
    if (hasStudents) { toast.error("Tidak bisa menghapus kelas yang masih memiliki siswa"); return; }
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) { toast.error("Gagal menghapus kelas: " + error.message); return; }
    toast.success("Kelas dihapus");
    fetchData();
  };

  const handleRenameClass = async () => {
    if (!renameTarget || !renameValue.trim() || !profile?.school_id) return;
    const newName = renameValue.trim();
    if (newName === renameTarget.oldName) { setRenameDialogOpen(false); return; }

    setRenaming(true);

    // Update class name in classes table (if it exists there)
    if (renameTarget.id) {
      const { error: classError } = await supabase
        .from("classes").update({ name: newName }).eq("id", renameTarget.id);
      if (classError) {
        toast.error("Gagal mengubah nama kelas: " + classError.message);
        setRenaming(false);
        return;
      }
    }

    // Update all students with old class name
    const { error: studentError } = await supabase
      .from("students").update({ class: newName })
      .eq("school_id", profile.school_id).eq("class", renameTarget.oldName);

    if (studentError) {
      toast.error("Nama kelas berhasil diubah tapi gagal memperbarui data siswa: " + studentError.message);
    }

    // Update class_teachers
    await supabase
      .from("class_teachers").update({ class_name: newName })
      .eq("school_id", profile.school_id).eq("class_name", renameTarget.oldName);

    setRenaming(false);
    setRenameDialogOpen(false);
    setRenameTarget(null);
    setRenameValue("");
    toast.success(`Kelas "${renameTarget.oldName}" diubah menjadi "${newName}"`);
    fetchData();
  };

  const ensureClassRow = async (className: string) => {
    if (!profile?.school_id) return null;

    const { data: existing, error: selectError } = await supabase
      .from("classes")
      .select("id, name, wa_group_id")
      .eq("school_id", profile.school_id)
      .eq("name", className)
      .maybeSingle();

    if (selectError) throw selectError;
    if (existing?.id) return existing;

    const { data: created, error: insertError } = await supabase
      .from("classes")
      .insert({ school_id: profile.school_id, name: className })
      .select("id, name, wa_group_id")
      .single();

    if (insertError) throw insertError;
    return created;
  };

  const handleSaveGroupId = async () => {
    if (!groupIdTarget) return;
    setSavingGroupId(true);
    const { error } = await supabase.from("classes").update({ wa_group_id: groupIdValue.trim() || null }).eq("id", groupIdTarget.id);
    setSavingGroupId(false);
    if (error) { toast.error("Gagal menyimpan: " + error.message); return; }
    toast.success(`ID Group WA kelas "${groupIdTarget.name}" berhasil disimpan`);
    setGroupIdDialogOpen(false);
    setGroupIdTarget(null);
    setGroupIdValue("");
    fetchData();
  };

  const classData = useMemo(() => {
    const groups: Record<string, { id?: string; waGroupId?: string; students: any[]; hadir: number; izin: number; sakit: number; alfa: number }> = {};
    for (const c of classes) groups[c.name] = { id: c.id, waGroupId: c.wa_group_id || "", students: [], hadir: 0, izin: 0, sakit: 0, alfa: 0 };
    for (const s of students) {
      if (!groups[s.class]) groups[s.class] = { students: [], hadir: 0, izin: 0, sakit: 0, alfa: 0 };
      groups[s.class].students.push(s);
      const log = todayLogs.find((l) => l.student_id === s.id);
      if (log) {
        const status = log.status as string;
        if (status === "hadir") groups[s.class].hadir++;
        else if (status === "izin") groups[s.class].izin++;
        else if (status === "sakit") groups[s.class].sakit++;
        else if (status === "alfa") groups[s.class].alfa++;
      }
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [students, todayLogs, classes]);

  const totalHadir = todayLogs.filter(l => l.status === "hadir").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Daftar Kelas</h1>
          <p className="text-muted-foreground text-sm">Kelola kelas dan lihat statistik kehadiran</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary hover:opacity-90 h-10">
              <Plus className="h-4 w-4 mr-2" /> Tambah Kelas
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Tambah Kelas Baru</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Nama Kelas</Label>
                <Input placeholder="Contoh: 1A, 2B, TK-A" value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddClass()} />
              </div>
              <Button onClick={handleAddClass} disabled={saving} className="w-full gradient-primary hover:opacity-90">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Ubah Nama Kelas</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama Kelas Baru</Label>
              <Input placeholder="Masukkan nama kelas baru" value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleRenameClass()} />
              <p className="text-xs text-muted-foreground">Semua data siswa dan wali kelas akan otomatis diperbarui.</p>
            </div>
            <Button onClick={handleRenameClass} disabled={renaming || !renameValue.trim()} className="w-full gradient-primary hover:opacity-90">
              {renaming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Perubahan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* WA Group ID Dialog */}
      <Dialog open={groupIdDialogOpen} onOpenChange={setGroupIdDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>ID Group WhatsApp — {groupIdTarget?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>ID Group WhatsApp</Label>
              <Input placeholder="Contoh: 120363XXXXXXXXX@g.us" value={groupIdValue}
                onChange={(e) => setGroupIdValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSaveGroupId()} />
              <p className="text-xs text-muted-foreground">Masukkan ID Group WA agar notifikasi absensi dikirim ke group kelas ini.</p>
            </div>
            <Button onClick={handleSaveGroupId} disabled={savingGroupId} className="w-full gradient-primary hover:opacity-90">
              {savingGroupId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="shadow-card border-0">
          <CardContent className="p-4 text-center">
            <GraduationCap className="h-6 w-6 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{classData.length}</p>
            <p className="text-xs text-muted-foreground">Total Kelas</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0">
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{students.length}</p>
            <p className="text-xs text-muted-foreground">Total Siswa</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0">
          <CardContent className="p-4 text-center">
            <UserCheck className="h-6 w-6 mx-auto mb-1 text-success" />
            <p className="text-2xl font-bold text-success">{totalHadir}</p>
            <p className="text-xs text-muted-foreground">Hadir Hari Ini</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0">
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold text-muted-foreground">{students.length - todayLogs.length}</p>
            <p className="text-xs text-muted-foreground">Belum Absen</p>
          </CardContent>
        </Card>
      </div>

      {/* Class Cards */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Memuat data...</div>
      ) : classData.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Belum ada data kelas. Klik "Tambah Kelas" untuk memulai.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classData.map(([cls, info], i) => {
            const totalRecorded = info.hadir + info.izin + info.sakit + info.alfa;
            const percentage = info.students.length ? Math.round((totalRecorded / info.students.length) * 100) : 0;
            return (
              <motion.div key={cls} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="shadow-card border-0 hover:shadow-elevated transition-all group">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center">
                          <GraduationCap className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{cls}</h3>
                          <p className="text-xs text-muted-foreground">{info.students.length} siswa</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              {subscriptionLoading ? (
                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                </Button>
                              ) : canWhatsApp ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const row = info.id
                                        ? ({ id: info.id, wa_group_id: info.waGroupId || null } as any)
                                        : await ensureClassRow(cls);

                                      if (!row?.id) return;

                                      setGroupIdTarget({ id: row.id, name: cls, waGroupId: row.wa_group_id || "" });
                                      setGroupIdValue(row.wa_group_id || "");
                                      setGroupIdDialogOpen(true);
                                    } catch (err: any) {
                                      toast.error("Gagal menyiapkan kelas: " + (err?.message || "Unknown error"));
                                    }
                                  }}
                                >
                                  <MessageCircle className={`h-4 w-4 ${info.waGroupId ? "text-success" : "text-muted-foreground"}`} />
                                </Button>
                              ) : (
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-40 cursor-not-allowed" disabled>
                                  <Lock className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              {subscriptionLoading
                                ? "Memeriksa paket..."
                                : canWhatsApp
                                  ? (info.waGroupId ? "WA Group: Terhubung" : "Atur ID Group WA")
                                  : "Upgrade paket untuk fitur WA Group"}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button variant="ghost" size="icon" className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameTarget({ id: info.id || "", oldName: cls });
                            setRenameValue(cls);
                            setRenameDialogOpen(true);
                          }}>
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        {info.id && (
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); handleDeleteClass(info.id!, cls); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors cursor-pointer"
                          onClick={() => navigate(`/students?class=${encodeURIComponent(cls)}`)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Absensi hari ini</span>
                        <span className="font-semibold">{totalRecorded}/{info.students.length}</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <motion.div className="h-full rounded-full bg-gradient-to-r from-primary to-success"
                          initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 0.8, delay: i * 0.05 }} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      <Badge className="bg-success/10 text-success border-0 text-[10px]">✓ {info.hadir}</Badge>
                      <Badge className="bg-warning/10 text-warning border-0 text-[10px]">📝 {info.izin}</Badge>
                      <Badge className="bg-blue-50 text-blue-600 border-0 text-[10px]">🤒 {info.sakit}</Badge>
                      <Badge className="bg-destructive/10 text-destructive border-0 text-[10px]">✗ {info.alfa}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Classes;