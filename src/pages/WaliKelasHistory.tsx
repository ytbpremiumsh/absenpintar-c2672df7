import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Users, CheckCircle2, XCircle, BarChart3, CalendarDays,
  Activity, GraduationCap, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { motion } from "framer-motion";

const COLORS: Record<string, string> = {
  hadir: "#22c55e", izin: "#f59e0b", sakit: "#6366f1", alfa: "#ef4444",
};
const STATUS_LABELS: Record<string, string> = {
  hadir: "Hadir", izin: "Izin", sakit: "Sakit", alfa: "Alfa",
};

const WaliKelasHistory = () => {
  const { user, profile } = useAuth();
  const [assignments, setAssignments] = useState<{ class_name: string; school_id: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [logs, setLogs] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(today);
  const [quickDays, setQuickDays] = useState(30);

  const setQuickRange = (days: number) => {
    setQuickDays(days);
    setStartDate(new Date(Date.now() - days * 86400000).toISOString().slice(0, 10));
    setEndDate(today);
  };

  // Fetch wali kelas assignments
  useEffect(() => {
    if (!user) return;
    supabase.from("class_teachers").select("class_name, school_id").eq("user_id", user.id).then(({ data }) => {
      const assigns = data || [];
      setAssignments(assigns);
      if (assigns.length > 0) setSelectedClass(assigns[0].class_name);
    });
  }, [user]);

  // Fetch attendance data for selected class
  useEffect(() => {
    if (!profile?.school_id || !selectedClass) { setLoading(false); return; }
    const fetchData = async () => {
      setLoading(true);
      const [studentsRes, logsRes] = await Promise.all([
        supabase.from("students").select("id, name, student_id, class").eq("school_id", profile.school_id!).eq("class", selectedClass).order("name"),
        supabase.from("attendance_logs").select("student_id, date, status, attendance_type").eq("school_id", profile.school_id!).eq("attendance_type", "datang").gte("date", startDate).lte("date", endDate),
      ]);

      const studentData = studentsRes.data || [];
      setAllStudents(studentData);

      if (studentData.length > 0) {
        const ids = studentData.map(s => s.id);
        const { data: filteredLogs } = await supabase
          .from("attendance_logs")
          .select("student_id, date, status, attendance_type")
          .eq("school_id", profile.school_id!)
          .eq("attendance_type", "datang")
          .gte("date", startDate)
          .lte("date", endDate)
          .in("student_id", ids);
        setLogs(filteredLogs || []);
      } else {
        setLogs([]);
      }
      setLoading(false);
    };
    fetchData();
  }, [profile?.school_id, selectedClass, startDate, endDate]);

  const statusCounts = useMemo(() => {
    const counts = { hadir: 0, izin: 0, sakit: 0, alfa: 0 };
    logs.forEach(l => { if (counts[l.status as keyof typeof counts] !== undefined) counts[l.status as keyof typeof counts]++; });
    return counts;
  }, [logs]);

  const pieData = Object.entries(statusCounts).map(([k, v]) => ({ name: STATUS_LABELS[k], value: v, color: COLORS[k] })).filter(d => d.value > 0);
  const totalLogs = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  // Per-student summary
  const studentSummary = useMemo(() => {
    const map: Record<string, { name: string; student_id: string; hadir: number; izin: number; sakit: number; alfa: number; total: number }> = {};
    allStudents.forEach(s => {
      map[s.id] = { name: s.name, student_id: s.student_id, hadir: 0, izin: 0, sakit: 0, alfa: 0, total: 0 };
    });
    logs.forEach(l => {
      if (map[l.student_id] && map[l.student_id][l.status as keyof typeof statusCounts] !== undefined) {
        map[l.student_id][l.status as keyof typeof statusCounts]++;
        map[l.student_id].total++;
      }
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [allStudents, logs]);

  // Daily trend
  const dailyTrend = useMemo(() => {
    const byDate: Record<string, { hadir: number; izin: number; sakit: number; alfa: number }> = {};
    logs.forEach(l => {
      if (!byDate[l.date]) byDate[l.date] = { hadir: 0, izin: 0, sakit: 0, alfa: 0 };
      if (byDate[l.date][l.status as keyof typeof statusCounts] !== undefined) byDate[l.date][l.status as keyof typeof statusCounts]++;
    });
    return Object.entries(byDate).sort().map(([date, d]) => ({ date: date.slice(5), ...d }));
  }, [logs]);

  const classNames = assignments.map(a => a.class_name);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (assignments.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Activity} title="Analytic Kelas Wali" subtitle="Analisa kehadiran umum kelas wali Anda" />
        <Card className="border-0 shadow-card">
          <CardContent className="p-10 text-center text-muted-foreground">Anda belum ditugaskan sebagai wali kelas.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={Activity} title="Analytic Kelas Wali" subtitle="Analisa kehadiran umum (Datang) untuk kelas wali Anda" />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {classNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-1.5">
          {[7, 14, 30].map(d => (
            <Button key={d} size="sm" variant={quickDays === d ? "default" : "outline"} onClick={() => setQuickRange(d)} className="text-xs rounded-lg">
              {d} Hari
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 w-[130px] text-xs" />
          <span>-</span>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 w-[130px] text-xs" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Hadir", value: statusCounts.hadir, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
          { label: "Izin", value: statusCounts.izin, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
          { label: "Sakit", value: statusCounts.sakit, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
          { label: "Alfa", value: statusCounts.alfa, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-0 shadow-card">
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                {totalLogs > 0 && <p className="text-[10px] text-muted-foreground">{Math.round((s.value / totalLogs) * 100)}%</p>}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Pie */}
        <Card className="border-0 shadow-card">
          <CardContent className="p-4">
            <h3 className="text-sm font-bold mb-3">Distribusi Status</h3>
            {pieData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Tidak ada data</p>
            ) : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bar trend */}
        <Card className="border-0 shadow-card">
          <CardContent className="p-4">
            <h3 className="text-sm font-bold mb-3">Tren Harian</h3>
            {dailyTrend.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Tidak ada data</p>
            ) : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="hadir" fill={COLORS.hadir} stackId="a" />
                    <Bar dataKey="izin" fill={COLORS.izin} stackId="a" />
                    <Bar dataKey="sakit" fill={COLORS.sakit} stackId="a" />
                    <Bar dataKey="alfa" fill={COLORS.alfa} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-student table */}
      <Card className="border-0 shadow-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-bold">Ringkasan Per Siswa</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-primary/5">
                <th className="p-2 text-left">No</th>
                <th className="p-2 text-left">Nama</th>
                <th className="p-2 text-center">H</th>
                <th className="p-2 text-center">I</th>
                <th className="p-2 text-center">S</th>
                <th className="p-2 text-center">A</th>
                <th className="p-2 text-center">%</th>
              </tr>
            </thead>
            <tbody>
              {studentSummary.map((s, i) => (
                <tr key={i} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-2">{i + 1}</td>
                  <td className="p-2 font-medium">{s.name}</td>
                  <td className="p-2 text-center text-emerald-600 font-bold">{s.hadir || ""}</td>
                  <td className="p-2 text-center text-amber-600 font-bold">{s.izin || ""}</td>
                  <td className="p-2 text-center text-blue-600 font-bold">{s.sakit || ""}</td>
                  <td className="p-2 text-center text-red-600 font-bold">{s.alfa || ""}</td>
                  <td className="p-2 text-center font-bold">{s.total > 0 ? `${Math.round((s.hadir / s.total) * 100)}%` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default WaliKelasHistory;
