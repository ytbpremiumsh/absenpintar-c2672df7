import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { School, Users, CreditCard, TrendingUp, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface DashboardStats {
  totalSchools: number;
  activeSubscriptions: number;
  totalRevenue: number;
  recentPayments: any[];
  schools: any[];
}

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalSchools: 0, activeSubscriptions: 0, totalRevenue: 0, recentPayments: [], schools: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [schoolsRes, subsRes, paymentsRes] = await Promise.all([
        supabase.from("schools").select("id, name, created_at, logo"),
        supabase.from("school_subscriptions").select("id, school_id, plan_id, status, started_at, expires_at, subscription_plans(name)"),
        supabase.from("payment_transactions").select("id, school_id, amount, status, paid_at, created_at, schools(name), subscription_plans(name)").order("created_at", { ascending: false }).limit(10),
      ]);

      const schools = schoolsRes.data || [];
      const subs = subsRes.data || [];
      const payments = paymentsRes.data || [];
      const activeSubs = subs.filter((s: any) => s.status === "active");
      const paidPayments = payments.filter((p: any) => p.status === "paid");
      const totalRevenue = paidPayments.reduce((sum: number, p: any) => sum + p.amount, 0);

      setStats({ totalSchools: schools.length, activeSubscriptions: activeSubs.length, totalRevenue, recentPayments: payments, schools });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const formatRupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

  const statCards = [
    { icon: School, label: "Total Sekolah", value: stats.totalSchools, color: "text-primary", bg: "bg-primary/10" },
    { icon: CheckCircle2, label: "Langganan Aktif", value: stats.activeSubscriptions, color: "text-success", bg: "bg-success/10" },
    { icon: CreditCard, label: "Total Pendapatan", value: formatRupiah(stats.totalRevenue), color: "text-warning", bg: "bg-warning/10" },
    { icon: TrendingUp, label: "Transaksi Terbaru", value: stats.recentPayments.length, color: "text-primary", bg: "gradient-primary" },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Super Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview platform & monitoring sekolah</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-0 shadow-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`h-5 w-5 ${s.bg.includes("gradient") ? "text-primary-foreground" : s.color}`} />
                </div>
                <div>
                  <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Payments */}
      <Card className="border-0 shadow-card">
        <CardHeader><CardTitle className="text-base">Transaksi Terbaru</CardTitle></CardHeader>
        <CardContent>
          {stats.recentPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada transaksi</p>
          ) : (
            <div className="space-y-2">
              {stats.recentPayments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{(p as any).schools?.name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{(p as any).subscription_plans?.name} • {new Date(p.created_at).toLocaleDateString("id-ID")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{formatRupiah(p.amount)}</p>
                    <Badge variant={p.status === "paid" ? "default" : "secondary"} className={`text-[10px] ${p.status === "paid" ? "bg-success/10 text-success border-success/20" : ""}`}>
                      {p.status === "paid" ? "Lunas" : p.status === "pending" ? "Pending" : p.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schools List */}
      <Card className="border-0 shadow-card">
        <CardHeader><CardTitle className="text-base">Daftar Sekolah</CardTitle></CardHeader>
        <CardContent>
          {stats.schools.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada sekolah terdaftar</p>
          ) : (
            <div className="space-y-2">
              {stats.schools.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                  <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                    <School className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">Bergabung {new Date(s.created_at).toLocaleDateString("id-ID")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminDashboard;
