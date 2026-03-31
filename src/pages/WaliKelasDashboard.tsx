import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, UserCheck, Clock, GraduationCap, Search,
  AlertTriangle, Thermometer, FileText, Activity, Trophy, Medal, Flame, TrendingUp,
} from "lucide-react";
import {
  BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

const STATUS_LABELS: Record<string, string> = { hadir: "Hadir", izin: "Izin", sakit: "Sakit", alfa: "Alfa", belum: "Belum" };
const STATUS_BG: Record<string, string> = {
  hadir: "bg-success/10 text-success border-success/20",
  izin: "bg-warning/10 text-warning border-warning/20",
  sakit: "bg-blue-50 text-blue-500 border-blue-200",
  alfa: "bg-destructive/10 text-destructive border-destructive/20",
  belum: "bg-muted text-muted-foreground border-border",
};
const COLORS: Record<string, string> = {
  hadir: "#22c55e", izin: "#f59e0b", sakit: "#6366f1", alfa: "#ef4444",
};

interface StudentWithAttendance {
  id: string;
  name: string;
  student_id: string;
  class: string;
  photo_url: string | null;
  status: string;
  time: string | null;
  method: string | null;
}

const WaliKelasDashboard = () => {
  const { user, profile } = useAuth();
  const [assignments, setAssignments] = useState<{ class_name: string; school_id: string }[]>([]);
  const [students, setStudents] = useState<StudentWithAttendance[]>([]);
  const [allStudentsList, setAllStudentsList] = useState<any[]>([]);
  const [historicalLogs, setHistoricalLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedAnalyticsClass, setSelectedAnalyticsClass] = useState<string>("all");
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;
    const fetchAssignments = async () => {
      const { data } = await supabase
        .from("class_teachers")
        .select("class_name, school_id")
        .eq("user_id", user.id);
      setAssignments(data || []);
    };
    fetchAssignments();
  }, [user]);

  useEffect(() => {
    if (assignments.length === 0) { setLoading(false); return; }
    const fetchData = async () => {
      const schoolId = assignments[0].school_id;
      const classNames = assignments.map((a) => a.class_name);

      const { data: studentData } = await supabase
        .from("students").select("id, name, student_id, class, photo_url")
        .eq("school_id", schoolId).in("class", classNames).order("class").order("name");

      if (!studentData || studentData.length === 0) {
        setStudents([]);
        setAllStudentsList([]);
        setLoading(false);
        return;
      }

      setAllStudentsList(studentData);
      const studentIds = studentData.map((s) => s.id);

      // Today's attendance
      const { data: attendanceData } = await supabase
        .from("attendance_logs").select("student_id, status, time, method")
        .eq("school_id", schoolId).eq("date", today).in("student_id", studentIds);

      const attendanceMap = new Map<string, { status: string; time: string; method: string }>();
      (attendanceData || []).forEach((a) => {
        attendanceMap.set(a.student_id, { status: a.status, time: a.time, method: a.method });
      });

      const merged: StudentWithAttendance[] = studentData.map((s) => {
        const att = attendanceMap.get(s.id);
        return { ...s, status: att?.status || "belum", time: att?.time || null, method: att?.method || null };
      });
      setStudents(merged);

      // Historical logs (30 days)
      const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const { data: histLogs } = await supabase
        .from("attendance_logs")
        .select("student_id, status, date, students(name, class, student_id)")
        .eq("school_id", schoolId)
        .in("student_id", studentIds)
        .gte("date", thirtyAgo)
        .lte("date", today);
      setHistoricalLogs(histLogs || []);

      setLoading(false);
    };
    fetchData();
  }, [assignments, today]);

  const stats = useMemo(() => {
    const total = students.length;
    const hadir = students.filter((s) => s.status === "hadir").length;
    const izin = students.filter((s) => s.status === "izin").length;
    const sakit = students.filter((s) => s.status === "sakit").length;
    const alfa = students.filter((s) => s.status === "alfa").length;
    const belum = students.filter((s) => s.status === "belum").length;
    return { total, hadir, izin, sakit, alfa, belum };
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!search) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.student_id.toLowerCase().includes(q) || s.class.toLowerCase().includes(q)
    );
  }, [students, search]);

  // Analytics computations
  const analytics = useMemo(() => {
    if (historicalLogs.length === 0) return null;

    const classNames = assignments.map((a) => a.class_name);
    const filteredLogs = selectedAnalyticsClass === "all"
      ? historicalLogs
      : historicalLogs.filter((l: any) => l.students?.class === selectedAnalyticsClass);

    // Distribution
    const dist: Record<string, number> = { hadir: 0, izin: 0, sakit: 0, alfa: 0 };
    filteredLogs.forEach((l: any) => { if (dist[l.status] !== undefined) dist[l.status]++; });
    const totalLogs = Object.values(dist).reduce((a, b) => a + b, 0);
    const pieData = Object.entries(dist).map(([key, val]) => ({
      name: STATUS_LABELS[key], value: val, color: COLORS[key],
    })).filter((d) => d.value > 0);

    const attendanceRate = totalLogs > 0 ? Math.round((dist.hadir / totalLogs) * 100) : 0;

    // Per-class comparison
    const byClass: Record<string, { hadir: number; total: number }> = {};
    historicalLogs.forEach((l: any) => {
      const cls = l.students?.class || "?";
      if (!byClass[cls]) byClass[cls] = { hadir: 0, total: 0 };
      byClass[cls].total++;
      if (l.status === "hadir") byClass[cls].hadir++;
    });
    const classData = Object.entries(byClass).map(([cls, d]) => ({
      name: cls,
      rate: d.total > 0 ? Math.round((d.hadir / d.total) * 100) : 0,
      hadir: d.hadir,
      total: d.total,
    })).sort((a, b) => b.rate - a.rate);

    const bestClass = classData.length > 0 ? classData[0] : null;

    // Per-student
    const relevantStudents = selectedAnalyticsClass === "all"
      ? allStudentsList
      : allStudentsList.filter((s) => s.class === selectedAnalyticsClass);

    const byStudent: Record<string, { hadir: number; izin: number; sakit: number; alfa: number; total: number }> = {};
    filteredLogs.forEach((l: any) => {
      const sid = l.student_id;
      if (!byStudent[sid]) byStudent[sid] = { hadir: 0, izin: 0, sakit: 0, alfa: 0, total: 0 };
      byStudent[sid].total++;
      if (byStudent[sid][l.status as keyof typeof byStudent[typeof sid]] !== undefined) {
        (byStudent[sid] as any)[l.status]++;
      }
    });

    const studentAnalytics = relevantStudents.map((s: any) => {
      const data = byStudent[s.id] || { hadir: 0, izin: 0, sakit: 0, alfa: 0, total: 0 };
      const rate = data.total > 0 ? Math.round((data.hadir / data.total) * 100) : 0;
      return { ...s, ...data, rate };
    }).sort((a: any, b: any) => b.rate - a.rate);

    return { pieData, attendanceRate, classData, bestClass, studentAnalytics, totalLogs, classNames };
  }, [historicalLogs, selectedAnalyticsClass, allStudentsList, assignments]);

  const percentage = stats.total ? Math.round(((stats.total - stats.belum) / stats.total) * 100) : 0;
  const classNames = assignments.map((a) => a.class_name);

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Memuat data...</div>;
  }

  if (assignments.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard Wali Kelas</h1>
        <Card className="border-0 shadow-card">
          <CardContent className="p-10 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Anda belum ditugaskan sebagai wali kelas.</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Hubungi admin sekolah untuk penugasan.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getRateColor = (rate: number) => {
    if (rate >= 85) return "text-success";
    if (rate >= 70) return "text-warning";
    return "text-destructive";
  };

  const getRateProgressColor = (rate: number) => {
    if (rate >= 85) return "bg-success";
    if (rate >= 70) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Wali Kelas</h1>
          <p className="text-muted-foreground text-sm">
            Kelas: {classNames.join(", ")} • {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="dashboard" className="flex-1 sm:flex-none gap-1.5">
            <Activity className="h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1 sm:flex-none gap-1.5">
            <BarChart3 className="h-4 w-4" /> Analitik Kelas
          </TabsTrigger>
        </TabsList>

        {/* ===== DASHBOARD TAB ===== */}
        <TabsContent value="dashboard" className="space-y-6 mt-4">
          {/* Stats */}
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { icon: Users, value: stats.total, label: "Total Siswa", color: "text-primary", bg: "bg-primary/10" },
              { icon: UserCheck, value: stats.hadir, label: "Hadir", color: "text-success", bg: "bg-success/10" },
              { icon: FileText, value: stats.izin, label: "Izin", color: "text-warning", bg: "bg-warning/10" },
              { icon: Thermometer, value: stats.sakit, label: "Sakit", color: "text-blue-500", bg: "bg-blue-50" },
              { icon: AlertTriangle, value: stats.alfa, label: "Alfa", color: "text-destructive", bg: "bg-destructive/10" },
              { icon: Clock, value: stats.belum, label: "Belum", color: "text-muted-foreground", bg: "bg-muted" },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="border-0 shadow-card">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Progress */}
          <Card className="border-0 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Progress Absensi Hari Ini</span>
                </div>
                <span className="text-2xl font-extrabold text-primary">{percentage}%</span>
              </div>
              <div className="h-4 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-primary/80 to-success"
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 1.2 }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">{stats.total - stats.belum} dari {stats.total} siswa sudah diabsen</p>
            </CardContent>
          </Card>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari siswa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
          </div>

          {/* Student list */}
          <Card className="border-0 shadow-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-bold text-sm text-foreground">Daftar Siswa & Status Absensi</h2>
            </div>
            <div className="divide-y divide-border">
              {filteredStudents.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground text-sm">Tidak ada siswa ditemukan</div>
              ) : (
                filteredStudents.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-3 p-3 hover:bg-secondary/30 transition-colors"
                  >
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden ${
                      s.status === "hadir" ? "bg-success/15 text-success" :
                      s.status === "izin" ? "bg-warning/15 text-warning" :
                      s.status === "sakit" ? "bg-blue-50 text-blue-500" :
                      s.status === "alfa" ? "bg-destructive/15 text-destructive" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {s.photo_url ? (
                        <img src={s.photo_url} alt="" className="h-full w-full rounded-full object-cover" />
                      ) : s.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">{s.class} • NIS: {s.student_id}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="secondary" className={`text-[10px] ${STATUS_BG[s.status] || ""}`}>
                        {STATUS_LABELS[s.status] || s.status}
                      </Badge>
                      {s.time && (
                        <span className="text-[10px] font-mono text-muted-foreground">{s.time.slice(0, 5)}</span>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        {/* ===== ANALYTICS TAB ===== */}
        <TabsContent value="analytics" className="space-y-6 mt-4">
          {!analytics || analytics.totalLogs === 0 ? (
            <Card className="border-0 shadow-card">
              <CardContent className="p-10 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Belum ada data absensi dalam 30 hari terakhir.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Filter & Summary Cards */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <Select value={selectedAnalyticsClass} onValueChange={setSelectedAnalyticsClass}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Pilih Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kelas</SelectItem>
                    {classNames.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Data 30 hari terakhir</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="border-0 shadow-card">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-extrabold text-foreground">{analytics.totalLogs}</p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Total Data</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-card">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                      <UserCheck className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className={`text-2xl font-extrabold ${getRateColor(analytics.attendanceRate)}`}>{analytics.attendanceRate}%</p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Kehadiran</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-card">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                      <Award className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-2xl font-extrabold text-foreground">{analytics.bestClass?.name || "-"}</p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Kelas Terbaik</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Pie Chart */}
                <Card className="border-0 shadow-card">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-bold text-foreground mb-3">Distribusi Status</h3>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={analytics.pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {analytics.pieData.map((entry: any, i: number) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Bar Chart - Class Comparison */}
                {analytics.classData.length > 1 && (
                  <Card className="border-0 shadow-card">
                    <CardContent className="p-4">
                      <h3 className="text-sm font-bold text-foreground mb-3">Perbandingan Kelas</h3>
                      <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analytics.classData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(val: number) => `${val}%`} />
                            <Bar dataKey="rate" name="Kehadiran %" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Per-Student Table */}
              <Card className="border-0 shadow-card overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="font-bold text-sm text-foreground">Kehadiran Per Siswa (30 Hari)</h3>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead className="hidden sm:table-cell">Kelas</TableHead>
                        <TableHead className="text-center">Hadir</TableHead>
                        <TableHead className="text-center">Izin</TableHead>
                        <TableHead className="text-center">Sakit</TableHead>
                        <TableHead className="text-center">Alfa</TableHead>
                        <TableHead className="w-[140px]">% Kehadiran</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.studentAnalytics.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">Tidak ada data</TableCell>
                        </TableRow>
                      ) : (
                        analytics.studentAnalytics.map((s: any, i: number) => (
                          <TableRow key={s.id}>
                            <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                            <TableCell>
                              <div className="font-medium text-sm">{s.name}</div>
                              <div className="text-[10px] text-muted-foreground">NIS: {s.student_id}</div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm">{s.class}</TableCell>
                            <TableCell className="text-center text-sm font-semibold text-success">{s.hadir}</TableCell>
                            <TableCell className="text-center text-sm font-semibold text-warning">{s.izin}</TableCell>
                            <TableCell className="text-center text-sm font-semibold text-blue-500">{s.sakit}</TableCell>
                            <TableCell className="text-center text-sm font-semibold text-destructive">{s.alfa}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                                  <div className={`h-full rounded-full ${getRateProgressColor(s.rate)}`} style={{ width: `${s.rate}%` }} />
                                </div>
                                <span className={`text-xs font-bold min-w-[32px] text-right ${getRateColor(s.rate)}`}>{s.rate}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WaliKelasDashboard;
