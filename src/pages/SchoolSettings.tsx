import { PageHeader } from "@/components/PageHeader";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { School, Save, Upload, Lock, Loader2, Image, Clock, Plus, Trash2, FileText, GripVertical, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";
import { toast } from "sonner";

const SchoolSettings = () => {
  const { profile } = useAuth();
  const features = useSubscriptionFeatures();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [npsn, setNpsn] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [timezone, setTimezone] = useState("Asia/Jakarta");
  const [logo, setLogo] = useState("");
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("14:00");
  const [attStartTime, setAttStartTime] = useState("06:00");
  const [attEndTime, setAttEndTime] = useState("12:00");
  const [depStartTime, setDepStartTime] = useState("12:00");
  const [depEndTime, setDepEndTime] = useState("17:00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [qrInstructions, setQrInstructions] = useState<{ id?: string; text: string }[]>([]);
  const [savingInstructions, setSavingInstructions] = useState(false);

  const maxInstructions = features.planName === "Free" ? 2 : 999;

  useEffect(() => {
    if (!profile?.school_id) return;
    Promise.all([
      supabase.from("schools").select("name, address, logo, npsn, city, province, timezone").eq("id", profile.school_id).single(),
      supabase.from("pickup_settings").select("school_start_time, school_end_time, attendance_start_time, attendance_end_time, departure_start_time, departure_end_time").eq("school_id", profile.school_id).maybeSingle(),
      supabase.from("qr_instructions").select("id, instruction_text, sort_order").eq("school_id", profile.school_id).order("sort_order"),
    ]).then(([schoolRes, settingsRes, instrRes]) => {
      if (schoolRes.data) {
        setName(schoolRes.data.name || "");
        setAddress(schoolRes.data.address || "");
        setLogo(schoolRes.data.logo || "");
        setNpsn((schoolRes.data as any).npsn || "");
        setCity((schoolRes.data as any).city || "");
        setProvince((schoolRes.data as any).province || "");
        setTimezone((schoolRes.data as any).timezone || "Asia/Jakarta");
      }
      if (settingsRes.data) {
        setStartTime(settingsRes.data.school_start_time?.slice(0, 5) || "07:00");
        setEndTime(settingsRes.data.school_end_time?.slice(0, 5) || "14:00");
        setAttStartTime((settingsRes.data as any).attendance_start_time?.slice(0, 5) || "06:00");
        setAttEndTime((settingsRes.data as any).attendance_end_time?.slice(0, 5) || "12:00");
        setDepStartTime((settingsRes.data as any).departure_start_time?.slice(0, 5) || "12:00");
        setDepEndTime((settingsRes.data as any).departure_end_time?.slice(0, 5) || "17:00");
      }
      if (instrRes.data && instrRes.data.length > 0) {
        setQrInstructions(instrRes.data.map((r: any) => ({ id: r.id, text: r.instruction_text })));
      }
      setLoading(false);
    });
  }, [profile?.school_id]);

  const handleLogoUpload = async (file: File) => {
    if (!features.canCustomLogo) {
      toast.error("Fitur custom logo tersedia di paket School ke atas");
      return;
    }
    if (!profile?.school_id) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${profile.school_id}/logo.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("school-logos").upload(path, file, { upsert: true });
      if (uploadErr) { toast.error("Gagal upload logo: " + uploadErr.message); setUploading(false); return; }
      const { data: urlData } = supabase.storage.from("school-logos").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      
      // Save logo URL to database immediately
      const { error: saveErr } = await supabase.from("schools").update({ logo: publicUrl }).eq("id", profile.school_id);
      if (saveErr) { toast.error("Logo terupload tapi gagal menyimpan ke database: " + saveErr.message); setUploading(false); return; }
      
      setLogo(publicUrl);
      toast.success("Logo berhasil diupload dan disimpan!");
    } catch (err: any) {
      toast.error("Terjadi kesalahan: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAddInstruction = () => {
    if (qrInstructions.length >= maxInstructions) {
      toast.error(`Paket ${features.planName} hanya bisa ${maxInstructions} petunjuk. Upgrade untuk menambah lebih banyak.`);
      return;
    }
    setQrInstructions([...qrInstructions, { text: "" }]);
  };

  const handleRemoveInstruction = (index: number) => {
    setQrInstructions(qrInstructions.filter((_, i) => i !== index));
  };

  const handleUpdateInstruction = (index: number, text: string) => {
    const updated = [...qrInstructions];
    updated[index] = { ...updated[index], text };
    setQrInstructions(updated);
  };

  const handleSaveInstructions = async () => {
    if (!profile?.school_id) return;
    setSavingInstructions(true);

    // Delete existing
    await supabase.from("qr_instructions").delete().eq("school_id", profile.school_id);

    // Insert new
    const validInstructions = qrInstructions.filter(i => i.text.trim());
    if (validInstructions.length > 0) {
      const rows = validInstructions.map((instr, i) => ({
        school_id: profile.school_id!,
        instruction_text: instr.text.trim(),
        sort_order: i,
      }));
      const { error } = await supabase.from("qr_instructions").insert(rows);
      if (error) { toast.error("Gagal menyimpan: " + error.message); setSavingInstructions(false); return; }
    }

    setSavingInstructions(false);
    toast.success("Petunjuk QR Code berhasil disimpan!");
  };

  const handleSave = async () => {
    if (!profile?.school_id) return;
    setSaving(true);

    const { error: schoolErr } = await supabase.from("schools").update({
      name, address, logo: logo || null,
      npsn: npsn || null, city: city || null, province: province || null, timezone,
    } as any).eq("id", profile.school_id);

    const settingsPayload = {
      school_start_time: startTime + ":00",
      school_end_time: endTime + ":00",
      attendance_start_time: attStartTime + ":00",
      attendance_end_time: attEndTime + ":00",
      departure_start_time: depStartTime + ":00",
      departure_end_time: depEndTime + ":00",
    };

    const { data: existing } = await supabase.from("pickup_settings").select("id").eq("school_id", profile.school_id).maybeSingle();
    if (existing) {
      await supabase.from("pickup_settings").update(settingsPayload as any).eq("school_id", profile.school_id);
    } else {
      await supabase.from("pickup_settings").insert({
        school_id: profile.school_id,
        is_active: false,
        ...settingsPayload,
      } as any);
    }

    setSaving(false);
    if (schoolErr) { toast.error("Gagal menyimpan: " + schoolErr.message); } else { toast.success("Pengaturan sekolah berhasil diperbarui!"); }
  };

  if (loading) return <div className="flex items-center justify-center py-12 text-muted-foreground">Memuat...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader icon={School} title="Identitas Sekolah" subtitle="Kelola informasi dan pengaturan sekolah Anda" />

      <Card className="border-0 shadow-card">
        <CardHeader><CardTitle className="text-base">Informasi Sekolah</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="school-name">Nama Sekolah</Label>
            <Input id="school-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama sekolah" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="school-address">Alamat</Label>
            <Textarea id="school-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Alamat lengkap sekolah" rows={3} />
          </div>

          {/* Logo */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Logo Sekolah</Label>
              {!features.canCustomLogo && (
                <Badge variant="secondary" className="text-[10px]"><Lock className="h-3 w-3 mr-1" /> Paket School+</Badge>
              )}
            </div>
            <div className="flex items-center gap-4">
              {logo ? (
                <img src={logo} alt="Logo" className="h-16 w-16 object-contain rounded-lg border border-border" />
              ) : (
                <div className="h-16 w-16 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
                  <Image className="h-6 w-6 text-muted-foreground/30" />
                </div>
              )}
              {features.canCustomLogo ? (
                <div className="relative">
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => { if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]); }} />
                  <Button variant="outline" size="sm" disabled={uploading}>
                    {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                    {uploading ? "Mengupload..." : "Upload Logo"}
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="opacity-60 cursor-not-allowed"
                  onClick={() => toast.error("Fitur Upload Logo tersedia di paket School ke atas. Silakan upgrade langganan.")}>
                  <Upload className="h-4 w-4 mr-1" /> Upload Logo
                  <Lock className="h-3 w-3 ml-1 text-warning" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Waktu Absensi Datang & Pulang */}
      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Waktu Absensi Datang & Pulang
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Atur rentang waktu untuk absensi datang dan pulang. Sistem akan otomatis menentukan mode absensi berdasarkan waktu saat scan.
          </p>
          
          <div className="space-y-4">
            <div className="bg-success/5 border border-success/20 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-success/15 text-success border-success/20 text-xs">Datang</Badge>
                <span className="text-xs text-muted-foreground">Waktu absensi kedatangan siswa</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="att-start" className="text-xs">Mulai</Label>
                  <Input id="att-start" type="time" value={attStartTime} onChange={(e) => setAttStartTime(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="att-end" className="text-xs">Selesai</Label>
                  <Input id="att-end" type="time" value={attEndTime} onChange={(e) => setAttEndTime(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="bg-warning/5 border border-warning/20 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-warning/15 text-warning border-warning/20 text-xs">Pulang</Badge>
                <span className="text-xs text-muted-foreground">Waktu absensi kepulangan siswa</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="dep-start" className="text-xs">Mulai</Label>
                  <Input id="dep-start" type="time" value={depStartTime} onChange={(e) => setDepStartTime(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dep-end" className="text-xs">Selesai</Label>
                  <Input id="dep-end" type="time" value={depEndTime} onChange={(e) => setDepEndTime(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p>• <strong>Waktu Datang ({attStartTime} - {attEndTime}):</strong> Scan akan tercatat sebagai absensi <strong>Datang</strong></p>
            <p>• <strong>Waktu Pulang ({depStartTime} - {depEndTime}):</strong> Scan akan tercatat sebagai absensi <strong>Pulang</strong></p>
            <p>• Setiap siswa bisa scan <strong>1x Datang</strong> dan <strong>1x Pulang</strong> per hari</p>
          </div>
        </CardContent>
      </Card>

      {/* Petunjuk QR Code */}
      <Card className="border-0 shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Petunjuk QR Code
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              {qrInstructions.length}/{maxInstructions === 999 ? "∞" : maxInstructions}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Atur teks petunjuk yang muncul pada kartu QR Code siswa saat didownload. Sesuaikan dengan ketentuan sekolah Anda.
          </p>

          {qrInstructions.length === 0 && (
            <div className="text-center py-6 border-2 border-dashed border-muted-foreground/20 rounded-lg">
              <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Belum ada petunjuk khusus</p>
              <p className="text-xs text-muted-foreground">Petunjuk default akan digunakan pada QR Code</p>
            </div>
          )}

          <div className="space-y-2">
            {qrInstructions.map((instr, i) => (
              <div key={i} className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                <span className="text-xs text-muted-foreground font-bold shrink-0 w-5">{i + 1}.</span>
                <Input
                  value={instr.text}
                  onChange={(e) => handleUpdateInstruction(i, e.target.value)}
                  placeholder="Contoh: Tunjukkan QR Code kepada guru piket"
                  className="text-sm h-9"
                />
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleRemoveInstruction(i)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleAddInstruction}
              disabled={qrInstructions.length >= maxInstructions}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Petunjuk
              {features.planName === "Free" && qrInstructions.length >= maxInstructions && (
                <Lock className="h-3 w-3 ml-1 text-muted-foreground" />
              )}
            </Button>
            <Button size="sm" onClick={handleSaveInstructions} disabled={savingInstructions} className="gradient-primary hover:opacity-90">
              {savingInstructions ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              Simpan Petunjuk
            </Button>
          </div>

          {features.planName === "Free" && (
            <p className="text-[10px] text-muted-foreground bg-muted/50 rounded-lg p-2">
              Paket Free hanya bisa menambahkan {maxInstructions} petunjuk. <strong>Upgrade</strong> untuk petunjuk tak terbatas.
            </p>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gradient-primary hover:opacity-90 w-full sm:w-auto">
        <Save className="h-4 w-4 mr-2" />
        {saving ? "Menyimpan..." : "Simpan Pengaturan Sekolah"}
      </Button>
    </div>
  );
};

export default SchoolSettings;
