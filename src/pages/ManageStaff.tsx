import { PageHeader } from "@/components/PageHeader";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus, Trash2, Users2, Mail, Lock, Loader2, Phone, Shield, Pencil, GraduationCap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { PremiumGate } from "@/components/PremiumGate";

interface StaffMember {
  user_id: string;
  full_name: string;
  roles: string[]; // supports multiple roles
}

const ManageStaff = () => {
  const { profile } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRole, setFormRole] = useState<"staff" | "teacher">("staff");

  // Detail/Edit
  const [detailDialog, setDetailDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRoleStaff, setEditRoleStaff] = useState(false);
  const [editRoleTeacher, setEditRoleTeacher] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const schoolId = profile?.school_id;

  const fetchStaff = async () => {
    if (!schoolId) { setLoading(false); return; }
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").eq("school_id", schoolId);
    if (!profiles || profiles.length === 0) { setStaff([]); setLoading(false); return; }

    const userIds = profiles.map((p) => p.user_id);
    const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds).in("role", ["staff", "teacher"]);

    // Group roles by user_id
    const roleMap = new Map<string, string[]>();
    (roles || []).forEach((r) => {
      const existing = roleMap.get(r.user_id) || [];
      existing.push(r.role);
      roleMap.set(r.user_id, existing);
    });

    const staffList: StaffMember[] = profiles
      .filter((p) => roleMap.has(p.user_id))
      .map((p) => ({ user_id: p.user_id, full_name: p.full_name, roles: roleMap.get(p.user_id) || [] }));

    setStaff(staffList);
    setLoading(false);
  };

  useEffect(() => { fetchStaff(); }, [schoolId]);

  const handleCreate = async () => {
    if (!formName || !formEmail || !formPassword) { toast.error("Nama, email, dan password harus diisi"); return; }
    if (!schoolId) { toast.error("Data sekolah belum dimuat, silakan tunggu sebentar"); return; }
    if (formPassword.length < 6) { toast.error("Password minimal 6 karakter"); return; }

    setCreating(true);
    try {
      const res = await supabase.functions.invoke("create-user", {
        body: { email: formEmail, password: formPassword, full_name: formName, role: formRole, school_id: schoolId, phone: formPhone },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      const roleLabel = formRole === "teacher" ? "Guru" : "Staff";
      toast.success(`${roleLabel} ${formName} berhasil ditambahkan`);
      setShowDialog(false);
      setFormName(""); setFormEmail(""); setFormPassword(""); setFormPhone(""); setFormRole("staff");
      fetchStaff();
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat akun");
    } finally { setCreating(false); }
  };

  const handleDelete = async (member: StaffMember) => {
    if (!confirm(`Hapus semua role ${member.full_name}? Akun tidak akan dihapus, hanya role yang dicabut.`)) return;
    // Delete all staff/teacher roles
    for (const role of member.roles) {
      await supabase.from("user_roles").delete().eq("user_id", member.user_id).eq("role", role as any);
    }
    toast.success(`Role ${member.full_name} berhasil dicabut`);
    fetchStaff();
  };

  const openDetail = (member: StaffMember) => {
    setSelectedStaff(member);
    setEditName(member.full_name);
    setEditEmail("");
    setEditPhone("");
    setEditPassword("");
    setEditRoleStaff(member.roles.includes("staff"));
    setEditRoleTeacher(member.roles.includes("teacher"));
    setEditMode(false);
    setDetailDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedStaff || !editName.trim()) return;
    if (!editRoleStaff && !editRoleTeacher) {
      toast.error("Minimal pilih satu role (Staff atau Guru)");
      return;
    }
    setSavingEdit(true);
    try {
      // Update name, email, password via edge function
      const res = await supabase.functions.invoke("update-user", {
        body: {
          user_id: selectedStaff.user_id,
          full_name: editName.trim(),
          ...(editEmail.trim() ? { email: editEmail.trim() } : {}),
          ...(editPhone.trim() ? { phone: editPhone.trim() } : {}),
          ...(editPassword.trim() ? { password: editPassword.trim() } : {}),
        },
      });
      if (res.data?.error) throw new Error(res.data.error);

      // Sync roles
      const currentRoles = selectedStaff.roles;
      const wantedRoles: string[] = [];
      if (editRoleStaff) wantedRoles.push("staff");
      if (editRoleTeacher) wantedRoles.push("teacher");

      // Add missing roles
      for (const role of wantedRoles) {
        if (!currentRoles.includes(role)) {
          await supabase.from("user_roles").insert({ user_id: selectedStaff.user_id, role: role as any });
        }
      }
      // Remove unwanted roles
      for (const role of currentRoles) {
        if (!wantedRoles.includes(role)) {
          await supabase.from("user_roles").delete().eq("user_id", selectedStaff.user_id).eq("role", role as any);
        }
      }

      toast.success("Data berhasil diperbarui");
    } catch (err: any) {
      toast.error("Gagal update: " + err.message);
    }
    setSavingEdit(false);
    setDetailDialog(false);
    fetchStaff();
  };

  const getRoleBadges = (roles: string[]) => {
    return (
      <div className="flex flex-wrap gap-1 mt-0.5">
        {roles.includes("teacher") && (
          <Badge variant="secondary" className="text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400 border-0">
            <GraduationCap className="h-3 w-3 mr-1" /> Guru
          </Badge>
        )}
        {roles.includes("staff") && (
          <Badge variant="secondary" className="text-[10px]">
            <Shield className="h-3 w-3 mr-1" /> Operator
          </Badge>
        )}
      </div>
    );
  };

  return (
    <PremiumGate featureLabel="Kelola Guru & Staff" featureKey="canMultiStaff" requiredPlan="School">
    <div className="space-y-6">
      <PageHeader icon={Shield} title="Guru dan Staff" subtitle="Tambah dan kelola akun guru dan staff/operator" actions={
        <Button onClick={() => setShowDialog(true)} className="bg-white/20 hover:bg-white/30 text-white border border-white/20 rounded-xl text-xs">
          <Plus className="h-4 w-4 mr-2" /> Tambah Akun
        </Button>
      } />

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Memuat data...</div>
      ) : staff.length === 0 ? (
        <Card className="border-0 shadow-card">
          <CardContent className="p-10 text-center">
            <Users2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Belum ada guru/staff ditambahkan</p>
            <Button variant="outline" className="mt-4" onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> Tambah Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((member, i) => (
            <motion.div key={member.user_id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-0 shadow-card hover:shadow-elevated transition-all h-full">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-primary-foreground text-lg font-bold shrink-0 ${member.roles.includes("teacher") ? "bg-violet-500" : "gradient-primary"}`}>
                      {member.full_name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm truncate">{member.full_name}</h3>
                      {getRoleBadges(member.roles)}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(member)}>
                        <Pencil className="h-3.5 w-3.5 text-primary" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive/60 hover:text-destructive" onClick={() => handleDelete(member)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Guru / Staff Baru</DialogTitle>
            <DialogDescription>Buat akun login untuk guru atau staff operator</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Tipe Akun</Label>
              <Select value={formRole} onValueChange={(v) => setFormRole(v as "staff" | "teacher")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">
                    <span className="flex items-center gap-2"><Shield className="h-4 w-4" /> Staff / Operator</span>
                  </SelectItem>
                  <SelectItem value="teacher">
                    <span className="flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Guru</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input placeholder="Nama lengkap" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email (untuk login)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="email@sekolah.com" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="pl-9" />
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
            <Button onClick={handleCreate} disabled={creating} className="w-full gradient-primary hover:opacity-90">
              {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Membuat...</> : <><Plus className="h-4 w-4 mr-2" /> Buat Akun {formRole === "teacher" ? "Guru" : "Staff"}</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail/Edit Dialog */}
      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users2 className="h-5 w-5 text-primary" />
              {editMode ? "Edit Data" : "Detail"}
            </DialogTitle>
          </DialogHeader>
          {selectedStaff && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`h-14 w-14 rounded-xl flex items-center justify-center text-primary-foreground text-xl font-bold shrink-0 ${selectedStaff.roles.includes("teacher") ? "bg-violet-500" : "gradient-primary"}`}>
                  {selectedStaff.full_name.charAt(0)}
                </div>
                <div className="flex-1">
                  {editMode ? (
                    <div className="space-y-1">
                      <Label className="text-xs">Nama</Label>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="font-semibold" />
                    </div>
                  ) : (
                    <>
                      <h3 className="font-bold text-lg">{selectedStaff.full_name}</h3>
                      {getRoleBadges(selectedStaff.roles)}
                    </>
                  )}
                </div>
              </div>

              {editMode && (
                <div className="space-y-3">
                  {/* Role checkboxes */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Role / Hak Akses</Label>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={editRoleStaff} onCheckedChange={(v) => setEditRoleStaff(!!v)} />
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="text-sm">Staff / Operator</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={editRoleTeacher} onCheckedChange={(v) => setEditRoleTeacher(!!v)} />
                        <GraduationCap className="h-4 w-4 text-violet-500" />
                        <span className="text-sm">Guru</span>
                      </label>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Bisa memilih keduanya sekaligus</p>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Email Login</Label>
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

export default ManageStaff;
