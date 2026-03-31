import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Users, UserCheck, Clock, GraduationCap, Search,
  AlertTriangle, Thermometer, FileText, Activity, FileSpreadsheet,
} from "lucide-react";
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
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<{ class_name: string; school_id: string }[]>([]);
  const [students, setStudents] = useState<StudentWithAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
    const fetchStudentsAndAttendance = async () => {
      const schoolId = assignments[0].school_id;
      const classNames = assignments.map((a) => a.class_name);
      const { data: studentData } = await supabase
        .from("students").select("id, name, student_id, class, photo_url")
        .eq("school_id", schoolId).in("class", classNames).order("class").order("name");

      if (!studentData || studentData.length === 0) { setStudents([]); setLoading(false); return; }

      const studentIds = studentData.map((s) => s.id);
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
      setLoading(false);
    };
    fetchStudentsAndAttendance();
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Wali Kelas</h1>
          <p className="text-muted-foreground text-sm">
            Kelas: {classNames.join(", ")} • {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        {/* Rekap Absensi moved to sidebar */}
      </div>

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
    </div>
  );
};

export default WaliKelasDashboard;
