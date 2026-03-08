import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Save, Loader2, Send, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const WhatsAppSettings = () => {
  const { profile } = useAuth();
  const [apiUrl, setApiUrl] = useState("http://proxy.onesender.net/api/v1/messages");
  const [apiKey, setApiKey] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [integrationId, setIntegrationId] = useState<string | null>(null);
  const [hasPremium, setHasPremium] = useState(false);

  useEffect(() => {
    if (!profile?.school_id) return;

    const fetchData = async () => {
      // Check subscription for Premium
      const { data: sub } = await supabase
        .from("school_subscriptions")
        .select("plan_id, subscription_plans(name)")
        .eq("school_id", profile.school_id!)
        .eq("status", "active")
        .maybeSingle();

      const planName = (sub as any)?.subscription_plans?.name?.toLowerCase() || "";
      setHasPremium(planName.includes("premium"));

      // Get integration settings
      const { data: integration } = await supabase
        .from("school_integrations" as any)
        .select("*")
        .eq("school_id", profile.school_id!)
        .eq("integration_type", "onesender")
        .maybeSingle();

      if (integration) {
        setApiUrl((integration as any).api_url || "http://proxy.onesender.net/api/v1/messages");
        setApiKey((integration as any).api_key || "");
        setIsActive((integration as any).is_active || false);
        setIntegrationId((integration as any).id);
      }
      setLoading(false);
    };
    fetchData();
  }, [profile?.school_id]);

  const handleSave = async () => {
    if (!profile?.school_id) return;
    setSaving(true);

    const payload = {
      school_id: profile.school_id,
      integration_type: "onesender",
      api_url: apiUrl,
      api_key: apiKey,
      is_active: isActive,
    };

    let error;
    if (integrationId) {
      ({ error } = await supabase.from("school_integrations" as any).update(payload).eq("id", integrationId));
    } else {
      const res = await supabase.from("school_integrations" as any).insert(payload).select().single();
      error = res.error;
      if (res.data) setIntegrationId((res.data as any).id);
    }

    setSaving(false);
    if (error) {
      toast.error("Gagal menyimpan: " + error.message);
    } else {
      toast.success("Pengaturan WhatsApp berhasil disimpan!");
    }
  };

  const handleTest = async () => {
    if (!testPhone.trim()) { toast.error("Masukkan nomor WhatsApp untuk tes"); return; }
    if (!apiUrl || !apiKey) { toast.error("API URL dan API Key harus diisi"); return; }

    setTesting(true);
    try {
      const res = await supabase.functions.invoke("send-whatsapp", {
        body: {
          phone: testPhone.replace(/\D/g, ""),
          message: "✅ Tes koneksi WhatsApp Gateway berhasil!\n\nPesan ini dikirim dari sistem Smart School Pickup.",
          api_url: apiUrl,
          api_key: apiKey,
        },
      });

      if (res.error) throw res.error;
      const data = res.data as any;
      if (data?.success) {
        toast.success("Pesan tes berhasil dikirim!");
      } else {
        toast.error("Gagal mengirim: " + (data?.error || "Unknown error"));
      }
    } catch (err: any) {
      toast.error("Gagal mengirim pesan tes: " + (err.message || "Unknown error"));
    }
    setTesting(false);
  };

  if (loading) return <div className="flex items-center justify-center py-12 text-muted-foreground">Memuat...</div>;

  if (!hasPremium) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Integrasi WhatsApp
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">Kirim notifikasi otomatis ke orang tua</p>
        </div>
        <Card className="border-0 shadow-card">
          <CardContent className="py-12 text-center space-y-3">
            <AlertTriangle className="h-12 w-12 text-warning mx-auto" />
            <h3 className="font-bold text-lg text-foreground">Fitur Premium</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Integrasi WhatsApp Gateway hanya tersedia untuk paket <strong>Premium</strong>. 
              Upgrade langganan Anda untuk menggunakan fitur ini.
            </p>
            <Button variant="outline" onClick={() => window.location.href = "/subscription"}>
              Lihat Paket Langganan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Integrasi WhatsApp
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">Konfigurasi OneSender WA Gateway untuk notifikasi otomatis</p>
      </div>

      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Konfigurasi OneSender</span>
            <Badge className={isActive ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"}>
              {isActive ? "Aktif" : "Nonaktif"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <div>
              <p className="text-sm font-semibold text-foreground">Aktifkan Notifikasi WhatsApp</p>
              <p className="text-[11px] text-muted-foreground">Kirim pesan otomatis saat siswa dijemput</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-url">API URL</Label>
            <Input
              id="api-url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://proxy.onesender.net/api/v1/messages"
            />
            <p className="text-[11px] text-muted-foreground">Endpoint API OneSender untuk mengirim pesan</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key">API Key / Token</Label>
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Masukkan token OneSender Anda"
            />
            <p className="text-[11px] text-muted-foreground">Token otorisasi dari dashboard OneSender Anda</p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="gradient-primary hover:opacity-90">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Menyimpan..." : "Simpan Pengaturan"}
          </Button>
        </CardContent>
      </Card>

      {/* Test Section */}
      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Tes Kirim Pesan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-phone">Nomor WhatsApp Tujuan</Label>
            <Input
              id="test-phone"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="6281234567890"
            />
            <p className="text-[11px] text-muted-foreground">Gunakan format internasional (62...)</p>
          </div>
          <Button onClick={handleTest} disabled={testing || !apiUrl || !apiKey} variant="outline">
            {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            {testing ? "Mengirim..." : "Kirim Pesan Tes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppSettings;
