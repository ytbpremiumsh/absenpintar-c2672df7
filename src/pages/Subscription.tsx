import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Zap, Crown, Loader2, Shield, Calendar, Clock, ChevronRight, Gift } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const iconMap: Record<string, any> = {
  Free: Gift,
  Basic: Zap,
  School: Star,
  Premium: Crown,
};

const Subscription = () => {
  const { user, profile } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [currentSub, setCurrentSub] = useState<any>(null);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [showPlans, setShowPlans] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: plansData } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      const parsedPlans = (plansData || []).map((p: any) => ({
        ...p,
        features: Array.isArray(p.features) ? p.features : [],
      }));
      setPlans(parsedPlans);

      if (profile?.school_id) {
        const { data: sub } = await supabase
          .from("school_subscriptions")
          .select("*, subscription_plans(*)")
          .eq("school_id", profile.school_id)
          .eq("status", "active")
          .maybeSingle();

        if (sub) {
          setCurrentSub(sub);
          const plan = (sub as any).subscription_plans;
          if (plan) {
            setCurrentPlan({
              ...plan,
              features: Array.isArray(plan.features) ? plan.features : [],
            });
          }
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [profile?.school_id]);

  const handlePurchase = async (planId: string) => {
    setPurchasing(planId);
    try {
      const { data, error } = await supabase.functions.invoke("create-mayar-payment", {
        body: { plan_id: planId },
      });
      if (error) throw error;
      const result = data as any;
      if (result?.auto_approved) {
        toast.success("Paket berhasil diaktifkan!");
        // Refresh page
        window.location.reload();
      } else if (result?.payment_url) {
        window.open(result.payment_url, "_blank");
        toast.success("Redirecting ke halaman pembayaran...");
      } else {
        toast.error("Gagal mendapatkan link pembayaran");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat pembayaran");
    }
    setPurchasing(null);
  };

  const formatRupiah = (n: number) => n === 0 ? "Gratis" : `Rp ${n.toLocaleString("id-ID")}`;

  const isExpired = currentSub?.expires_at ? new Date(currentSub.expires_at) < new Date() : false;
  const isFree = currentPlan?.price === 0;
  const hasActiveSub = currentSub && !isExpired;

  const daysLeft = currentSub?.expires_at
    ? Math.max(0, Math.ceil((new Date(currentSub.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  // If user has active subscription (not expired), show subscription info
  if (hasActiveSub && currentPlan && !showPlans) {
    const Icon = iconMap[currentPlan.name] || Zap;

    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Langganan Anda</h1>
          <p className="text-muted-foreground text-sm mt-1">Informasi paket langganan aktif</p>
        </div>

        {/* Active Plan Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-elevated overflow-hidden">
            <div className="gradient-primary p-6 text-center">
              <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
                <Icon className="h-8 w-8 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-extrabold text-primary-foreground">{currentPlan.name}</h2>
              {currentPlan.description && (
                <p className="text-primary-foreground/70 text-sm mt-1">{currentPlan.description}</p>
              )}
              <div className="mt-3">
                <span className="text-3xl font-extrabold text-primary-foreground">{formatRupiah(currentPlan.price)}</span>
                {currentPlan.price > 0 && <span className="text-primary-foreground/60 text-sm"> / bulan</span>}
              </div>
            </div>

            <CardContent className="p-6 space-y-5">
              {/* Status & Expiry */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-success/5 border border-success/20 text-center">
                  <Shield className="h-5 w-5 text-success mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-sm font-bold text-success">Aktif</p>
                </div>
                <div className="p-3 rounded-xl bg-secondary text-center">
                  <Calendar className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Masa Aktif</p>
                  {isFree ? (
                    <p className="text-sm font-bold text-foreground">Selamanya</p>
                  ) : daysLeft !== null ? (
                    <p className={`text-sm font-bold ${daysLeft <= 7 ? "text-warning" : "text-foreground"}`}>
                      {daysLeft} hari lagi
                    </p>
                  ) : (
                    <p className="text-sm font-bold text-foreground">—</p>
                  )}
                </div>
              </div>

              {/* Expiry Date */}
              {currentSub.expires_at && !isFree && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/50">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Berlaku hingga:</span>
                  <span className="text-sm font-semibold text-foreground ml-auto">
                    {new Date(currentSub.expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                </div>
              )}

              {/* Features */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3">Fitur yang Tersedia</h3>
                <ul className="space-y-2.5">
                  {currentPlan.features.map((f: string, idx: number) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-start gap-2.5 text-sm"
                    >
                      <div className="h-5 w-5 rounded-full bg-success/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-success" />
                      </div>
                      <span className="text-foreground">{f}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Max Students */}
              {currentPlan.max_students && (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-xs text-muted-foreground">Batas Maksimal Siswa</p>
                  <p className="text-lg font-bold text-primary">{currentPlan.max_students} siswa</p>
                </div>
              )}

              {/* Upgrade CTA */}
              {currentPlan.price < Math.max(...plans.map((p: any) => p.price)) && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowPlans(true)}
                >
                  Upgrade Paket <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Show plan selection (no active sub, expired, or user clicked "Upgrade")
  const highlightIdx = plans.findIndex((p) => p.name === "School") !== -1 ? plans.findIndex((p) => p.name === "School") : 1;

  return (
    <div className="space-y-6">
      <div className="text-center max-w-xl mx-auto">
        <h1 className="text-2xl font-bold">Pilih Paket Langganan</h1>
        <p className="text-muted-foreground text-sm mt-1">Pilih paket yang sesuai dengan kebutuhan sekolah Anda</p>
        {isExpired && currentPlan && (
          <Badge className="mt-2 bg-warning/10 text-warning border-warning/20">
            Paket {currentPlan.name} Anda sudah berakhir
          </Badge>
        )}
        {showPlans && hasActiveSub && (
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowPlans(false)}>
            ← Kembali ke info langganan
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
        {plans.map((plan, i) => {
          const highlighted = i === highlightIdx;
          const Icon = iconMap[plan.name] || Zap;
          const isCurrentPlan = currentSub?.plan_id === plan.id;
          const isDowngrade = currentPlan && plan.price < currentPlan.price;
          return (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className={`shadow-card border-0 relative overflow-hidden h-full flex flex-col ${highlighted ? "ring-2 ring-primary" : ""}`}>
                {highlighted && <div className="gradient-primary text-primary-foreground text-xs font-semibold text-center py-1">Paling Populer</div>}
                <CardHeader className="text-center pb-2">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center mx-auto mb-2 ${highlighted ? "gradient-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                  <div className="mt-2">
                    <span className="text-2xl font-bold">{formatRupiah(plan.price)}</span>
                    {plan.price > 0 && <span className="text-muted-foreground text-sm"> / bulan</span>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col">
                  <ul className="space-y-2 flex-1">
                    {plan.features.map((f: string) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${highlighted ? "gradient-primary hover:opacity-90 text-primary-foreground" : ""}`}
                    variant={highlighted ? "default" : "outline"}
                    disabled={isCurrentPlan || isDowngrade || purchasing === plan.id}
                    onClick={() => handlePurchase(plan.id)}
                  >
                    {purchasing === plan.id ? (
                      <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Memproses...</>
                    ) : isCurrentPlan ? (
                      "Paket Aktif"
                    ) : isDowngrade ? (
                      "—"
                    ) : plan.price === 0 ? (
                      "Mulai Gratis"
                    ) : (
                      "Pilih Paket"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Subscription;
