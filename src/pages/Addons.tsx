import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, CreditCard, Package, ChevronRight, Sparkles, ArrowRight, MessageSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

const Addons = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [domainEnabled, setDomainEnabled] = useState(true);
  const [idcardEnabled, setIdcardEnabled] = useState(true);
  const [waCreditEnabled, setWaCreditEnabled] = useState(true);
  const [domainAddon, setDomainAddon] = useState<any>(null);
  const [idcardOrders, setIdcardOrders] = useState<any[]>([]);
  const [waCredits, setWaCredits] = useState<any>(null);
  const [waCreditPrice, setWaCreditPrice] = useState(50000);
  const [waCreditPerPack, setWaCreditPerPack] = useState(1000);
  const [waPacks, setWaPacks] = useState(1);
  const [purchasing, setPurchasing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (searchParams.get("status") === "wa_credit_success") {
      toast.success("Pembayaran kredit WhatsApp berhasil!");
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", ["addon_custom_domain_enabled", "addon_idcard_enabled", "addon_wa_credit_enabled", "wa_credit_price", "wa_credit_per_pack"]);
      (data || []).forEach((d: any) => {
        if (d.key === "addon_custom_domain_enabled" && d.value === "false") setDomainEnabled(false);
        if (d.key === "addon_idcard_enabled" && d.value === "false") setIdcardEnabled(false);
        if (d.key === "addon_wa_credit_enabled" && d.value === "false") setWaCreditEnabled(false);
        if (d.key === "wa_credit_price") setWaCreditPrice(parseInt(d.value) || 50000);
        if (d.key === "wa_credit_per_pack") setWaCreditPerPack(parseInt(d.value) || 1000);
      });

      if (profile?.school_id) {
        const [domRes, orderRes, creditRes] = await Promise.all([
          supabase.from("school_addons").select("*").eq("school_id", profile.school_id).eq("addon_type", "custom_domain").maybeSingle(),
          supabase.from("id_card_orders").select("*, id_card_designs(name)").eq("school_id", profile.school_id).order("created_at", { ascending: false }).limit(5),
          supabase.from("wa_credits").select("*").eq("school_id", profile.school_id).maybeSingle(),
        ]);
        setDomainAddon(domRes.data);
        setIdcardOrders(orderRes.data || []);
        setWaCredits(creditRes.data);
      }
      setLoading(false);
    };
    fetchSettings();
  }, [profile?.school_id]);

  const handleBuyWaCredit = async () => {
    if (!profile?.school_id) return;
    setPurchasing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Sesi login berakhir");

      const { data, error } = await supabase.functions.invoke("create-mayar-payment", {
        body: { addon_type: "wa_credit", school_id: profile.school_id, wa_credit_amount: waPacks },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (error) throw error;
      if (data?.payment_url) {
        toast.success("Membuka halaman pembayaran...");
        window.open(data.payment_url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat pembayaran");
    }
    setPurchasing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const addons = [
    ...(domainEnabled ? [{
      key: "domain",
      icon: Globe,
      title: "Custom Domain",
      description: "Gunakan domain pribadi untuk dashboard sekolah Anda. Tampil lebih profesional dengan URL khusus.",
      price: "Rp 200.000",
      priceNote: "mengikuti masa aktif langganan",
      status: domainAddon?.status === "active" ? "active" : domainAddon ? "pending" : null,
      statusLabel: domainAddon?.status === "active" ? "Aktif" : domainAddon ? "Proses" : null,
      gradient: "from-blue-600 to-indigo-700",
      features: ["SSL Gratis & HTTPS", "Instant Setup", "Tutorial DNS Lengkap"],
      onClick: () => navigate("/custom-domain"),
    }] : []),
    ...(idcardEnabled ? [{
      key: "idcard",
      icon: CreditCard,
      title: "Cetak ID Card Siswa",
      description: "Cetak kartu identitas siswa profesional dengan QR Code unik untuk absensi dan identifikasi.",
      price: "Rp 7.000",
      priceNote: "per kartu",
      status: idcardOrders.length > 0 ? "has_orders" : null,
      statusLabel: idcardOrders.length > 0 ? `${idcardOrders.length} pesanan` : null,
      gradient: "from-emerald-600 to-teal-700",
      features: ["Pilih Desain Premium", "QR Code Otomatis", "Tracking Pengiriman"],
      onClick: () => navigate("/order-idcard"),
    }] : []),
  ];

  const getProgressLabel = (progress: string) => {
    const map: Record<string, string> = {
      waiting_payment: "Menunggu Bayar", paid: "Dibayar", processing: "Diproses",
      printing: "Dicetak", shipping: "Dikirim", completed: "Selesai",
    };
    return map[progress] || progress;
  };

  const creditPercent = waCredits ? Math.min(100, (waCredits.balance / Math.max(waCredits.total_purchased, 1)) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            Add-on
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Fitur tambahan untuk meningkatkan sistem sekolah Anda</p>
        </div>
      </div>

      {addons.length === 0 && !waCreditEnabled && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Package className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg mb-1">Belum Ada Add-on Tersedia</h3>
            <p className="text-muted-foreground text-sm">Add-on akan muncul di sini saat tersedia</p>
          </CardContent>
        </Card>
      )}

      {/* Add-on Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {addons.map((addon, idx) => (
          <motion.div key={addon.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
            <Card className="cursor-pointer group overflow-hidden border-2 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5" onClick={addon.onClick}>
              <CardContent className="p-0">
                <div className={`bg-gradient-to-r ${addon.gradient} p-5 text-white`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <addon.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{addon.title}</h3>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-xl font-extrabold">{addon.price}</span>
                          <span className="text-xs text-white/70">/ {addon.priceNote}</span>
                        </div>
                      </div>
                    </div>
                    {addon.statusLabel && (
                      <Badge className="bg-white/20 text-white border-white/30 text-[10px]">{addon.statusLabel}</Badge>
                    )}
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{addon.description}</p>
                  <div className="space-y-2">
                    {addon.features.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-sm">
                        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Sparkles className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-foreground">{f}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-semibold text-primary group-hover:underline">
                      {addon.status === "active" ? "Kelola" : addon.status === "has_orders" ? "Lihat Pesanan" : "Mulai Sekarang"}
                    </span>
                    <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {/* WA Credit Card */}
        {waCreditEnabled && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: addons.length * 0.1 }}>
            <Card className="overflow-hidden border-2 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
              <CardContent className="p-0">
                <div className="bg-gradient-to-r from-violet-600 to-purple-700 p-5 text-white">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <MessageSquare className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">Kredit Pesan WA</h3>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-xl font-extrabold">Rp {waCreditPrice.toLocaleString("id-ID")}</span>
                          <span className="text-xs text-white/70">/ {waCreditPerPack.toLocaleString("id-ID")} pesan</span>
                        </div>
                      </div>
                    </div>
                    {waCredits && (
                      <Badge className="bg-white/20 text-white border-white/30 text-[10px]">
                        {waCredits.balance.toLocaleString("id-ID")} sisa
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Top-up kredit pesan WhatsApp untuk notifikasi absensi, penjemputan, dan broadcast ke wali murid.
                  </p>

                  {/* Credit balance */}
                  {waCredits && (
                    <div className="p-3 rounded-xl bg-secondary/50 border border-border space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Sisa Kredit</span>
                        <span className="font-bold text-foreground">{waCredits.balance.toLocaleString("id-ID")} pesan</span>
                      </div>
                      <Progress value={creditPercent} className="h-2" />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Terpakai: {waCredits.total_used.toLocaleString("id-ID")}</span>
                        <span>Total: {waCredits.total_purchased.toLocaleString("id-ID")}</span>
                      </div>
                    </div>
                  )}

                  {/* Purchase */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">Jumlah paket:</span>
                      <Input type="number" min={1} max={100} value={waPacks} onChange={(e) => setWaPacks(Math.max(1, parseInt(e.target.value) || 1))} className="w-20 h-8 text-sm" />
                      <span className="text-xs text-muted-foreground">= {(waPacks * waCreditPerPack).toLocaleString("id-ID")} pesan</span>
                    </div>
                    <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2.5">
                      <span className="text-sm text-muted-foreground">Total:</span>
                      <span className="font-bold text-foreground">Rp {(waPacks * waCreditPrice).toLocaleString("id-ID")}</span>
                    </div>
                    <Button className="w-full" onClick={handleBuyWaCredit} disabled={purchasing}>
                      {purchasing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Memproses...</> : <><MessageSquare className="h-4 w-4 mr-2" /> Beli Kredit</>}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Recent ID Card Orders */}
      {idcardEnabled && idcardOrders.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Pesanan ID Card Terbaru
              </h3>
              <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => navigate("/order-idcard")}>
                Lihat semua <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            </div>
            <div className="space-y-2">
              {idcardOrders.slice(0, 3).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <span className="font-semibold text-sm">{order.total_cards} kartu</span>
                      <span className="text-xs text-muted-foreground ml-2">• {(order as any).id_card_designs?.name || "Desain Default"}</span>
                      <p className="text-xs text-muted-foreground">
                        Rp {(order.total_amount || 0).toLocaleString("id-ID")} • {new Date(order.created_at).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                  </div>
                  <Badge variant={order.progress === "completed" ? "default" : "secondary"} className="text-[10px]">
                    {getProgressLabel(order.progress)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Addons;
