import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  GraduationCap, Calendar, Clock, Users, BookOpen,
  CheckCircle, XCircle, AlertCircle, Loader2, ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

interface Schedule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  class_id: string;
  subject_id: string;
  class_name?: string;
  subject_name?: string;
  subject_color?: string;
}

interface Student {
  id: string;
  name: string;
  student_id: string;
  class: string;
  photo_url: string | null;
}

const TeacherDashboard = () => {
  const { user, profile } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Attendance modal state
  const [attendanceDialog, setAttendanceDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});
  const [existingAttendance, setExistingAttendance] = useState<Record<string, string>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const schoolId = profile?.school_id;
  const today = new Date();
  const todayDay = today.getDay(); // 0=Sunday

  useEffect(() => {
    if (!schoolId || !user) return;
    const fetchData = async () => {
      const [schedulesRes, classesRes, subjectsRes] = await Promise.all([
        supabase.from("teaching_schedules").select("*").eq("school_id", schoolId).eq("teacher_id", user.id).eq("is_active", true),
        supabase.from("classes").select("id, name").eq("school_id", schoolId),
        supabase.from("subjects").select("id, name, color").eq("school_id", schoolId),
      ]);

      const classMap = Object.fromEntries((classesRes.data || []).map(c => [c.id, c]));
      const subjectMap = Object.fromEntries((subjectsRes.data || []).map(s => [s.id, s]));

      setClasses(classesRes.data || []);
      setSubjects(subjectsRes.data || []);

      const enriched = (schedulesRes.data || []).map(s => ({
        ...s,
        class_name: classMap[s.class_id]?.name || "-",
        subject_name: subjectMap[s.subject_id]?.name || "-",
        subject_color: subjectMap[s.subject_id]?.color || "#3B82F6",
      }));

      setSchedules(enriched);
      setLoading(false);
    };
    fetchData();
  }, [schoolId, user]);

  const todaySchedules = useMemo(() => {
    return schedules
      .filter(s => s.day_of_week === todayDay)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [schedules, todayDay]);

  const weekSchedules = useMemo(() => {
    const grouped: Record<number, Schedule[]> = {};
    for (let d = 1; d <= 6; d++) grouped[d] = [];
    schedules.forEach(s => {
      if (grouped[s.day_of_week]) grouped[s.day_of_week].push(s);
    });
    Object.values(grouped).forEach(arr => arr.sort((a, b) => a.start_time.localeCompare(b.start_time)));
    return grouped;
  }, [schedules]);

  const openAttendance = async (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setAttendanceDialog(true);
    setLoadingStudents(true);

    // Fetch students in that class
    const className = schedule.class_name;
    const { data: studentData } = await supabase
      .from("students")
      .select("id, name, student_id, class, photo_url")
      .eq("school_id", schoolId!)
      .eq("class", className)
      .order("name");

    const studentsList = studentData || [];
    setStudents(studentsList);

    // Check existing attendance for today
    const todayStr = today.toISOString().split("T")[0];
    const { data: existing } = await supabase
      .from("subject_attendance")
      .select("student_id, status")
      .eq("teaching_schedule_id", schedule.id)
      .eq("date", todayStr);

    const existMap: Record<string, string> = {};
    const attMap: Record<string, string> = {};
    (existing || []).forEach((e: any) => {
      existMap[e.student_id] = e.status;
      attMap[e.student_id] = e.status;
    });

    // Default all to 'hadir' if no existing
    studentsList.forEach(s => {
      if (!attMap[s.id]) attMap[s.id] = "hadir";
    });

    setExistingAttendance(existMap);
    setAttendanceMap(attMap);
    setLoadingStudents(false);
  };

  const handleSaveAttendance = async () => {
    if (!selectedSchedule || !user || !schoolId) return;
    setSavingAttendance(true);

    const todayStr = today.toISOString().split("T")[0];
    const records = students.map(s => ({
      student_id: s.id,
      teaching_schedule_id: selectedSchedule.id,
      school_id: schoolId,
      teacher_id: user.id,
      date: todayStr,
      status: attendanceMap[s.id] || "hadir",
    }));

    // Upsert
    const { error } = await supabase
      .from("subject_attendance")
      .upsert(records, { onConflict: "student_id,teaching_schedule_id,date" });

    if (error) {
      toast.error("Gagal menyimpan absensi: " + error.message);
    } else {
      toast.success(`Absensi ${selectedSchedule.subject_name} berhasil disimpan`);
      setAttendanceDialog(false);
    }
    setSavingAttendance(false);
  };

  const statusOptions = [
    { value: "hadir", label: "Hadir", icon: CheckCircle, color: "text-emerald-600" },
    { value: "izin", label: "Izin", icon: AlertCircle, color: "text-amber-600" },
    { value: "sakit", label: "Sakit", icon: AlertCircle, color: "text-blue-600" },
    { value: "alfa", label: "Alfa", icon: XCircle, color: "text-red-600" },
  ];

  const getStatusBadge = (status: string) => {
    const opt = statusOptions.find(o => o.value === status);
    if (!opt) return null;
    const colors: Record<string, string> = {
      hadir: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
      izin: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
      sakit: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
      alfa: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
    };
    return <Badge className={`${colors[status]} text-[10px] border-0`}>{opt.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={GraduationCap}
        title="Dashboard Guru"
        subtitle={`Selamat datang, ${profile?.full_name || "Guru"} — ${DAYS[todayDay]}, ${today.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`}
      />

      {/* Today's Schedule */}
      <div>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Jadwal Hari Ini — {DAYS[todayDay]}
        </h2>
        {todaySchedules.length === 0 ? (
          <Card className="border-0 shadow-card">
            <CardContent className="p-8 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Tidak ada jadwal mengajar hari ini</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaySchedules.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="border-0 shadow-card hover:shadow-elevated transition-all cursor-pointer group" onClick={() => openAttendance(s)}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.subject_color }} />
                        <span className="font-bold text-sm">{s.subject_name}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        <span>Kelas {s.class_name}</span>
                      </div>
                      {s.room && (
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>Ruang {s.room}</span>
                        </div>
                      )}
                    </div>
                    <Button size="sm" className="w-full mt-3 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-xs rounded-xl">
                      Absensi Mata Pelajaran
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Full Week Schedule */}
      <div>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Jadwal Minggu Ini
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(day => (
            <Card key={day} className={`border-0 shadow-card ${day === todayDay ? "ring-2 ring-primary" : ""}`}>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  {DAYS[day]}
                  {day === todayDay && <Badge className="bg-primary text-primary-foreground text-[9px]">Hari Ini</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {(weekSchedules[day] || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">Tidak ada jadwal</p>
                ) : (
                  <div className="space-y-2">
                    {weekSchedules[day].map(s => (
                      <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 text-xs">
                        <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.subject_color }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{s.subject_name}</p>
                          <p className="text-muted-foreground">Kelas {s.class_name}</p>
                        </div>
                        <span className="text-muted-foreground shrink-0">{s.start_time.slice(0, 5)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Attendance Dialog */}
      <Dialog open={attendanceDialog} onOpenChange={setAttendanceDialog}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Absensi {selectedSchedule?.subject_name} — Kelas {selectedSchedule?.class_name}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              {DAYS[todayDay]}, {today.toLocaleDateString("id-ID")} • {selectedSchedule?.start_time?.slice(0, 5)} - {selectedSchedule?.end_time?.slice(0, 5)}
            </p>
          </DialogHeader>

          {loadingStudents ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground mt-2">Memuat data siswa...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Belum ada siswa di kelas ini</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {students.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/30">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">NIS: {s.student_id}</p>
                    </div>
                    <Select
                      value={attendanceMap[s.id] || "hadir"}
                      onValueChange={(val) => setAttendanceMap(prev => ({ ...prev, [s.id]: val }))}
                    >
                      <SelectTrigger className="w-[100px] h-8 text-xs rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className="flex items-center gap-1.5">
                              <opt.icon className={`h-3 w-3 ${opt.color}`} />
                              {opt.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="flex items-center gap-2 flex-wrap mt-3">
                {statusOptions.map(opt => {
                  const count = Object.values(attendanceMap).filter(v => v === opt.value).length;
                  return (
                    <Badge key={opt.value} variant="secondary" className="text-[10px]">
                      {opt.label}: {count}
                    </Badge>
                  );
                })}
              </div>

              <Button
                onClick={handleSaveAttendance}
                disabled={savingAttendance}
                className="w-full mt-2 bg-primary hover:bg-primary/90 rounded-xl"
              >
                {savingAttendance ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyimpan...</>
                ) : (
                  <><CheckCircle className="h-4 w-4 mr-2" /> Simpan Absensi</>
                )}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherDashboard;
