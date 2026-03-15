import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Save, Loader2, Send, History, Users, Power, Clock, Link2, CheckCircle2, AlertCircle } from "lucide-react";
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

const DEFAULT_ARRIVE = `📋 *Notifikasi Absensi Datang*\n\n{school_name}\n\nAnanda *{student_name}* (Kelas {class}) telah tercatat HADIR pada {day}, pukul {time}.\n\nNIS: {student_id}\nMetode: {method}\n\n_Pesan otomatis dari Smart School Attendance System_`;
const DEFAULT_DEPART = `📋 *Notifikasi Absensi Pulang*\n\n{school_name}\n\nAnanda *{student_name}* (Kelas {class}) telah tercatat PULANG pada {day}, pukul {time}.\n\nNIS: {student_id}\nMetode: {method}\n\n_Pesan otomatis dari Smart School Attendance System_`;
const DEFAULT_GROUP = `📋 *Notifikasi Absensi {type}*\n\n{school_name}\n\nSiswa *{student_name}* (Kelas {class}) telah tercatat {type} pada {day}, pukul {time}.\n\nMetode: {method}\n\n_Pesan otomatis dari Smart School Attendance System_`;

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
  <div className="mt-2 flex flex-wrap gap-1.5">
    {placeholders.map((p) => (
      <button
        key={p.key}
        type="button"
        className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-foreground transition hover:bg-secondary/80"
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

  const [classes, setClasses] = useState<{ name: string; wa_group_id: string | null }[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [groupMessage, setGroupMessage] = useState("");
  const [sendingGroup, setSendingGroup] = useState(false);

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
        supabase.from("classes").select("name, wa_group_id").eq("school_id", schoolId).order("name"),
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
    if (activeTab === "history") {
      void fetchLogs();
    }
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
    if (!schoolId) {
      toast.error("School ID tidak ditemukan.");
      return;
    }

    setSaving(true);

    // Auto-create integration record if it doesn't exist
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

      if (createErr) {
        setSaving(false);
        toast.error("Gagal menyimpan: " + createErr.message);
        return;
      }
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

  const handleSendToGroup = async () => {
    if (!selectedClass || !groupMessage.trim() || !schoolId) {
      toast.error("Pilih kelas dan isi pesan");
      return;
    }

    const cls = classes.find((c) => c.name === selectedClass);
    if (!cls?.wa_group_id) {
      toast.error("Kelas ini belum memiliki ID Group WhatsApp");
      return;
    }

    setSendingGroup(true);
    try {
      const res = await supabase.functions.invoke("send-whatsapp", {
        body: {
          school_id: schoolId,
          group_id: cls.wa_group_id,
          message: groupMessage,
          message_type: "group_broadcast",
        },
      });

      const data = res.data as any;
      if (data?.success) {
        toast.success(`Pesan berhasil dikirim ke group ${selectedClass}`);
        setGroupMessage("");
      } else {
        toast.error("Gagal: " + (data?.error || "Unknown error"));
      }
    } catch (err: any) {
      toast.error("Gagal: " + err.message);
    }
    setSendingGroup(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Memuat...</div>;
  }

  return (
    <PremiumGate featureLabel="WhatsApp Gateway" featureKey="canWhatsApp" requiredPlan="School">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
            WhatsApp
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Template pesan, broadcast group, dan riwayat pengiriman dalam satu halaman.
          </p>
        </div>


        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="template">Template WA</TabsTrigger>
            <TabsTrigger value="broadcast">Broadcast Group</TabsTrigger>
            <TabsTrigger value="history">Riwayat WA</TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Pengaturan Notifikasi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Power className="h-4 w-4" />
                    <div>
                      <p className="text-sm font-semibold">Status WhatsApp</p>
                      <p className="text-xs text-muted-foreground">Aktif/nonaktif untuk notifikasi scan otomatis</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={waEnabled ? "default" : "secondary"} className="text-[10px]">
                      {waEnabled ? "Aktif" : "Nonaktif"}
                    </Badge>
                    <Switch checked={waEnabled} onCheckedChange={handleToggleWa} />
                  </div>
                </div>

                {waEnabled && (
                  <div className="space-y-2 border-t pt-3">
                    <Label className="text-xs font-semibold">Target Pengiriman Otomatis saat Scan</Label>
                    <Select value={deliveryTarget} onValueChange={setDeliveryTarget}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DELIVERY_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Template Datang (Wali Murid)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea rows={6} className="font-mono text-xs" value={arriveTemplate} onChange={(e) => setArriveTemplate(e.target.value)} />
                <PlaceholderButtons placeholders={PLACEHOLDERS} onInsert={(key) => setArriveTemplate((prev) => prev + key)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Template Pulang (Wali Murid)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea rows={6} className="font-mono text-xs" value={departTemplate} onChange={(e) => setDepartTemplate(e.target.value)} />
                <PlaceholderButtons placeholders={PLACEHOLDERS} onInsert={(key) => setDepartTemplate((prev) => prev + key)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Template Group Kelas</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea rows={8} className="font-mono text-xs" value={groupTemplate} onChange={(e) => setGroupTemplate(e.target.value)} />
                <PlaceholderButtons placeholders={GROUP_PLACEHOLDERS} onInsert={(key) => setGroupTemplate((prev) => prev + key)} />
              </CardContent>
            </Card>

            <Button onClick={handleSaveSettings} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              Simpan Pengaturan
            </Button>
          </TabsContent>

          <TabsContent value="broadcast" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" />
                  Kirim Pesan ke Group Kelas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Pilih Kelas</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kelas..." />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.name} value={c.name}>
                          {c.name} {c.wa_group_id ? "(Siap)" : "(Belum ada group)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Isi Pesan</Label>
                  <Textarea
                    value={groupMessage}
                    onChange={(e) => setGroupMessage(e.target.value)}
                    rows={5}
                    placeholder="Ketik pesan yang akan dikirim ke group kelas..."
                  />
                </div>

                <Button onClick={handleSendToGroup} disabled={sendingGroup || !selectedClass || !groupMessage.trim()}>
                  {sendingGroup ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
                  Kirim ke Group
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-4 w-4" />
                  Riwayat Pengiriman
                </CardTitle>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Memuat riwayat...</div>
                ) : logs.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Belum ada riwayat pengiriman</div>
                ) : (
                  <div className="max-h-[500px] space-y-2 overflow-y-auto">
                    {logs.map((log: any) => (
                      <div key={log.id} className="flex items-start gap-3 rounded-lg bg-secondary/30 p-3 text-sm">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                          <MessageSquare className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {log.student_name && <span className="text-xs font-semibold">{log.student_name}</span>}
                            <Badge variant="secondary" className="text-[10px]">{log.message_type}</Badge>
                            <Badge variant={log.status === "sent" ? "default" : "destructive"} className="text-[10px]">
                              {log.status === "sent" ? "Terkirim" : "Gagal"}
                            </Badge>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{log.phone || log.group_id}</p>
                          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
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
