import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare, Save, Loader2, Send, History, Users, Power, Clock, Link2,
  CheckCircle2, AlertCircle, FileText, Megaphone,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { PremiumGate } from "@/components/PremiumGate";

const PLACEHOLDERS = [
  { key: "{student_name}", label: "Nama Siswa" },
  { key: "{class}", label: "Kelas" },
  { key: "{time}", label: "Waktu" },
  { key: "{day}", label: "Nama Hari" },
  { key: "{student_id}", label: "NIS" },
  { key: "{method}", label: "Metode" },
  { key: "{parent_name}", label: "Nama Wali" },
  { key: "{school_name}", label: "Nama Sekolah" },
];

const GROUP_PLACEHOLDERS = [
  ...PLACEHOLDERS.filter((p) => p.key !== "{parent_name}"),
  { key: "{type}", label: "Tipe (Datang/Pulang)" },
];

const DEFAULT_ARRIVE = `📋 *Notifikasi Absensi Datang*\n\n{school_name}\n\nAnanda *{student_name}* (Kelas {class}) telah tercatat HADIR pada {day}, pukul {time}.\n\nNIS: {student_id}\nMetode: {method}\n\n_Pesan otomatis dari ATSkolla_`;
const DEFAULT_DEPART = `📋 *Notifikasi Absensi Pulang*\n\n{school_name}\n\nAnanda *{student_name}* (Kelas {class}) telah tercatat PULANG pada {day}, pukul {time}.\n\nNIS: {student_id}\nMetode: {method}\n\n_Pesan otomatis dari ATSkolla_`;
const DEFAULT_GROUP = `📋 *Notifikasi Absensi {type}*\n\n{school_name}\n\nSiswa *{student_name}* (Kelas {class}) telah tercatat {type} pada {day}, pukul {time}.\n\nMetode: {method}\n\n_Pesan otomatis dari ATSkolla_`;

const DELIVERY_OPTIONS = [
  { value: "parent_only", label: "Hanya Wali Murid" },
  { value: "group_only", label: "Hanya Group Kelas" },
  { value: "both", label: "Group Kelas dan Wali Murid" },
];

const PlaceholderButtons = ({
  placeholders,
  onInsert,
}: {
  placeholders: typeof PLACEHOLDERS;
  onInsert: (key: string) => void;
}) => (
  <div className="mt-3 flex flex-wrap gap-1.5">
    {placeholders.map((p) => (
      <button
        key={p.key}
        type="button"
        className="rounded-full bg-primary/5 border border-primary/10 px-2.5 py-1 text-[10px] text-foreground transition hover:bg-primary/10 hover:border-primary/20 font-medium"
        onClick={() => onInsert(p.key)}
      >
        {p.key} <span className="text-muted-foreground">({p.label})</span>
      </button>
    ))}
  </div>
);

