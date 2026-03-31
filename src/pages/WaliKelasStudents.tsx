import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Users, Phone, User, GraduationCap, ChevronRight, Mail, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/PageHeader";


interface Student {
  id: string;
  name: string;
  student_id: string;
  class: string;
  gender: string;
  photo_url: string | null;
  parent_name: string;
  parent_phone: string;
}

interface AttendanceLog {
  id: string;
  date: string;
  time: string;
  status: string;
  method: string;
}

const WaliKelasStudents = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<{ class_name: string; school_id: string }[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<Record<string, { hadir: number; izin: number; sakit: number; alfa: number; total: number }>>({});

  useEffect(() => {
    if (!user) return;
    supabase.from("class_teachers").select("class_name, school_id").eq("user_id", user.id)
      .then(({ data }) => {
        setAssignments(data || []);
        if (data && data.length > 0) setSelectedClass(data[0].class_name);
      });
  }, [user]);

  useEffect(() => {
    if (!assignments.length || !selectedClass) { setLoading(false); return; }
    const fetchData = async () => {
      setLoading(true);
      const schoolId = assignments[0].school_id;

      const { data: studentData } = await supabase
        .from("students").select("id, name, student_id, class, gender, photo_url, parent_name, parent_phone")
        .eq("school_id", schoolId).eq("class", selectedClass).order("name");

      setStudents(studentData || []);

      if (studentData && studentData.length > 0) {
        const ids = studentData.map(s => s.id);
        const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
        const { data: logs } = await supabase
          .from("attendance_logs").select("student_id, status")
          .eq("school_id", schoolId).gte("date", thirtyAgo).in("student_id", ids);

        const summary: Record<string, { hadir: number; izin: number; sakit: number; alfa: number; total: number }> = {};
        (logs || []).forEach(l => {
          if (!summary[l.student_id]) summary[l.student_id] = { hadir: 0, izin: 0, sakit: 0, alfa: 0, total: 0 };
          summary[l.student_id].total++;
          const s = l.status as keyof typeof summary[string];
          if (s in summary[l.student_id]) (summary[l.student_id] as any)[s]++;
        });
        setAttendanceSummary(summary);
      }
      setLoading(false);
    };
    fetchData();
  }, [assignments, selectedClass]);

  const filtered = useMemo(() => {
    if (!search) return students;
    const q = search.toLowerCase();
    return students.filter(s => s.name.toLowerCase().includes(q) || s.student_id.toLowerCase().includes(q) || s.parent_name.toLowerCase().includes(q));
  }, [students, search]);

  const classNames = assignments.map(a => a.class_name);

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Memuat data...</div>;
  }

  if (assignments.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Users} title="Siswa Kelas Saya" subtitle="Data siswa dan wali murid kelas yang Anda ampu" />
        <Card className="border-0 shadow-card">
          <CardContent className="p-10 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Anda belum ditugaskan sebagai wali kelas.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getRate = (id: string) => {
    const s = attendanceSummary[id];
    if (!s || s.total === 0) return null;
    return Math.round((s.hadir / s.total) * 100);
  };

  return (
    <div className="space-y-5">
      <PageHeader icon={Users} title="Siswa Kelas Saya" subtitle="Data siswa dan wali murid kelas yang Anda ampu" />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Pilih Kelas" />
          </SelectTrigger>
          <SelectContent>
            {classNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari siswa atau wali murid..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-0 shadow-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-primary">{students.length}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Total Siswa</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <User className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-blue-500">{students.filter(s => s.gender === "L").length}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Laki-laki</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center">
              <User className="h-5 w-5 text-pink-500" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-pink-500">{students.filter(s => s.gender === "P").length}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Perempuan</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-success">{selectedClass}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Kelas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student list */}
      <Card className="border-0 shadow-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-bold text-sm text-foreground">Daftar Siswa & Wali Murid</h2>
        </div>
        <div className="divide-y divide-border">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">Tidak ada siswa ditemukan</div>
          ) : (
            filtered.map((s, i) => {
              const rate = getRate(s.id);
              return (
                <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  onClick={() => setSelectedStudent(s)}
                  className="flex items-center gap-3 p-3 hover:bg-secondary/30 transition-colors cursor-pointer">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden ${
                    s.gender === "L" ? "bg-blue-50 text-blue-500 dark:bg-blue-900/30" : "bg-pink-50 text-pink-500 dark:bg-pink-900/30"
                  }`}>
                    {s.photo_url ? <img src={s.photo_url} alt="" className="h-full w-full object-cover rounded-full" /> : s.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground">NIS: {s.student_id} • Wali: {s.parent_name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {rate !== null && (
                      <Badge variant="secondary" className={`text-[10px] ${
                        rate >= 85 ? "bg-success/10 text-success" : rate >= 70 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                      }`}>
                        {rate}%
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </Card>

      {/* Student Detail Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Siswa</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <StudentDetailContent
              student={selectedStudent}
              summary={attendanceSummary[selectedStudent.id]}
              schoolId={assignments[0]?.school_id}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StudentDetailContent = ({
  student,
  summary,
  schoolId,
}: {
  student: Student;
  summary?: { hadir: number; izin: number; sakit: number; alfa: number; total: number };
  schoolId?: string;
}) => {
  const rate = summary && summary.total > 0 ? Math.round((summary.hadir / summary.total) * 100) : null;
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Date range state
  const now = new Date();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(now.toISOString().slice(0, 10));

  useEffect(() => {
    if (!schoolId) return;
    const fetchLogs = async () => {
      setLoadingLogs(true);
      const { data } = await supabase
        .from("attendance_logs")
        .select("id, date, time, status, method")
        .eq("school_id", schoolId)
        .eq("student_id", student.id)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });
      setLogs(data || []);
      setLoadingLogs(false);
    };
    fetchLogs();
  }, [schoolId, student.id, startDate, endDate]);

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { hadir: "Hadir", izin: "Izin", sakit: "Sakit", alfa: "Alfa" };
    return map[s] || s;
  };

  const statusBadgeClass = (s: string) => {
    const map: Record<string, string> = {
      hadir: "bg-success/10 text-success border-success/30",
      izin: "bg-warning/10 text-warning border-warning/30",
      sakit: "bg-blue-100 text-blue-600 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400",
      alfa: "bg-destructive/10 text-destructive border-destructive/30",
    };
    return map[s] || "";
  };

  return (
    <div className="space-y-5">
      {/* Profile */}
      <div className="flex items-center gap-4">
        <div className={`h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0 overflow-hidden ${
          student.gender === "L" ? "bg-blue-50 text-blue-500 dark:bg-blue-900/30" : "bg-pink-50 text-pink-500 dark:bg-pink-900/30"
        }`}>
          {student.photo_url ? <img src={student.photo_url} alt="" className="h-full w-full object-cover rounded-full" /> : student.name.charAt(0)}
        </div>
        <div>
          <h3 className="font-bold text-lg text-foreground">{student.name}</h3>
          <p className="text-sm text-muted-foreground">{student.class} • {student.gender === "L" ? "Laki-laki" : "Perempuan"}</p>
          <p className="text-xs text-muted-foreground">NIS: {student.student_id}</p>
        </div>
      </div>

      {/* Parent Info */}
      <Card className="border border-border">
        <CardContent className="p-4 space-y-3">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Informasi Wali Murid
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-foreground">{student.parent_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <a href={`tel:${student.parent_phone}`} className="text-sm text-primary hover:underline">{student.parent_phone}</a>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <a href={`https://wa.me/${student.parent_phone.replace(/^0/, "62")}`} target="_blank" rel="noreferrer"
                className="text-sm text-success hover:underline">Hubungi via WhatsApp</a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Summary */}
      {summary && summary.total > 0 && (
        <Card className="border border-border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground">Ringkasan 30 Hari</h4>
              {rate !== null && (
                <span className={`text-lg font-extrabold ${rate >= 85 ? "text-success" : rate >= 70 ? "text-warning" : "text-destructive"}`}>
                  {rate}%
                </span>
              )}
            </div>
            <div className="h-3 rounded-full bg-secondary overflow-hidden">
              <div className={`h-full rounded-full transition-all ${rate && rate >= 85 ? "bg-success" : rate && rate >= 70 ? "bg-warning" : "bg-destructive"}`}
                style={{ width: `${rate || 0}%` }} />
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: "Hadir", value: summary.hadir, color: "text-success" },
                { label: "Izin", value: summary.izin, color: "text-warning" },
                { label: "Sakit", value: summary.sakit, color: "text-blue-500" },
                { label: "Alfa", value: summary.alfa, color: "text-destructive" },
              ].map(s => (
                <div key={s.label}>
                  <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance Detail Table with Date Range */}
      <Card className="border border-border">
        <CardContent className="p-4 space-y-3">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" /> Riwayat Absensi
          </h4>
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Dari</label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 text-xs w-36" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Sampai</label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 text-xs w-36" />
            </div>
            <Badge variant="secondary" className="text-[10px] h-8 flex items-center">{logs.length} data</Badge>
          </div>
          {loadingLogs ? (
            <div className="text-center py-4 text-muted-foreground text-sm">Memuat...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">Tidak ada data absensi</div>
          ) : (
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead className="text-xs font-semibold">Tanggal</TableHead>
                    <TableHead className="text-xs font-semibold">Hari</TableHead>
                    <TableHead className="text-xs font-semibold">Jam</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold">Metode</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(l => {
                    const d = new Date(l.date);
                    const dayName = d.toLocaleDateString("id-ID", { weekday: "short" });
                    const dateStr = d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
                    return (
                      <TableRow key={l.id} className="hover:bg-muted/20">
                        <TableCell className="text-xs">{dateStr}</TableCell>
                        <TableCell className="text-xs">{dayName}</TableCell>
                        <TableCell className="text-xs font-mono">{l.time?.slice(0, 5)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${statusBadgeClass(l.status)}`}>
                            {statusLabel(l.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground capitalize">{l.method}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WaliKelasStudents;
