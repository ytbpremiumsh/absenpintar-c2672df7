import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Check, Star, Zap, Crown, Loader2, Shield, Calendar, Clock,
  GraduationCap, AlertTriangle, CheckCircle2, CreditCard,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

const iconMap: Record<string, any> = { Free: Zap, Basic: Star, School: Crown, Premium: Crown };

interface UsageStats {
  classCount: number;
  studentCount: number;
  maxClasses: number;
  maxStudentsPerClass: number;
  maxStudentsTotal: number | null;
}

const planLimits: Record<string, { maxClasses: number; maxStudentsPerClass: number }> = {
  Free: { maxClasses: 2, maxStudentsPerClass: 10 },
  Basic: { maxClasses: 10, maxStudentsPerClass: 50 },
  School: { maxClasses: 999, maxStudentsPerClass: 999 },
  Premium: { maxClasses: 999, maxStudentsPerClass: 999 },
};

const Subscription = () => {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [currentSub, setCurrentSub] = useState<any>(null);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const [usage, setUsage] = useState<UsageStats>({ classCount: 0, studentCount: 0, maxClasses: 2, maxStudentsPerClass: 10, maxStudentsTotal: 20 });
  const [subscriptionHistory, setSubscriptionHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: plansData } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      const parsed = (plansData || []).map((p: any) => ({
        ...p,
        features: Array.isArray(p.features) ? p.features : [],
      }));
      setPlans(parsed);

      if (profile?.school_id) {
        const [subRes, classesRes, studentRes, historyRes] = await Promise.all([
          supabase.from("school_subscriptions").select("*, subscription_plans(*)").eq("school_id", profile.school_id).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("classes").select("name").eq("school_id", profile.school_id),
          supabase.from("students").select("id, class").eq("school_id", profile.school_id),
          supabase.from("payment_transactions").select("id, amount, status, created_at, paid_at, payment_method, subscription_plans(name)").eq("school_id", profile.school_id).eq("status", "paid").order("created_at", { ascending: false }).limit(20),
        ]);

        const sub = subRes.data;
        // Count unique classes from both classes table and student class assignments
        const classTableNames = new Set((classesRes.data || []).map((c: any) => c.name));
        const studentClassNames = new Set((studentRes.data || []).map((s: any) => s.class));
        const allClassNames = new Set([...classTableNames, ...studentClassNames]);
        const classCount = allClassNames.size;
        const studentCount = studentRes.data?.length || 0;
        setSubscriptionHistory(historyRes.data || []);

        if (sub) {
          setCurrentSub(sub);
          const plan = (sub as any).subscription_plans;
          if (plan) {
            const p = { ...plan, features: Array.isArray(plan.features) ? plan.features : [] };
            setCurrentPlan(p);
            const limits = planLimits[p.name] || planLimits.Free;
            setUsage({
              classCount,
              studentCount,
              maxClasses: limits.maxClasses,
              maxStudentsPerClass: limits.maxStudentsPerClass,
              maxStudentsTotal: p.max_students,
            });
          }
        } else {
          const freePlan = parsed.find((p: any) => p.price === 0);
          if (freePlan) setCurrentPlan(freePlan);
          setUsage({
            classCount,
            studentCount,
            maxClasses: 2,
            maxStudentsPerClass: 10,
            maxStudentsTotal: 20,
          });
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [profile?.school_id]);

  // Poll for payment confirmation when returning from Mayar
  useEffect(() => {
    const status = searchParams.get("status");
    if (status !== "success" || !profile?.school_id) return;

    toast.info("Menunggu konfirmasi pembayaran...");
    let attempts = 0;
    const maxAttempts = 60; // 60 * 3s = 3 minutes

    pollingRef.current = setInterval(async () => {
      attempts++;
      const { data: latestPayment } = await supabase
        .from("payment_transactions")
        .select("status, paid_at")
        .eq("school_id", profile.school_id!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestPayment?.status === "paid") {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setPaymentSuccess(true);
        toast.success("🎉 Pembayaran berhasil! Paket Anda telah di-upgrade otomatis.");
        setTimeout(() => window.location.replace("/subscription"), 2500);
      } else if (attempts >= maxAttempts) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        toast.info("Pembayaran belum dikonfirmasi. Silakan cek kembali nanti atau hubungi admin.");
      }
    }, 3000);

    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [searchParams, profile?.school_id]);

  const handlePurchase = async (planId: string) => {
    setPurchasing(planId);
    try {
      if (!profile?.school_id) throw new Error("Akun Anda belum terhubung ke sekolah.");

      const { data: sessionData } = await supabase.auth.getSession();
      let accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        const { data: refreshData } = await supabase.auth.refreshSession();
        accessToken = refreshData.session?.access_token;
      }

      if (!accessToken) {
        throw new Error("Sesi login berakhir. Silakan login ulang lalu coba lagi.");
      }

      const invokeCreatePayment = (token: string) =>
        supabase.functions.invoke("create-mayar-payment", {
          body: { plan_id: planId, school_id: profile.school_id },
          headers: { Authorization: `Bearer ${token}` },
        });

      let { data, error } = await invokeCreatePayment(accessToken);

      if (error && /unauthorized|401|non-2xx/i.test(error.message || "")) {
        const { data: retrySession } = await supabase.auth.refreshSession();
        const retryToken = retrySession.session?.access_token;
        if (retryToken) {
          ({ data, error } = await invokeCreatePayment(retryToken));
        }
      }

      if (error) {
        let message = error.message || "Gagal membuat pembayaran";
        const context = (error as any).context;
        if (context) {
          try {
            const parsed = await context.json();
            if (parsed?.error) message = parsed.error;
          } catch {
            // ignore parse error
          }
        }
        if (/unauthorized/i.test(message)) {
          message = "Sesi login berakhir. Silakan login ulang lalu coba lagi.";
        }
        throw new Error(message);
      }

      const result = data as any;
      if (result?.error) throw new Error(result.error);

      if (result?.auto_approved) {
        toast.success("Paket berhasil diaktifkan!");
        window.location.reload();
      } else if (result?.payment_url) {
        toast.success("Membuka halaman pembayaran Mayar...");
        window.open(result.payment_url, "_blank");
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
  const isFree = !currentSub || currentPlan?.price === 0;
  const hasActiveSub = currentSub && !isExpired;

  const daysLeft = currentSub?.expires_at
    ? Math.max(0, Math.ceil((new Date(currentSub.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  // Subscription period progress
  const periodProgress = (() => {
    if (!currentSub?.started_at || !currentSub?.expires_at || isFree) return null;
    const start = new Date(currentSub.started_at).getTime();
    const end = new Date(currentSub.expires_at).getTime();
    const now = Date.now();
    const total = end - start;
    const elapsed = now - start;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  })();

  const totalDays = currentSub?.started_at && currentSub?.expires_at
    ? Math.ceil((new Date(currentSub.expires_at).getTime() - new Date(currentSub.started_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const classPercent = usage.maxClasses >= 999 ? 0 : Math.min(100, (usage.classCount / usage.maxClasses) * 100);
  const studentPercent = usage.maxStudentsTotal
    ? Math.min(100, (usage.studentCount / usage.maxStudentsTotal) * 100)
    : usage.maxStudentsPerClass >= 999 ? 0 : Math.min(100, (usage.studentCount / (usage.maxClasses * usage.maxStudentsPerClass)) * 100);

  const classNearLimit = classPercent >= 80;
  const studentNearLimit = studentPercent >= 80;

  

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  const planName = currentPlan?.name || "Free";
  const Icon = iconMap[planName] || Zap;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Payment Success Banner */}
      {(paymentSuccess || searchParams.get("status") === "success") && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className={`border-0 shadow-card ${paymentSuccess ? "bg-success/5 border-success/30" : "bg-primary/5 border-primary/30"}`}>
            <div className="p-4 flex items-center gap-3">
              <CheckCircle2 className={`h-6 w-6 shrink-0 ${paymentSuccess ? "text-success" : "text-primary"}`} />
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">
                  {paymentSuccess ? "🎉 Pembayaran Berhasil — Upgrade Sukses!" : "⏳ Menunggu Konfirmasi Pembayaran..."}
                </p>
                <p className="text-xs text-muted-foreground">
                  {paymentSuccess
                    ? "Paket langganan Anda telah di-upgrade secara otomatis."
                    : "Sistem sedang memverifikasi pembayaran Anda."}
                </p>
              </div>
              {!paymentSuccess && <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0 ml-auto" />}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Header: Current Plan Status - Mobile Optimized */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-elevated overflow-hidden">
          <div className="gradient-primary p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-extrabold text-primary-foreground truncate">Paket {planName}</h2>
                  <Badge className="bg-white/20 text-primary-foreground border-0 text-[10px]">
                    {hasActiveSub && !isFree ? "Aktif" : isFree ? "Gratis" : "Expired"}
                  </Badge>
                </div>
                <p className="text-xl sm:text-2xl font-extrabold text-primary-foreground mt-0.5">
                  {formatRupiah(currentPlan?.price || 0)}
                  {(currentPlan?.price || 0) > 0 && <span className="text-primary-foreground/50 text-xs font-normal ml-1">/ bulan</span>}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {/* Period Progress */}
            {!isFree && periodProgress !== null && (
              <div className="mb-4 p-3 rounded-xl bg-secondary/50 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" /> Masa Aktif
                  </span>
                  <span className={`text-xs font-bold ${daysLeft !== null && daysLeft <= 7 ? "text-warning" : "text-primary"}`}>
                    {daysLeft} / {totalDays} hari
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${daysLeft !== null && daysLeft <= 7 ? "bg-gradient-to-r from-warning to-destructive" : "bg-gradient-to-r from-primary via-primary/80 to-success"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${periodProgress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(currentSub.started_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </span>
                  <span className={`text-[10px] font-medium ${daysLeft !== null && daysLeft <= 7 ? "text-warning" : "text-muted-foreground"}`}>
                    {daysLeft !== null && daysLeft <= 7 ? `⚠ ${daysLeft} hari lagi` : `${Math.round(periodProgress)}% terpakai`}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(currentSub.expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-success/5 border border-success/20 text-center">
                <Shield className="h-4 w-4 text-success mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">Status</p>
                <p className="text-xs sm:text-sm font-bold text-success">{hasActiveSub || isFree ? "Aktif" : "Expired"}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-secondary text-center">
                <Calendar className="h-4 w-4 text-primary mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">Masa Aktif</p>
                {isFree ? (
                  <p className="text-xs sm:text-sm font-bold text-foreground">Selamanya</p>
                ) : daysLeft !== null ? (
                  <p className={`text-xs sm:text-sm font-bold ${daysLeft <= 7 ? "text-warning" : "text-foreground"}`}>{daysLeft} hari</p>
                ) : (
                  <p className="text-xs sm:text-sm font-bold text-muted-foreground">—</p>
                )}
              </div>
              {!isFree && currentSub?.expires_at && (
                <div className="p-2.5 rounded-xl bg-secondary text-center col-span-2 sm:col-span-1">
                  <Clock className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground">Hingga</p>
                  <p className="text-xs sm:text-sm font-bold text-foreground">
                    {new Date(currentSub.expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              )}
            </div>

            {currentPlan?.features?.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Fitur Tersedia</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {currentPlan.features.map((f: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-sm py-0.5">
                      <Check className="h-3.5 w-3.5 text-success shrink-0" />
                      <span className="text-foreground text-xs sm:text-sm">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Usage Statistics */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border-0 shadow-card">
          <div className="p-4 sm:p-5">
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              Statistik Penggunaan
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-foreground font-medium">Kelas</span>
                  <span className={`text-sm font-bold ${classNearLimit ? "text-warning" : "text-foreground"}`}>
                    {usage.classCount} / {usage.maxClasses >= 999 ? "∞" : usage.maxClasses}
                  </span>
                </div>
                {usage.maxClasses < 999 ? (
                  <Progress value={classPercent} className="h-2.5" />
                ) : (
                  <div className="h-2.5 rounded-full bg-success/20 overflow-hidden">
                    <div className="h-full bg-success rounded-full" style={{ width: "100%" }} />
                  </div>
                )}
                {classNearLimit && usage.maxClasses < 999 && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertTriangle className="h-3 w-3 text-warning" />
                    <span className="text-[11px] text-warning">Mendekati batas maksimal kelas</span>
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-foreground font-medium">Siswa</span>
                  <span className={`text-sm font-bold ${studentNearLimit ? "text-warning" : "text-foreground"}`}>
                    {usage.studentCount} / {usage.maxStudentsTotal ? usage.maxStudentsTotal : usage.maxStudentsPerClass >= 999 ? "∞" : (usage.maxClasses * usage.maxStudentsPerClass)}
                  </span>
                </div>
                {(usage.maxStudentsTotal || usage.maxStudentsPerClass < 999) ? (
                  <Progress value={studentPercent} className="h-2.5" />
                ) : (
                  <div className="h-2.5 rounded-full bg-success/20 overflow-hidden">
                    <div className="h-full bg-success rounded-full" style={{ width: "100%" }} />
                  </div>
                )}
                {studentNearLimit && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertTriangle className="h-3 w-3 text-warning" />
                    <span className="text-[11px] text-warning">Mendekati batas maksimal siswa</span>
                  </div>
                )}
              </div>
              {isFree && (
                <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-[11px] text-muted-foreground">
                    <strong>Paket Free:</strong> Maksimal {usage.maxClasses} kelas, masing-masing {usage.maxStudentsPerClass} siswa
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Subscription History */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="border-0 shadow-card">
          <div className="p-4 sm:p-5">
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Riwayat Langganan
            </h3>
            {subscriptionHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada riwayat langganan.</p>
            ) : (
              <div className="space-y-2">
                {subscriptionHistory.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        Paket {(item as any).subscription_plans?.name || "-"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-foreground">{formatRupiah(item.amount || 0)}</p>
                      <Badge className="text-[10px] border bg-success/10 text-success border-success/20">berhasil</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* All Plans - Premium Cards */}
      {plans.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-bold text-foreground">Pilih Paket Langganan</h2>
              <p className="text-muted-foreground text-xs">Tingkatkan fitur dan kapasitas sekolah Anda</p>
            </div>

            {/* Collect all unique features across all plans */}
            {(() => {
              const allFeatures = Array.from(new Set(plans.flatMap((p: any) => p.features || [])));
              return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {plans.map((plan, i) => {
                const planFeatureSet = new Set(plan.features || []);
                const isCurrent = currentPlan?.id === plan.id || (!currentPlan?.id && plan.price === 0 && (currentPlan?.name === plan.name || (!currentSub && plan.price === 0)));
                const isLower = currentPlan && plan.price < (currentPlan.price || 0) && !isCurrent;
                const highlighted = !isCurrent && (plan.name === "School" || plans.filter(p => p.price > (currentPlan?.price || 0)).length === 1 && plan.price > (currentPlan?.price || 0));
                const PIcon = iconMap[plan.name] || Star;
                const isPremium = plan.name === "Premium";

                return (
                  <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.06 }}>
                    <Card className={`border-0 relative overflow-hidden flex flex-col ${
                      isCurrent ? "ring-2 ring-primary shadow-lg" : highlighted ? "ring-2 ring-primary/60 shadow-lg" : isPremium ? "ring-1 ring-amber-400/50 shadow-lg" : "shadow-card"
                    }`}>
                      {/* Top Banner */}
                      {isCurrent && (
                        <div className="gradient-primary text-primary-foreground text-[11px] font-semibold text-center py-1.5">
                          ✓ Paket Saat Ini
                        </div>
                      )}
                      {!isCurrent && highlighted && (
                        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-[11px] font-semibold text-center py-1.5">
                          ⭐ Rekomendasi
                        </div>
                      )}
                      {!isCurrent && !highlighted && isPremium && (
                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-semibold text-center py-1.5">
                          👑 Premium
                        </div>
                      )}

                      <div className="p-4 sm:p-5 flex flex-col flex-1">
                        {/* Plan Icon & Name */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                            isCurrent ? "gradient-primary text-primary-foreground" : isPremium ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white" : highlighted ? "bg-primary/10 text-primary" : "bg-secondary text-foreground"
                          }`}>
                            <PIcon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
                            {plan.description && <p className="text-[10px] text-muted-foreground truncate">{plan.description}</p>}
                          </div>
                        </div>

                        {/* Price */}
                        <div className="mb-4">
                          <p className="text-2xl font-extrabold text-foreground">
                            {formatRupiah(plan.price)}
                            {plan.price > 0 && <span className="text-xs text-muted-foreground font-normal ml-1">/ bulan</span>}
                          </p>
                        </div>

                        {/* Features List - All features shown */}
                        <div className="flex-1 mb-4">
                          <ul className="space-y-1 sm:space-y-1.5">
                            {allFeatures.map((f: string, fi: number) => {
                              const isIncluded = planFeatureSet.has(f);
                              return (
                                <li key={fi} className={`flex items-start gap-1.5 sm:gap-2 text-[10px] sm:text-xs ${!isIncluded ? "opacity-40" : ""}`}>
                                  <Check className={`h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 mt-0.5 ${isIncluded ? "text-success" : "text-muted-foreground"}`} />
                                  <span className={isIncluded ? "text-foreground" : "text-muted-foreground line-through"}>{f}</span>
                                </li>
                              );
                            })}
                          </ul>
                          {plan.max_students && (
                            <p className="text-[10px] text-muted-foreground mt-2 pl-5">Maks {plan.max_students} siswa</p>
                          )}
                        </div>

                        {/* CTA Button */}
                        <Button
                          className={`w-full font-semibold text-sm h-10 ${
                            isCurrent
                              ? "bg-secondary text-muted-foreground"
                              : isPremium
                                ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md"
                                : highlighted
                                  ? "gradient-primary hover:opacity-90 text-primary-foreground shadow-md"
                                  : ""
                          }`}
                          variant={isCurrent ? "secondary" : highlighted || isPremium ? "default" : "outline"}
                          disabled={isCurrent || !!isLower || purchasing === plan.id}
                          onClick={() => handlePurchase(plan.id)}
                        >
                          {purchasing === plan.id ? (
                            <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Memproses...</>
                          ) : isCurrent ? (
                            <><Check className="h-4 w-4 mr-1.5" />Paket Aktif</>
                          ) : isLower ? (
                            "—"
                          ) : (
                            <><Crown className="h-4 w-4 mr-1.5" />Upgrade Sekarang</>
                          )}
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
              );
            })()}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Subscription;
