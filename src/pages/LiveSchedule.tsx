import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { Clock, BookOpen, Users, MapPin, CheckCircle2, PlayCircle, Timer, Coffee, Radio, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const DAYS_SHORT = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

interface Schedule {
  id: string;
  teacher_id: string;
  subject_id: string;
  class_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
}

interface Subject { id: string; name: string; color: string | null; }
interface ClassData { id: string; name: string; }
interface TeacherProfile { user_id: string; full_name: string; }

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(t: string) {
  return t.slice(0, 5);
}

type ScheduleStatus = "upcoming" | "active" | "done";

function getStatus(startTime: string, endTime: string, now: Date, isToday: boolean): ScheduleStatus {
  if (!isToday) return "upcoming";
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (currentMinutes >= start && currentMinutes < end) return "active";
  if (currentMinutes >= end) return "done";
  return "upcoming";
}

function StatusBadge({ status, startTime, now, isToday }: { status: ScheduleStatus; startTime: string; now: Date; isToday: boolean }) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const start = timeToMinutes(startTime);
  const minutesUntil = start - currentMinutes;

  if (status === "active") return (
    <Badge className="bg-green-500/15 text-green-600 border-green-500/30 gap-1 animate-pulse">
      <PlayCircle className="h-3 w-3" />Berlangsung
    </Badge>
  );
  if (status === "done") return (
    <Badge variant="secondary" className="gap-1 opacity-60">
      <CheckCircle2 className="h-3 w-3" />Selesai
    </Badge>
  );
  if (isToday && minutesUntil <= 15 && minutesUntil > 0) return (
    <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 gap-1">
      <Timer className="h-3 w-3" />{minutesUntil} menit lagi
    </Badge>
  );
  return (
    <Badge variant="outline" className="gap-1">
      <Clock className="h-3 w-3" />Akan Datang
    </Badge>
  );
}

/** Get the date for a specific day_of_week index relative to the current week */
function getDateForDay(dayIdx: number, now: Date): Date {
  const jsDay = now.getDay(); // 0=Sun
  const todayIdx = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon
  const diff = dayIdx - todayIdx;
  const d = new Date(now);
  d.setDate(d.getDate() + diff);
  return d;
}

