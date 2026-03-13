import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, ExternalLink, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const KEYS = [
  "presentation_is_public",
  "presentation_title",
  "presentation_subtitle",
  "presentation_cta_title",
  "presentation_cta_subtitle",
  "presentation_cta_btn1",
  "presentation_cta_btn2",
  "presentation_cta_btn1_link",
  "presentation_cta_btn2_link",
  "login_sidebar_image",
];

const SuperAdminPresentation = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [ctaTitle, setCtaTitle] = useState("");
  const [ctaSubtitle, setCtaSubtitle] = useState("");
  const [ctaBtn1, setCtaBtn1] = useState("");
  const [ctaBtn2, setCtaBtn2] = useState("");
  const [ctaBtn1Link, setCtaBtn1Link] = useState("");
  const [ctaBtn2Link, setCtaBtn2Link] = useState("");
  const [loginImage, setLoginImage] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("platform_settings").select("key, value").in("key", KEYS);
      if (data) {
        const map = Object.fromEntries(data.map((d) => [d.key, d.value]));
        setIsPublic(map.presentation_is_public === "true");
        setTitle(map.presentation_title || "");
        setSubtitle(map.presentation_subtitle || "");
        setCtaTitle(map.presentation_cta_title || "");
        setCtaSubtitle(map.presentation_cta_subtitle || "");
        setCtaBtn1(map.presentation_cta_btn1 || "");
        setCtaBtn2(map.presentation_cta_btn2 || "");
        setCtaBtn1Link(map.presentation_cta_btn1_link || "");
        setCtaBtn2Link(map.presentation_cta_btn2_link || "");
        setLoginImage(map.login_sidebar_image || "");
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const rows = [
      { key: "presentation_is_public", value: isPublic ? "true" : "false" },
      { key: "presentation_title", value: title },
      { key: "presentation_subtitle", value: subtitle },
      { key: "presentation_cta_title", value: ctaTitle },
      { key: "presentation_cta_subtitle", value: ctaSubtitle },
      { key: "presentation_cta_btn1", value: ctaBtn1 },
      { key: "presentation_cta_btn2", value: ctaBtn2 },
      { key: "presentation_cta_btn1_link", value: ctaBtn1Link },
      { key: "presentation_cta_btn2_link", value: ctaBtn2Link },
      { key: "login_sidebar_image", value: loginImage },
    ].map((r) => ({ ...r, updated_at: new Date().toISOString() }));

    const { error } = await supabase
      .from("platform_settings")
      .upsert(rows, { onConflict: "key" });

    if (error) {
      toast.error("Gagal menyimpan: " + error.message);
    } else {
      toast.success("Pengaturan presentasi berhasil disimpan!");
    }
    setSaving(false);
  };

  const presentationUrl = `${window.location.origin}/presentation`;

  const copyLink = () => {
    navigator.clipboard.writeText(presentationUrl);
    toast.success("Link disalin ke clipboard!");
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Halaman Presentasi</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Kelola halaman perkenalan sistem untuk publik</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Simpan
        </Button>
      </div>

      {/* Visibility Toggle */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <h3 className="font-bold text-foreground text-sm">Akses Halaman</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Publik</p>
              <p className="text-xs text-muted-foreground">Jika aktif, halaman presentasi bisa diakses siapa saja via link</p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          {isPublic && (
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
              <Input value={presentationUrl} readOnly className="bg-transparent border-0 text-xs flex-1" />
              <Button size="sm" variant="outline" onClick={copyLink}>
                <Copy className="h-3.5 w-3.5 mr-1" /> Salin
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href="/presentation" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Buka
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Settings - Hero */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <h3 className="font-bold text-foreground text-sm">Konten Hero</h3>
          <div className="space-y-1">
            <Label className="text-xs">Judul Utama</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Absensi Pintar" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Subtitle</Label>
            <Textarea value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Sistem absensi siswa modern..." rows={2} />
          </div>
        </CardContent>
      </Card>

      {/* CTA Section */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <h3 className="font-bold text-foreground text-sm">Konten CTA (Call to Action)</h3>
          <p className="text-xs text-muted-foreground">Bagian ajakan di bawah halaman presentasi</p>
          <div className="space-y-1">
            <Label className="text-xs">Judul CTA</Label>
            <Input value={ctaTitle} onChange={(e) => setCtaTitle(e.target.value)} placeholder="Siap Memodernisasi Absensi Sekolah Anda?" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Subtitle CTA</Label>
            <Textarea value={ctaSubtitle} onChange={(e) => setCtaSubtitle(e.target.value)} placeholder="Bergabung sekarang dan rasakan kemudahan..." rows={2} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Tombol Utama (Teks)</Label>
              <Input value={ctaBtn1} onChange={(e) => setCtaBtn1(e.target.value)} placeholder="Daftar Gratis" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Link Tombol Utama</Label>
              <Input value={ctaBtn1Link} onChange={(e) => setCtaBtn1Link(e.target.value)} placeholder="/register" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tombol Kedua (Teks)</Label>
              <Input value={ctaBtn2} onChange={(e) => setCtaBtn2(e.target.value)} placeholder="Masuk ke Dashboard" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Link Tombol Kedua</Label>
              <Input value={ctaBtn2Link} onChange={(e) => setCtaBtn2Link(e.target.value)} placeholder="/login" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Login Page Settings */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <h3 className="font-bold text-foreground text-sm">Halaman Login</h3>
          <p className="text-xs text-muted-foreground">Gambar sidebar yang tampil di halaman login (URL gambar)</p>
          <div className="space-y-1">
            <Label className="text-xs">URL Gambar Sidebar Login</Label>
            <Input value={loginImage} onChange={(e) => setLoginImage(e.target.value)} placeholder="/images/presentation/students.jpeg" />
          </div>
          {loginImage && (
            <div className="rounded-lg overflow-hidden border border-border w-48 h-32">
              <img src={loginImage} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Info */}
      <Card className="border-0 shadow-card bg-muted/30">
        <CardContent className="p-4 sm:p-6">
          <h3 className="font-bold text-foreground text-sm mb-2">Konten Presentasi</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Halaman presentasi menampilkan 10 section fitur utama secara otomatis berdasarkan fitur sistem,
            ditambah 6 fitur pendukung. Konten Hero dan CTA bisa dikustomisasi melalui pengaturan di atas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminPresentation;
