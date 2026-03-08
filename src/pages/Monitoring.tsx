import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  UserCheck, UserX, Clock, Users, GraduationCap,
  Activity, CheckCircle2, AlertTriangle, Thermometer, FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const STATUS_COLORS: Record<string, string> = {
  hadir: "text-success",
  izin: "text-warning",
  sakit: "text-blue-500",
  alfa: "text-destructive",
};

const STATUS_BG: Record<string, string> = {
  hadir: "bg-success/10 border-success/20",
  izin: "bg-warning/10 border-warning/20",
  sakit: "bg-blue-50 border-blue-200",
  alfa: "bg-destructive/10 border-destructive/20",
};

const STATUS_LABELS: Record<string, string> = {
  hadir: "Hadir",
  izin: "Izin",
  sakit: "Sakit",
  alfa: "Alfa",
};

interface StudentWithStatus {
  id: string;
  name: string;
  class: string;
  parent_name: string;
  student_id: string;
  photo_url: string | null;
  status: "belum" | "hadir" | "izin" | "sakit" | "alfa";
  attendance_time?: string;
  log_id?: string;
}

const LiveDot = () => (
  <span className="relative flex h-2.5 w-2.5">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
  </span>
);

const Monitoring = () => {
  const { profile } = useAuth();
  const [students, setStudents] = useState<StudentWithStatus[]>([]);
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [editStudent, setEditStudent] = useState<StudentWithStatus | null>(null);
  const [editStatus, setEditStatus] = useState("");

  const fetchData = useCallback(async () => {
    if (!profile?.school_id) return;
    const schoolId = profile.school_id;
    const today = new Date().toISOString().slice(0, 10);

    const [studentsRes, logsRes] = await Promise.all([
      supabase.from("students").select("id, name, class, parent_name, student_id, photo_url").eq("school_id", schoolId),
      supabase.from("attendance_logs").select("id, student_id, time, status").eq("school_id", schoolId).eq("date", today),
    ]);

    const allStudents = studentsRes.data || [];
    const logs = logsRes.data || [];

    const mapped: StudentWithStatus[] = allStudents.map((s: any) => {
      const log = logs.find((l: any) => l.student_id === s.id);
      return {
        id: s.id, name: s.name, class: s.class,
        parent_name: s.parent_name, student_id: s.student_id, photo_url: s.photo_url,
        status: log ? (log.status as any) : "belum",
        attendance_time: log?.time,
        log_id: log?.id,
      };
    });

    setStudents(mapped);
    setLastUpdated(new Date());
  }, [profile?.school_id]);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("monitoring-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_logs" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const handleUpdateStatus = async () => {
    if (!editStudent || !editStatus || !profile?.school_id) return;
    
    if (editStudent.log_id) {
      // Update existing
      await supabase.from("attendance_logs").update({ status: editStatus }).eq("id", editStudent.log_id);
    } else {
      // Insert new
      const now = new Date();
      await supabase.from("attendance_logs").insert({
        school_id: profile.school_id,
        student_id: editStudent.id,
        date: now.toISOString().slice(0, 10),
        time: now.toTimeString().slice(0, 8),
        method: "manual",
        status: editStatus,
        recorded_by: profile.full_name || "Admin",
      });
    }
    toast.success(`Status ${editStudent.name} diubah ke ${STATUS_LABELS[editStatus]}`);
    setEditStudent(null);
    setEditStatus("");
    fetchData();
  };

  const grouped = useMemo(() => {
    const g: Record<string, StudentWithStatus[]> = {};
    for (const s of students) {
      if (!g[s.class]) g[s.class] = [];
      g[s.class].push(s);
    }
    return g;
  }, [students]);

  const classNames = Object.keys(grouped).sort();
  const totalHadir = students.filter((s) => s.status === "hadir").length;
  const totalIzin = students.filter((s) => s.status === "izin").length;
  const totalSakit = students.filter((s) => s.status === "sakit").length;
  const totalAlfa = students.filter((s) => s.status === "alfa").length;
  const totalBelum = students.filter((s) => s.status === "belum").length;
  const percentage = students.length ? Math.round(((students.length - totalBelum) / students.length) * 100) : 0;

  const toggleClass = (cls: string) => {
    setExpandedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(cls)) next.delete(cls); else next.add(cls);
      return next;
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Monitoring Absensi</h1>
          <div className="flex items-center gap-2 mt-1">
            <LiveDot />
            <p className="text-muted-foreground text-xs sm:text-sm">
              Realtime • {lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        {[
          { icon: Users, value: students.length, label: "Total", color: "text-primary", bg: "bg-primary/10" },
          { icon: UserCheck, value: totalHadir, label: "Hadir", color: "text-success", bg: "bg-success/10" },
          { icon: FileText, value: totalIzin, label: "Izin", color: "text-warning", bg: "bg-warning/10" },
          { icon: Thermometer, value: totalSakit, label: "Sakit", color: "text-blue-500", bg: "bg-blue-50" },
          { icon: AlertTriangle, value: totalAlfa, label: "Alfa", color: "text-destructive", bg: "bg-destructive/10" },
          { icon: Clock, value: totalBelum, label: "Belum", color: "text-muted-foreground", bg: "bg-muted" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="border-0 shadow-card">
              <CardContent className="p-2 sm:p-3 text-center">
                <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-lg ${stat.bg} flex items-center justify-center mx-auto mb-1`}>
                  <stat.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${stat.color}`} />
                </div>
                <p className={`text-lg sm:text-xl font-extrabold ${stat.color}`}>{stat.value}</p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Progress bar */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-semibold text-foreground">Progress Absensi</span>
            <span className="text-base sm:text-lg font-extrabold text-primary">{percentage}%</span>
          </div>
          <div className="h-2.5 sm:h-3 rounded-full bg-secondary overflow-hidden">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-primary via-primary/80 to-success"
              initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 1, ease: "easeOut" }} />
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5">{students.length - totalBelum} dari {students.length} siswa sudah diabsen</p>
        </CardContent>
      </Card>

      {/* Class Cards */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <h2 className="text-base sm:text-lg font-bold text-foreground">Per Kelas</h2>
          <Badge variant="secondary" className="text-[10px] sm:text-xs">{classNames.length} kelas</Badge>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          {classNames.map((cls) => {
            const classStudents = grouped[cls];
            const classHadir = classStudents.filter((s) => s.status === "hadir").length;
            const classBelum = classStudents.filter((s) => s.status === "belum").length;
            const classRecorded = classStudents.length - classBelum;
            const classPct = classStudents.length ? Math.round((classRecorded / classStudents.length) * 100) : 0;
            const allDone = classBelum === 0;
            const isExpanded = expandedClasses.has(cls);

            return (
              <motion.div key={cls} layout transition={{ type: "spring", stiffness: 300, damping: 30 }}>
                <Card className={`overflow-hidden border transition-all duration-300 ${
                  allDone ? "border-success/30 shadow-[0_0_15px_-3px_hsl(var(--success)/0.15)]" : "border-border shadow-card"
                }`}>
                  <div className="p-3 sm:p-4 cursor-pointer" onClick={() => toggleClass(cls)}>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`h-9 w-9 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center shrink-0 ${
                        allDone ? "bg-success/15 text-success" : "gradient-primary text-primary-foreground"
                      }`}>
                        <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm sm:text-base text-foreground">{cls}</h3>
                          {allDone && <Badge className="bg-success/10 text-success border-success/20 text-[9px] sm:text-[10px]">✓ Lengkap</Badge>}
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-0.5"><Users className="h-3 w-3" /> {classStudents.length}</span>
                          <span className="flex items-center gap-0.5 text-success"><UserCheck className="h-3 w-3" /> {classHadir}</span>
                          <span className="flex items-center gap-0.5 text-muted-foreground"><Clock className="h-3 w-3" /> {classBelum}</span>
                        </div>
                      </div>
                      <p className={`text-lg sm:text-xl font-extrabold ${allDone ? "text-success" : "text-primary"}`}>{classPct}%</p>
                    </div>
                    <div className="mt-2 sm:mt-3 h-1.5 sm:h-2 rounded-full bg-secondary overflow-hidden">
                      <motion.div className={`h-full rounded-full ${allDone ? "bg-success" : "bg-gradient-to-r from-primary to-primary/70"}`}
                        initial={{ width: 0 }} animate={{ width: `${classPct}%` }} transition={{ duration: 0.8 }} />
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                        <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-1.5 sm:space-y-2 border-t border-border pt-2 sm:pt-3">
                          {classStudents
                            .sort((a, b) => (a.status === "belum" ? 1 : -1))
                            .map((s, i) => {
                              const statusKey = s.status === "belum" ? "belum" : s.status;
                              return (
                                <motion.div key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.02 }}>
                                  <div className={`flex items-center gap-2 sm:gap-3 rounded-xl p-2 sm:p-3 transition-all border ${
                                    s.status === "belum" ? "bg-muted/50 border-border" : STATUS_BG[s.status] || "bg-muted/50 border-border"
                                  }`}>
                                    <div className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 ${
                                      s.status === "hadir" ? "bg-success/15 text-success" :
                                      s.status === "belum" ? "bg-muted text-muted-foreground" :
                                      "bg-destructive/15 text-destructive"
                                    }`}>
                                      {s.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-xs sm:text-sm text-foreground truncate">{s.name}</p>
                                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">NIS: {s.student_id}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <Badge
                                        variant="secondary"
                                        className={`text-[9px] sm:text-[10px] cursor-pointer hover:opacity-80 ${
                                          s.status === "belum" ? "" : STATUS_BG[s.status]?.replace("border-", "").split(" ")[0] || ""
                                        }`}
                                        onClick={(e) => { e.stopPropagation(); setEditStudent(s); setEditStatus(s.status === "belum" ? "" : s.status); }}
                                      >
                                        {s.status === "belum" ? "Belum Absen" : STATUS_LABELS[s.status]}
                                      </Badge>
                                      {s.attendance_time && (
                                        <span className="text-[9px] text-muted-foreground">{s.attendance_time.slice(0, 5)}</span>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Edit Status Dialog */}
      <Dialog open={!!editStudent} onOpenChange={(open) => { if (!open) { setEditStudent(null); setEditStatus(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Ubah Status Absensi</DialogTitle>
          </DialogHeader>
          {editStudent && (
            <div className="space-y-4 py-2">
              <div className="text-center">
                <p className="font-bold text-foreground">{editStudent.name}</p>
                <p className="text-sm text-muted-foreground">Kelas {editStudent.class} • NIS: {editStudent.student_id}</p>
              </div>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue placeholder="Pilih status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hadir">✅ Hadir</SelectItem>
                  <SelectItem value="izin">📝 Izin</SelectItem>
                  <SelectItem value="sakit">🤒 Sakit</SelectItem>
                  <SelectItem value="alfa">❌ Alfa</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setEditStudent(null); setEditStatus(""); }} className="flex-1">Batal</Button>
                <Button onClick={handleUpdateStatus} disabled={!editStatus} className="flex-1 gradient-primary hover:opacity-90">Simpan</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Monitoring;