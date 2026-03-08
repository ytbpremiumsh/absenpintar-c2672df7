import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Clock, Calendar, GraduationCap, TrendingUp, AlertTriangle, Thermometer, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Badge } from "@/components/ui/badge";

const STATUS_COLORS: Record<string, string> = {
  hadir: "hsl(152, 69%, 40%)",
  izin: "hsl(38, 92%, 50%)",
  sakit: "hsl(210, 70%, 50%)",
  alfa: "hsl(0, 72%, 51%)",
};

const STATUS_LABELS: Record<string, string> = {
  hadir: "Hadir",
  izin: "Izin",
  sakit: "Sakit",
  alfa: "Alfa",
};

interface StudentData {
  id: string;
  name: string;
  class: string;
  parent_name: string;
  photo_url: string | null;
}

const Dashboard = () => {
  const { profile } = useAuth();
  const [totalStudents, setTotalStudents] = useState(0);
  const [todayLogs, setTodayLogs] = useState<any[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!profile?.school_id) return;
    const schoolId = profile.school_id;
    const today = new Date().toISOString().slice(0, 10);

    const [studentsRes, logsRes] = await Promise.all([
      supabase.from("students").select("id, name, class, parent_name, photo_url").eq("school_id", schoolId),
      supabase.from("attendance_logs").select("*").eq("school_id", schoolId).eq("date", today).order("created_at", { ascending: false }),
    ]);

    const allStudents = studentsRes.data || [];
    setStudents(allStudents);
    setTotalStudents(allStudents.length);
    setTodayLogs(logsRes.data || []);
    setLoading(false);
  }, [profile?.school_id]);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("attendance-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_logs" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  // Count statuses
  const statusCounts = { hadir: 0, izin: 0, sakit: 0, alfa: 0 };
  todayLogs.forEach((log) => {
    const s = log.status as keyof typeof statusCounts;
    if (statusCounts[s] !== undefined) statusCounts[s]++;
  });
  const totalAbsen = todayLogs.length;
  const belumAbsen = totalStudents - totalAbsen;

  const stats = [
    { label: "Total Siswa", value: totalStudents, icon: Users, color: "bg-primary/10 text-primary" },
    { label: "Hadir", value: statusCounts.hadir, icon: UserCheck, color: "bg-success/10 text-success" },
    { label: "Izin", value: statusCounts.izin, icon: FileText, color: "bg-warning/10 text-warning" },
    { label: "Sakit", value: statusCounts.sakit, icon: Thermometer, color: "bg-[hsl(210,70%,50%)]/10 text-[hsl(210,70%,50%)]" },
    { label: "Alfa", value: statusCounts.alfa, icon: AlertTriangle, color: "bg-destructive/10 text-destructive" },
    { label: "Belum Absen", value: belumAbsen, icon: Clock, color: "bg-muted text-muted-foreground" },
  ];

  // Hourly chart
  const hourlyData = Array.from({ length: 10 }, (_, i) => {
    const hour = 6 + i;
    const count = todayLogs.filter((l) => {
      const t = l.time as string;
      return t && parseInt(t.split(":")[0]) === hour;
    }).length;
    return { time: `${String(hour).padStart(2, "0")}:00`, count };
  });

  // Pie chart data
  const pieData = [
    { name: "Hadir", value: statusCounts.hadir },
    { name: "Izin", value: statusCounts.izin },
    { name: "Sakit", value: statusCounts.sakit },
    { name: "Alfa", value: statusCounts.alfa },
    { name: "Belum", value: belumAbsen },
  ].filter(d => d.value > 0);

  const PIE_COLORS = [STATUS_COLORS.hadir, STATUS_COLORS.izin, STATUS_COLORS.sakit, STATUS_COLORS.alfa, "hsl(220, 10%, 75%)"];

  const getStudentName = (log: any) => students.find(s => s.id === log.student_id)?.name || "Siswa";
  const getStudentClass = (log: any) => students.find(s => s.id === log.student_id)?.class || "";

  const now = new Date();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold">Dashboard Absensi</h1>
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
          <Clock className="h-3.5 w-3.5 ml-1" />
          <span>{now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className="shadow-card border-0 hover:shadow-elevated transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-bold mt-0.5">{loading ? "..." : stat.value}</p>
                  </div>
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="h-4 w-4" />
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
              Absensi Per Jam Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(value: number) => [`${value} siswa`, "Absen"]} />
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
              Status Kehadiran
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="h-40 sm:h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} siswa`]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[key] }} />
                  <span>{label} ({statusCounts[key as keyof typeof statusCounts]})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Attendance */}
      <Card className="shadow-card border-0">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-sm font-semibold">Absensi Terbaru</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-3 sm:px-6">
          {todayLogs.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada absensi hari ini</p>
          )}
          {todayLogs.slice(0, 10).map((log) => {
            const studentName = getStudentName(log);
            const studentClass = getStudentClass(log);
            const status = log.status as string;
            const statusColor = STATUS_COLORS[status] || STATUS_COLORS.hadir;
            return (
              <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/50 transition-colors">
                <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                  {studentName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{studentName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {studentClass && `Kelas ${studentClass} • `}
                    {log.method === "face" ? "Face Recognition" : "Barcode"} • {log.recorded_by || "System"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant="secondary" className="text-[10px] font-medium" style={{ backgroundColor: `${statusColor}20`, color: statusColor }}>
                    {STATUS_LABELS[status] || status}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{log.time?.slice(0, 5)}</p>
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