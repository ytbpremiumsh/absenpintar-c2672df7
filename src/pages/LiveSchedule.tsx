import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { Clock, BookOpen, Users, MapPin, CheckCircle2, PlayCircle, Timer, Coffee, Radio, ChevronLeft, ChevronRight, CalendarDays, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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

const GRADIENTS = [
  { from: "from-violet-500", to: "to-fuchsia-500", solid: "bg-violet-500", text: "text-violet-600", soft: "bg-violet-500/10", border: "border-violet-500/30" },
  { from: "from-amber-400", to: "to-orange-500", solid: "bg-amber-500", text: "text-amber-600", soft: "bg-amber-500/10", border: "border-amber-500/30" },
  { from: "from-sky-500", to: "to-blue-600", solid: "bg-sky-500", text: "text-sky-600", soft: "bg-sky-500/10", border: "border-sky-500/30" },
  { from: "from-emerald-500", to: "to-teal-600", solid: "bg-emerald-500", text: "text-emerald-600", soft: "bg-emerald-500/10", border: "border-emerald-500/30" },
  { from: "from-pink-500", to: "to-rose-500", solid: "bg-pink-500", text: "text-pink-600", soft: "bg-pink-500/10", border: "border-pink-500/30" },
  { from: "from-indigo-500", to: "to-purple-600", solid: "bg-indigo-500", text: "text-indigo-600", soft: "bg-indigo-500/10", border: "border-indigo-500/30" },
];

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

function getDateForDay(dayIdx: number, now: Date): Date {
  const jsDay = now.getDay();
  const todayIdx = jsDay === 0 ? 6 : jsDay - 1;
  const diff = dayIdx - todayIdx;
  const d = new Date(now);
  d.setDate(d.getDate() + diff);
  return d;
}

function formatIndonesianDate(d: Date): string {
  return d.toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
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

  // Featured = active first, else next upcoming
  const featuredIdx = useMemo(() => {
    const active = daySchedules.findIndex(s => getStatus(s.start_time, s.end_time, now, isToday) === "active");
    if (active !== -1) return active;
    const upcoming = daySchedules.findIndex(s => getStatus(s.start_time, s.end_time, now, isToday) === "upcoming");
    return upcoming;
  }, [daySchedules, now, isToday]);

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
    <div className="space-y-5">
      {/* Premium hero header */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary via-primary to-[#4c5ded] text-white shadow-elevated">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute top-10 right-32 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
        <svg className="absolute top-0 right-0 opacity-10 pointer-events-none" width="200" height="200" viewBox="0 0 200 200" fill="none">
          <pattern id="dots-page" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="white" />
          </pattern>
          <rect width="200" height="200" fill="url(#dots-page)" />
        </svg>

        <div className="relative z-10 px-5 sm:px-7 pt-5 sm:pt-6 pb-6">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider opacity-80">{formatIndonesianDate(now)}</p>
              <h1 className="text-2xl sm:text-3xl font-bold mt-0.5 flex items-center gap-2.5">
                <span className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
                  <Radio className="h-5 w-5 animate-pulse" />
                </span>
                Jadwal Live
              </h1>
              <p className="text-white/80 text-sm mt-1">{now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB</p>
            </div>
          </div>

          {/* Day pills */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mt-5">
            {DAYS.map((day, idx) => {
              const dayDate = getDateForDay(idx, now);
              const isSelected = selectedDay === idx;
              const isCurrent = idx === todayIdx;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDay(idx)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-2 sm:py-2.5 rounded-2xl transition-all relative",
                    isSelected
                      ? "bg-white text-primary shadow-lg scale-105 font-bold"
                      : "bg-white/10 text-white hover:bg-white/20 backdrop-blur"
                  )}
                >
                  <span className={cn("text-[9px] sm:text-[10px] font-bold uppercase", isSelected ? "opacity-70" : "opacity-80")}>
                    {DAYS_SHORT[idx]}
                  </span>
                  <span className="text-base sm:text-lg font-bold leading-none">
                    {dayDate.getDate()}
                  </span>
                  {isCurrent && !isSelected && (
                    <span className="absolute top-1 right-1.5 h-1.5 w-1.5 rounded-full bg-amber-300" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Stat pills */}
          <div className="flex gap-2 flex-wrap mt-4">
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur border border-white/20 rounded-full px-3 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-300 opacity-75" />
                <span className="relative rounded-full h-2 w-2 bg-emerald-300" />
              </span>
              <span className="text-xs font-bold">{activeCount} Berlangsung</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur border border-white/20 rounded-full px-3 py-1.5">
              <Timer className="h-3.5 w-3.5" />
              <span className="text-xs font-bold">{upcomingCount} Akan Datang</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur border border-white/20 rounded-full px-3 py-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="text-xs font-bold">{doneCount} Selesai</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur border border-white/20 rounded-full px-3 py-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-xs font-bold">{daySchedules.length} Total</span>
            </div>
          </div>
        </div>
      </div>

      {/* Header for selected day */}
      <div className="flex items-center justify-between flex-wrap gap-2">
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
          <SelectTrigger className="w-full sm:w-48 rounded-xl"><SelectValue placeholder="Semua Guru" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Guru</SelectItem>
            {teachers.map((t) => <SelectItem key={t.user_id} value={t.user_id}>{t.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-full sm:w-48 rounded-xl"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kelas</SelectItem>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Premium colorful timeline */}
      {daySchedules.length === 0 ? (
        <Card className="rounded-2xl border border-border/40">
          <CardContent className="p-10 text-center text-muted-foreground">
            <div className="h-16 w-16 rounded-full bg-muted/40 flex items-center justify-center mx-auto mb-3">
              <Coffee className="h-7 w-7 opacity-50" />
            </div>
            <p className="font-semibold text-foreground">Tidak ada jadwal di hari {DAYS[selectedDay]}</p>
            <p className="text-sm mt-1">Hari libur atau tidak ada jadwal yang terdaftar</p>
          </CardContent>
        </Card>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedDay}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-2.5"
          >
            {daySchedules.map((s, idx) => {
              const status = getStatus(s.start_time, s.end_time, now, isToday);
              const palette = GRADIENTS[idx % GRADIENTS.length];
              const isFeatured = idx === featuredIdx && isToday;
              const isActive = status === "active";
              const isDone = status === "done";

              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="flex gap-3"
                >
                  {/* Time column */}
                  <div className="flex flex-col items-end shrink-0 pt-3 w-14 sm:w-16">
                    <span className={cn(
                      "text-sm font-bold font-mono tabular-nums",
                      isActive ? "text-emerald-600" : "text-foreground"
                    )}>
                      {formatTime(s.start_time)}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {formatTime(s.end_time)}
                    </span>
                  </div>

                  {/* Vertical rail */}
                  <div className="flex flex-col items-center pt-4 shrink-0">
                    <div className={cn(
                      "h-3 w-3 rounded-full ring-4 ring-background relative z-10",
                      palette.solid,
                      isActive && "shadow-[0_0_0_5px_rgba(16,185,129,0.25)]",
                      isDone && "opacity-40"
                    )}>
                      {isActive && (
                        <span className="absolute inset-0 rounded-full animate-ping bg-emerald-400 opacity-60" />
                      )}
                    </div>
                    {idx < daySchedules.length - 1 && (
                      <div className="w-px flex-1 bg-border/60 mt-1.5" style={{ minHeight: 32 }} />
                    )}
                  </div>

                  {/* Card */}
                  <div className={cn(
                    "flex-1 rounded-2xl p-4 transition-all relative overflow-hidden border",
                    isActive
                      ? `bg-gradient-to-r ${palette.from} ${palette.to} text-white shadow-xl border-transparent`
                      : isDone
                        ? "bg-muted/30 border-border/30 opacity-70"
                        : isFeatured
                          ? `bg-gradient-to-r ${palette.from} ${palette.to} text-white shadow-lg border-transparent`
                          : `${palette.soft} ${palette.border}`,
                  )}>
                    {(isActive || isFeatured) && (
                      <>
                        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/15 blur-2xl pointer-events-none" />
                        <div className="absolute -left-4 -bottom-8 h-20 w-20 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                      </>
                    )}

                    <div className="relative z-10 flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <h4 className={cn(
                          "font-bold text-base sm:text-lg leading-tight",
                          (isActive || isFeatured) ? "text-white" : isDone ? "text-muted-foreground line-through" : palette.text
                        )}>
                          {getSubjectName(s.subject_id)}
                        </h4>
                      </div>
                      {isActive && (
                        <Badge className="bg-white/25 backdrop-blur text-white border-white/30 text-[10px] font-bold gap-1 animate-pulse shrink-0">
                          <PlayCircle className="h-3 w-3" /> LIVE
                        </Badge>
                      )}
                      {isDone && (
                        <Badge variant="secondary" className="text-[10px] gap-1 shrink-0">
                          <CheckCircle2 className="h-3 w-3" /> Selesai
                        </Badge>
                      )}
                      {!isActive && !isDone && isFeatured && (
                        <Badge className="bg-white/25 backdrop-blur text-white border-white/30 text-[10px] font-bold gap-1 shrink-0">
                          <Timer className="h-3 w-3" /> Berikutnya
                        </Badge>
                      )}
                      {!isActive && !isDone && !isFeatured && isToday && (() => {
                        const cMin = now.getHours() * 60 + now.getMinutes();
                        const m = timeToMinutes(s.start_time) - cMin;
                        if (m > 0 && m <= 30) {
                          return (
                            <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px] gap-1 shrink-0">
                              <Clock className="h-3 w-3" /> {m} mnt lagi
                            </Badge>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    <div className={cn(
                      "relative z-10 flex flex-wrap gap-x-3 gap-y-1.5 text-xs sm:text-sm",
                      (isActive || isFeatured) ? "text-white/95" : "text-muted-foreground"
                    )}>
                      <span className={cn(
                        "flex items-center gap-1.5 font-semibold px-2 py-0.5 rounded-md",
                        (isActive || isFeatured) ? "bg-white/20" : "bg-background/60 text-foreground"
                      )}>
                        <Users className="h-3.5 w-3.5" />
                        {getTeacherName(s.teacher_id)}
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

                    {/* Live progress */}
                    {isActive && (() => {
                      const currentMin = now.getHours() * 60 + now.getMinutes();
                      const start = timeToMinutes(s.start_time);
                      const end = timeToMinutes(s.end_time);
                      const progress = Math.min(100, Math.max(0, ((currentMin - start) / (end - start)) * 100));
                      return (
                        <div className="relative z-10 mt-3 space-y-1">
                          <div className="flex justify-between text-[11px] text-white/90">
                            <span className="font-medium">Progress kelas</span>
                            <span className="font-bold tabular-nums">{Math.round(progress)}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
