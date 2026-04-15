import { PageHeader } from "@/components/PageHeader";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  GraduationCap, Plus, Trash2, UserCheck, Mail, Lock, Loader2, Phone, Pencil, Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { PremiumGate } from "@/components/PremiumGate";

interface ClassTeacher {
  id: string;
  user_id: string;
  class_name: string;
  school_id: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

interface TeacherOption {
  user_id: string;
  full_name: string;
}

  // Edit/Detail
  const [detailDialog, setDetailDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<{ user_id: string; name: string; email: string; phone: string; assignments: ClassTeacher[] } | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editClass, setEditClass] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const schoolId = profile?.school_id;

  const fetchData = async () => {
    if (!schoolId) { setLoading(false); return; }

    const [assignmentsRes, classesRes, studentsRes] = await Promise.all([
      supabase.from("class_teachers").select("*").eq("school_id", schoolId),
      supabase.from("classes").select("name").eq("school_id", schoolId).order("name"),
      supabase.from("students").select("class").eq("school_id", schoolId),
    ]);

    const rawData = assignmentsRes.data || [];
    const enriched: ClassTeacher[] = rawData.map((a) => ({ ...a, user_name: "", user_email: "" }));

    if (enriched.length > 0) {
      const userIds = [...new Set(enriched.map((a) => a.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const profileMap = new Map<string, string>();
      (profiles || []).forEach((p) => profileMap.set(p.user_id, p.full_name));
      enriched.forEach((a) => { a.user_name = profileMap.get(a.user_id) || "Unknown"; });
    }

    const classTableNames = (classesRes.data || []).map((c) => c.name);
    const studentClassNames = [...new Set((studentsRes.data || []).map((s) => s.class))];
    const allClasses = [...new Set([...classTableNames, ...studentClassNames])].sort();

    setAssignments(enriched);
    setClasses(allClasses);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [schoolId]);

  const handleCreate = async () => {
    if (!formName || !formEmail || !formPassword || !formClass) {
      toast.error("Nama, email, password, dan kelas harus diisi"); return;
    }
    if (!schoolId) { toast.error("Data sekolah belum dimuat, silakan tunggu sebentar"); return; }
    if (formPassword.length < 6) { toast.error("Password minimal 6 karakter"); return; }

    setCreating(true);
    try {
      const res = await supabase.functions.invoke("create-user", {
        body: { email: formEmail, password: formPassword, full_name: formName, role: "teacher", school_id: schoolId, phone: formPhone },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      const userId = res.data.user_id;
      const { error: assignError } = await supabase.from("class_teachers").insert({ user_id: userId, class_name: formClass, school_id: schoolId });
      if (assignError) throw assignError;

      toast.success(`Wali kelas ${formName} berhasil ditambahkan untuk kelas ${formClass}`);
      setShowDialog(false);
      setFormName(""); setFormEmail(""); setFormPassword(""); setFormClass(""); setFormPhone("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat wali kelas");
    } finally { setCreating(false); }
  };

  const handleDelete = async (assignment: ClassTeacher) => {
    if (!confirm(`Hapus penugasan wali kelas ${assignment.user_name} dari kelas ${assignment.class_name}?`)) return;
    const { error } = await supabase.from("class_teachers").delete().eq("id", assignment.id);
    if (error) { toast.error("Gagal menghapus penugasan"); } else { toast.success("Penugasan dihapus"); fetchData(); }
  };

  const openDetail = async (userId: string, name: string, teacherAssignments: ClassTeacher[]) => {
    setSelectedTeacher({ user_id: userId, name, email: "", phone: "", assignments: teacherAssignments });
    setEditName(name);
    setEditEmail("");
    setEditPhone("");
    setEditPassword("");
    setEditClass("");
    setEditMode(false);
    setDetailDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedTeacher || !editName.trim()) return;
    setSavingEdit(true);
    try {
      const res = await supabase.functions.invoke("update-user", {
        body: {
          user_id: selectedTeacher.user_id,
          full_name: editName.trim(),
          ...(editEmail.trim() ? { email: editEmail.trim() } : {}),
          ...(editPhone.trim() ? { phone: editPhone.trim() } : {}),
          ...(editPassword.trim() ? { password: editPassword.trim() } : {}),
        },
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success("Data berhasil diperbarui");
    } catch (err: any) {
      toast.error("Gagal update: " + err.message);
    }
    setSavingEdit(false);
    setDetailDialog(false);
    fetchData();
  };

  const handleAddClass = async () => {
    if (!selectedTeacher || !editClass || !schoolId) return;
    setSavingEdit(true);
    const { error } = await supabase.from("class_teachers").insert({
      user_id: selectedTeacher.user_id, class_name: editClass, school_id: schoolId,
    });
    if (error) { toast.error("Gagal: " + error.message); }
    else { toast.success(`Kelas ${editClass} ditambahkan`); setEditClass(""); }
    setSavingEdit(false);
    fetchData();
    const { data: newAssignments } = await supabase.from("class_teachers").select("*").eq("user_id", selectedTeacher.user_id).eq("school_id", schoolId);
    if (newAssignments) setSelectedTeacher({ ...selectedTeacher, assignments: newAssignments });
  };

  const grouped = assignments.reduce<Record<string, ClassTeacher[]>>((acc, a) => {
    const key = a.user_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  return (
    <PremiumGate featureLabel="Kelola Wali Kelas" requiredPlan="School">
    <div className="space-y-6">
      <PageHeader icon={GraduationCap} title="Kelola Wali Kelas" subtitle="Tambah dan kelola wali kelas untuk setiap kelas" actions={
        <Button onClick={() => setShowDialog(true)} className="bg-white/20 hover:bg-white/30 text-white border border-white/20 rounded-xl text-xs">
          <Plus className="h-4 w-4 mr-2" /> Tambah Wali Kelas
        </Button>
      } />

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Memuat data...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card className="border-0 shadow-card">
          <CardContent className="p-10 text-center">
            <UserCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Belum ada wali kelas yang ditugaskan</p>
            <Button variant="outline" className="mt-4" onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> Tambah Wali Kelas Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(grouped).map(([userId, teacherAssignments], i) => {
            const teacher = teacherAssignments[0];
            return (
              <motion.div key={userId} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="border-0 shadow-card hover:shadow-elevated transition-all h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground text-lg font-bold shrink-0">
                        {(teacher.user_name || "?").charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm truncate">{teacher.user_name}</h3>
                        <p className="text-[11px] text-muted-foreground">Wali Kelas</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(userId, teacher.user_name || "", teacherAssignments)}>
                          <Eye className="h-3.5 w-3.5 text-primary" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Kelas ({teacherAssignments.length})
                      </p>
                      {teacherAssignments.map((a) => (
                        <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">{a.class_name}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive/60 hover:text-destructive" onClick={() => handleDelete(a)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Wali Kelas Baru</DialogTitle>
            <DialogDescription>Buat akun login dan tugaskan ke kelas</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input placeholder="Nama wali kelas" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email (untuk login)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="wali@sekolah.com" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Minimal 6 karakter" type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>No. WhatsApp</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="08xxxxxxxxxx" type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Kelas yang Ditugaskan</Label>
              <Select value={formClass} onValueChange={setFormClass}>
                <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} disabled={creating} className="w-full gradient-primary hover:opacity-90">
              {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Membuat...</> : <><Plus className="h-4 w-4 mr-2" /> Buat & Tugaskan</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail/Edit Dialog */}
      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              {editMode ? "Edit Wali Kelas" : "Detail Wali Kelas"}
            </DialogTitle>
          </DialogHeader>
          {selectedTeacher && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground text-xl font-bold shrink-0">
                  {selectedTeacher.name.charAt(0)}
                </div>
                <div className="flex-1">
                  {editMode ? (
                    <div className="space-y-1">
                      <Label className="text-xs">Nama</Label>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="font-semibold" />
                    </div>
                  ) : (
                    <h3 className="font-bold text-lg">{selectedTeacher.name}</h3>
                  )}
                  <Badge variant="secondary" className="text-[10px] mt-1">Wali Kelas</Badge>
                </div>
              </div>

              {editMode && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Kosongkan jika tidak diubah" type="email" className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">No. WhatsApp</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Kosongkan jika tidak diubah" type="tel" className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Password Baru</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Kosongkan jika tidak diubah" type="password" className="pl-9" />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Kelas yang Ditugaskan</p>
                {selectedTeacher.assignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{a.class_name}</span>
                    </div>
                    {editMode && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive/60 hover:text-destructive" onClick={() => handleDelete(a)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {editMode && (
                <div className="space-y-2">
                  <Label className="text-xs">Tambah Kelas Baru</Label>
                  <div className="flex gap-2">
                    <Select value={editClass} onValueChange={setEditClass}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                      <SelectContent>
                        {classes.filter(c => !selectedTeacher.assignments.some(a => a.class_name === c)).map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={handleAddClass} disabled={!editClass || savingEdit}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {editMode ? (
                  <>
                    <Button variant="outline" onClick={() => setEditMode(false)} className="flex-1">Batal</Button>
                    <Button onClick={handleSaveEdit} disabled={savingEdit} className="flex-1 gradient-primary hover:opacity-90">
                      {savingEdit ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <><Pencil className="h-4 w-4 mr-1" /> Simpan</>}
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setEditMode(true)} className="w-full" variant="outline">
                    <Pencil className="h-4 w-4 mr-1" /> Edit Data
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </PremiumGate>
  );
};

export default ManageWaliKelas;
