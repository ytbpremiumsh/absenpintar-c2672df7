import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Send, MessageSquare, Info, Smartphone, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const SuperAdminRegistrationWA = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [activeTab, setActiveTab] = useState("onesender");
  const [settings, setSettings] = useState({
    wa_registration_enabled: "false",
    wa_api_url: "",
    wa_api_key: "",
    wa_registration_message: "",
    mpwa_platform_api_key: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("platform_settings" as any)
      .select("key, value")
      .in("key", [
        "wa_registration_enabled", "wa_api_url", "wa_api_key", "wa_registration_message",
        "mpwa_platform_api_key",
      ]);

    const map: Record<string, string> = {};
    ((data as any[]) || []).forEach((item) => { map[item.key] = item.value; });
    setSettings((prev) => ({ ...prev, ...map }));
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const keys = Object.keys(settings) as (keyof typeof settings)[];
    const rows = keys.map((key) => ({
      key,
      value: settings[key],
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from("platform_settings")
      .upsert(rows, { onConflict: "key" });
    if (error) {
      toast.error("Gagal menyimpan: " + error.message);
    } else {
      toast.success("Pengaturan berhasil disimpan!");
    }
    setSaving(false);
  };

  const handleTest = async () => {
    if (!testPhone.trim()) { toast.error("Masukkan nomor WhatsApp tujuan"); return; }

    if (activeTab === "onesender") {
      if (!settings.wa_api_url || !settings.wa_api_key) { toast.error("API URL dan API Key OneSender harus diisi"); return; }
    } else {
      if (!settings.mpwa_platform_api_key) { toast.error("API Key MPWA harus diisi"); return; }
    }

    setTesting(true);
    try {
      const message = settings.wa_registration_message
        .replace(/{name}/g, "Admin Test")
        .replace(/{school}/g, "Sekolah Test")
        .replace(/{email}/g, "test@sekolah.com") || "✅ Tes koneksi WhatsApp Gateway berhasil!";

      const body: any = {
        phone: testPhone.replace(/\D/g, ""),
        message,
      };

      if (activeTab === "mpwa") {
        body.gateway_type = "mpwa";
        // For MPWA test, we need a sender - use testPhone as both sender and recipient for testing
        toast.error("Untuk tes MPWA, gunakan dashboard sekolah yang sudah scan QR. API Key yang disimpan di sini hanya sebagai konfigurasi global.");
        setTesting(false);
        return;
      }

      // OneSender
      body.api_url = settings.wa_api_url;
      body.api_key = settings.wa_api_key;

      const res = await supabase.functions.invoke("send-whatsapp", { body });
      const data = res.data as any;
      if (data?.success) {
        toast.success("Pesan tes berhasil dikirim!");
      } else {
        toast.error("Gagal: " + (data?.error || "Unknown error"));
      }
    } catch (err: any) {
      toast.error("Gagal: " + (err.message || "Unknown error"));
    }
    setTesting(false);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Konfigurasi API WA
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Pengaturan API OneSender & MPWA untuk platform</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Simpan
        </Button>
      </div>

      {/* Enable/Disable */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-foreground text-sm">Aktifkan Notifikasi Registrasi</h3>
              <p className="text-xs text-muted-foreground">Kirim pesan WhatsApp otomatis ke nomor admin yang mendaftar</p>
            </div>
            <Switch
              checked={settings.wa_registration_enabled === "true"}
              onCheckedChange={(v) => setSettings({ ...settings, wa_registration_enabled: v ? "true" : "false" })}
            />
          </div>
        </CardContent>
      </Card>

      {/* API Settings - Tabbed */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <h3 className="font-bold text-foreground text-sm">Pengaturan API WhatsApp</h3>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-10">
              <TabsTrigger value="onesender" className="text-xs sm:text-sm gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                OneSender
              </TabsTrigger>
              <TabsTrigger value="mpwa" className="text-xs sm:text-sm gap-1.5">
                <Smartphone className="h-3.5 w-3.5" />
                MPWA
              </TabsTrigger>
            </TabsList>

            <TabsContent value="onesender" className="mt-4 space-y-4">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-[11px] text-muted-foreground">
                  OneSender digunakan sebagai gateway utama sistem ATSkolla. Konfigurasi ini berlaku untuk notifikasi registrasi platform.
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">API URL</Label>
                <Input
                  value={settings.wa_api_url}
                  onChange={(e) => setSettings({ ...settings, wa_api_url: e.target.value })}
                  placeholder="http://proxy.onesender.net/api/v1/messages"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">API Key / Token</Label>
                <Input
                  type="password"
                  value={settings.wa_api_key}
                  onChange={(e) => setSettings({ ...settings, wa_api_key: e.target.value })}
                  placeholder="Masukkan API Key OneSender"
                />
              </div>
            </TabsContent>

            <TabsContent value="mpwa" className="mt-4 space-y-4">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-[11px] text-muted-foreground">
                  MPWA memungkinkan setiap sekolah menggunakan nomor WhatsApp sendiri. Cukup masukkan API Key di sini — setiap sekolah akan memasukkan nomor WhatsApp dan scan QR code sendiri di dashboard masing-masing.
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">MPWA API Key (Global)</Label>
                <Input
                  type="password"
                  value={settings.mpwa_platform_api_key}
                  onChange={(e) => setSettings({ ...settings, mpwa_platform_api_key: e.target.value })}
                  placeholder="API Key dari MPWA (app.ayopintar.com)"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  API Key ini digunakan untuk semua sekolah yang memilih gateway WASkolla Scan Sendiri. Setiap sekolah akan input nomor WA dan scan QR sendiri.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Message Template */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <h3 className="font-bold text-foreground text-sm">Template Pesan Registrasi</h3>
          <div className="flex flex-wrap gap-1.5 mb-2">
            <Badge variant="secondary" className="text-[10px]">{"{name}"} = Nama Admin</Badge>
            <Badge variant="secondary" className="text-[10px]">{"{school}"} = Nama Sekolah</Badge>
            <Badge variant="secondary" className="text-[10px]">{"{email}"} = Email</Badge>
          </div>
          <Textarea
            value={settings.wa_registration_message}
            onChange={(e) => setSettings({ ...settings, wa_registration_message: e.target.value })}
            rows={8}
            className="resize-none font-mono text-sm"
            placeholder="Masukkan template pesan..."
          />
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3" /> Preview:</p>
            <p className="text-xs text-foreground whitespace-pre-wrap">
              {(settings.wa_registration_message || "Belum ada template")
                .replace(/{name}/g, "Budi Santoso")
                .replace(/{school}/g, "SDN 1 Jakarta")
                .replace(/{email}/g, "budi@sdn1jakarta.sch.id")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Test */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <h3 className="font-bold text-foreground text-sm">Tes Kirim Pesan</h3>
          <p className="text-[11px] text-muted-foreground">
            Tes menggunakan gateway: <span className="font-semibold">{activeTab === "mpwa" ? "MPWA" : "OneSender"}</span>
          </p>
          <div className="flex gap-2">
            <Input
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="6281234567890"
              className="flex-1"
            />
            <Button onClick={handleTest} disabled={testing} variant="outline">
              {testing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Kirim Tes
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Masukkan nomor WhatsApp dengan format internasional (62...)</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminRegistrationWA;
