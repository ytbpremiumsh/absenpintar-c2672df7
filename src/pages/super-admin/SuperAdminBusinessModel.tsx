import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, ExternalLink, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const KEYS = ["business_model_is_public", "business_model_title", "business_model_subtitle"];

const SuperAdminBusinessModel = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("platform_settings").select("key, value").in("key", KEYS);
      if (data) {
        const map = Object.fromEntries(data.map((d) => [d.key, d.value]));
        setIsPublic(map.business_model_is_public === "true");
        setTitle(map.business_model_title || "");
        setSubtitle(map.business_model_subtitle || "");
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const rows = [
      { key: "business_model_is_public", value: isPublic ? "true" : "false" },
      { key: "business_model_title", value: title },
      { key: "business_model_subtitle", value: subtitle },
    ].map((r) => ({ ...r, updated_at: new Date().toISOString() }));

    const { error } = await supabase
      .from("platform_settings")
      .upsert(rows, { onConflict: "key" });

    if (error) {
      toast.error("Gagal menyimpan: " + error.message);
    } else {
      toast.success("Pengaturan model bisnis berhasil disimpan!");
    }
    setSaving(false);
  };

  const pageUrl = `${window.location.origin}/business-model`;

  const copyLink = () => {
    navigator.clipboard.writeText(pageUrl);
    toast.success("Link disalin ke clipboard!");
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Model Bisnis</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Kelola halaman model bisnis untuk publik</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Simpan
        </Button>
      </div>

      <Card className="border-0 shadow-card">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <h3 className="font-bold text-foreground text-sm">Akses Halaman</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Publik</p>
              <p className="text-xs text-muted-foreground">Jika aktif, halaman model bisnis bisa diakses siapa saja via link</p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          {isPublic && (
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
              <Input value={pageUrl} readOnly className="bg-transparent border-0 text-xs flex-1" />
              <Button size="sm" variant="outline" onClick={copyLink}>
                <Copy className="h-3.5 w-3.5 mr-1" /> Salin
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href="/business-model" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Buka
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-card">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <h3 className="font-bold text-foreground text-sm">Konten Hero</h3>
          <div className="space-y-1">
            <Label className="text-xs">Judul Utama</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Smart Pickup School System" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Subtitle</Label>
            <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Model Bisnis & Proyeksi Pertumbuhan" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-card bg-muted/30">
        <CardContent className="p-4 sm:p-6">
          <h3 className="font-bold text-foreground text-sm mb-2">Konten Halaman</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Halaman model bisnis menampilkan secara otomatis:
            <strong> Peluang Pasar, 4 Sumber Pendapatan (SaaS, Enterprise, WhatsApp, White Label), Struktur Harga, Unit Economics, Growth Roadmap 3 Tahun, dan Keunggulan Kompetitif</strong>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminBusinessModel;
