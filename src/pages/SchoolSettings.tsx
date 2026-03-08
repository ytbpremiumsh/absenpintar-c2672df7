import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { School, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const SchoolSettings = () => {
  const { profile } = useAuth();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [logo, setLogo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile?.school_id) return;
    supabase.from("schools").select("name, address, logo").eq("id", profile.school_id).single()
      .then(({ data }) => {
        if (data) {
          setName(data.name || "");
          setAddress(data.address || "");
          setLogo(data.logo || "");
        }
        setLoading(false);
      });
  }, [profile?.school_id]);

  const handleSave = async () => {
    if (!profile?.school_id) return;
    setSaving(true);
    const { error } = await supabase.from("schools")
      .update({ name, address, logo: logo || null })
      .eq("id", profile.school_id);
    setSaving(false);
    if (error) {
      toast.error("Gagal menyimpan: " + error.message);
    } else {
      toast.success("Identitas sekolah berhasil diperbarui!");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Memuat...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <School className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Identitas Sekolah
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">Kelola informasi sekolah Anda</p>
      </div>

      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Informasi Sekolah</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="school-name">Nama Sekolah</Label>
            <Input id="school-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama sekolah" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="school-address">Alamat</Label>
            <Textarea id="school-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Alamat lengkap sekolah" rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="school-logo">URL Logo</Label>
            <Input id="school-logo" value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://..." />
            {logo && (
              <div className="mt-2">
                <img src={logo} alt="Logo" className="h-16 w-16 object-contain rounded-lg border border-border" />
              </div>
            )}
          </div>
          <Button onClick={handleSave} disabled={saving} className="gradient-primary hover:opacity-90">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SchoolSettings;
