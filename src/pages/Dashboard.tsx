import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, UserCheck, Clock, Calendar, GraduationCap, TrendingUp, AlertTriangle, Thermometer, FileText, ChevronRight, QrCode, ClipboardList, Settings, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";

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
  const navigate = useNavigate();


  const fetchData = useCallback(async () => {
    if (!profile?.school_id) { setLoading(false); return; }
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

  const statusCounts = { hadir: 0, izin: 0, sakit: 0, alfa: 0 };
  todayLogs.forEach((log) => {
    const s = log.status as keyof typeof statusCounts;
    if (statusCounts[s] !== undefined) statusCounts[s]++;
  });
  const totalAbsen = todayLogs.length;
  const belumAbsen = totalStudents - totalAbsen;
  const attendancePercent = totalStudents > 0 ? Math.round((statusCounts.hadir / totalStudents) * 100) : 0;

  const statCards = [
    { label: "TOTAL SISWA", value: totalStudents, desc: "terdaftar di sekolah", icon: Users, iconBg: "bg-indigo-100 dark:bg-indigo-900/40", iconColor: "text-indigo-600 dark:text-indigo-400" },
    { label: "HADIR", value: statusCounts.hadir, desc: "hadir hari ini", icon: UserCheck, iconBg: "bg-emerald-100 dark:bg-emerald-900/40", iconColor: "text-emerald-600 dark:text-emerald-400" },
    { label: "IZIN / SAKIT", value: statusCounts.izin + statusCounts.sakit, desc: `${statusCounts.izin} izin, ${statusCounts.sakit} sakit`, icon: FileText, iconBg: "bg-amber-100 dark:bg-amber-900/40", iconColor: "text-amber-600 dark:text-amber-400" },
    { label: "ALFA / BELUM", value: statusCounts.alfa + belumAbsen, desc: `${statusCounts.alfa} alfa, ${belumAbsen} belum`, icon: AlertTriangle, iconBg: "bg-red-100 dark:bg-red-900/40", iconColor: "text-red-600 dark:text-red-400" },
  ];

  const quickActions = [
    { label: "Scan Absensi", desc: "Scan QR / Barcode", icon: QrCode, bg: "bg-indigo-50 dark:bg-indigo-950/30", iconColor: "text-indigo-600 dark:text-indigo-400", path: "/scan" },
    { label: "Data Siswa", desc: "Kelola daftar siswa", icon: GraduationCap, bg: "bg-emerald-50 dark:bg-emerald-950/30", iconColor: "text-emerald-600 dark:text-emerald-400", path: "/students" },
    { label: "Rekap Absensi", desc: "Export rekap bulanan", icon: ClipboardList, bg: "bg-amber-50 dark:bg-amber-950/30", iconColor: "text-amber-600 dark:text-amber-400", path: "/export-history" },
    { label: "Pengaturan", desc: "Konfigurasi sekolah", icon: Settings, bg: "bg-blue-50 dark:bg-blue-950/30", iconColor: "text-blue-600 dark:text-blue-400", path: "/school-settings" },
  ];

  // Chart data
  const chartData = (() => {
    if (chartPeriod === "daily") {
      const hourly: Record<string, { hadir: number; izin: number; sakit: number; alfa: number }> = {};
      todayLogs.forEach((log) => {
        const hour = log.time?.slice(0, 2) || "00";
        const label = `${hour}:00`;
        if (!hourly[label]) hourly[label] = { hadir: 0, izin: 0, sakit: 0, alfa: 0 };
        const s = log.status as keyof typeof statusCounts;
        if (hourly[label][s] !== undefined) hourly[label][s]++;
      });
      return Object.entries(hourly).sort(([a], [b]) => a.localeCompare(b)).map(([name, counts]) => ({ name, ...counts }));
    }

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

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const result: { name: string; hadir: number; izin: number; sakit: number; alfa: number }[] = [];
    for (let week = 0; week < Math.ceil(daysInMonth / 7); week++) {
      const weekData = { name: `Mg ${week + 1}`, hadir: 0, izin: 0, sakit: 0, alfa: 0 };
      for (let d = week * 7 + 1; d <= Math.min((week + 1) * 7, daysInMonth); d++) {
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const counts = grouped[dateStr];
        if (counts) { weekData.hadir += counts.hadir; weekData.izin += counts.izin; weekData.sakit += counts.sakit; weekData.alfa += counts.alfa; }
      }
      result.push(weekData);
    }
    return result;
  })();

  const pieData = [
    { name: "Hadir", value: statusCounts.hadir, key: "hadir" },
    { name: "Izin", value: statusCounts.izin, key: "izin" },
    { name: "Sakit", value: statusCounts.sakit, key: "sakit" },
    { name: "Alfa", value: statusCounts.alfa, key: "alfa" },
    { name: "Belum", value: belumAbsen, key: "belum" },
  ].filter(d => d.value > 0);

  const PIE_COLORS = [STATUS_COLORS.hadir, STATUS_COLORS.izin, STATUS_COLORS.sakit, STATUS_COLORS.alfa, "hsl(220, 10%, 75%)"];

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

  const uniqueClasses = [...new Set(students.map(s => s.class))].sort();
  const filteredHistoryLogs = editClassFilter === "all"
    ? historyLogs
    : historyLogs.filter(l => {
        const st = students.find(s => s.id === l.student_id);
        return st?.class === editClassFilter;
      });

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={TrendingUp}
        title="Dashboard Absensi"
        subtitle={now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        actions={
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-2xl font-bold">{attendancePercent}%</p>
              <p className="text-[11px] text-white/70">Kehadiran</p>
            </div>
            <Button onClick={() => navigate("/scan")} className="bg-white/20 hover:bg-white/30 text-white rounded-xl shadow-sm border border-white/20">
              <QrCode className="h-4 w-4 mr-2" />
              Scan
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="rounded-2xl border border-border/60 shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground tracking-wider uppercase">{s.label}</p>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">{loading ? "..." : s.value}</p>
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

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 rounded-2xl border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Statistik Kehadiran — {periodTitle}
              </CardTitle>
              <Tabs value={chartPeriod} onValueChange={(v) => setChartPeriod(v as any)}>
                <TabsList className="h-8 bg-muted/60 rounded-xl">
                  <TabsTrigger value="daily" className="text-xs px-2.5 h-6 rounded-lg">Harian</TabsTrigger>
                  <TabsTrigger value="weekly" className="text-xs px-2.5 h-6 rounded-lg">Mingguan</TabsTrigger>
                  <TabsTrigger value="monthly" className="text-xs px-2.5 h-6 rounded-lg">Bulanan</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="h-48 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }}
                    formatter={(value: number, name: string) => [`${value} siswa`, STATUS_LABELS[name] || name]}
                  />
                  <Line type="monotone" dataKey="hadir" stroke={STATUS_COLORS.hadir} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2 }} name="hadir" />
                  <Line type="monotone" dataKey="izin" stroke={STATUS_COLORS.izin} strokeWidth={2} dot={{ r: 3 }} name="izin" />
                  <Line type="monotone" dataKey="sakit" stroke={STATUS_COLORS.sakit} strokeWidth={2} dot={{ r: 3 }} name="sakit" />
                  <Line type="monotone" dataKey="alfa" stroke={STATUS_COLORS.alfa} strokeWidth={2} dot={{ r: 3 }} name="alfa" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[key] }} />
                  <span className="text-muted-foreground font-medium">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              Status Kehadiran
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">Klik bagian pie untuk detail</p>
          </CardHeader>
          <CardContent>
            <div className="h-40 sm:h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value" onClick={handlePieClick} cursor="pointer">
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
                <button key={key} onClick={() => setSelectedStatus(key)} className="flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity cursor-pointer">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[key] }} />
                  <span className="font-medium">{label} ({statusCounts[key as keyof typeof statusCounts]})</span>
                </button>
              ))}
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

      {/* Student List Dialog */}
      <Dialog open={!!selectedStatus} onOpenChange={(open) => { if (!open) setSelectedStatus(null); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-md p-0 overflow-hidden rounded-2xl">
          <div className="p-4 border-b border-border" style={{ backgroundColor: `${selectedColor}15` }}>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold" style={{ color: selectedColor }}>{selectedLabel}</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">{selectedStudents.length} siswa • Hari ini</DialogDescription>
              </div>
              <Badge className="text-sm font-bold" style={{ backgroundColor: `${selectedColor}20`, color: selectedColor }}>{selectedStudents.length}</Badge>
            </div>
          </div>
          <ScrollArea className="max-h-[60vh]">
            {selectedStudents.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Tidak ada siswa</div>
            ) : (
              <div className="divide-y divide-border">
                {selectedStudents.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden" style={{ backgroundColor: `${selectedColor}15`, color: selectedColor }}>
                      {s.photo_url ? <img src={s.photo_url} alt="" className="h-full w-full rounded-full object-cover" /> : s.name.charAt(0)}
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
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Absensi Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {todayLogs.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada absensi hari ini</p>
          )}
          {todayLogs.slice(0, 10).map((log, idx) => {
            const studentName = getStudentName(log);
            const studentClass = getStudentClass(log);
            const status = log.status as string;
            const statusColor = STATUS_COLORS[status] || STATUS_COLORS.hadir;
            return (
              <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden shadow-sm"
                  style={{ backgroundColor: statusColor }}>
                  {students.find(s => s.id === log.student_id)?.photo_url ? (
                    <img src={students.find(s => s.id === log.student_id)!.photo_url!} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : studentName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{studentName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {studentClass && `Kelas ${studentClass} • `}
                    {log.method === "face_recognition" ? "Face Recognition" : log.method === "rfid" ? "Kartu RFID" : "Barcode"} • {log.recorded_by || "System"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <Badge className="text-[10px] font-semibold border-0 rounded-full px-2" style={{ backgroundColor: `${statusColor}15`, color: statusColor }}>
                    {STATUS_LABELS[status] || status}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{log.time?.slice(0, 5)}</p>
                </div>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>

      {/* Edit History Dialog */}
      <Dialog open={editHistoryOpen} onOpenChange={setEditHistoryOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl p-0 overflow-hidden rounded-2xl max-h-[85vh]">
          <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              Edit Riwayat Absensi
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">Pilih tanggal dan ubah status kehadiran siswa</DialogDescription>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-3">
              <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-auto text-sm h-9 rounded-lg" />
              <Select value={editClassFilter} onValueChange={setEditClassFilter}>
                <SelectTrigger className="w-[140px] h-9 rounded-lg text-sm">
                  <SelectValue placeholder="Semua Kelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelas</SelectItem>
                  {uniqueClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              {Object.keys(editChanges).length > 0 && (
                <Button onClick={saveHistoryChanges} disabled={savingHistory} size="sm" className="rounded-lg">
                  {savingHistory ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                  Simpan ({Object.keys(editChanges).length})
                </Button>
              )}
            </div>
          </div>
          <ScrollArea className="max-h-[60vh]">
            {loadingHistory ? (
              <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
            ) : filteredHistoryLogs.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Tidak ada data absensi pada tanggal ini</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Siswa</TableHead>
                    <TableHead className="text-xs">Kelas</TableHead>
                    <TableHead className="text-xs">Waktu</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Ubah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistoryLogs.map((log) => {
                    const student = students.find(s => s.id === log.student_id);
                    const currentStatus = editChanges[log.id] || log.status;
                    const statusColor = STATUS_COLORS[currentStatus] || STATUS_COLORS.hadir;
                    const isChanged = editChanges[log.id] && editChanges[log.id] !== log.status;
                    return (
                      <TableRow key={log.id} className={isChanged ? "bg-primary/5" : ""}>
                        <TableCell className="text-sm font-medium py-2">{student?.name || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground py-2">{student?.class || "—"}</TableCell>
                        <TableCell className="text-xs font-mono py-2">{log.time?.slice(0, 5)}</TableCell>
                        <TableCell className="py-2">
                          <Badge className="text-[10px] font-semibold border-0 rounded-full px-2" style={{ backgroundColor: `${statusColor}15`, color: statusColor }}>
                            {STATUS_LABELS[currentStatus] || currentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex gap-1">
                            {["hadir", "izin", "sakit", "alfa"].map(s => (
                              <button key={s} onClick={() => {
                                setEditChanges(prev => {
                                  const next = { ...prev };
                                  if (s === log.status) { delete next[log.id]; } else { next[log.id] = s; }
                                  return next;
                                });
                              }}
                                className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all ${
                                  currentStatus === s
                                    ? "text-white shadow-sm"
                                    : "text-muted-foreground hover:bg-muted"
                                }`}
                                style={currentStatus === s ? { backgroundColor: STATUS_COLORS[s] } : {}}
                              >
                                {s === "hadir" ? "H" : s === "izin" ? "I" : s === "sakit" ? "S" : "A"}
                              </button>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
