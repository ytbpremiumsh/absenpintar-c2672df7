import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Save, Loader2, Send, School, Pencil, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface IntegrationData {
  id: string;
  school_id: string;
  school_name: string;
  api_url: string;
  api_key: string;
  is_active: boolean;
  message_template: string;
  attendance_arrive_template: string;
  attendance_depart_template: string;
}

const DEFAULT_ARRIVE_TEMPLATE = `📋 *Notifikasi Absensi Datang*\n\n{school_name}\n\nAnanda *{student_name}* (Kelas {class}) telah tercatat HADIR pada {day}, pukul {time}.\n\nNIS: {student_id}\nMetode: {method}\n\n_Pesan otomatis dari Smart School Attendance System_`;

const DEFAULT_DEPART_TEMPLATE = `📋 *Notifikasi Absensi Pulang*\n\n{school_name}\n\nAnanda *{student_name}* (Kelas {class}) telah tercatat PULANG pada {day}, pukul {time}.\n\nNIS: {student_id}\nMetode: {method}\n\n_Pesan otomatis dari Smart School Attendance System_`;

const DEFAULT_GROUP_TEMPLATE = `📋 *Notifikasi Absensi {type}*\n\n{school_name}\n\nSiswa *{student_name}* (Kelas {class}) telah tercatat {type} pada {day}, pukul {time}.\n\nMetode: {method}\n\n_Pesan otomatis dari Smart School Attendance System_`;

const ATTENDANCE_PLACEHOLDERS = [
  { key: "{student_name}", label: "Nama Siswa" },
  { key: "{class}", label: "Kelas" },
  { key: "{time}", label: "Waktu" },
  { key: "{day}", label: "Nama Hari" },
  { key: "{student_id}", label: "NIS" },
  { key: "{method}", label: "Metode Absen" },
  { key: "{parent_name}", label: "Nama Wali" },
  { key: "{school_name}", label: "Nama Sekolah" },
];

const GROUP_PLACEHOLDERS = [
  ...ATTENDANCE_PLACEHOLDERS,
  { key: "{type}", label: "Tipe (Datang/Pulang)" },
];

const PlaceholderButtons = ({ placeholders, onInsert }: { placeholders: typeof ATTENDANCE_PLACEHOLDERS; onInsert: (key: string) => void }) => (
  <div className="flex flex-wrap gap-1 mt-2">
    {placeholders.map((p) => (
      <button
        key={p.key}
        type="button"
        className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        onClick={() => onInsert(p.key)}
      >
        {p.key} <span className="text-muted-foreground">({p.label})</span>
      </button>
    ))}
  </div>
);

