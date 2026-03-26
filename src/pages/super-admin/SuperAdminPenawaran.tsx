import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Loader2, ExternalLink, Globe, Type, MessageSquare, Phone, Mail, Sparkles } from "lucide-react";

const FIELDS = [
  { key: "hero_title", label: "Judul Hero", type: "text", icon: Type, group: "hero" },
  { key: "hero_subtitle", label: "Subtitle Hero", type: "textarea", icon: Type, group: "hero" },
  { key: "hero_cta_text", label: "Teks Tombol CTA", type: "text", icon: Type, group: "hero" },
  { key: "hero_cta_link", label: "Link Tombol CTA", type: "text", icon: Globe, group: "hero" },
  { key: "section_why_title", label: "Judul Seksi Keunggulan", type: "text", icon: Type, group: "section" },
  { key: "section_pricing_title", label: "Judul Seksi Harga", type: "text", icon: Type, group: "section" },
  { key: "section_pricing_subtitle", label: "Subtitle Seksi Harga", type: "text", icon: Type, group: "section" },
  { key: "promo_banner_text", label: "Teks Banner Promo", type: "text", icon: Sparkles, group: "promo" },
  { key: "promo_banner_active", label: "Aktifkan Banner Promo", type: "boolean", icon: Sparkles, group: "promo" },
  { key: "contact_whatsapp", label: "Nomor WhatsApp", type: "text", icon: Phone, group: "contact" },
  { key: "contact_email", label: "Email Kontak", type: "text", icon: Mail, group: "contact" },
];

const GROUPS = [
  { key: "hero", title: "Hero Section", desc: "Bagian utama halaman penawaran" },
  { key: "section", title: "Judul Seksi", desc: "Judul untuk setiap bagian halaman" },
  { key: "promo", title: "Banner Promosi", desc: "Banner promosi di bagian atas halaman" },
  { key: "contact", title: "Kontak", desc: "Informasi kontak di halaman penawaran" },
];

const SuperAdminPenawaran = () => {
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("promo_content").select("key, value").then(({ data }) => {
      if (data) {
        setContent(Object.fromEntries(data.map((d) => [d.key, d.value])));
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(content).map(([key, value]) =>
        supabase.from("promo_content").update({ value, updated_at: new Date().toISOString() }).eq("key", key)
      );
      await Promise.all(updates);
      toast.success("Konten penawaran berhasil disimpan!");
    } catch {
      toast.error("Gagal menyimpan");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Halaman Penawaran</h1>
          <p className="text-muted-foreground">Kelola konten halaman promosi untuk calon pelanggan</p>
        </div>
        <div className="flex gap-2">
          <a href="/penawaran" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </a>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Simpan
          </Button>
        </div>
      </div>

      {GROUPS.map((group) => (
        <Card key={group.key}>
          <CardHeader>
            <CardTitle className="text-lg">{group.title}</CardTitle>
            <CardDescription>{group.desc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {FIELDS.filter((f) => f.group === group.key).map((field) => (
              <div key={field.key} className="space-y-2">
                <Label className="flex items-center gap-2">
                  <field.icon className="h-4 w-4 text-muted-foreground" />
                  {field.label}
                </Label>
                {field.type === "textarea" ? (
                  <Textarea
                    value={content[field.key] || ""}
                    onChange={(e) => setContent((p) => ({ ...p, [field.key]: e.target.value }))}
                    rows={3}
                  />
                ) : field.type === "boolean" ? (
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={content[field.key] === "true"}
                      onCheckedChange={(v) => setContent((p) => ({ ...p, [field.key]: v ? "true" : "false" }))}
                    />
                    <span className="text-sm text-muted-foreground">
                      {content[field.key] === "true" ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                ) : (
                  <Input
                    value={content[field.key] || ""}
                    onChange={(e) => setContent((p) => ({ ...p, [field.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SuperAdminPenawaran;
