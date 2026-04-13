import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { MessageSquare, Loader2, ArrowLeft, Minus, Plus, ShieldCheck, Zap, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";

const WaCredit = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [waCredits, setWaCredits] = useState<any>(null);
  const [waCreditPrice, setWaCreditPrice] = useState(50000);
  const [waCreditPerPack, setWaCreditPerPack] = useState(1000);
  const [waPacks, setWaPacks] = useState(1);
  const [purchasing, setPurchasing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);

  useEffect(() => {
    if (searchParams.get("status") === "success") {
      toast.success("Pembayaran kredit WhatsApp berhasil!");
    }
  }, [searchParams]);

  useEffect(() => {
    const fetch = async () => {
      const { data: settings } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", ["wa_credit_price", "wa_credit_per_pack"]);
      (settings || []).forEach((d: any) => {
        if (d.key === "wa_credit_price") setWaCreditPrice(parseInt(d.value) || 50000);
        if (d.key === "wa_credit_per_pack") setWaCreditPerPack(parseInt(d.value) || 1000);
      });

      if (profile?.school_id) {
        const [creditRes, historyRes] = await Promise.all([
          supabase.from("wa_credits").select("*").eq("school_id", profile.school_id).maybeSingle(),
          supabase.from("payment_transactions").select("*, subscription_plans(name)")
            .eq("school_id", profile.school_id)
            .like("payment_method", "%wa_credit%")
            .order("created_at", { ascending: false })
            .limit(10),
        ]);
        setWaCredits(creditRes.data);
        setPurchaseHistory(historyRes.data || []);
      }
      setLoading(false);
    };
    fetch();
  }, [profile?.school_id]);

  const handleBuy = async () => {
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

  const creditPercent = waCredits ? Math.min(100, (waCredits.balance / Math.max(waCredits.total_purchased, 1)) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/addons")} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            Kredit Pesan WhatsApp
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Top-up kredit pesan untuk notifikasi absensi & broadcast</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Credit Status */}
        <div className="space-y-5">
          {/* Balance Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="overflow-hidden border-2">
              <div className="bg-gradient-to-r from-violet-600 to-purple-700 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/70 font-medium">Sisa Kredit Pesan</p>
                    <p className="text-4xl font-extrabold mt-1">{waCredits ? waCredits.balance.toLocaleString("id-ID") : "0"}</p>
                    <p className="text-sm text-white/70 mt-1">pesan tersedia</p>
                  </div>
                  <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <MessageSquare className="h-8 w-8" />
                  </div>
                </div>
              </div>
              <CardContent className="p-5 space-y-4">
                {waCredits && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pemakaian</span>
                        <span className="font-semibold">{waCredits.total_used.toLocaleString("id-ID")} / {waCredits.total_purchased.toLocaleString("id-ID")}</span>
                      </div>
                      <Progress value={creditPercent} className="h-2.5" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Total Beli", val: waCredits.total_purchased.toLocaleString("id-ID"), icon: TrendingUp },
                        { label: "Terpakai", val: waCredits.total_used.toLocaleString("id-ID"), icon: Zap },
                        { label: "Sisa", val: waCredits.balance.toLocaleString("id-ID"), icon: ShieldCheck },
                      ].map((s) => (
                        <div key={s.label} className="p-3 rounded-xl bg-muted/50 border text-center">
                          <s.icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                          <p className="text-xs text-muted-foreground">{s.label}</p>
                          <p className="font-bold text-sm">{s.val}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {!waCredits && (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm">Belum ada kredit. Beli kredit pertama Anda!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right: Purchase */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-2 h-full">
            <CardContent className="p-6 space-y-5">
              <div>
                <h3 className="font-bold text-lg">Beli Kredit Pesan</h3>
                <p className="text-sm text-muted-foreground mt-1">Pilih jumlah paket yang ingin dibeli</p>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Harga per paket</span>
                  <Badge variant="secondary" className="text-xs">
                    {waCreditPerPack.toLocaleString("id-ID")} pesan
                  </Badge>
                </div>
                <p className="text-2xl font-extrabold text-foreground">Rp {waCreditPrice.toLocaleString("id-ID")}</p>
              </div>

              {/* Quantity Selector */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Jumlah Paket</label>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setWaPacks(Math.max(1, waPacks - 1))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={waPacks}
                    onChange={(e) => setWaPacks(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center font-bold text-lg h-10"
                  />
                  <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setWaPacks(Math.min(100, waPacks + 1))}>
                    <Plus className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">= <strong>{(waPacks * waCreditPerPack).toLocaleString("id-ID")}</strong> pesan</span>
                </div>
              </div>

              {/* Total */}
              <div className="p-4 rounded-xl bg-muted/50 border flex items-center justify-between">
                <span className="font-medium">Total Pembayaran</span>
                <span className="text-xl font-extrabold text-primary">Rp {(waPacks * waCreditPrice).toLocaleString("id-ID")}</span>
              </div>

              <Button className="w-full h-12 text-base" onClick={handleBuy} disabled={purchasing}>
                {purchasing ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Memproses...</>
                ) : (
                  <><MessageSquare className="h-5 w-5 mr-2" /> Beli Kredit Sekarang</>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">Pembayaran diproses melalui payment gateway yang aman</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default WaCredit;
