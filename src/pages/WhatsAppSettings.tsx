import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Save, Loader2, Send, History, Users, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";
import { toast } from "sonner";
import { PremiumGate } from "@/components/PremiumGate";
import { motion } from "framer-motion";

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

const DEFAULT_ARRIVE = `📋 *Notifikasi Absensi Datang*\n\n{school_name}\n\nAnanda *{student_name}* (Kelas {class}) telah tercatat HADIR pada {day}, pukul {time}.\n\nNIS: {student_id}\nMetode: {method}\n\n_Pesan otomatis dari Smart School Attendance System_`;
const DEFAULT_DEPART = `📋 *Notifikasi Absensi Pulang*\n\n{school_name}\n\nAnanda *{student_name}* (Kelas {class}) telah tercatat PULANG pada {day}, pukul {time}.\n\nNIS: {student_id}\nMetode: {method}\n\n_Pesan otomatis dari Smart School Attendance System_`;

const PlaceholderButtons = ({ onInsert }: { onInsert: (key: string) => void }) => (
  <div className="flex flex-wrap gap-1 mt-2">
    {PLACEHOLDERS.map((p) => (
      <button key={p.key} type="button"
        className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        onClick={() => onInsert(p.key)}>
        {p.key} <span className="text-muted-foreground">({p.label})</span>
      </button>
    ))}
  </div>
);

