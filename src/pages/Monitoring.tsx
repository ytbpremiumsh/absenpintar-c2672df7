import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  UserCheck, UserX, Clock, Users, GraduationCap,
  Activity, Globe, CheckCircle2, Power, Undo2, RotateCcw, Volume2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { announcePickup } from "@/lib/announcePickup";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface StudentWithStatus {
  id: string;
  name: string;
  class: string;
  parent_name: string;
  student_id: string;
  status: "waiting" | "picked_up";
  pickup_time?: string;
  pickup_by?: string;
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
  const [isPickupActive, setIsPickupActive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [confirmStudent, setConfirmStudent] = useState<StudentWithStatus | null>(null);
  const [cancelStudent, setCancelStudent] = useState<StudentWithStatus | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);

  const fetchData = useCallback(async () => {
    if (!profile?.school_id) return;
    const schoolId = profile.school_id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [studentsRes, logsRes, settingsRes] = await Promise.all([
      supabase.from("students").select("id, name, class, parent_name, student_id").eq("school_id", schoolId),
      supabase.from("pickup_logs").select("id, student_id, pickup_time, pickup_by").eq("school_id", schoolId).gte("pickup_time", today.toISOString()),
      supabase.from("pickup_settings").select("is_active").eq("school_id", schoolId).maybeSingle(),
    ]);

    if (settingsRes.data) setIsPickupActive(settingsRes.data.is_active);

    const allStudents = studentsRes.data || [];
    const logs = logsRes.data || [];

    const mapped: StudentWithStatus[] = allStudents.map((s: any) => {
      const log = logs.find((l: any) => l.student_id === s.id);
      return {
        id: s.id, name: s.name, class: s.class,
        parent_name: s.parent_name, student_id: s.student_id,
        status: log ? "picked_up" : "waiting",
        pickup_time: log?.pickup_time, pickup_by: log?.pickup_by,
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
      .on("postgres_changes", { event: "*", schema: "public", table: "pickup_logs" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const togglePickupSystem = async () => {
    if (!profile?.school_id) return;
    const newState = !isPickupActive;
    const { data: existing } = await supabase
      .from("pickup_settings").select("id").eq("school_id", profile.school_id).maybeSingle();

    if (existing) {
      await supabase.from("pickup_settings").update({ is_active: newState }).eq("school_id", profile.school_id);
    } else {
      await supabase.from("pickup_settings").insert({ school_id: profile.school_id, is_active: newState } as any);
    }
    setIsPickupActive(newState);
    toast.success(newState ? "Sistem penjemputan diaktifkan" : "Sistem penjemputan dinonaktifkan");
  };

  const handleManualPickup = async (student: StudentWithStatus) => {
    if (!profile?.school_id) return;
    const { error } = await supabase.from("pickup_logs").insert({
      student_id: student.id, school_id: profile.school_id,
      pickup_by: "Admin (Manual)", status: "picked_up",
    });
    if (error) {
      toast.error("Gagal mencatat penjemputan");
    } else {
      toast.success(`${student.name} berhasil ditandai pulang`);
      announcePickup(student.name, student.class);
      fetchData();
    }
    setConfirmStudent(null);
  };

  const handleCancelPickup = async (student: StudentWithStatus) => {
    if (!student.log_id) return;
    const { error } = await supabase.from("pickup_logs").delete().eq("id", student.log_id);
    if (error) {
      toast.error("Gagal membatalkan: " + error.message);
    } else {
      toast.success(`Penjemputan ${student.name} dibatalkan`);
      fetchData();
    }
    setCancelStudent(null);
  };

  const handleDailyReset = async () => {
    if (!profile?.school_id) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { error } = await supabase.from("pickup_logs")
      .delete()
      .eq("school_id", profile.school_id)
      .gte("pickup_time", today.toISOString());
    if (error) {
      toast.error("Gagal reset: " + error.message);
    } else {
      toast.success("Data penjemputan hari ini berhasil direset");
      fetchData();
    }
    setResetConfirm(false);
  };

  const copyClassLink = (cls: string) => {
    if (!profile?.school_id) return;
    const link = `${window.location.origin}/live/${profile.school_id}/${encodeURIComponent(cls)}`;
    navigator.clipboard.writeText(link);
    toast.success(`Link kelas ${cls} disalin!`);
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
  const totalPicked = students.filter((s) => s.status === "picked_up").length;
  const totalWaiting = students.length - totalPicked;
  const percentage = students.length ? Math.round((totalPicked / students.length) * 100) : 0;

  const toggleClass = (cls: string) => {
    setExpandedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(cls)) next.delete(cls); else next.add(cls);
      return next;
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Monitoring Penjemputan</h1>
          <div className="flex items-center gap-2 mt-1">
            <LiveDot />
            <p className="text-muted-foreground text-xs sm:text-sm">
              Realtime • {lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setResetConfirm(true)} className="text-xs">
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset Hari Ini
          </Button>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
            isPickupActive ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"
          }`}>
            <Power className={`h-3.5 w-3.5 ${isPickupActive ? "text-success" : "text-destructive"}`} />
            <span className="text-xs font-medium text-foreground">{isPickupActive ? "Aktif" : "Nonaktif"}</span>
            <Switch checked={isPickupActive} onCheckedChange={togglePickupSystem} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users, value: students.length, label: "Total Siswa", color: "text-primary", bg: "bg-primary/10" },
          { icon: UserCheck, value: totalPicked, label: "Sudah Pulang", color: "text-success", bg: "bg-success/10" },
          { icon: UserX, value: totalWaiting, label: "Menunggu", color: "text-destructive", bg: "bg-destructive/10" },
          { icon: Activity, value: `${percentage}%`, label: "Progress", color: "text-primary", bg: "gradient-primary" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-0 shadow-card">
              <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                  <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.bg.includes("gradient") ? "text-primary-foreground" : stat.color}`} />
                </div>
                <div>
                  <p className={`text-xl sm:text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Progress bar */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-semibold text-foreground">Progress Keseluruhan</span>
            <span className="text-base sm:text-lg font-extrabold text-primary">{percentage}%</span>
          </div>
          <div className="h-2.5 sm:h-3 rounded-full bg-secondary overflow-hidden">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-primary via-primary/80 to-success"
              initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 1, ease: "easeOut" }} />
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5">{totalPicked} dari {students.length} siswa</p>
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
            const classPicked = classStudents.filter((s) => s.status === "picked_up").length;
            const classWaiting = classStudents.length - classPicked;
            const classPct = classStudents.length ? Math.round((classPicked / classStudents.length) * 100) : 0;
            const allDone = classWaiting === 0;
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
                          {allDone && <Badge className="bg-success/10 text-success border-success/20 text-[9px] sm:text-[10px]">✓</Badge>}
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-0.5"><Users className="h-3 w-3" /> {classStudents.length}</span>
                          <span className="flex items-center gap-0.5 text-success"><UserCheck className="h-3 w-3" /> {classPicked}</span>
                          <span className="flex items-center gap-0.5 text-destructive"><UserX className="h-3 w-3" /> {classWaiting}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); copyClassLink(cls); }}
                          className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-all"
                          title="Salin link publik">
                          <Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
                        </button>
                        <p className={`text-lg sm:text-xl font-extrabold ${allDone ? "text-success" : "text-primary"}`}>{classPct}%</p>
                      </div>
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
                            .sort((a, b) => (a.status === "waiting" ? -1 : 1))
                            .map((s, i) => (
                              <motion.div key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.02 }}>
                                <div className={`flex items-center gap-2 sm:gap-3 rounded-xl p-2 sm:p-3 transition-all ${
                                  s.status === "picked_up" ? "bg-success/5 border border-success/20" : "bg-destructive/5 border border-destructive/20"
                                }`}>
                                  <div className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 ${
                                    s.status === "picked_up" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                                  }`}>
                                    {s.name.charAt(0)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-xs sm:text-sm text-foreground truncate">{s.name}</p>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">NIS: {s.student_id}</p>
                                  </div>
                                  {s.status === "picked_up" ? (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <div className="text-right">
                                        <Badge className="bg-success/10 text-success border-success/20 text-[9px] sm:text-[10px]">
                                          <UserCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" /> Pulang
                                        </Badge>
                                        {s.pickup_time && (
                                          <div className="flex items-center gap-0.5 text-muted-foreground mt-0.5 justify-end">
                                            <Clock className="h-2.5 w-2.5" />
                                            <span className="text-[9px] sm:text-[10px]">{new Date(s.pickup_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                                          </div>
                                        )}
                                      </div>
                                      <button onClick={() => setCancelStudent(s)}
                                        className="h-7 w-7 rounded-lg bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center transition-all"
                                        title="Batalkan penjemputan">
                                        <Undo2 className="h-3 w-3 text-destructive" />
                                      </button>
                                    </div>
                                  ) : (
                                    <Button size="sm" variant="outline"
                                      className="shrink-0 text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                                      onClick={() => setConfirmStudent(s)}>
                                      <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-0.5 sm:mr-1" /> Approve
                                    </Button>
                                  )}
                                </div>
                              </motion.div>
                            ))}
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

      {/* Manual Pickup Dialog */}
      <AlertDialog open={!!confirmStudent} onOpenChange={(o) => !o && setConfirmStudent(null)}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">Konfirmasi Kepulangan</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              Tandai <strong>{confirmStudent?.name}</strong> (Kelas {confirmStudent?.class}) sebagai sudah pulang?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs sm:text-sm">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmStudent && handleManualPickup(confirmStudent)} className="text-xs sm:text-sm">
              <Volume2 className="h-3.5 w-3.5 mr-1" /> Ya, Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Pickup Dialog */}
      <AlertDialog open={!!cancelStudent} onOpenChange={(o) => !o && setCancelStudent(null)}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">Batalkan Penjemputan?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              Apakah Anda yakin ingin membatalkan penjemputan <strong>{cancelStudent?.name}</strong>?
              Status akan kembali ke "menunggu".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs sm:text-sm">Tidak</AlertDialogCancel>
            <AlertDialogAction onClick={() => cancelStudent && handleCancelPickup(cancelStudent)}
              className="bg-destructive hover:bg-destructive/90 text-xs sm:text-sm">
              Ya, Batalkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Daily Reset Dialog */}
      <AlertDialog open={resetConfirm} onOpenChange={setResetConfirm}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">Reset Data Hari Ini?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              Semua data penjemputan hari ini akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs sm:text-sm">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDailyReset} className="bg-destructive hover:bg-destructive/90 text-xs sm:text-sm">
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Ya, Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Monitoring;
