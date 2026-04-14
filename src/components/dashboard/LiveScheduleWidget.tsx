import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Radio, PlayCircle, Timer, CheckCircle2, Clock, Users, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

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

type ScheduleStatus = "upcoming" | "active" | "done";

function getStatus(startTime: string, endTime: string, now: Date): ScheduleStatus {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (currentMinutes >= start && currentMinutes < end) return "active";
  if (currentMinutes >= end) return "done";
  return "upcoming";
}

export function LiveScheduleWidget({ schoolId }: { schoolId: string }) {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [now, setNow] = useState(new Date());
  const [currentSlide, setCurrentSlide] = useState(0);

  const jsDay = now.getDay();
  const todayIdx = jsDay === 0 ? 6 : jsDay - 1;

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    Promise.all([
      supabase.from("teaching_schedules").select("id, teacher_id, subject_id, class_id, day_of_week, start_time, end_time, room").eq("school_id", schoolId).eq("is_active", true),
      supabase.from("subjects").select("id, name, color").eq("school_id", schoolId),
      supabase.from("classes").select("id, name").eq("school_id", schoolId),
      supabase.from("profiles").select("user_id, full_name").eq("school_id", schoolId),
    ]).then(([sr, subr, cr, tr]) => {
      if (sr.data) setSchedules(sr.data);
      if (subr.data) setSubjects(subr.data);
      if (cr.data) setClasses(cr.data);
      if (tr.data) setTeachers(tr.data);
    });
  }, [schoolId]);

  const getTeacherName = (id: string) => teachers.find((t) => t.user_id === id)?.full_name || "—";
  const getSubjectName = (id: string) => subjects.find((s) => s.id === id)?.name || "—";
  const getSubjectColor = (id: string) => subjects.find((s) => s.id === id)?.color || "#3B82F6";
  const getClassName = (id: string) => classes.find((c) => c.id === id)?.name || "—";

  const todaySchedules = useMemo(() => {
    return schedules
      .filter((s) => s.day_of_week === todayIdx)
      .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
  }, [schedules, todayIdx]);

  const activeCount = todaySchedules.filter((s) => getStatus(s.start_time, s.end_time, now) === "active").length;
  const upcomingCount = todaySchedules.filter((s) => getStatus(s.start_time, s.end_time, now) === "upcoming").length;
  const doneCount = todaySchedules.filter((s) => getStatus(s.start_time, s.end_time, now) === "done").length;

  // Auto-advance carousel
  useEffect(() => {
    if (todaySchedules.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((p) => (p + 1) % todaySchedules.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [todaySchedules.length]);

  if (todaySchedules.length === 0) return null;

  const current = todaySchedules[currentSlide];
  if (!current) return null;
  const status = getStatus(current.start_time, current.end_time, now);

  return (
    <Card className="rounded-2xl border border-border/60 shadow-sm overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Radio className="h-4 w-4 text-green-500 animate-pulse" />
            Jadwal Live Hari Ini
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs h-7 text-primary" onClick={() => navigate("/live-schedule")}>
            Lihat Semua
          </Button>
        </div>
        {/* Mini stats */}
        <div className="flex gap-3 text-[11px] text-muted-foreground mt-1">
          <span className="flex items-center gap-1"><PlayCircle className="h-3 w-3 text-green-500" />{activeCount} aktif</span>
          <span className="flex items-center gap-1"><Timer className="h-3 w-3 text-amber-500" />{upcomingCount} akan datang</span>
          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-muted-foreground" />{doneCount} selesai</span>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {/* Carousel slide */}
        <div className={cn(
          "rounded-xl p-3 border transition-all",
          status === "active" && "border-green-500/30 bg-green-500/5",
          status === "done" && "border-border bg-muted/30 opacity-60",
          status === "upcoming" && "border-amber-500/20 bg-amber-500/5"
        )}>
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center shrink-0">
              <div className={cn("text-sm font-bold font-mono", status === "active" ? "text-green-600" : "text-foreground")}>
                {current.start_time.slice(0, 5)}
              </div>
              <div className="h-4 w-px bg-border my-0.5" />
              <div className="text-xs font-mono text-muted-foreground">{current.end_time.slice(0, 5)}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: getSubjectColor(current.subject_id) }} />
                <h4 className={cn("font-bold text-sm truncate", status === "active" && "text-green-700 dark:text-green-400")}>
                  {getSubjectName(current.subject_id)}
                </h4>
                {status === "active" && (
                  <Badge className="bg-green-500/15 text-green-600 border-green-500/30 gap-0.5 text-[10px] h-5 px-1.5">
                    <PlayCircle className="h-2.5 w-2.5" />Live
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{getTeacherName(current.teacher_id)}</span>
                <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{getClassName(current.class_id)}</span>
              </div>
              {status === "active" && (() => {
                const currentMin = now.getHours() * 60 + now.getMinutes();
                const start = timeToMinutes(current.start_time);
                const end = timeToMinutes(current.end_time);
                const progress = Math.min(100, Math.max(0, ((currentMin - start) / (end - start)) * 100));
                return (
                  <div className="mt-2">
                    <div className="h-1 rounded-full bg-green-500/20 overflow-hidden">
                      <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Carousel navigation */}
        {todaySchedules.length > 1 && (
          <div className="flex items-center justify-between mt-2">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentSlide((p) => (p === 0 ? todaySchedules.length - 1 : p - 1))}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <div className="flex gap-1">
              {todaySchedules.map((_, i) => (
                <button key={i} onClick={() => setCurrentSlide(i)}
                  className={cn("h-1.5 rounded-full transition-all", i === currentSlide ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30")} />
              ))}
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentSlide((p) => (p + 1) % todaySchedules.length)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
