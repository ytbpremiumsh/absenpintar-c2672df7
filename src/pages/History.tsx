import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  TrendingUp, Users, CheckCircle2, XCircle, FileSpreadsheet,
  BarChart3, CalendarDays, Award, Lightbulb, Loader2, GraduationCap, UserCheck,
} from "lucide-react";

const COLORS: Record<string, string> = {
  hadir: "#22c55e", izin: "#f59e0b", sakit: "#6366f1", alfa: "#ef4444",
};
const STATUS_LABELS: Record<string, string> = {
  hadir: "Hadir", izin: "Izin", sakit: "Sakit", alfa: "Alfa",
};
const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const History = () => {
  const { profile, user, roles } = useAuth();
  const features = useSubscriptionFeatures();
  const [logs, setLogs] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [teacherClasses, setTeacherClasses] = useState<string[] | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentAttLogs, setStudentAttLogs] = useState<any[]>([]);
  const [loadingStudentLogs, setLoadingStudentLogs] = useState(false);

  const isTeacherOnly = roles.includes("teacher") && !roles.includes("school_admin") && !roles.includes("staff");

  const today = new Date().toISOString().slice(0, 10);
  const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(thirtyAgo);
  const [endDate, setEndDate] = useState(today);
  const [quickDays, setQuickDays] = useState(30);

  const setQuickRange = (days: number) => {
    setQuickDays(days);
    setStartDate(new Date(Date.now() - days * 86400000).toISOString().slice(0, 10));
    setEndDate(today);
  };

  // Fetch teacher class assignments if teacher-only
  useEffect(() => {
    if (!isTeacherOnly || !user) { setTeacherClasses(null); return; }
    supabase.from("class_teachers").select("class_name").eq("user_id", user.id)
      .then(({ data }) => {
        setTeacherClasses(data?.map(d => d.class_name) || []);
      });
  }, [isTeacherOnly, user]);

  useEffect(() => {
    if (!profile?.school_id) { setLoading(false); return; }
    // Wait for teacher classes to load if teacher-only
    if (isTeacherOnly && teacherClasses === null) return;

    const fetchData = async () => {
      setLoading(true);

      let logsQuery = supabase.from("attendance_logs")
        .select("*, students(name, class, student_id)")
        .eq("school_id", profile.school_id)
        .gte("date", startDate).lte("date", endDate)
        .order("date", { ascending: false })
        .limit(5000);

      let studentsQuery = supabase.from("students").select("id, name, class, student_id")
        .eq("school_id", profile.school_id);

      // Filter by teacher's assigned classes
      if (isTeacherOnly && teacherClasses && teacherClasses.length > 0) {
        studentsQuery = studentsQuery.in("class", teacherClasses);
      }

      const [logsRes, studentsRes] = await Promise.all([logsQuery, studentsQuery]);

      let filteredLogs = logsRes.data || [];
      // Filter logs to only assigned classes for teacher
      if (isTeacherOnly && teacherClasses && teacherClasses.length > 0) {
        filteredLogs = filteredLogs.filter((l: any) => teacherClasses.includes(l.students?.class));
      }

      setLogs(filteredLogs);
      setAllStudents(studentsRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [profile?.school_id, startDate, endDate, isTeacherOnly, teacherClasses]);

  // All unique class names
  const classNames = useMemo(() => {
    const set = new Set<string>();
    allStudents.forEach(s => set.add(s.class));
    return Array.from(set).sort();
  }, [allStudents]);

  const analytics = useMemo(() => {
    const total = logs.length;
    const byStatus: Record<string, number> = { hadir: 0, izin: 0, sakit: 0, alfa: 0 };
    const byClass: Record<string, { total: number; hadir: number; alfa: number; izin: number; sakit: number }> = {};
    const byDate: Record<string, { total: number; hadir: number; alfa: number }> = {};
    const byDay: Record<number, Record<string, number>> = {};
    const studentAlfa: Record<string, { name: string; class: string; count: number }> = {};
    // Per-student stats
    const studentStats: Record<string, { id: string; name: string; class: string; student_id: string; hadir: number; izin: number; sakit: number; alfa: number; total: number }> = {};

    for (const l of logs) {
      byStatus[l.status] = (byStatus[l.status] || 0) + 1;
      const cls = l.students?.class || "?";
      if (!byClass[cls]) byClass[cls] = { total: 0, hadir: 0, alfa: 0, izin: 0, sakit: 0 };
      byClass[cls].total++;
      if (l.status === "hadir") byClass[cls].hadir++;
      if (l.status === "alfa") byClass[cls].alfa++;
      if (l.status === "izin") byClass[cls].izin++;
      if (l.status === "sakit") byClass[cls].sakit++;

      if (!byDate[l.date]) byDate[l.date] = { total: 0, hadir: 0, alfa: 0 };
      byDate[l.date].total++;
      if (l.status === "hadir") byDate[l.date].hadir++;
      if (l.status === "alfa") byDate[l.date].alfa++;

      const dow = new Date(l.date).getDay();
      if (!byDay[dow]) byDay[dow] = { hadir: 0, izin: 0, sakit: 0, alfa: 0 };
      byDay[dow][l.status] = (byDay[dow][l.status] || 0) + 1;

      if (l.status === "alfa") {
        const sid = l.student_id;
        if (!studentAlfa[sid]) studentAlfa[sid] = { name: l.students?.name || "?", class: l.students?.class || "?", count: 0 };
        studentAlfa[sid].count++;
      }

      // Per student
      const sid = l.student_id;
      if (!studentStats[sid]) studentStats[sid] = {
        id: sid, name: l.students?.name || "?", class: l.students?.class || "?",
        student_id: l.students?.student_id || "?",
        hadir: 0, izin: 0, sakit: 0, alfa: 0, total: 0,
      };
      studentStats[sid].total++;
      studentStats[sid][l.status as "hadir" | "izin" | "sakit" | "alfa"]++;
    }

    const attendanceRate = total > 0 ? ((byStatus.hadir / total) * 100) : 0;

    const bestClass = Object.entries(byClass).sort((a, b) => {
      const rateA = a[1].total > 0 ? a[1].hadir / a[1].total : 0;
      const rateB = b[1].total > 0 ? b[1].hadir / b[1].total : 0;
      return rateB - rateA;
    })[0];

    const pieData = Object.entries(byStatus).filter(([, v]) => v > 0).map(([k, v]) => ({
      name: STATUS_LABELS[k], value: v, color: COLORS[k],
    }));

    const trendData = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, d]) => ({
      date: date.slice(5),
      "% Hadir": d.total > 0 ? Math.round((d.hadir / d.total) * 100) : 0,
      Hadir: d.hadir,
      Alfa: d.alfa,
    }));

    const classData = Object.entries(byClass).map(([cls, d]) => ({
      name: cls,
      rate: d.total > 0 ? Math.round((d.hadir / d.total) * 100) : 0,
      total: d.total,
      hadir: d.hadir,
      alfa: d.alfa,
      izin: d.izin,
      sakit: d.sakit,
    })).sort((a, b) => b.rate - a.rate);

    const dowData = [1, 2, 3, 4, 5, 6].map(d => ({
      name: DAY_NAMES[d],
      Hadir: byDay[d]?.hadir || 0,
      Izin: byDay[d]?.izin || 0,
      Sakit: byDay[d]?.sakit || 0,
      Alfa: byDay[d]?.alfa || 0,
    }));

    const topAbsentees = Object.values(studentAlfa).sort((a, b) => b.count - a.count).slice(0, 10);

    const insights: string[] = [];
    if (attendanceRate >= 90) insights.push(`✅ Tingkat kehadiran sangat baik (${attendanceRate.toFixed(1)}%).`);
    else if (attendanceRate >= 75) insights.push(`⚠️ Tingkat kehadiran cukup (${attendanceRate.toFixed(1)}%), perlu peningkatan.`);
    else insights.push(`🔴 Tingkat kehadiran rendah (${attendanceRate.toFixed(1)}%), perlu perhatian serius.`);
    if (bestClass) insights.push(`🏆 Kelas terbaik: ${bestClass[0]} dengan ${bestClass[1].total > 0 ? Math.round((bestClass[1].hadir / bestClass[1].total) * 100) : 0}% kehadiran.`);
    if (topAbsentees.length > 0) insights.push(`📋 ${topAbsentees[0].name} (${topAbsentees[0].class}) memiliki ${topAbsentees[0].count} kali alfa terbanyak.`);
    const worstDay = dowData.filter(d => d.Alfa > 0).sort((a, b) => b.Alfa - a.Alfa)[0];
    if (worstDay) insights.push(`📅 Hari ${worstDay.name} memiliki alfa terbanyak (${worstDay.Alfa} kali).`);

    const allStudentStats = Object.values(studentStats).sort((a, b) => {
      const rateA = a.total > 0 ? a.hadir / a.total : 0;
      const rateB = b.total > 0 ? b.hadir / b.total : 0;
      return rateB - rateA;
    });

    return { total, byStatus, attendanceRate, bestClass, pieData, trendData, classData, dowData, topAbsentees, insights, allStudentStats };
  }, [logs]);

  // Filtered student stats by class
  const filteredStudentStats = useMemo(() => {
    if (selectedClass === "all") return analytics.allStudentStats;
    return analytics.allStudentStats.filter(s => s.class === selectedClass);
  }, [analytics.allStudentStats, selectedClass]);

  // Per-class pie data for selected class
  const classPieData = useMemo(() => {
    const cls = analytics.classData.find(c => c.name === selectedClass);
    if (!cls || selectedClass === "all") {
      // Aggregate all
      return [
        { name: "Hadir", value: analytics.byStatus.hadir, color: COLORS.hadir },
        { name: "Izin", value: analytics.byStatus.izin, color: COLORS.izin },
        { name: "Sakit", value: analytics.byStatus.sakit, color: COLORS.sakit },
        { name: "Alfa", value: analytics.byStatus.alfa, color: COLORS.alfa },
      ].filter(d => d.value > 0);
    }
    return [
      { name: "Hadir", value: cls.hadir, color: COLORS.hadir },
      { name: "Izin", value: cls.izin, color: COLORS.izin },
      { name: "Sakit", value: cls.sakit, color: COLORS.sakit },
      { name: "Alfa", value: cls.alfa, color: COLORS.alfa },
    ].filter(d => d.value > 0);
  }, [analytics, selectedClass]);

  const exportExcel = () => {
    if (!features.canExportReport) { toast.error("Fitur export tersedia di paket Basic ke atas"); return; }
    const data = logs.map((l, i) => ({
      "No": i + 1,
      "Nama Siswa": l.students?.name || "-",
      "Kelas": l.students?.class || "-",
      "Tanggal": l.date,
      "Jam": l.time?.slice(0, 5),
      "Status": STATUS_LABELS[l.status] || l.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Analytic Kelas");
    XLSX.writeFile(wb, `analytic-kelas-${startDate}-${endDate}.xlsx`);
    toast.success("Data berhasil diexport!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#5B6CF9] to-[#4c5ded] p-5 sm:p-6 text-white shadow-xl">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Analytic Kelas</h1>
              <p className="text-white/70 text-xs sm:text-sm">Dashboard analitik & performa kehadiran siswa</p>
            </div>
          </div>
          <Button onClick={exportExcel} className="bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-sm gap-1.5 text-xs font-semibold shrink-0 h-9 rounded-lg">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Export Excel
          </Button>
        </div>
      </div>

      {/* Date Range Picker */}
      <Card className="border-0 shadow-lg rounded-2xl">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Dari</label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setQuickDays(0); }} className="h-9 w-auto pl-9 rounded-lg" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Sampai</label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setQuickDays(0); }} className="h-9 w-auto pl-9 rounded-lg" />
              </div>
            </div>
            <div className="flex gap-1.5">
              {[30, 60, 90].map(d => (
                <Button key={d} variant={quickDays === d ? "default" : "outline"} size="sm"
                  onClick={() => setQuickRange(d)}
                  className={`text-xs h-9 rounded-lg ${quickDays === d ? "bg-[#5B6CF9] hover:bg-[#4c5ded] text-white" : ""}`}>
                  {d} Hari
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 rounded-xl p-1">
          <TabsTrigger value="overview" className="rounded-lg text-xs font-semibold gap-1.5 data-[state=active]:bg-[#5B6CF9] data-[state=active]:text-white">
            <BarChart3 className="h-3.5 w-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="class-analysis" className="rounded-lg text-xs font-semibold gap-1.5 data-[state=active]:bg-[#5B6CF9] data-[state=active]:text-white">
            <GraduationCap className="h-3.5 w-3.5" /> Analisa Kelas
          </TabsTrigger>
        </TabsList>

        {/* ===== TAB: OVERVIEW ===== */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { icon: Users, label: "Total Data", value: analytics.total.toLocaleString(), color: "text-foreground", bg: "bg-secondary" },
              { icon: CheckCircle2, label: "Tingkat Kehadiran", value: `${analytics.attendanceRate.toFixed(1)}%`, color: "text-success", bg: "bg-success/10" },
              { icon: XCircle, label: "Total Alfa", value: analytics.byStatus.alfa.toLocaleString(), color: "text-destructive", bg: "bg-destructive/10" },
              { icon: Award, label: "Kelas Terbaik", value: analytics.bestClass?.[0] || "-", color: "text-[#5B6CF9]", bg: "bg-[#5B6CF9]/10" },
            ].map(kpi => (
              <Card key={kpi.label} className="border-0 shadow-lg rounded-2xl">
                <CardContent className="p-4 flex items-start justify-between">
                  <div>
                    <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                    <p className={`text-xl sm:text-2xl font-extrabold mt-1 ${kpi.color}`}>{kpi.value}</p>
                  </div>
                  <div className={`h-10 w-10 rounded-xl ${kpi.bg} flex items-center justify-center shrink-0`}>
                    <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Row 1: Donut + Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-0 shadow-lg rounded-2xl">
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-foreground mb-4">Distribusi Status</h3>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie data={analytics.pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                        dataKey="value" stroke="none">
                        {analytics.pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => v.toLocaleString()} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {analytics.pieData.map(d => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                        <div>
                          <p className="font-semibold">{d.name}</p>
                          <p className="text-muted-foreground">{d.value.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg rounded-2xl">
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-foreground mb-4">Tren Harian</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={analytics.trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="% Hadir" stroke="#22c55e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Hadir" stroke="#6366f1" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="Alfa" stroke="#ef4444" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2: Class Comparison + Day of Week */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-0 shadow-lg rounded-2xl">
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-foreground mb-4">Perbandingan Kelas</h3>
                <ResponsiveContainer width="100%" height={Math.max(200, analytics.classData.length * 36)}>
                  <BarChart data={analytics.classData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="rate" fill="#5B6CF9" radius={[0, 6, 6, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg rounded-2xl">
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-foreground mb-4">Pola Harian (Sen - Sab)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={analytics.dowData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Hadir" stackId="a" fill="#22c55e" />
                    <Bar dataKey="Izin" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="Sakit" stackId="a" fill="#6366f1" />
                    <Bar dataKey="Alfa" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Class Summary Table */}
          <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">Ringkasan Per Kelas</h3>
            </div>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="font-semibold">Kelas</TableHead>
                      <TableHead className="font-semibold text-center">Total</TableHead>
                      <TableHead className="font-semibold text-center">Hadir</TableHead>
                      <TableHead className="font-semibold text-center">Alfa</TableHead>
                      <TableHead className="font-semibold">Tingkat Kehadiran</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.classData.map(cls => (
                      <TableRow key={cls.name} className="hover:bg-muted/20">
                        <TableCell className="font-semibold text-sm">{cls.name}</TableCell>
                        <TableCell className="text-center text-sm">{cls.total}</TableCell>
                        <TableCell className="text-center text-sm text-success font-medium">{cls.hadir}</TableCell>
                        <TableCell className="text-center text-sm text-destructive font-medium">{cls.alfa}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Progress value={cls.rate} className="h-2 flex-1"
                              style={{ ['--progress-foreground' as any]: cls.rate >= 85 ? '#22c55e' : cls.rate >= 70 ? '#f59e0b' : '#ef4444' }} />
                            <span className={`text-xs font-bold min-w-[40px] text-right ${cls.rate >= 85 ? "text-success" : cls.rate >= 70 ? "text-warning" : "text-destructive"}`}>
                              {cls.rate}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Top 10 Absentees */}
          {analytics.topAbsentees.length > 0 && (
            <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-bold text-foreground">Top 10 Siswa Terbanyak Alfa</h3>
              </div>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="w-12 font-semibold text-center">#</TableHead>
                      <TableHead className="font-semibold">Nama Siswa</TableHead>
                      <TableHead className="font-semibold">Kelas</TableHead>
                      <TableHead className="font-semibold text-center">Jumlah Alfa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.topAbsentees.map((s, i) => (
                      <TableRow key={i} className={`hover:bg-muted/20 ${i < 3 ? "bg-destructive/5" : ""}`}>
                        <TableCell className="text-center">
                          {i < 3 ? (
                            <Badge className="bg-destructive text-white text-[10px] h-5 w-5 p-0 flex items-center justify-center rounded-full">
                              {i + 1}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">{i + 1}</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-sm">{s.name}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-[10px]">{s.class}</Badge></TableCell>
                        <TableCell className="text-center">
                          <Badge variant="destructive" className="text-xs">{s.count}x</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Insights Banner */}
          {analytics.insights.length > 0 && (
            <Card className="border-0 shadow-lg rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#5B6CF9]/10 flex items-center justify-center shrink-0">
                    <Lightbulb className="h-5 w-5 text-[#5B6CF9]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-2">Ringkasan Insight</h3>
                    <ul className="space-y-1.5">
                      {analytics.insights.map((insight, i) => (
                        <li key={i} className="text-xs text-muted-foreground">{insight}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== TAB: ANALISA KELAS ===== */}
        <TabsContent value="class-analysis" className="space-y-6 mt-4">
          {/* Class Selector */}
          <Card className="border-0 shadow-lg rounded-2xl">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-[#5B6CF9]/10 flex items-center justify-center">
                    <GraduationCap className="h-4 w-4 text-[#5B6CF9]" />
                  </div>
                  <span className="text-sm font-bold text-foreground">Pilih Kelas</span>
                </div>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-48 h-9 rounded-lg">
                    <SelectValue placeholder="Semua Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kelas</SelectItem>
                    {classNames.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Class KPI + Pie */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Stat cards */}
            <div className="lg:col-span-1 grid grid-cols-2 lg:grid-cols-1 gap-3">
              {(() => {
                const filtered = selectedClass === "all" ? analytics.allStudentStats : analytics.allStudentStats.filter(s => s.class === selectedClass);
                const totalStudents = selectedClass === "all" ? allStudents.length : allStudents.filter(s => s.class === selectedClass).length;
                const totalRecords = filtered.reduce((a, b) => a + b.total, 0);
                const totalHadir = filtered.reduce((a, b) => a + b.hadir, 0);
                const totalAlfa = filtered.reduce((a, b) => a + b.alfa, 0);
                const rate = totalRecords > 0 ? ((totalHadir / totalRecords) * 100) : 0;
                return [
                  { label: "Jumlah Siswa", value: totalStudents.toString(), icon: Users, color: "text-[#5B6CF9]", bg: "bg-[#5B6CF9]/10" },
                  { label: "Total Record", value: totalRecords.toLocaleString(), icon: BarChart3, color: "text-foreground", bg: "bg-secondary" },
                  { label: "% Kehadiran", value: `${rate.toFixed(1)}%`, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
                  { label: "Total Alfa", value: totalAlfa.toLocaleString(), icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
                ].map(kpi => (
                  <Card key={kpi.label} className="border-0 shadow-md rounded-xl">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg ${kpi.bg} flex items-center justify-center shrink-0`}>
                        <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                        <p className={`text-lg font-extrabold ${kpi.color}`}>{kpi.value}</p>
                      </div>
                    </CardContent>
                  </Card>
                ));
              })()}
            </div>

            {/* Pie Chart for selected class */}
            <Card className="border-0 shadow-lg rounded-2xl lg:col-span-2">
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-foreground mb-4">
                  Distribusi Status {selectedClass !== "all" ? `— ${selectedClass}` : "— Semua Kelas"}
                </h3>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie data={classPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                        dataKey="value" stroke="none">
                        {classPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => v.toLocaleString()} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {classPieData.map(d => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                        <div>
                          <p className="font-semibold">{d.name}</p>
                          <p className="text-muted-foreground">{d.value.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Per-Student Attendance Table */}
          <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[#5B6CF9]" />
                <h3 className="text-sm font-bold text-foreground">
                  Persentase Kehadiran Per Siswa {selectedClass !== "all" ? `— ${selectedClass}` : ""}
                </h3>
              </div>
              <Badge variant="secondary" className="text-[10px]">{filteredStudentStats.length} siswa</Badge>
            </div>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="w-12 font-semibold text-center">#</TableHead>
                      <TableHead className="font-semibold">Nama Siswa</TableHead>
                      <TableHead className="font-semibold">Kelas</TableHead>
                      <TableHead className="font-semibold text-center">Hadir</TableHead>
                      <TableHead className="font-semibold text-center">Izin</TableHead>
                      <TableHead className="font-semibold text-center">Sakit</TableHead>
                      <TableHead className="font-semibold text-center">Alfa</TableHead>
                      <TableHead className="font-semibold">% Kehadiran</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudentStats.map((s, i) => {
                      const rate = s.total > 0 ? Math.round((s.hadir / s.total) * 100) : 0;
                      return (
                        <TableRow key={i} className="hover:bg-muted/20 cursor-pointer" onClick={() => {
                          setSelectedStudentId(s.id);
                          setLoadingStudentLogs(true);
                          supabase.from("attendance_logs").select("id, date, time, status, method")
                            .eq("student_id", s.id).gte("date", startDate).lte("date", endDate)
                            .order("date", { ascending: false })
                            .then(({ data }) => { setStudentAttLogs(data || []); setLoadingStudentLogs(false); });
                        }}>
                          <TableCell className="text-center text-xs text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-medium text-sm text-primary hover:underline">{s.name}</TableCell>
                          <TableCell><Badge variant="secondary" className="text-[10px]">{s.class}</Badge></TableCell>
                          <TableCell className="text-center text-sm text-success font-medium">{s.hadir}</TableCell>
                          <TableCell className="text-center text-sm text-amber-500 font-medium">{s.izin}</TableCell>
                          <TableCell className="text-center text-sm text-[#5B6CF9] font-medium">{s.sakit}</TableCell>
                          <TableCell className="text-center text-sm text-destructive font-medium">{s.alfa}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={rate} className="h-2 flex-1 max-w-[120px]"
                                style={{ ['--progress-foreground' as any]: rate >= 85 ? '#22c55e' : rate >= 70 ? '#f59e0b' : '#ef4444' }} />
                              <span className={`text-xs font-bold min-w-[36px] text-right ${rate >= 85 ? "text-success" : rate >= 70 ? "text-warning" : "text-destructive"}`}>
                                {rate}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredStudentStats.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                          Tidak ada data kehadiran untuk filter ini
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Class Ranking Bar */}
          {selectedClass === "all" && analytics.classData.length > 0 && (
            <Card className="border-0 shadow-lg rounded-2xl">
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-foreground mb-4">Peringkat Kelas berdasarkan Kehadiran</h3>
                <ResponsiveContainer width="100%" height={Math.max(200, analytics.classData.length * 40)}>
                  <BarChart data={analytics.classData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="rate" fill="#5B6CF9" radius={[0, 6, 6, 0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Student Attendance Detail Dialog */}
      <Dialog open={!!selectedStudentId} onOpenChange={(open) => { if (!open) setSelectedStudentId(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Riwayat Absensi — {filteredStudentStats.find(s => s.id === selectedStudentId)?.name || ""}
            </DialogTitle>
          </DialogHeader>
          {loadingStudentLogs ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Memuat data...</div>
          ) : studentAttLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Tidak ada data absensi</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead className="text-xs font-semibold">Tanggal</TableHead>
                    <TableHead className="text-xs font-semibold">Hari</TableHead>
                    <TableHead className="text-xs font-semibold">Jam</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentAttLogs.map((l: any) => {
                    const d = new Date(l.date);
                    const dayName = d.toLocaleDateString("id-ID", { weekday: "short" });
                    const dateStr = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
                    const statusColors: Record<string, string> = {
                      hadir: "bg-success/10 text-success border-success/30",
                      izin: "bg-warning/10 text-warning border-warning/30",
                      sakit: "bg-blue-100 text-blue-600 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400",
                      alfa: "bg-destructive/10 text-destructive border-destructive/30",
                    };
                    return (
                      <TableRow key={l.id} className="hover:bg-muted/20">
                        <TableCell className="text-xs">{dateStr}</TableCell>
                        <TableCell className="text-xs">{dayName}</TableCell>
                        <TableCell className="text-xs font-mono">{l.time?.slice(0, 5)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${statusColors[l.status] || ""}`}>
                            {STATUS_LABELS[l.status] || l.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default History;
