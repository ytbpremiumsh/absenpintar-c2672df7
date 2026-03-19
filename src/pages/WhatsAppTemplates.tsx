import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Save, Loader2, Power, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { PremiumGate } from "@/components/PremiumGate";

const PLACEHOLDERS = [
  { key: "{student_name}", label: "Nama Siswa" },
  { key: "{class}", label: "Kelas" },
  { key: "{time}", label: "Waktu" },
  { key: "{day}", label: "Nama Hari" },
  { key: "{date}", label: "Tanggal" },
  { key: "{student_id}", label: "NIS" },
  { key: "{method}", label: "Metode" },
  { key: "{parent_name}", label: "Nama Wali" },
  { key: "{school_name}", label: "Nama Sekolah" },
];

const GROUP_PLACEHOLDERS = [
  ...PLACEHOLDERS.filter(p => p.key !== "{parent_name}"),
  { key: "{type}", label: "Tipe (Datang/Pulang)" },
];

const DEFAULT_ARRIVE = `📋 *Notifikasi Absensi Datang*\n\n{school_name}\n\nAnanda *{student_name}* (Kelas {class}) telah tercatat HADIR pada {day}, pukul {time}.\n\nNIS: {student_id}\nMetode: {method}\n\n_Pesan otomatis dari ATSkolla_`;
const DEFAULT_DEPART = `📋 *Notifikasi Absensi Pulang*\n\n{school_name}\n\nAnanda *{student_name}* (Kelas {class}) telah tercatat PULANG pada {day}, pukul {time}.\n\nNIS: {student_id}\nMetode: {method}\n\n_Pesan otomatis dari ATSkolla_`;
const DEFAULT_GROUP = `📋 *Notifikasi Absensi {type}*\n\n{school_name}\n\nSiswa *{student_name}* (Kelas {class}) telah tercatat {type} pada {day}, pukul {time}.\n\nMetode: {method}\n\n_Pesan otomatis dari ATSkolla_`;

const DELIVERY_OPTIONS = [
  { value: "parent_only", label: "Hanya Wali Murid" },
  { value: "group_only", label: "Hanya Group Kelas" },
  { value: "both", label: "Group Kelas & Wali Murid" },
];

const PlaceholderButtons = ({ placeholders, onInsert }: { placeholders: typeof PLACEHOLDERS; onInsert: (key: string) => void }) => (
  <div className="flex flex-wrap gap-1 mt-2">
    {placeholders.map((p) => (
      <button key={p.key} type="button"
        className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        onClick={() => onInsert(p.key)}>
        {p.key} <span className="text-muted-foreground">({p.label})</span>
      </button>
    ))}
  </div>
);

const WhatsAppTemplates = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [arriveTemplate, setArriveTemplate] = useState(DEFAULT_ARRIVE);
  const [departTemplate, setDepartTemplate] = useState(DEFAULT_DEPART);
  const [groupTemplate, setGroupTemplate] = useState(DEFAULT_GROUP);
  const [integrationId, setIntegrationId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [waEnabled, setWaEnabled] = useState(true);
  const [deliveryTarget, setDeliveryTarget] = useState("parent_only");

  const schoolId = profile?.school_id;

  useEffect(() => {
    if (!schoolId) return;
    supabase.from("school_integrations").select("*").eq("school_id", schoolId).eq("integration_type", "onesender").maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d = data as any;
          setIntegrationId(d.id);
          setIsActive(d.is_active);
          setWaEnabled(d.wa_enabled !== false);
          setDeliveryTarget(d.wa_delivery_target || "parent_only");
          setArriveTemplate(d.attendance_arrive_template || DEFAULT_ARRIVE);
          setDepartTemplate(d.attendance_depart_template || DEFAULT_DEPART);
          setGroupTemplate(d.attendance_group_template || DEFAULT_GROUP);
        }
        setLoading(false);
      });
  }, [schoolId]);

  const handleToggleWa = async (val: boolean) => {
    setWaEnabled(val);
    if (integrationId) {
      await supabase.from("school_integrations" as any).update({ wa_enabled: val }).eq("id", integrationId);
      toast.success(val ? "WhatsApp diaktifkan" : "WhatsApp dinonaktifkan");
    }
  };

  const handleSave = async () => {
    if (!schoolId || !integrationId) {
      toast.error("Integrasi WhatsApp belum dikonfigurasi. Hubungi administrator.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("school_integrations" as any).update({
      attendance_arrive_template: arriveTemplate,
      attendance_depart_template: departTemplate,
      attendance_group_template: groupTemplate,
      wa_delivery_target: deliveryTarget,
      wa_enabled: waEnabled,
    }).eq("id", integrationId);
    setSaving(false);
    if (error) toast.error("Gagal menyimpan: " + error.message);
    else toast.success("Template berhasil disimpan!");
  };

  if (loading) return <div className="flex items-center justify-center py-12 text-muted-foreground">Memuat...</div>;

  return (
    <PremiumGate featureLabel="WhatsApp Gateway" requiredPlan="Premium">
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
            Template Pesan WhatsApp
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Atur template notifikasi otomatis dan target pengiriman
          </p>
        </div>

        {!isActive && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 text-sm text-destructive">
              ⚠️ Integrasi WhatsApp belum aktif. Hubungi administrator untuk mengaktifkan.
            </CardContent>
          </Card>
        )}

        {/* Toggle & Delivery Target */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Power className="h-4 w-4" />
                <div>
                  <p className="font-semibold text-sm">Status WhatsApp</p>
                  <p className="text-xs text-muted-foreground">Aktifkan atau nonaktifkan notifikasi WhatsApp saat scan</p>
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
              <div className="space-y-2 pt-3 border-t">
                <Label className="text-xs font-semibold">Target Pengiriman Notifikasi Scan</Label>
                <Select value={deliveryTarget} onValueChange={setDeliveryTarget}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DELIVERY_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Tentukan kemana notifikasi otomatis dikirim saat siswa scan absensi
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Arrive Template */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Template Notifikasi Datang (Wali Murid)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea value={arriveTemplate} onChange={(e) => setArriveTemplate(e.target.value)}
              rows={6} className="font-mono text-xs" />
            <PlaceholderButtons placeholders={PLACEHOLDERS} onInsert={(key) => setArriveTemplate(arriveTemplate + key)} />
          </CardContent>
        </Card>

        {/* Depart Template */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Template Notifikasi Pulang (Wali Murid)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea value={departTemplate} onChange={(e) => setDepartTemplate(e.target.value)}
              rows={6} className="font-mono text-xs" />
            <PlaceholderButtons placeholders={PLACEHOLDERS} onInsert={(key) => setDepartTemplate(departTemplate + key)} />
          </CardContent>
        </Card>

        {/* Group Template */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Template Notifikasi Group Kelas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Template ini digunakan saat siswa scan dan target pengiriman mencakup Group Kelas.
              Gunakan placeholder <code className="bg-muted px-1 rounded">{"{type}"}</code> untuk tipe absensi.
            </p>
            <Textarea value={groupTemplate} onChange={(e) => setGroupTemplate(e.target.value)}
              rows={8} className="font-mono text-xs" />
            <PlaceholderButtons placeholders={GROUP_PLACEHOLDERS} onInsert={(key) => setGroupTemplate(groupTemplate + key)} />
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving || !integrationId} className="w-full sm:w-auto">
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Simpan Semua Template
        </Button>
      </div>
    </PremiumGate>
  );
};

export default WhatsAppTemplates;
