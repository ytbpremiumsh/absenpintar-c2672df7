import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { School, Save, Upload, Lock, Loader2, Image, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";
import { toast } from "sonner";

const SchoolSettings = () => {
  const { profile } = useAuth();
  const features = useSubscriptionFeatures();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [logo, setLogo] = useState("");
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("14:00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!profile?.school_id) return;
    Promise.all([
      supabase.from("schools").select("name, address, logo").eq("id", profile.school_id).single(),
      supabase.from("pickup_settings").select("school_start_time, school_end_time").eq("school_id", profile.school_id).maybeSingle(),
    ]).then(([schoolRes, settingsRes]) => {
      if (schoolRes.data) {
        setName(schoolRes.data.name || "");
        setAddress(schoolRes.data.address || "");
        setLogo(schoolRes.data.logo || "");
      }
      if (settingsRes.data) {
        setStartTime(settingsRes.data.school_start_time?.slice(0, 5) || "07:00");
        setEndTime(settingsRes.data.school_end_time?.slice(0, 5) || "14:00");
      }
      setLoading(false);
    });
  }, [profile?.school_id]);

  const handleLogoUpload = async (file: File) => {
    if (!features.canCustomLogo) {
      toast.error("Fitur custom logo tersedia di paket School ke atas");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${profile?.school_id}/logo.${ext}`;
    const { error } = await supabase.storage.from("school-logos").upload(path, file, { upsert: true });
    if (error) { toast.error("Gagal upload logo: " + error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("school-logos").getPublicUrl(path);
    setLogo(urlData.publicUrl);
    setUploading(false);
    toast.success("Logo berhasil diupload!");
  };

  const handleSave = async () => {
    if (!profile?.school_id) return;
    setSaving(true);

    // Save school info
    const { error: schoolErr } = await supabase.from("schools").update({ name, address, logo: logo || null }).eq("id", profile.school_id);

    // Save pickup settings (jam masuk/pulang)
    const { data: existing } = await supabase.from("pickup_settings").select("id").eq("school_id", profile.school_id).maybeSingle();
    if (existing) {
      await supabase.from("pickup_settings").update({
        school_start_time: startTime + ":00",
        school_end_time: endTime + ":00",
      }).eq("school_id", profile.school_id);
    } else {
      await supabase.from("pickup_settings").insert({
        school_id: profile.school_id,
        school_start_time: startTime + ":00",
        school_end_time: endTime + ":00",
        is_active: false,
      } as any);
    }

    setSaving(false);
    if (schoolErr) { toast.error("Gagal menyimpan: " + schoolErr.message); } else { toast.success("Pengaturan sekolah berhasil diperbarui!"); }
  };

  if (loading) return <div className="flex items-center justify-center py-12 text-muted-foreground">Memuat...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <School className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Identitas Sekolah
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">Kelola informasi dan pengaturan sekolah Anda</p>
      </div>

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
                <div>
                  <Input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://..." className="text-sm" />
                  <p className="text-[10px] text-muted-foreground mt-1">Upload logo tersedia di paket School ke atas</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jam Masuk / Pulang */}
      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Jam Masuk & Pulang
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Atur jam masuk dan jam pulang sekolah. Sistem akan otomatis menampilkan status waktu di halaman scan.</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Jam Masuk</Label>
              <Input id="start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">Jam Pulang</Label>
              <Input id="end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p>• <strong>Sebelum jam masuk:</strong> Status "Belum Masuk"</p>
            <p>• <strong>Jam masuk – jam pulang:</strong> Status "Jam Sekolah"</p>
            <p>• <strong>Setelah jam pulang:</strong> Status "Waktu Pulang" (penjemputan aktif)</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gradient-primary hover:opacity-90 w-full sm:w-auto">
        <Save className="h-4 w-4 mr-2" />
        {saving ? "Menyimpan..." : "Simpan Semua Perubahan"}
      </Button>
    </div>
  );
};

export default SchoolSettings;
