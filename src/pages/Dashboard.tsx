import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Clock, Calendar, GraduationCap, TrendingUp, AlertTriangle, Thermometer, FileText, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

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

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const Dashboard = () => {
  const { profile } = useAuth();
  const [totalStudents, setTotalStudents] = useState(0);
  const [todayLogs, setTodayLogs] = useState<any[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [periodLogs, setPeriodLogs] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!profile?.school_id) return;
    const schoolId = profile.school_id;
    const today = new Date().toISOString().slice(0, 10);

    const [studentsRes, logsRes] = await Promise.all([
      supabase.from("students").select("id, name, class, parent_name, photo_url").eq("school_id", schoolId),
      supabase.from("attendance_logs").select("*").eq("school_id", schoolId).eq("date", today).eq("attendance_type", "datang").order("created_at", { ascending: false }),
    ]);

    const allStudents = studentsRes.data || [];
    setStudents(allStudents);
    setTotalStudents(allStudents.length);
    setTodayLogs(logsRes.data || []);
    setLoading(false);
  }, [profile?.school_id]);

  const fetchPeriodLogs = useCallback(async () => {
    if (!profile?.school_id) return;
    const now = new Date();
    let fromDate: string;

    if (chartPeriod === "daily") {
      fromDate = now.toISOString().slice(0, 10);
    } else if (chartPeriod === "weekly") {
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
      fromDate = monday.toISOString().slice(0, 10);
    } else {
      fromDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    }

    const { data } = await supabase
      .from("attendance_logs")
      .select("date, status")
      .eq("school_id", profile.school_id)
      .eq("attendance_type", "datang")
      .gte("date", fromDate)
      .order("date");

    setPeriodLogs(data || []);
  }, [profile?.school_id, chartPeriod]);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("attendance-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_logs" }, () => { fetchData(); fetchPeriodLogs(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData, fetchPeriodLogs]);

  useEffect(() => { fetchPeriodLogs(); }, [fetchPeriodLogs]);

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

  // Build LINE chart data based on period
  const chartData = (() => {
    if (chartPeriod === "daily") {
      // For daily, show hourly breakdown
      const hourly: Record<string, { hadir: number; izin: number; sakit: number; alfa: number }> = {};
      todayLogs.forEach((log) => {
        const hour = log.time?.slice(0, 2) || "00";
        const label = `${hour}:00`;
        if (!hourly[label]) hourly[label] = { hadir: 0, izin: 0, sakit: 0, alfa: 0 };
        const s = log.status as keyof typeof statusCounts;
        if (hourly[label][s] !== undefined) hourly[label][s]++;
      });
      return Object.entries(hourly)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, counts]) => ({ name, ...counts }));
    }

    // Group logs by date
    const grouped: Record<string, { hadir: number; izin: number; sakit: number; alfa: number }> = {};
    periodLogs.forEach((log) => {
      if (!grouped[log.date]) grouped[log.date] = { hadir: 0, izin: 0, sakit: 0, alfa: 0 };
      const s = log.status as keyof typeof statusCounts;
      if (grouped[log.date][s] !== undefined) grouped[log.date][s]++;
    });

    if (chartPeriod === "weekly") {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));

      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = d.toISOString().slice(0, 10);
        const counts = grouped[dateStr] || { hadir: 0, izin: 0, sakit: 0, alfa: 0 };
        return { name: DAY_NAMES[d.getDay()], ...counts };
      });
    }

    // Monthly - group by week
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const result: { name: string; hadir: number; izin: number; sakit: number; alfa: number }[] = [];

    for (let week = 0; week < Math.ceil(daysInMonth / 7); week++) {
      const weekData = { name: `Mg ${week + 1}`, hadir: 0, izin: 0, sakit: 0, alfa: 0 };
      for (let d = week * 7 + 1; d <= Math.min((week + 1) * 7, daysInMonth); d++) {
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const counts = grouped[dateStr];
        if (counts) {
          weekData.hadir += counts.hadir;
          weekData.izin += counts.izin;
          weekData.sakit += counts.sakit;
          weekData.alfa += counts.alfa;
        }
      }
      result.push(weekData);
    }
    return result;
  })();

  // Pie chart data
  const pieData = [
    { name: "Hadir", value: statusCounts.hadir, key: "hadir" },
    { name: "Izin", value: statusCounts.izin, key: "izin" },
    { name: "Sakit", value: statusCounts.sakit, key: "sakit" },
    { name: "Alfa", value: statusCounts.alfa, key: "alfa" },
    { name: "Belum", value: belumAbsen, key: "belum" },
  ].filter(d => d.value > 0);

  const PIE_COLORS = [STATUS_COLORS.hadir, STATUS_COLORS.izin, STATUS_COLORS.sakit, STATUS_COLORS.alfa, "hsl(220, 10%, 75%)"];

  // Get students for selected status
  const getStudentsForStatus = (status: string) => {
    if (status === "belum") {
      const loggedStudentIds = new Set(todayLogs.map(l => l.student_id));
      return students.filter(s => !loggedStudentIds.has(s.id));
    }
    const studentIds = todayLogs.filter(l => l.status === status).map(l => l.student_id);
    return students.filter(s => studentIds.includes(s.id));
  };

  const handlePieClick = (_: any, index: number) => {
    const item = pieData[index];
    if (item) setSelectedStatus(item.key);
  };

  const getStudentName = (log: any) => students.find(s => s.id === log.student_id)?.name || "Siswa";
  const getStudentClass = (log: any) => students.find(s => s.id === log.student_id)?.class || "";

  const now = new Date();
  const periodTitle = chartPeriod === "daily" ? "Hari Ini" : chartPeriod === "weekly" ? "Minggu Ini" : "Bulan Ini";

  const selectedStudents = selectedStatus ? getStudentsForStatus(selectedStatus) : [];
  const selectedLabel = selectedStatus ? (selectedStatus === "belum" ? "Belum Absen" : STATUS_LABELS[selectedStatus] || selectedStatus) : "";
  const selectedColor = selectedStatus ? (selectedStatus === "belum" ? "hsl(220, 10%, 75%)" : STATUS_COLORS[selectedStatus]) : "";

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
      <div className="grid grid-cols-3 gap-3">
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Statistik Kehadiran — {periodTitle}
              </CardTitle>
              <Tabs value={chartPeriod} onValueChange={(v) => setChartPeriod(v as any)}>
                <TabsList className="h-8">
                  <TabsTrigger value="daily" className="text-xs px-2.5 h-6">Harian</TabsTrigger>
                  <TabsTrigger value="weekly" className="text-xs px-2.5 h-6">Mingguan</TabsTrigger>
                  <TabsTrigger value="monthly" className="text-xs px-2.5 h-6">Bulanan</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(value: number, name: string) => [`${value} siswa`, STATUS_LABELS[name] || name]}
                  />
                  <Line type="monotone" dataKey="hadir" stroke={STATUS_COLORS.hadir} strokeWidth={2} dot={{ r: 3 }} name="hadir" />
                  <Line type="monotone" dataKey="izin" stroke={STATUS_COLORS.izin} strokeWidth={2} dot={{ r: 3 }} name="izin" />
                  <Line type="monotone" dataKey="sakit" stroke={STATUS_COLORS.sakit} strokeWidth={2} dot={{ r: 3 }} name="sakit" />
                  <Line type="monotone" dataKey="alfa" stroke={STATUS_COLORS.alfa} strokeWidth={2} dot={{ r: 3 }} name="alfa" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLORS[key] }} />
                  <span className="text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              Status Kehadiran
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">Klik bagian pie untuk melihat daftar siswa</p>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="h-40 sm:h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={40} outerRadius={65}
                    paddingAngle={3} dataKey="value"
                    onClick={handlePieClick}
                    cursor="pointer"
                  >
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
                <button
                  key={key}
                  onClick={() => setSelectedStatus(key)}
                  className="flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity cursor-pointer"
                >
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[key] }} />
                  <span>{label} ({statusCounts[key as keyof typeof statusCounts]})</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student List Dialog */}
      <Dialog open={!!selectedStatus} onOpenChange={(open) => { if (!open) setSelectedStatus(null); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-md p-0 overflow-hidden">
          <div className="p-4 border-b border-border" style={{ backgroundColor: `${selectedColor}15` }}>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold" style={{ color: selectedColor }}>
                  {selectedLabel}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {selectedStudents.length} siswa • Hari ini
                </DialogDescription>
              </div>
              <Badge className="text-sm font-bold" style={{ backgroundColor: `${selectedColor}20`, color: selectedColor }}>
                {selectedStudents.length}
              </Badge>
            </div>
          </div>
          <ScrollArea className="max-h-[60vh]">
            {selectedStudents.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Tidak ada siswa</div>
            ) : (
              <div className="divide-y divide-border">
                {selectedStudents.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden"
                      style={{ backgroundColor: `${selectedColor}15`, color: selectedColor }}>
                      {s.photo_url ? (
                        <img src={s.photo_url} alt="" className="h-full w-full rounded-full object-cover" />
                      ) : s.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">Kelas {s.class}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

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
                    {log.method === "face_recognition" ? "Face Recognition" : log.method === "rfid" ? "Kartu RFID" : "Barcode"} • {log.recorded_by || "System"}
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