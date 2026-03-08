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
  GraduationCap, Plus, Trash2, UserCheck, Mail, Lock, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface ClassTeacher {
  id: string;
  user_id: string;
  class_name: string;
  school_id: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

const ManageWaliKelas = () => {
  const { profile } = useAuth();
  const [assignments, setAssignments] = useState<ClassTeacher[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formClass, setFormClass] = useState("");
  const [formPhone, setFormPhone] = useState("");

  const schoolId = profile?.school_id;

  const fetchData = async () => {
    if (!schoolId) return;

    const [assignmentsRes, classesRes, studentsRes] = await Promise.all([
      supabase.from("class_teachers").select("*").eq("school_id", schoolId),
      supabase.from("classes").select("name").eq("school_id", schoolId).order("name"),
      supabase.from("students").select("class").eq("school_id", schoolId),
    ]);

    const rawData = assignmentsRes.data || [];
    const enriched: ClassTeacher[] = rawData.map((a) => ({ ...a, user_name: "" }));

    // Fetch profiles for each teacher
    if (enriched.length > 0) {
      const userIds = [...new Set(enriched.map((a) => a.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const profileMap = new Map<string, string>();
      (profiles || []).forEach((p) => profileMap.set(p.user_id, p.full_name));

      enriched.forEach((a) => {
        a.user_name = profileMap.get(a.user_id) || "Unknown";
      });
    }

    // Merge class names from classes table and unique student classes
    const classTableNames = (classesRes.data || []).map((c) => c.name);
    const studentClassNames = [...new Set((studentsRes.data || []).map((s) => s.class))];
    const allClasses = [...new Set([...classTableNames, ...studentClassNames])].sort();

    setAssignments(enriched);
    setClasses(allClasses);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [schoolId]);

  const handleCreate = async () => {
    if (!formName || !formEmail || !formPassword || !formClass || !schoolId) {
      toast.error("Semua field harus diisi");
      return;
    }
    if (formPassword.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }

    setCreating(true);
    try {
      // Create user via edge function
      const res = await supabase.functions.invoke("create-user", {
        body: {
          email: formEmail,
          password: formPassword,
          full_name: formName,
          role: "teacher",
          school_id: schoolId,
        },
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      const userId = res.data.user_id;

      // Create class_teacher assignment
      const { error: assignError } = await supabase
        .from("class_teachers")
        .insert({ user_id: userId, class_name: formClass, school_id: schoolId });

      if (assignError) throw assignError;

      toast.success(`Wali kelas ${formName} berhasil ditambahkan untuk kelas ${formClass}`);
      setShowDialog(false);
      setFormName("");
      setFormEmail("");
      setFormPassword("");
      setFormClass("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat wali kelas");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (assignment: ClassTeacher) => {
    if (!confirm(`Hapus penugasan wali kelas ${assignment.user_name} dari kelas ${assignment.class_name}?`)) return;

    const { error } = await supabase.from("class_teachers").delete().eq("id", assignment.id);
    if (error) {
      toast.error("Gagal menghapus penugasan");
    } else {
      toast.success("Penugasan dihapus");
      fetchData();
    }
  };

  // Group assignments by teacher
  const grouped = assignments.reduce<Record<string, ClassTeacher[]>>((acc, a) => {
    const key = a.user_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kelola Wali Kelas</h1>
          <p className="text-muted-foreground text-sm">Tambah dan kelola wali kelas untuk setiap kelas</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gradient-primary hover:opacity-90">
          <Plus className="h-4 w-4 mr-2" /> Tambah Wali Kelas
        </Button>
      </div>

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
              <Label>Kelas yang Ditugaskan</Label>
              <Select value={formClass} onValueChange={setFormClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} disabled={creating} className="w-full gradient-primary hover:opacity-90">
              {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Membuat...</> : <><Plus className="h-4 w-4 mr-2" /> Buat & Tugaskan</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageWaliKelas;
