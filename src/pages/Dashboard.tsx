import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserX, ScanLine, TrendingUp, Clock, Calendar, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

const COLORS = ["hsl(152, 69%, 40%)", "hsl(0, 72%, 51%)", "hsl(234, 89%, 60%)", "hsl(38, 92%, 50%)"];

const Dashboard = () => {
  const { profile } = useAuth();
  const [totalStudents, setTotalStudents] = useState(0);
  const [pickedUp, setPickedUp] = useState(0);
  const [todayLogs, setTodayLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!profile?.school_id) return;
    const schoolId = profile.school_id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [studentsRes, logsRes] = await Promise.all([
      supabase.from("students").select("id", { count: "exact" }).eq("school_id", schoolId),
      supabase.from("pickup_logs").select("*").eq("school_id", schoolId).gte("pickup_time", today.toISOString()),
    ]);

    setTotalStudents(studentsRes.count || 0);
    const logs = logsRes.data || [];
    setTodayLogs(logs);
    setPickedUp(logs.length);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    // Realtime subscription
    const channel = supabase
      .channel("pickup-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pickup_logs" }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.school_id]);

  const waiting = totalStudents - pickedUp;

  const stats = [
    { label: "Total Siswa", value: totalStudents, icon: Users, color: "bg-primary/10 text-primary", change: "" },
    { label: "Sudah Dijemput", value: pickedUp, icon: UserCheck, color: "bg-success/10 text-success", change: `${totalStudents ? Math.round((pickedUp / totalStudents) * 100) : 0}%` },
    { label: "Belum Dijemput", value: waiting, icon: UserX, color: "bg-destructive/10 text-destructive", change: `${totalStudents ? Math.round((waiting / totalStudents) * 100) : 0}%` },
    { label: "Scan Hari Ini", value: todayLogs.length, icon: ScanLine, color: "bg-warning/10 text-warning", change: "" },
  ];

  // Generate hourly chart data
  const hourlyData = Array.from({ length: 8 }, (_, i) => {
    const hour = 10 + i;
    const count = todayLogs.filter((l) => new Date(l.pickup_time).getHours() === hour).length;
    return { time: `${hour}:00`, count };
  });

  const pieData = [
    { name: "Dijemput", value: pickedUp },
    { name: "Menunggu", value: waiting },
  ];

  // Weekly mock trend data
  const weeklyData = [
    { day: "Sen", total: 45, picked: 45 },
    { day: "Sel", total: 48, picked: 46 },
    { day: "Rab", total: 47, picked: 47 },
    { day: "Kam", total: 50, picked: 48 },
    { day: "Jum", total: 44, picked: 42 },
    { day: "Sab", total: totalStudents, picked: pickedUp },
  ];

  const now = new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Ringkasan aktivitas penjemputan hari ini</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
          <Clock className="h-4 w-4 ml-2" />
          <span>{now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="shadow-card border-0 hover:shadow-elevated transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</p>
                    <p className="text-3xl font-bold mt-1">{loading ? "..." : stat.value}</p>
                    {stat.change && (
                      <p className="text-xs text-muted-foreground mt-0.5">{stat.change} dari total</p>
                    )}
                  </div>
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Bar Chart - Hourly */}
        <Card className="lg:col-span-2 shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Aktivitas Penjemputan Per Jam
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value} siswa`, "Dijemput"]}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              Status Penjemputan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value">
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} siswa`]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="h-3 w-3 rounded-full bg-success" />
                <span>Dijemput ({pickedUp})</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="h-3 w-3 rounded-full bg-destructive" />
                <span>Menunggu ({waiting})</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Weekly Trend */}
        <Card className="lg:col-span-3 shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Tren Penjemputan Mingguan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Area type="monotone" dataKey="total" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" name="Total" />
                  <Area type="monotone" dataKey="picked" stackId="2" stroke="hsl(var(--success))" fill="hsl(var(--success) / 0.15)" name="Dijemput" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Pickups */}
        <Card className="lg:col-span-2 shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Penjemputan Terbaru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayLogs.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada penjemputan hari ini</p>
            )}
            {todayLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                  {log.pickup_by?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{log.pickup_by}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.pickup_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span className="text-[10px] font-medium bg-success/10 text-success px-2 py-0.5 rounded-full">
                  Dijemput
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