const WhatsAppSettings = () => {
  const { profile } = useAuth();
  const features = useSubscriptionFeatures();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [arriveTemplate, setArriveTemplate] = useState(DEFAULT_ARRIVE);
  const [departTemplate, setDepartTemplate] = useState(DEFAULT_DEPART);
  const [integrationId, setIntegrationId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  // Group messaging
  const [classes, setClasses] = useState<{ name: string; wa_group_id: string | null }[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [groupMessage, setGroupMessage] = useState("");
  const [sendingGroup, setSendingGroup] = useState(false);

  // Message history
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const schoolId = profile?.school_id;

  useEffect(() => {
    if (!schoolId) return;
    const fetchData = async () => {
      const [intRes, classRes] = await Promise.all([
        supabase.from("school_integrations").select("*").eq("school_id", schoolId).eq("integration_type", "onesender").maybeSingle(),
        supabase.from("classes").select("name, wa_group_id").eq("school_id", schoolId).order("name"),
      ]);

      if (intRes.data) {
        const d = intRes.data as any;
        setIntegrationId(d.id);
        setIsActive(d.is_active);
        setArriveTemplate(d.attendance_arrive_template || DEFAULT_ARRIVE);
        setDepartTemplate(d.attendance_depart_template || DEFAULT_DEPART);
      }
      setClasses(classRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [schoolId]);

  const fetchLogs = async () => {
    if (!schoolId) return;
    setLogsLoading(true);
    const { data } = await supabase
      .from("wa_message_logs" as any)
      .select("*")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(50);
    setLogs(data || []);
    setLogsLoading(false);
  };

  const handleSaveTemplates = async () => {
    if (!schoolId || !integrationId) {
      toast.error("Integrasi WhatsApp belum dikonfigurasi. Hubungi administrator.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("school_integrations" as any).update({
      attendance_arrive_template: arriveTemplate,
      attendance_depart_template: departTemplate,
    }).eq("id", integrationId);
    setSaving(false);
    if (error) toast.error("Gagal menyimpan: " + error.message);
    else toast.success("Template berhasil disimpan!");
  };

  const handleSendToGroup = async () => {
    if (!selectedClass || !groupMessage.trim() || !schoolId) {
      toast.error("Pilih kelas dan isi pesan");
      return;
    }
    const cls = classes.find(c => c.name === selectedClass);
    if (!cls?.wa_group_id) {
      toast.error("Kelas ini belum memiliki ID Grup WhatsApp. Atur di halaman Kelas.");
      return;
    }
    setSendingGroup(true);
    try {
      const res = await supabase.functions.invoke("send-whatsapp", {
        body: { school_id: schoolId, group_id: cls.wa_group_id, message: groupMessage },
      });
      const data = res.data as any;
      if (data?.success) {
        toast.success(`Pesan berhasil dikirim ke grup ${selectedClass}`);
        setGroupMessage("");
      } else {
        toast.error("Gagal: " + (data?.error || "Unknown error"));
      }
    } catch (err: any) {
      toast.error("Gagal: " + err.message);
    }
    setSendingGroup(false);
  };

  if (loading) return <div className="flex items-center justify-center py-12 text-muted-foreground">Memuat...</div>;

  return (
    <PremiumGate featureLabel="WhatsApp Gateway" requiredPlan="Premium">
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Pengaturan WhatsApp
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Custom template notifikasi & kirim pesan ke grup kelas
          </p>
        </div>

        {!isActive && (
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="p-4 text-sm text-warning">
              ⚠️ Integrasi WhatsApp belum aktif untuk sekolah Anda. Hubungi administrator untuk mengaktifkan.
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="templates" className="text-xs">📝 Template</TabsTrigger>
            <TabsTrigger value="group" className="text-xs">👥 Grup Kelas</TabsTrigger>
            <TabsTrigger value="history" className="text-xs" onClick={fetchLogs}>📜 Riwayat</TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4 mt-4">
            <Card className="border-0 shadow-card">
              <CardHeader><CardTitle className="text-base">Template Notifikasi Absensi Datang</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Textarea value={arriveTemplate} onChange={(e) => setArriveTemplate(e.target.value)}
                  rows={6} className="font-mono text-xs" />
                <PlaceholderButtons onInsert={(key) => setArriveTemplate(arriveTemplate + key)} />
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card">
              <CardHeader><CardTitle className="text-base">Template Notifikasi Absensi Pulang</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Textarea value={departTemplate} onChange={(e) => setDepartTemplate(e.target.value)}
                  rows={6} className="font-mono text-xs" />
                <PlaceholderButtons onInsert={(key) => setDepartTemplate(departTemplate + key)} />
              </CardContent>
            </Card>

            <Button onClick={handleSaveTemplates} disabled={saving || !integrationId} className="gradient-primary hover:opacity-90">
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Simpan Template
            </Button>
          </TabsContent>

          {/* Group Messaging Tab */}
          <TabsContent value="group" className="space-y-4 mt-4">
            <Card className="border-0 shadow-card">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Kirim Pesan ke Grup Kelas</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Pilih Kelas</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger><SelectValue placeholder="Pilih kelas..." /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.name} value={c.name}>
                          {c.name} {c.wa_group_id ? "✅" : "❌ (Belum ada grup)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Isi Pesan</Label>
                  <Textarea value={groupMessage} onChange={(e) => setGroupMessage(e.target.value)}
                    rows={5} placeholder="Ketik pesan yang akan dikirim ke grup WhatsApp kelas..." />
                </div>
                <Button onClick={handleSendToGroup} disabled={sendingGroup || !selectedClass || !groupMessage.trim()}
                  className="gradient-primary hover:opacity-90">
                  {sendingGroup ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                  Kirim ke Grup
                </Button>

                {classes.filter(c => !c.wa_group_id).length > 0 && (
                  <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-lg p-2">
                    ⚠️ Beberapa kelas belum memiliki ID Grup WhatsApp. Atur di halaman <strong>Kelas</strong> → klik kelas → isi WA Group ID.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4 mt-4">
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" /> Riwayat Pengiriman Pesan
                </CardTitle>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">Memuat riwayat...</div>
                ) : logs.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Belum ada riwayat pengiriman pesan
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {logs.map((log: any, i: number) => (
                      <motion.div key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                        className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 text-sm">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <MessageSquare className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {log.student_name && <span className="font-semibold text-xs">{log.student_name}</span>}
                            <Badge variant="secondary" className="text-[10px]">{log.message_type}</Badge>
                            <Badge variant="secondary" className={`text-[10px] ${log.status === 'sent' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                              {log.status === 'sent' ? 'Terkirim' : 'Gagal'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{log.phone || log.group_id}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(log.created_at).toLocaleString("id-ID")}
                          </p>
                        </div>
                      </motion.div>
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