function formatIndonesianDate(d: Date): string {
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function LiveSchedule() {
  const { profile } = useAuth();
  const schoolId = profile?.school_id;
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [filterTeacher, setFilterTeacher] = useState<string>("all");
  const [filterClass, setFilterClass] = useState<string>("all");

  const jsDay = now.getDay();
  const todayIdx = jsDay === 0 ? 6 : jsDay - 1;
  const [selectedDay, setSelectedDay] = useState(todayIdx);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    const load = async () => {
      setLoading(true);
      const [sr, subr, cr, tr] = await Promise.all([
        supabase.from("teaching_schedules").select("id, teacher_id, subject_id, class_id, day_of_week, start_time, end_time, room").eq("school_id", schoolId).eq("is_active", true),
        supabase.from("subjects").select("id, name, color").eq("school_id", schoolId),
        supabase.from("classes").select("id, name").eq("school_id", schoolId),
        supabase.from("profiles").select("user_id, full_name").eq("school_id", schoolId),
      ]);
      if (sr.data) setSchedules(sr.data);
      if (subr.data) setSubjects(subr.data);
      if (cr.data) setClasses(cr.data);
      if (tr.data) setTeachers(tr.data);
      setLoading(false);
    };
    load();
  }, [schoolId]);

  const getTeacherName = (id: string) => teachers.find((t) => t.user_id === id)?.full_name || "—";
  const getSubjectName = (id: string) => subjects.find((s) => s.id === id)?.name || "—";
  const getSubjectColor = (id: string) => subjects.find((s) => s.id === id)?.color || "#3B82F6";
  const getClassName = (id: string) => classes.find((c) => c.id === id)?.name || "—";

  const isToday = selectedDay === todayIdx;
  const selectedDate = getDateForDay(selectedDay, now);

  const daySchedules = useMemo(() => {
    let filtered = schedules.filter((s) => s.day_of_week === selectedDay);
    if (filterTeacher !== "all") filtered = filtered.filter((s) => s.teacher_id === filterTeacher);
    if (filterClass !== "all") filtered = filtered.filter((s) => s.class_id === filterClass);
    return filtered.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
  }, [schedules, selectedDay, filterTeacher, filterClass]);

  const activeCount = daySchedules.filter((s) => getStatus(s.start_time, s.end_time, now, isToday) === "active").length;
  const doneCount = daySchedules.filter((s) => getStatus(s.start_time, s.end_time, now, isToday) === "done").length;
  const upcomingCount = daySchedules.filter((s) => getStatus(s.start_time, s.end_time, now, isToday) === "upcoming").length;

  const dayCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let d = 0; d < 7; d++) {
      counts[d] = schedules.filter((s) => s.day_of_week === d).length;
    }
    return counts;
  }, [schedules]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <PageHeader icon={Radio} title="Jadwal Live" subtitle="Memuat data..." />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <PageHeader
        icon={Radio}
        title="Jadwal Live"
        subtitle={`${formatIndonesianDate(now)} — ${now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`}
      />

      {/* Day selector with dates */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {DAYS.map((day, idx) => {
            const dayDate = getDateForDay(idx, now);
            return (
              <button
                key={idx}
                onClick={() => setSelectedDay(idx)}
                className={cn(
                  "snap-start shrink-0 flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-xl border transition-all min-w-[68px]",
                  selectedDay === idx
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : idx === todayIdx
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-card border-border hover:bg-accent"
                )}
              >
                <span className="text-xs font-medium">{DAYS_SHORT[idx]}</span>
                <span className="text-lg font-bold">{dayDate.getDate()}</span>
                <span className="text-[10px] opacity-70">
                  {dayDate.toLocaleDateString("id-ID", { month: "short" })}
                </span>
                {idx === todayIdx && selectedDay !== idx && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats cards */}
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
        <Card className="border-green-500/30 bg-green-500/5 shrink-0 min-w-[120px] flex-1">
          <CardContent className="p-3 text-center">
            <PlayCircle className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
            <p className="text-[11px] text-muted-foreground">Berlangsung</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30 bg-amber-500/5 shrink-0 min-w-[120px] flex-1">
          <CardContent className="p-3 text-center">
            <Timer className="h-5 w-5 mx-auto text-amber-500 mb-1" />
            <p className="text-2xl font-bold text-amber-600">{upcomingCount}</p>
            <p className="text-[11px] text-muted-foreground">Akan Datang</p>
          </CardContent>
        </Card>
        <Card className="border-muted bg-muted/30 shrink-0 min-w-[120px] flex-1">
          <CardContent className="p-3 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{doneCount}</p>
            <p className="text-[11px] text-muted-foreground">Selesai</p>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5 shrink-0 min-w-[120px] flex-1">
          <CardContent className="p-3 text-center">
            <BookOpen className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold text-primary">{daySchedules.length}</p>
            <p className="text-[11px] text-muted-foreground">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Header for selected day with full Indonesian date */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDay((p) => (p === 0 ? 6 : p - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              {DAYS[selectedDay]}
              {isToday && <Badge variant="outline" className="text-[10px]">Hari Ini</Badge>}
            </h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {formatIndonesianDate(selectedDate)}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDay((p) => (p === 6 ? 0 : p + 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {!isToday && (
          <Button variant="outline" size="sm" onClick={() => setSelectedDay(todayIdx)} className="text-xs">
            Kembali ke Hari Ini
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={filterTeacher} onValueChange={setFilterTeacher}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Semua Guru" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Guru</SelectItem>
            {teachers.map((t) => <SelectItem key={t.user_id} value={t.user_id}>{t.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kelas</SelectItem>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Timeline */}
      {daySchedules.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <Coffee className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Tidak ada jadwal di hari {DAYS[selectedDay]}</p>
          <p className="text-sm">Hari libur atau tidak ada jadwal yang terdaftar</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {daySchedules.map((s) => {
            const status = getStatus(s.start_time, s.end_time, now, isToday);
            const isActive = status === "active";
            return (
              <Card key={s.id} className={cn(
                "transition-all duration-300",
                isActive && "ring-2 ring-green-500/50 shadow-lg shadow-green-500/10 border-green-500/30",
                status === "done" && "opacity-50"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center shrink-0">
                      <div className={cn("text-lg font-bold font-mono", isActive ? "text-green-600" : "text-foreground")}>
                        {formatTime(s.start_time)}
                      </div>
                      <div className="h-6 w-px bg-border my-1" />
                      <div className="text-sm font-mono text-muted-foreground">{formatTime(s.end_time)}</div>
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: getSubjectColor(s.subject_id) }} />
                          <h4 className={cn("font-bold text-base", isActive && "text-green-700 dark:text-green-400")}>
                            {getSubjectName(s.subject_id)}
                          </h4>
                        </div>
                        <StatusBadge status={status} startTime={s.start_time} now={now} isToday={isToday} />
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />{getTeacherName(s.teacher_id)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5" />{getClassName(s.class_id)}
                        </span>
                        {s.room && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />{s.room}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {isActive && (() => {
                    const currentMin = now.getHours() * 60 + now.getMinutes();
                    const start = timeToMinutes(s.start_time);
                    const end = timeToMinutes(s.end_time);
                    const progress = Math.min(100, Math.max(0, ((currentMin - start) / (end - start)) * 100));
                    return (
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>Progress</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-green-500/20 overflow-hidden">
                          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
