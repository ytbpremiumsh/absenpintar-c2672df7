import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { School, Users, CreditCard, TrendingUp, CheckCircle2, GraduationCap, UserCheck, Clock, BarChart3, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

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
  schoolUsage: { name: string; students: number; classes: number; plan: string }[];
}

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalSchools: 0, totalStudents: 0, totalStaff: 0, totalClasses: 0,
    activeSubscriptions: 0, pendingPayments: 0,
    totalRevenue: 0, monthlyRevenue: 0,
    recentPayments: [], schools: [], schoolUsage: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [schoolsRes, studentsRes, classesRes, profilesRes, subsRes, paymentsRes, rolesRes] = await Promise.all([
        supabase.from("schools").select("id, name, created_at, logo, address"),
        supabase.from("students").select("id, school_id"),
        supabase.from("classes").select("id, school_id"),
        supabase.from("profiles").select("id, school_id"),
        supabase.from("school_subscriptions").select("id, school_id, plan_id, status, started_at, expires_at, subscription_plans(name)"),
        supabase.from("payment_transactions").select("id, school_id, amount, status, paid_at, created_at, schools(name), subscription_plans(name)").order("created_at", { ascending: false }).limit(10),
        supabase.from("user_roles").select("id, role"),
      ]);

      const schools = schoolsRes.data || [];
      const students = studentsRes.data || [];
      const classes = classesRes.data || [];
      const subs = subsRes.data || [];
      const payments = paymentsRes.data || [];
      const roles = rolesRes.data || [];

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

      // Build per-school usage
      const schoolUsage = schools.map((s: any) => {
        const schoolStudents = students.filter((st: any) => st.school_id === s.id).length;
        const schoolClasses = classes.filter((c: any) => c.school_id === s.id).length;
        const sub = activeSubs.find((sub: any) => sub.school_id === s.id);
        const planName = sub ? (sub as any).subscription_plans?.name || "Free" : "Free";
        return { name: s.name, students: schoolStudents, classes: schoolClasses, plan: planName };
      });

      setStats({
        totalSchools: schools.length,
        totalStudents: students.length,
        totalStaff: staffCount,
        totalClasses: classes.length,
        activeSubscriptions: activeSubs.length,
        pendingPayments: pendingPayments.length,
        totalRevenue,
        monthlyRevenue,
        recentPayments: payments,
        schools,
        schoolUsage,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const formatRupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

  const statCards = [
    { icon: School, label: "Total Sekolah", value: stats.totalSchools, color: "text-primary", bg: "bg-primary/10" },
    { icon: GraduationCap, label: "Total Siswa", value: stats.totalStudents.toLocaleString("id-ID"), color: "text-blue-600", bg: "bg-blue-500/10" },
    { icon: Activity, label: "Total Kelas", value: stats.totalClasses, color: "text-indigo-600", bg: "bg-indigo-500/10" },
    { icon: UserCheck, label: "Total Pengguna", value: stats.totalStaff, color: "text-violet-600", bg: "bg-violet-500/10" },
    { icon: CheckCircle2, label: "Langganan Aktif", value: stats.activeSubscriptions, color: "text-success", bg: "bg-success/10" },
    { icon: Clock, label: "Pembayaran Pending", value: stats.pendingPayments, color: "text-warning", bg: "bg-warning/10" },
    { icon: CreditCard, label: "Total Pendapatan", value: formatRupiah(stats.totalRevenue), color: "text-emerald-600", bg: "bg-emerald-500/10" },
    { icon: BarChart3, label: "Pendapatan Bulan Ini", value: formatRupiah(stats.monthlyRevenue), color: "text-primary", bg: "bg-primary/10" },
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
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className={`text-xl font-extrabold ${s.color} truncate`}>{s.value}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* School Usage Statistics */}
      <Card className="border-0 shadow-card">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Statistik Penggunaan per Sekolah</CardTitle></CardHeader>
        <CardContent>
          {stats.schoolUsage.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada sekolah terdaftar</p>
          ) : (
            <div className="space-y-4">
              {/* Summary totals */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                <p className="text-sm font-bold text-foreground">Total Keseluruhan</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-lg font-extrabold text-primary">{stats.schoolUsage.length}</p>
                    <p className="text-[11px] text-muted-foreground">Sekolah</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-extrabold text-primary">{stats.schoolUsage.reduce((sum, s) => sum + s.classes, 0)}</p>
                    <p className="text-[11px] text-muted-foreground">Kelas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-extrabold text-primary">{stats.schoolUsage.reduce((sum, s) => sum + s.students, 0).toLocaleString("id-ID")}</p>
                    <p className="text-[11px] text-muted-foreground">Siswa</p>
                  </div>
                </div>
              </div>
              {stats.schoolUsage.map((s) => (
                <div key={s.name} className="p-4 rounded-xl bg-secondary/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <School className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground">Paket {s.plan}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{s.plan}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Kelas</span>
                        <span className="text-xs font-bold text-foreground">{s.classes}</span>
                      </div>
                      <Progress value={Math.min(100, s.classes * 10)} className="h-1.5" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Siswa</span>
                        <span className="text-xs font-bold text-foreground">{s.students}</span>
                      </div>
                      <Progress value={Math.min(100, s.students)} className="h-1.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
                    <Badge variant={p.status === "paid" ? "default" : "secondary"} className={`text-[10px] ${p.status === "paid" ? "bg-success/10 text-success border-success/20" : p.status === "pending" ? "bg-warning/10 text-warning border-warning/20" : ""}`}>
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
