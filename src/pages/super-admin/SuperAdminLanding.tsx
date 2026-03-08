import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Upload, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContentItem {
  id: string;
  key: string;
  value: string;
  type: string;
}

const LABELS: Record<string, string> = {
  hero_title: "Judul Hero",
  hero_subtitle: "Deskripsi Hero",
  hero_image: "Gambar Hero",
  hero_caption: "Caption di bawah Gambar Hero",
  feature_1_title: "Fitur 1 - Judul",
  feature_1_desc: "Fitur 1 - Deskripsi",
  feature_1_icon: "Fitur 1 - Ikon (scan/monitor/message/chart)",
  feature_2_title: "Fitur 2 - Judul",
  feature_2_desc: "Fitur 2 - Deskripsi",
  feature_2_icon: "Fitur 2 - Ikon",
  feature_3_title: "Fitur 3 - Judul",
  feature_3_desc: "Fitur 3 - Deskripsi",
  feature_3_icon: "Fitur 3 - Ikon",
  feature_4_title: "Fitur 4 - Judul",
  feature_4_desc: "Fitur 4 - Deskripsi",
  feature_4_icon: "Fitur 4 - Ikon",
  feature_5_title: "Fitur 5 - Judul",
  feature_5_desc: "Fitur 5 - Deskripsi",
  feature_5_icon: "Fitur 5 - Ikon",
  feature_6_title: "Fitur 6 - Judul",
  feature_6_desc: "Fitur 6 - Deskripsi",
  feature_6_icon: "Fitur 6 - Ikon",
  why_title: "Kenapa Harus - Judul",
  why_desc: "Kenapa Harus - Deskripsi",
  why_item_1_title: "Kenapa 1 - Judul",
  why_item_1_desc: "Kenapa 1 - Deskripsi",
  why_item_2_title: "Kenapa 2 - Judul",
  why_item_2_desc: "Kenapa 2 - Deskripsi",
  why_item_3_title: "Kenapa 3 - Judul",
  why_item_3_desc: "Kenapa 3 - Deskripsi",
  why_item_4_title: "Kenapa 4 - Judul",
  why_item_4_desc: "Kenapa 4 - Deskripsi",
  cta_banner_text: "Teks Banner CTA",
  footer_logo: "Logo Footer",
  footer_address: "Alamat",
  footer_email: "Email",
  footer_phone: "Telepon",
  cta_text: "Teks Tombol CTA",
};

const SECTIONS = [
  { title: "Hero Section", keys: ["hero_title", "hero_subtitle", "hero_image", "hero_caption", "cta_text"] },
  { title: "Fitur 1", keys: ["feature_1_title", "feature_1_desc", "feature_1_icon"] },
  { title: "Fitur 2", keys: ["feature_2_title", "feature_2_desc", "feature_2_icon"] },
  { title: "Fitur 3", keys: ["feature_3_title", "feature_3_desc", "feature_3_icon"] },
  { title: "Fitur 4", keys: ["feature_4_title", "feature_4_desc", "feature_4_icon"] },
  { title: "Fitur 5", keys: ["feature_5_title", "feature_5_desc", "feature_5_icon"] },
  { title: "Fitur 6", keys: ["feature_6_title", "feature_6_desc", "feature_6_icon"] },
  { title: "Kenapa Harus Kami", keys: ["why_title", "why_desc", "why_item_1_title", "why_item_1_desc", "why_item_2_title", "why_item_2_desc", "why_item_3_title", "why_item_3_desc", "why_item_4_title", "why_item_4_desc"] },
  { title: "Banner CTA", keys: ["cta_banner_text"] },
  { title: "Footer", keys: ["footer_logo", "footer_address", "footer_email", "footer_phone"] },
];


const SuperAdminLanding = () => {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string | null>(null);

  const fetchContent = async () => {
    const { data } = await supabase.from("landing_content").select("*").order("created_at");
    setItems((data as ContentItem[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchContent(); }, []);

  const getValue = (key: string) => {
    if (key in edited) return edited[key];
    return items.find((i) => i.key === key)?.value || "";
  };

  const handleChange = (key: string, value: string) => {
    setEdited((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = async (key: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 5MB");
      return;
    }
    setUploading(key);
    const ext = file.name.split(".").pop();
    const path = `${key}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("landing-assets").upload(path, file);
    if (error) {
      toast.error("Gagal mengunggah gambar");
      setUploading(null);
      return;
    }
    const { data: urlData } = supabase.storage.from("landing-assets").getPublicUrl(path);
    handleChange(key, urlData.publicUrl);
    setUploading(null);
  };

  const handleSave = async () => {
    const keys = Object.keys(edited);
    if (keys.length === 0) {
      toast.info("Tidak ada perubahan");
      return;
    }
    setSaving(true);
    for (const key of keys) {
      await supabase
        .from("landing_content")
        .update({ value: edited[key], updated_at: new Date().toISOString() })
        .eq("key", key);
    }
    toast.success("Landing page berhasil diperbarui!");
    setEdited({});
    fetchContent();
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Landing Page</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Kelola konten halaman utama</p>
        </div>
        <Button onClick={handleSave} disabled={saving || Object.keys(edited).length === 0} className="gradient-primary text-primary-foreground">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Simpan
        </Button>
      </div>

      {SECTIONS.map((section) => (
        <Card key={section.title} className="border-0 shadow-card">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <h3 className="font-bold text-foreground text-sm">{section.title}</h3>
            {section.keys.map((key) => {
              const item = items.find((i) => i.key === key);
              const isImage = item?.type === "image";
              const label = LABELS[key] || key;
              const val = getValue(key);

              if (isImage) {
                return (
                  <div key={key} className="space-y-2">
                    <Label className="text-xs">{label}</Label>
                    {val && (
                      <div className="relative inline-block">
                        <img src={val} alt={label} className="h-24 rounded-lg object-cover" />
                        <button
                          onClick={() => handleChange(key, "")}
                          className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        id={`file-${key}`}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleImageUpload(key, f);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploading === key}
                        onClick={() => document.getElementById(`file-${key}`)?.click()}
                      >
                        {uploading === key ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Upload className="h-3 w-3 mr-1" />
                        )}
                        Upload Gambar
                      </Button>
                    </div>
                  </div>
                );
              }

              const isLong = key.includes("subtitle") || key.includes("desc") || key.includes("address");
              return (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  {isLong ? (
                    <Textarea
                      value={val}
                      onChange={(e) => handleChange(key, e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  ) : (
                    <Input
                      value={val}
                      onChange={(e) => handleChange(key, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SuperAdminLanding;
