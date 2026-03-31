import { PageHeader } from "@/components/PageHeader";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus, Trash2, Users2, Mail, Lock, Loader2, Phone, Shield, Pencil, Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { PremiumGate } from "@/components/PremiumGate";

interface StaffMember {
  user_id: string;
  full_name: string;
  role: string;
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

  // Detail/Edit
  const [detailDialog, setDetailDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const schoolId = profile?.school_id;

  const fetchStaff = async () => {
    if (!schoolId) { setLoading(false); return; }
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").eq("school_id", schoolId);
    if (!profiles || profiles.length === 0) { setStaff([]); setLoading(false); return; }

    const userIds = profiles.map((p) => p.user_id);
    const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds).eq("role", "staff");

    const staffUserIds = new Set((roles || []).map((r) => r.user_id));
    const staffList: StaffMember[] = profiles
      .filter((p) => staffUserIds.has(p.user_id))
      .map((p) => ({ user_id: p.user_id, full_name: p.full_name, role: "staff" }));

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
        body: { email: formEmail, password: formPassword, full_name: formName, role: "staff", school_id: schoolId, phone: formPhone },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      toast.success(`Staff ${formName} berhasil ditambahkan`);
      setShowDialog(false);
      setFormName(""); setFormEmail(""); setFormPassword(""); setFormPhone("");
      fetchStaff();
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat akun staff");
    } finally { setCreating(false); }
  };

  const handleDelete = async (member: StaffMember) => {
    if (!confirm(`Hapus staff ${member.full_name}? Akun tidak akan dihapus, hanya role staff yang dicabut.`)) return;
    const { error } = await supabase.from("user_roles").delete().eq("user_id", member.user_id).eq("role", "staff");
    if (error) { toast.error("Gagal menghapus role staff"); } else { toast.success(`Role staff ${member.full_name} berhasil dicabut`); fetchStaff(); }
  };

  const openDetail = (member: StaffMember) => {
    setSelectedStaff(member);
    setEditName(member.full_name);
    setEditEmail("");
    setEditPhone("");
    setEditPassword("");
    setEditMode(false);
    setDetailDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedStaff || !editName.trim()) return;
    setSavingEdit(true);
    try {
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
      toast.success("Data berhasil diperbarui");
    } catch (err: any) {
      toast.error("Gagal update: " + err.message);
    }
    setSavingEdit(false);
    setDetailDialog(false);
    fetchStaff();
  };

  return (
    <PremiumGate featureLabel="Kelola Staff / Operator" featureKey="canMultiStaff" requiredPlan="School">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kelola Staff / Operator</h1>
          <p className="text-muted-foreground text-sm">Tambah dan kelola akun staff yang bisa mengoperasikan sistem</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gradient-primary hover:opacity-90">
          <Plus className="h-4 w-4 mr-2" /> Tambah Staff
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Memuat data...</div>
      ) : staff.length === 0 ? (
        <Card className="border-0 shadow-card">
          <CardContent className="p-10 text-center">
            <Users2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Belum ada staff/operator ditambahkan</p>
            <Button variant="outline" className="mt-4" onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> Tambah Staff Pertama
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
                    <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground text-lg font-bold shrink-0">
                      {member.full_name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm truncate">{member.full_name}</h3>
                      <Badge variant="secondary" className="text-[10px] mt-1">
                        <Shield className="h-3 w-3 mr-1" /> Staff / Operator
                      </Badge>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(member)}>
                        <Eye className="h-3.5 w-3.5 text-primary" />
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
            <DialogTitle>Tambah Staff / Operator Baru</DialogTitle>
            <DialogDescription>Buat akun login untuk staff yang bisa mengoperasikan sistem absensi</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input placeholder="Nama staff" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email (untuk login)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="staff@sekolah.com" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="pl-9" />
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
              {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Membuat...</> : <><Plus className="h-4 w-4 mr-2" /> Buat Akun Staff</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail/Edit Dialog */}
      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {editMode ? "Edit Staff" : "Detail Staff"}
            </DialogTitle>
          </DialogHeader>
          {selectedStaff && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground text-xl font-bold shrink-0">
                  {selectedStaff.full_name.charAt(0)}
                </div>
                <div className="flex-1">
                  {editMode ? (
                    <div className="space-y-1">
                      <Label className="text-xs">Nama</Label>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="font-semibold" />
                    </div>
                  ) : (
                    <h3 className="font-bold text-lg">{selectedStaff.full_name}</h3>
                  )}
                  <Badge variant="secondary" className="text-[10px] mt-1">
                    <Shield className="h-3 w-3 mr-1" /> Staff / Operator
                  </Badge>
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