const SuperAdminWhatsApp = () => {
  const [integrations, setIntegrations] = useState<IntegrationData[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<IntegrationData | null>(null);
  const [form, setForm] = useState({
    school_id: "",
    api_url: "http://proxy.onesender.net/api/v1/messages",
    api_key: "",
    is_active: false,
    message_template: "",
    attendance_arrive_template: DEFAULT_ARRIVE_TEMPLATE,
    attendance_depart_template: DEFAULT_DEPART_TEMPLATE,
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testDialogId, setTestDialogId] = useState<string | null>(null);

  const fetchData = async () => {
    const [intRes, schoolsRes] = await Promise.all([
      supabase.from("school_integrations" as any).select("*").eq("integration_type", "onesender"),
      supabase.from("schools").select("id, name"),
    ]);

    const schoolsList = schoolsRes.data || [];
    setSchools(schoolsList);

    const mapped = (intRes.data || []).map((i: any) => ({
      ...i,
      school_name: schoolsList.find((s: any) => s.id === i.school_id)?.name || "—",
    }));
    setIntegrations(mapped);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      school_id: "", api_url: "http://proxy.onesender.net/api/v1/messages", api_key: "", is_active: false,
      message_template: "",
      attendance_arrive_template: DEFAULT_ARRIVE_TEMPLATE,
      attendance_depart_template: DEFAULT_DEPART_TEMPLATE,
    });
    setDialogOpen(true);
  };

  const openEdit = (int: IntegrationData) => {
    setEditing(int);
    setForm({
      school_id: int.school_id, api_url: int.api_url, api_key: int.api_key, is_active: int.is_active,
      message_template: int.message_template || "",
      attendance_arrive_template: int.attendance_arrive_template || DEFAULT_ARRIVE_TEMPLATE,
      attendance_depart_template: int.attendance_depart_template || DEFAULT_DEPART_TEMPLATE,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.school_id) { toast.error("Pilih sekolah"); return; }
    if (!form.api_url || !form.api_key) { toast.error("API URL dan API Key wajib diisi"); return; }
    setSaving(true);

    const payload = {
      school_id: form.school_id,
      integration_type: "onesender",
      api_url: form.api_url,
      api_key: form.api_key,
      is_active: form.is_active,
      message_template: form.message_template,
      attendance_arrive_template: form.attendance_arrive_template,
      attendance_depart_template: form.attendance_depart_template,
    };

    let error;
    if (editing) {
      ({ error } = await supabase.from("school_integrations" as any).update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("school_integrations" as any).insert(payload));
    }

    setSaving(false);
    if (error) {
      toast.error("Gagal menyimpan: " + error.message);
    } else {
      toast.success(editing ? "Berhasil diupdate" : "Integrasi berhasil ditambahkan");
      setDialogOpen(false);
      fetchData();
    }
  };

  const handleToggle = async (int: IntegrationData) => {
    const { error } = await supabase
      .from("school_integrations" as any)
      .update({ is_active: !int.is_active })
      .eq("id", int.id);
    if (error) { toast.error("Gagal: " + error.message); return; }
    toast.success(int.is_active ? "Dinonaktifkan" : "Diaktifkan");
    fetchData();
  };

  const handleTest = async (int: IntegrationData) => {
    if (!testPhone.trim()) { toast.error("Masukkan nomor WhatsApp"); return; }
    setTesting(int.id);
    try {
      const res = await supabase.functions.invoke("send-whatsapp", {
        body: {
          phone: testPhone.replace(/\D/g, ""),
          message: `✅ Tes koneksi WhatsApp Gateway untuk ${int.school_name} berhasil!\n\nPesan ini dikirim dari Smart School Pickup System.`,
          api_url: int.api_url,
          api_key: int.api_key,
        },
      });
      const data = res.data as any;
      if (data?.success) {
        toast.success("Pesan tes berhasil dikirim!");
      } else {
        toast.error("Gagal: " + (data?.error || "Unknown error"));
      }
    } catch (err: any) {
      toast.error("Gagal: " + (err.message || "Unknown error"));
    }
    setTesting(null);
    setTestDialogId(null);
    setTestPhone("");
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            WhatsApp Gateway
          </h1>
          <p className="text-muted-foreground text-sm">Kelola integrasi OneSender & template notifikasi per sekolah</p>
        </div>
        <Button onClick={openCreate} className="gradient-primary text-primary-foreground">
          <Plus className="h-4 w-4 mr-1" /> Tambah Integrasi
        </Button>
      </div>

      {integrations.length === 0 ? (
        <Card className="border-0 shadow-card">
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada integrasi WhatsApp</p>
            <Button variant="outline" className="mt-3" onClick={openCreate}>Tambah Sekarang</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {integrations.map((int, i) => (
            <motion.div key={int.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="border-0 shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                      <School className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground truncate">{int.school_name}</h3>
                      <p className="text-[11px] text-muted-foreground font-mono truncate">{int.api_url}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-[10px] ${int.is_active ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"}`}>
                          {int.is_active ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setTestDialogId(int.id); setTestPhone(""); }}>
                        <Send className="h-3.5 w-3.5 mr-1" /> Tes
                      </Button>
                      <Switch checked={int.is_active} onCheckedChange={() => handleToggle(int)} />
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(int)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Integrasi" : "Tambah Integrasi WhatsApp"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Sekolah</Label>
              <Select value={form.school_id} onValueChange={(v) => setForm({ ...form, school_id: v })} disabled={!!editing}>
                <SelectTrigger><SelectValue placeholder="Pilih sekolah" /></SelectTrigger>
                <SelectContent>
                  {schools.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>API URL</Label>
              <Input value={form.api_url} onChange={(e) => setForm({ ...form, api_url: e.target.value })} placeholder="http://proxy.onesender.net/api/v1/messages" />
            </div>
            <div>
              <Label>API Key / Token</Label>
              <Input type="password" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} placeholder="Token OneSender" />
            </div>

            {/* Template Tabs */}
            <Tabs defaultValue="arrive" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="arrive" className="text-xs">📥 Absensi Datang</TabsTrigger>
                <TabsTrigger value="depart" className="text-xs">📤 Absensi Pulang</TabsTrigger>
              </TabsList>

              <TabsContent value="arrive" className="space-y-2 mt-3">
                <Label className="text-xs text-muted-foreground">Template Notifikasi Absensi Datang</Label>
                <Textarea
                  value={form.attendance_arrive_template}
                  onChange={(e) => setForm({ ...form, attendance_arrive_template: e.target.value })}
                  rows={6}
                  className="font-mono text-xs"
                />
                <PlaceholderButtons placeholders={ATTENDANCE_PLACEHOLDERS} onInsert={(key) => setForm({ ...form, attendance_arrive_template: form.attendance_arrive_template + key })} />
              </TabsContent>

              <TabsContent value="depart" className="space-y-2 mt-3">
                <Label className="text-xs text-muted-foreground">Template Notifikasi Absensi Pulang</Label>
                <Textarea
                  value={form.attendance_depart_template}
                  onChange={(e) => setForm({ ...form, attendance_depart_template: e.target.value })}
                  rows={6}
                  className="font-mono text-xs"
                />
                <PlaceholderButtons placeholders={ATTENDANCE_PLACEHOLDERS} onInsert={(key) => setForm({ ...form, attendance_depart_template: form.attendance_depart_template + key })} />
              </TabsContent>
            </Tabs>

            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Aktifkan</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground">
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              {editing ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={!!testDialogId} onOpenChange={() => setTestDialogId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Tes Kirim Pesan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nomor WhatsApp Tujuan</Label>
              <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="6281234567890" />
              <p className="text-[11px] text-muted-foreground mt-1">Format internasional (62...)</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                const int = integrations.find((i) => i.id === testDialogId);
                if (int) handleTest(int);
              }}
              disabled={testing === testDialogId}
              variant="outline"
            >
              {testing === testDialogId ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Kirim Tes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminWhatsApp;
