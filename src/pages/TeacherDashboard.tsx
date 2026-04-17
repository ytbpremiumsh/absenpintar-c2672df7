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
  PlayCircle, Timer, Activity,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { WeekScheduleCard } from "@/components/dashboard/WeekScheduleCard";

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const DAYS_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

type ScheduleStatus = "upcoming" | "active" | "done";

function getStatus(startTime: string, endTime: string, now: Date): ScheduleStatus {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (currentMinutes >= start && currentMinutes < end) return "active";
  if (currentMinutes >= end) return "done";
  return "upcoming";
}

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
  const [now, setNow] = useState(new Date());

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
  const todayDay = today.getDay();

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

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

  // Stats
  const activeCount = todaySchedules.filter(s => getStatus(s.start_time, s.end_time, now) === "active").length;
  const upcomingCount = todaySchedules.filter(s => getStatus(s.start_time, s.end_time, now) === "upcoming").length;
  const doneCount = todaySchedules.filter(s => getStatus(s.start_time, s.end_time, now) === "done").length;
  const totalSubjects = new Set(schedules.map(s => s.subject_id)).size;
  const totalClasses = new Set(schedules.map(s => s.class_id)).size;

  const openAttendance = async (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setAttendanceDialog(true);
    setLoadingStudents(true);

    const className = schedule.class_name;
    const { data: studentData } = await supabase
      .from("students")
      .select("id, name, student_id, class, photo_url")
      .eq("school_id", schoolId!)
      .eq("class", className)
      .order("name");

    const studentsList = studentData || [];
    setStudents(studentsList);

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

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Jadwal Hari Ini", value: todaySchedules.length, icon: Calendar, gradient: "from-primary/10 to-primary/5", iconColor: "text-primary" },
          { label: "Sedang Berlangsung", value: activeCount, icon: PlayCircle, gradient: "from-emerald-500/10 to-emerald-500/5", iconColor: "text-emerald-600" },
          { label: "Mata Pelajaran", value: totalSubjects, icon: BookOpen, gradient: "from-violet-500/10 to-violet-500/5", iconColor: "text-violet-600" },
          { label: "Total Kelas", value: totalClasses, icon: Users, gradient: "from-amber-500/10 to-amber-500/5", iconColor: "text-amber-600" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-0 shadow-card overflow-hidden">
              <CardContent className={cn("p-4 bg-gradient-to-br", stat.gradient)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium">{stat.label}</p>
                    <p className="text-2xl font-bold mt-0.5">{stat.value}</p>
                  </div>
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center bg-background/60 backdrop-blur-sm", stat.iconColor)}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Today's Schedule - Timeline Style */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            Jadwal Hari Ini
          </h2>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> {activeCount} aktif</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> {upcomingCount} akan datang</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> {doneCount} selesai</span>
          </div>
        </div>

        {todaySchedules.length === 0 ? (
          <Card className="border-0 shadow-card">
            <CardContent className="p-8 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Tidak ada jadwal mengajar hari ini</p>
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border hidden sm:block" />

            <div className="space-y-3">
              <AnimatePresence>
                {todaySchedules.map((s, i) => {
                  const status = getStatus(s.start_time, s.end_time, now);
                  const currentMin = now.getHours() * 60 + now.getMinutes();
                  const start = timeToMinutes(s.start_time);
                  const end = timeToMinutes(s.end_time);
                  const progress = status === "active" ? Math.min(100, Math.max(0, ((currentMin - start) / (end - start)) * 100)) : status === "done" ? 100 : 0;

                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex gap-3 sm:gap-4"
                    >
                      {/* Timeline dot */}
                      <div className="hidden sm:flex flex-col items-center pt-5 shrink-0">
                        <div className={cn(
                          "h-[10px] w-[10px] rounded-full border-2 z-10",
                          status === "active" && "border-emerald-500 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]",
                          status === "done" && "border-muted-foreground/40 bg-muted-foreground/40",
                          status === "upcoming" && "border-amber-500 bg-background",
                        )} />
                      </div>

                      {/* Card */}
                      <Card
                        className={cn(
                          "flex-1 border shadow-card transition-all cursor-pointer group hover:shadow-elevated",
                          status === "active" && "border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 to-transparent ring-1 ring-emerald-500/20",
                          status === "done" && "opacity-60 border-border",
                          status === "upcoming" && "border-amber-500/20 hover:border-amber-500/40",
                        )}
                        onClick={() => openAttendance(s)}
                      >
                        <CardContent className="p-0">
                          <div className="flex flex-col sm:flex-row sm:items-center">
                            {/* Time block */}
                            <div className={cn(
                              "px-4 py-3 sm:py-4 sm:w-[130px] shrink-0 flex sm:flex-col items-center sm:items-start gap-2 sm:gap-0.5 border-b sm:border-b-0 sm:border-r",
                              status === "active" ? "border-emerald-500/20" : "border-border/50"
                            )}>
                              <span className={cn(
                                "text-lg sm:text-xl font-bold font-mono",
                                status === "active" && "text-emerald-600 dark:text-emerald-400",
                                status === "done" && "text-muted-foreground",
                              )}>
                                {s.start_time.slice(0, 5)}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-mono">
                                s/d {s.end_time.slice(0, 5)}
                              </span>
                            </div>

                            {/* Main content */}
                            <div className="flex-1 px-4 py-3 sm:py-4">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: s.subject_color }} />
                                  <span className="font-bold text-sm">{s.subject_name}</span>
                                  {status === "active" && (
                                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[9px] h-5 px-1.5 gap-0.5 animate-pulse">
                                      <PlayCircle className="h-2.5 w-2.5" /> Berlangsung
                                    </Badge>
                                  )}
                                  {status === "upcoming" && (
                                    <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[9px] h-5 px-1.5">
                                      <Timer className="h-2.5 w-2.5 mr-0.5" /> Akan Datang
                                    </Badge>
                                  )}
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                              </div>

                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Kelas {s.class_name}</span>
                                {s.room && <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> Ruang {s.room}</span>}
                              </div>

                              {/* Progress bar for active */}
                              {status === "active" && (
                                <div className="mt-2.5">
                                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                                    <span>Progress</span>
                                    <span>{Math.round(progress)}%</span>
                                  </div>
                                  <div className="h-1.5 rounded-full bg-emerald-500/15 overflow-hidden">
                                    <motion.div
                                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${progress}%` }}
                                      transition={{ duration: 1 }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Action button */}
                            <div className="px-4 pb-3 sm:pb-0 sm:pr-4 shrink-0">
                              <Button
                                size="sm"
                                className={cn(
                                  "text-xs rounded-xl w-full sm:w-auto",
                                  status === "active"
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                                )}
                              >
                                {status === "done" ? "Lihat Absensi" : "Absensi Mapel"}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </motion.div>

      {/* Full Week Schedule — Mobile App Style */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <WeekScheduleCard
          weekSchedules={weekSchedules}
          todayDay={todayDay}
          now={now}
          totalSessions={schedules.length}
          onSelectSchedule={openAttendance}
        />
      </motion.div>

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
