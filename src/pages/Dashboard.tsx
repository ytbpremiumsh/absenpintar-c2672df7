import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserX, ScanLine, TrendingUp, Clock, Calendar, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

const COLORS = ["hsl(152, 69%, 40%)", "hsl(0, 72%, 51%)"];

interface StudentData {
  id: string;
  name: string;
  class: string;
  parent_name: string;
  photo_url: string | null;
}

const Dashboard = () => {
  const { profile } = useAuth();
  const features = useSubscriptionFeatures();
  const [totalStudents, setTotalStudents] = useState(0);
  const [pickedUp, setPickedUp] = useState(0);
  const [todayLogs, setTodayLogs] = useState<any[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!profile?.school_id) return;
    const schoolId = profile.school_id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [studentsRes, logsRes] = await Promise.all([
      supabase.from("students").select("id, name, class, parent_name, photo_url").eq("school_id", schoolId),
      supabase.from("pickup_logs").select("*").eq("school_id", schoolId).gte("pickup_time", today.toISOString()).order("pickup_time", { ascending: false }),
    ]);

    const allStudents = studentsRes.data || [];
    setStudents(allStudents);
    setTotalStudents(allStudents.length);
    const logs = logsRes.data || [];
    setTodayLogs(logs);
    setPickedUp(logs.length);
    setLoading(false);
  }, [profile?.school_id]);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("pickup-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "pickup_logs" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const waiting = totalStudents - pickedUp;

  const stats = [
    { label: "Total Siswa", value: totalStudents, icon: Users, color: "bg-primary/10 text-primary", change: "" },
    { label: "Sudah Dijemput", value: pickedUp, icon: UserCheck, color: "bg-success/10 text-success", change: `${totalStudents ? Math.round((pickedUp / totalStudents) * 100) : 0}%` },
    { label: "Belum Dijemput", value: waiting, icon: UserX, color: "bg-destructive/10 text-destructive", change: `${totalStudents ? Math.round((waiting / totalStudents) * 100) : 0}%` },
    { label: "Scan Hari Ini", value: todayLogs.length, icon: ScanLine, color: "bg-warning/10 text-warning", change: "" },
  ];

  const hourlyData = Array.from({ length: 8 }, (_, i) => {
    const hour = 10 + i;
    const count = todayLogs.filter((l) => new Date(l.pickup_time).getHours() === hour).length;
    return { time: `${hour}:00`, count };
  });

  const pieData = [
    { name: "Dijemput", value: pickedUp },
    { name: "Menunggu", value: waiting },
  ];

  // Resolve student name from logs
  const getStudentName = (log: any) => {
    const student = students.find(s => s.id === log.student_id);
    return student?.name || "Siswa";
  };

  const getStudentClass = (log: any) => {
    const student = students.find(s => s.id === log.student_id);
    return student?.class || "";
  };

  const now = new Date();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
          <Clock className="h-3.5 w-3.5 ml-1" />
          <span>{now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="shadow-card border-0 hover:shadow-elevated transition-shadow">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl sm:text-3xl font-bold mt-1">{loading ? "..." : stat.value}</p>
                    {stat.change && <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{stat.change} dari total</p>}
                  </div>
                  <div className={`h-9 w-9 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="lg:col-span-2 shadow-card border-0">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Aktivitas Per Jam
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(value: number) => [`${value} siswa`, "Dijemput"]} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              Status Penjemputan
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="h-40 sm:h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={5} dataKey="value">
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} siswa`]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 sm:gap-6 mt-2">
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

      {/* Penjemputan Terbaru - showing student names */}
      <Card className="shadow-card border-0">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-sm font-semibold">Penjemputan Terbaru</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-3 sm:px-6">
          {todayLogs.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada penjemputan hari ini</p>
          )}
          {todayLogs.slice(0, 8).map((log) => {
            const studentName = getStudentName(log);
            const studentClass = getStudentClass(log);
            return (
              <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/50 transition-colors">
                {(() => {
                  const student = students.find(s => s.id === log.student_id);
                  const photoUrl = student?.photo_url;
                  return features.canUploadPhoto && photoUrl ? (
                    <img src={photoUrl} alt={studentName} className="h-9 w-9 rounded-full object-cover shrink-0 border-2 border-success/30" />
                  ) : (
                    <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                      {studentName.charAt(0)}
                    </div>
                  );
                })()}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{studentName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {studentClass && `Kelas ${studentClass} • `}
                    Dijemput oleh: {log.pickup_by}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-medium bg-success/10 text-success px-2 py-0.5 rounded-full">
                    Dijemput
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(log.pickup_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