const WhatsAppSettings = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("template");

  const [arriveTemplate, setArriveTemplate] = useState(DEFAULT_ARRIVE);
  const [departTemplate, setDepartTemplate] = useState(DEFAULT_DEPART);
  const [groupTemplate, setGroupTemplate] = useState(DEFAULT_GROUP);
  const [integrationId, setIntegrationId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [waEnabled, setWaEnabled] = useState(true);
  const [deliveryTarget, setDeliveryTarget] = useState("parent_only");

  const [classes, setClasses] = useState<{ id: string; name: string; wa_group_id: string | null }[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [groupMessage, setGroupMessage] = useState("");
  const [sendingGroup, setSendingGroup] = useState(false);
  const [editingGroupIds, setEditingGroupIds] = useState<Record<string, string>>({});
  const [savingGroupId, setSavingGroupId] = useState<string | null>(null);

  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const schoolId = profile?.school_id;

  useEffect(() => {
    if (!schoolId) return;
    const fetchData = async () => {
      const [intRes, classRes] = await Promise.all([
        supabase
          .from("school_integrations")
          .select("*")
          .eq("school_id", schoolId)
          .eq("integration_type", "onesender")
          .maybeSingle(),
        supabase.from("classes").select("id, name, wa_group_id").eq("school_id", schoolId).order("name"),
      ]);

      if (intRes.data) {
        const d = intRes.data as any;
        setIntegrationId(d.id);
        setIsActive(d.is_active);
        setWaEnabled(d.wa_enabled !== false);
        setDeliveryTarget(d.wa_delivery_target || "parent_only");
        setArriveTemplate(d.attendance_arrive_template || DEFAULT_ARRIVE);
        setDepartTemplate(d.attendance_depart_template || DEFAULT_DEPART);
        setGroupTemplate(d.attendance_group_template || DEFAULT_GROUP);
      }

      setClasses(classRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [schoolId]);

  useEffect(() => {
    if (activeTab === "history") void fetchLogs();
  }, [activeTab]);

  const fetchLogs = async () => {
    if (!schoolId) return;
    setLogsLoading(true);
    const { data } = await supabase
      .from("wa_message_logs" as any)
      .select("*")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(100);
    setLogs(data || []);
    setLogsLoading(false);
  };

  const handleSaveSettings = async () => {
    if (!schoolId) { toast.error("School ID tidak ditemukan."); return; }
    setSaving(true);

    if (!integrationId) {
      const { data: newInt, error: createErr } = await supabase
        .from("school_integrations")
        .insert({
          school_id: schoolId,
          integration_type: "onesender",
          is_active: false,
          wa_enabled: waEnabled,
          wa_delivery_target: deliveryTarget,
          attendance_arrive_template: arriveTemplate,
          attendance_depart_template: departTemplate,
          attendance_group_template: groupTemplate,
        })
        .select("id")
        .single();

      if (createErr) { setSaving(false); toast.error("Gagal menyimpan: " + createErr.message); return; }
      setIntegrationId(newInt.id);
      setSaving(false);
      toast.success("Pengaturan WhatsApp berhasil disimpan");
      return;
    }

    const { error } = await supabase
      .from("school_integrations" as any)
      .update({
        attendance_arrive_template: arriveTemplate,
        attendance_depart_template: departTemplate,
        attendance_group_template: groupTemplate,
        wa_delivery_target: deliveryTarget,
        wa_enabled: waEnabled,
      })
      .eq("id", integrationId);

    setSaving(false);
    if (error) toast.error("Gagal menyimpan: " + error.message);
    else toast.success("Pengaturan WhatsApp berhasil disimpan");
  };

  const handleToggleWa = async (val: boolean) => {
    setWaEnabled(val);
    if (integrationId) {
      await supabase.from("school_integrations" as any).update({ wa_enabled: val }).eq("id", integrationId);
      toast.success(val ? "WhatsApp diaktifkan" : "WhatsApp dinonaktifkan");
    }
  };

  const handleSaveClassGroupId = async (classId: string, className: string) => {
    setSavingGroupId(classId);
    const newValue = editingGroupIds[classId]?.trim() || null;
    const { error } = await supabase.from("classes").update({ wa_group_id: newValue }).eq("id", classId);
    setSavingGroupId(null);
    if (error) { toast.error("Gagal menyimpan: " + error.message); return; }
    toast.success(`ID Group WA kelas "${className}" berhasil disimpan`);
    setClasses(prev => prev.map(c => c.id === classId ? { ...c, wa_group_id: newValue } : c));
  };

  const handleSendToGroup = async () => {
    if (!selectedClass || !groupMessage.trim() || !schoolId) { toast.error("Pilih kelas dan isi pesan"); return; }
    const cls = classes.find((c) => c.name === selectedClass);
    if (!cls?.wa_group_id) { toast.error("Kelas ini belum memiliki ID Group WhatsApp"); return; }

    setSendingGroup(true);
    try {
      const res = await supabase.functions.invoke("send-whatsapp", {
        body: { school_id: schoolId, group_id: cls.wa_group_id, message: groupMessage, message_type: "group_broadcast" },
      });
      const data = res.data as any;
      if (data?.success) { toast.success(`Pesan berhasil dikirim ke group ${selectedClass}`); setGroupMessage(""); }
      else toast.error("Gagal: " + (data?.error || "Unknown error"));
    } catch (err: any) { toast.error("Gagal: " + err.message); }
    setSendingGroup(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const connectedCount = classes.filter(c => c.wa_group_id).length;

  return (
    <PremiumGate featureLabel="WhatsApp Gateway" featureKey="canWhatsApp" requiredPlan="School">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center shadow-md">
            <MessageSquare className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">WhatsApp</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Template pesan, broadcast group, dan riwayat pengiriman
            </p>
          </div>
        </div>

        {/* Status Card */}
        <Card className="border-0 shadow-card overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${waEnabled ? "bg-success/10" : "bg-muted"}`}>
                  <Power className={`h-4 w-4 ${waEnabled ? "text-success" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Status WhatsApp</p>
                  <p className="text-[10px] text-muted-foreground">Notifikasi otomatis saat scan absensi</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={waEnabled ? "default" : "secondary"} className={`text-[10px] ${waEnabled ? "bg-success/10 text-success border-success/20" : ""}`}>
                  {waEnabled ? "Aktif" : "Nonaktif"}
                </Badge>
                <Switch checked={waEnabled} onCheckedChange={handleToggleWa} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-11 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="template" className="rounded-lg text-xs sm:text-sm gap-1.5 data-[state=active]:shadow-sm">
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Template</span>
            </TabsTrigger>
            <TabsTrigger value="group-id" className="rounded-lg text-xs sm:text-sm gap-1.5 data-[state=active]:shadow-sm">
              <Link2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Group Kelas</span>
            </TabsTrigger>
            <TabsTrigger value="broadcast" className="rounded-lg text-xs sm:text-sm gap-1.5 data-[state=active]:shadow-sm">
              <Megaphone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Broadcast</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg text-xs sm:text-sm gap-1.5 data-[state=active]:shadow-sm">
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Riwayat</span>
            </TabsTrigger>
          </TabsList>

          {/* ═══════ TEMPLATE TAB ═══════ */}
          <TabsContent value="template" className="mt-4 space-y-4">
            {waEnabled && (
              <Card className="border-0 shadow-card">
                <CardContent className="p-4">
                  <Label className="text-xs font-semibold text-foreground">Target Pengiriman Otomatis</Label>
                  <p className="text-[10px] text-muted-foreground mb-2">Pilih tujuan pengiriman notifikasi saat scan absensi</p>
                  <Select value={deliveryTarget} onValueChange={setDeliveryTarget}>
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DELIVERY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}

            {[
              { title: "Template Datang", subtitle: "Dikirim ke wali murid saat absensi datang", value: arriveTemplate, setter: setArriveTemplate, placeholders: PLACEHOLDERS },
              { title: "Template Pulang", subtitle: "Dikirim ke wali murid saat absensi pulang", value: departTemplate, setter: setDepartTemplate, placeholders: PLACEHOLDERS },
              { title: "Template Group Kelas", subtitle: "Dikirim ke group WhatsApp kelas", value: groupTemplate, setter: setGroupTemplate, placeholders: GROUP_PLACEHOLDERS },
            ].map((tmpl) => (
              <Card key={tmpl.title} className="border-0 shadow-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/20">
                  <h3 className="text-sm font-bold text-foreground">{tmpl.title}</h3>
                  <p className="text-[10px] text-muted-foreground">{tmpl.subtitle}</p>
                </div>
                <CardContent className="p-4">
                  <Textarea
                    rows={6}
                    className="font-mono text-xs bg-muted/30 border-border/50 focus:bg-background transition-colors"
                    value={tmpl.value}
                    onChange={(e) => tmpl.setter(e.target.value)}
                  />
                  <PlaceholderButtons placeholders={tmpl.placeholders} onInsert={(key) => tmpl.setter((prev: string) => prev + key)} />
                </CardContent>
              </Card>
            ))}

            <Button onClick={handleSaveSettings} disabled={saving} className="gradient-primary hover:opacity-90 shadow-md h-10 px-6">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Simpan Pengaturan
            </Button>
          </TabsContent>

          {/* ═══════ GROUP ID TAB ═══════ */}
          <TabsContent value="group-id" className="mt-4">
            <Card className="border-0 shadow-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-primary" />
                    ID Group WhatsApp per Kelas
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Masukkan ID Group WhatsApp untuk setiap kelas
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <CheckCircle2 className="h-3 w-3 text-success" />
                  {connectedCount}/{classes.length} terhubung
                </Badge>
              </div>
              <CardContent className="p-4">
                {classes.length === 0 ? (
                  <div className="py-8 text-center">
                    <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Belum ada data kelas</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {classes.map((cls) => (
                      <div
                        key={cls.id}
                        className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                          cls.wa_group_id
                            ? "border-success/20 bg-success/[0.02]"
                            : "border-border bg-background hover:border-primary/20"
                        }`}
                      >
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                          cls.wa_group_id ? "bg-success/10" : "bg-muted"
                        }`}>
                          {cls.wa_group_id ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-sm font-semibold text-foreground">{cls.name}</span>
                            <Badge className={`text-[9px] px-1.5 py-0 border-0 ${
                              cls.wa_group_id ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                            }`}>
                              {cls.wa_group_id ? "Terhubung" : "Belum diisi"}
                            </Badge>
                          </div>
                          <Input
                            placeholder="120363XXXXXXXXX@g.us"
                            defaultValue={cls.wa_group_id || ""}
                            onChange={(e) => setEditingGroupIds(prev => ({ ...prev, [cls.id]: e.target.value }))}
                            className="text-xs h-8 bg-muted/30 focus:bg-background transition-colors"
                          />
                        </div>
                        <Button
                          size="sm"
                          variant={cls.wa_group_id ? "outline" : "default"}
                          className={`shrink-0 h-8 w-8 p-0 ${!cls.wa_group_id ? "gradient-primary hover:opacity-90" : ""}`}
                          disabled={savingGroupId === cls.id}
                          onClick={() => handleSaveClassGroupId(cls.id, cls.name)}
                        >
                          {savingGroupId === cls.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════ BROADCAST TAB ═══════ */}
          <TabsContent value="broadcast" className="mt-4">
            <Card className="border-0 shadow-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/20">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-primary" />
                  Kirim Pesan ke Group Kelas
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Broadcast pesan manual ke group WhatsApp kelas</p>
              </div>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Pilih Kelas</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue placeholder="Pilih kelas..." />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.name} value={c.name}>
                          <span className="flex items-center gap-2">
                            {c.name}
                            {c.wa_group_id ? (
                              <Badge className="bg-success/10 text-success border-0 text-[9px] px-1 py-0">Siap</Badge>
                            ) : (
                              <Badge className="bg-muted text-muted-foreground border-0 text-[9px] px-1 py-0">Belum</Badge>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Isi Pesan</Label>
                  <Textarea
                    value={groupMessage}
                    onChange={(e) => setGroupMessage(e.target.value)}
                    rows={5}
                    placeholder="Ketik pesan yang akan dikirim ke group kelas..."
                    className="bg-muted/30 focus:bg-background transition-colors"
                  />
                </div>

                <Button
                  onClick={handleSendToGroup}
                  disabled={sendingGroup || !selectedClass || !groupMessage.trim()}
                  className="gradient-primary hover:opacity-90 shadow-md h-10 px-6"
                >
                  {sendingGroup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Kirim ke Group
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════ HISTORY TAB ═══════ */}
          <TabsContent value="history" className="mt-4">
            <Card className="border-0 shadow-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/20">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  Riwayat Pengiriman
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">100 pesan terakhir yang dikirim</p>
              </div>
              <CardContent className="p-4">
                {logsLoading ? (
                  <div className="py-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                    <p className="text-xs text-muted-foreground mt-2">Memuat riwayat...</p>
                  </div>
                ) : logs.length === 0 ? (
                  <div className="py-8 text-center">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Belum ada riwayat pengiriman</p>
                  </div>
                ) : (
                  <div className="max-h-[500px] space-y-2 overflow-y-auto">
                    {logs.map((log: any) => (
                      <div
                        key={log.id}
                        className={`flex items-start gap-3 rounded-xl border p-3 transition-all ${
                          log.status === "sent"
                            ? "border-success/15 bg-success/[0.02]"
                            : "border-destructive/15 bg-destructive/[0.02]"
                        }`}
                      >
                        <div className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${
                          log.status === "sent" ? "bg-success/10" : "bg-destructive/10"
                        }`}>
                          {log.status === "sent" ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {log.student_name && <span className="text-xs font-semibold text-foreground">{log.student_name}</span>}
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{log.message_type}</Badge>
                            <Badge className={`text-[9px] px-1.5 py-0 border-0 ${
                              log.status === "sent" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                            }`}>
                              {log.status === "sent" ? "Terkirim" : "Gagal"}
                            </Badge>
                          </div>
                          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{log.phone || log.group_id}</p>
                          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(log.created_at).toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PremiumGate>
  );
};

export default WhatsAppSettings;
