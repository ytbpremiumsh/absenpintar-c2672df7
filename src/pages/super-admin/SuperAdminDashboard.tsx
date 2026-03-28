import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { School, Users, CreditCard, CheckCircle2, GraduationCap, UserCheck, MessageSquare, TrendingUp, Settings, LifeBuoy, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useNavigate } from "react-router-dom";

interface DashboardStats {
  totalSchools: number;
  totalStudents: number;
  totalStaff: number;
  totalClasses: number;
  activeSubscriptions: number;
  pendingPayments: number;
  totalRevenue: number;
  recentPayments: any[];
  schools: any[];
  monthlyRevenue: number;
  paidCount: number;
  waActiveCount: number;
  planDistribution: { name: string; value: number; color: string }[];
}

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalSchools: 0, totalStudents: 0, totalStaff: 0, totalClasses: 0,
    activeSubscriptions: 0, pendingPayments: 0,
    totalRevenue: 0, monthlyRevenue: 0, paidCount: 0, waActiveCount: 0,
    recentPayments: [], schools: [], planDistribution: [],
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      const [schoolsRes, studentsRes, classesRes, profilesRes, subsRes, paymentsRes, rolesRes, integrationsRes] = await Promise.all([
        supabase.from("schools").select("id, name, created_at, logo, address"),
        supabase.from("students").select("id, school_id"),
        supabase.from("classes").select("id, school_id"),
        supabase.from("profiles").select("id, school_id"),
        supabase.from("school_subscriptions").select("id, school_id, plan_id, status, started_at, expires_at, subscription_plans(name)"),
        supabase.from("payment_transactions").select("id, school_id, amount, status, paid_at, created_at, schools(name), subscription_plans(name)").order("created_at", { ascending: false }).limit(10),
        supabase.from("user_roles").select("id, role"),
        supabase.from("school_integrations").select("school_id, is_active").eq("is_active", true),
      ]);

      const schools = schoolsRes.data || [];
      const students = studentsRes.data || [];
      const subs = subsRes.data || [];
      const payments = paymentsRes.data || [];
      const roles = rolesRes.data || [];
      const integrations = integrationsRes.data || [];

      const activeSubs = subs.filter((s: any) => s.status === "active");
      const pendingPayments = payments.filter((p: any) => p.status === "pending");
      const paidPayments = payments.filter((p: any) => p.status === "paid");
      const totalRevenue = paidPayments.reduce((sum: number, p: any) => sum + p.amount, 0);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthlyRevenue = paidPayments
        .filter((p: any) => p.paid_at && p.paid_at >= startOfMonth)
        .reduce((sum: number, p: any) => sum + p.amount, 0);

      const staffCount = roles.filter((r: any) => r.role !== "super_admin").length;
      const waActiveSchools = new Set(integrations.map((i: any) => i.school_id)).size;

      // Plan distribution
      const planCounts: Record<string, number> = {};
      schools.forEach((s: any) => {
        const sub = activeSubs.find((sub: any) => sub.school_id === s.id);
        const planName = sub ? (sub as any).subscription_plans?.name || "Gratis" : "Gratis";
        planCounts[planName] = (planCounts[planName] || 0) + 1;
      });
      const PLAN_COLORS = ["hsl(220, 15%, 75%)", "hsl(217, 91%, 60%)", "hsl(262, 83%, 58%)", "hsl(142, 71%, 45%)"];
      const planDistribution = Object.entries(planCounts).map(([name, value], i) => ({
        name, value, color: PLAN_COLORS[i % PLAN_COLORS.length],
      }));

      setStats({
        totalSchools: schools.length,
        totalStudents: students.length,
        totalStaff: staffCount,
        totalClasses: (classesRes.data || []).length,
        activeSubscriptions: activeSubs.length,
        pendingPayments: pendingPayments.length,
        totalRevenue,
        monthlyRevenue,
        paidCount: paidPayments.length,
        waActiveCount: waActiveSchools,
        recentPayments: payments,
        schools,
        planDistribution,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const formatRupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  const statCards = [
    { label: "TOTAL SEKOLAH", value: stats.totalSchools, desc: "terdaftar di platform", icon: School, iconBg: "bg-indigo-100 dark:bg-indigo-900/40", iconColor: "text-indigo-600 dark:text-indigo-400" },
    { label: "TOTAL SISWA", value: stats.totalStudents.toLocaleString("id-ID"), desc: "di seluruh sekolah", icon: GraduationCap, iconBg: "bg-emerald-100 dark:bg-emerald-900/40", iconColor: "text-emerald-600 dark:text-emerald-400" },
    { label: "TOTAL PENGGUNA", value: stats.totalStaff, desc: "admin & operator", icon: UserCheck, iconBg: "bg-blue-100 dark:bg-blue-900/40", iconColor: "text-blue-600 dark:text-blue-400" },
    { label: "WA AKTIF", value: stats.waActiveCount, desc: "sekolah pakai notif WA", icon: MessageSquare, iconBg: "bg-teal-100 dark:bg-teal-900/40", iconColor: "text-teal-600 dark:text-teal-400" },
  ];

  const quickActions = [
    { label: "Kelola Sekolah", desc: "Daftar & detail sekolah", icon: School, bg: "bg-indigo-50 dark:bg-indigo-950/30", iconColor: "text-indigo-600 dark:text-indigo-400", path: "/super-admin/schools" },
    { label: "Langganan", desc: "Konfirmasi pembayaran", icon: CreditCard, bg: "bg-amber-50 dark:bg-amber-950/30", iconColor: "text-amber-600 dark:text-amber-400", path: "/super-admin/payments" },
    { label: "WA Integrasi", desc: "Status notif per sekolah", icon: MessageSquare, bg: "bg-teal-50 dark:bg-teal-950/30", iconColor: "text-teal-600 dark:text-teal-400", path: "/super-admin/whatsapp" },
    { label: "Manajemen User", desc: "Akun admin sekolah", icon: Users, bg: "bg-blue-50 dark:bg-blue-950/30", iconColor: "text-blue-600 dark:text-blue-400", path: "/super-admin/schools" },
  ];

  const allPaid = stats.pendingPayments === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Super Admin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Pantau seluruh platform ATSkolla secara real-time</p>
        </div>
        <Button onClick={() => navigate("/super-admin/schools")} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm">
          <School className="h-4 w-4 mr-2" />
          Kelola Sekolah
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="rounded-2xl border border-border/60 shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground tracking-wider uppercase">{s.label}</p>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">{s.value}</p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                  </div>
                  <div className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl ${s.iconBg} flex items-center justify-center shrink-0`}>
                    <s.icon className={`h-5 w-5 sm:h-[22px] sm:w-[22px] ${s.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Payment + Plan Distribution */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Payment Status */}
        <Card className="rounded-2xl border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Status Pembayaran
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {allPaid && (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                Semua pembayaran terkonfirmasi
              </div>
            )}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Lunas</span>
                <Badge className="rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-0 text-xs font-bold px-2.5">{stats.paidCount}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Menunggu</span>
                <Badge className="rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-0 text-xs font-bold px-2.5">{stats.pendingPayments}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Total Aktif</span>
                <Badge variant="outline" className="rounded-full text-xs font-bold px-2.5">{stats.activeSubscriptions}</Badge>
              </div>
            </div>
            <Button variant="outline" className="w-full rounded-xl mt-2 text-sm" onClick={() => navigate("/super-admin/payments")}>
              <CreditCard className="h-4 w-4 mr-2" />
              Kelola Pembayaran
            </Button>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card className="rounded-2xl border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              Distribusi Paket Langganan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="h-40 w-40 sm:h-48 sm:w-48 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.planDistribution.length > 0 ? stats.planDistribution : [{ name: "Kosong", value: 1, color: "hsl(220, 10%, 90%)" }]}
                      cx="50%" cy="50%"
                      innerRadius={40} outerRadius={70}
                      paddingAngle={2} dataKey="value"
                    >
                      {(stats.planDistribution.length > 0 ? stats.planDistribution : [{ name: "Kosong", value: 1, color: "hsl(220, 10%, 90%)" }]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value} sekolah`]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 flex-1">
                {stats.planDistribution.map((plan) => (
                  <div key={plan.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: plan.color }} />
                      <span className="text-sm text-foreground">{plan.name}</span>
                    </div>
                    <Badge variant="outline" className="rounded-full text-xs font-bold px-2.5">{plan.value} sekolah</Badge>
                  </div>
                ))}
                {stats.planDistribution.length === 0 && (
                  <p className="text-sm text-muted-foreground">Belum ada data</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-bold text-foreground mb-3">Aksi Cepat</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action, i) => (
            <motion.div key={action.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
              <Card
                className={`rounded-2xl border border-border/40 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer ${action.bg}`}
                onClick={() => navigate(action.path)}
              >
                <CardContent className="p-4 sm:p-5">
                  <action.icon className={`h-6 w-6 ${action.iconColor} mb-3`} />
                  <p className={`text-sm font-semibold ${action.iconColor}`}>{action.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{action.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Payments */}
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            Transaksi Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada transaksi</p>
          ) : (
            <div className="space-y-2">
              {stats.recentPayments.slice(0, 5).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{(p as any).schools?.name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{(p as any).subscription_plans?.name} • {new Date(p.created_at).toLocaleDateString("id-ID")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{formatRupiah(p.amount)}</p>
                    <Badge className={`text-[10px] rounded-full border-0 px-2 ${p.status === "paid" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"}`}>
                      {p.status === "paid" ? "Lunas" : p.status === "pending" ? "Pending" : p.status}
                    </Badge>
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
