import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  UserCheck, UserX, Clock, School, Users, RefreshCw,
  GraduationCap, Activity,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface StudentStatus {
  id: string;
  name: string;
  class: string;
  parent_name: string;
  student_id: string;
  status: "waiting" | "picked_up";
  pickup_time: string | null;
  pickup_by: string | null;
}

const LiveDot = () => (
  <span className="relative flex h-2.5 w-2.5">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
  </span>
);

const PublicClassMonitoring = () => {
  const { schoolId, className } = useParams<{ schoolId: string; className: string }>();
  const [students, setStudents] = useState<StudentStatus[]>([]);
  const [schoolName, setSchoolName] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const decodedClass = className ? decodeURIComponent(className) : "";

  const fetchData = async (showRefresh = false) => {
    if (!schoolId || !decodedClass) return;
    if (showRefresh) setIsRefreshing(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-monitoring?school_id=${schoolId}&class=${encodeURIComponent(decodedClass)}`;
      const res = await fetch(url, {
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      });
      const json = await res.json();
      if (json.error) return;

      setSchoolName(json.school?.name || "Smart Pickup");
      const allStudents: StudentStatus[] = [];
      Object.values(json.classes as Record<string, StudentStatus[]>).forEach((arr) => allStudents.push(...arr));
      setStudents(allStudents);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 10000);
    const channel = supabase
      .channel(`public-class-${decodedClass}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pickup_logs" }, () => fetchData(true))
      .subscribe();
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [schoolId, decodedClass]);

  const picked = students.filter((s) => s.status === "picked_up");
  const waiting = students.filter((s) => s.status === "waiting");
  const percentage = students.length ? Math.round((picked.length / students.length) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
            <GraduationCap className="h-8 w-8 text-primary-foreground" />
          </motion.div>
          <p className="text-muted-foreground font-medium">Memuat data kelas {decodedClass}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-hero text-primary-foreground sticky top-0 z-50 shadow-elevated">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold">{schoolName} — Kelas {decodedClass}</h1>
                <div className="flex items-center gap-2 text-xs opacity-80">
                  <LiveDot />
                  <span>Monitoring Penjemputan Realtime</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => fetchData(true)}
                className="h-9 w-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </button>
              <div className="text-right text-xs opacity-70 hidden sm:block">
                <p>Update terakhir</p>
                <p className="font-mono font-bold">
                  {lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Users, value: students.length, label: "Total Siswa", color: "text-primary", bg: "bg-primary/10" },
            { icon: UserCheck, value: picked.length, label: "Dijemput", color: "text-success", bg: "bg-success/10" },
            { icon: UserX, value: waiting.length, label: "Menunggu", color: "text-destructive", bg: "bg-destructive/10" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-0 shadow-card">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
                    <p className="text-[11px] text-muted-foreground font-medium">{stat.label}</p>
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
                <Activity className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Progress Kelas {decodedClass}</span>
              </div>
              <span className="text-lg font-extrabold text-primary">{percentage}%</span>
            </div>
            <div className="h-4 rounded-full bg-secondary overflow-hidden">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-primary via-primary/80 to-success"
                initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 1.2, ease: "easeOut" }} />
            </div>
          </CardContent>
        </Card>

        {/* Student list */}
        <div className="space-y-4">
          {/* Waiting */}
          {waiting.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
                <h2 className="font-bold text-foreground">Belum Dijemput ({waiting.length})</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <AnimatePresence>
                  {waiting.map((s, i) => (
                    <motion.div key={s.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.02 }}>
                      <Card className="border border-destructive/20 bg-destructive/5 shadow-sm">
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-destructive/15 text-destructive flex items-center justify-center font-bold text-sm shrink-0">
                            {s.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">{s.name}</p>
                            <p className="text-xs text-muted-foreground">NIS: {s.student_id} • {s.parent_name}</p>
                          </div>
                          <Badge variant="destructive" className="text-[10px] animate-pulse shrink-0">
                            <UserX className="h-3 w-3 mr-1" /> Menunggu
                          </Badge>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Picked up */}
          {picked.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-success" />
                <h2 className="font-bold text-foreground">Sudah Dijemput ({picked.length})</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <AnimatePresence>
                  {picked.map((s, i) => (
                    <motion.div key={s.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.02 }}>
                      <Card className="border border-success/20 bg-success/5 shadow-sm">
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-success/15 text-success flex items-center justify-center font-bold text-sm shrink-0">
                            {s.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">{s.name}</p>
                            <p className="text-xs text-muted-foreground">NIS: {s.student_id} • {s.parent_name}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <Badge className="bg-success/10 text-success border-success/20 text-[10px]">
                              <UserCheck className="h-3 w-3 mr-1" /> Dijemput
                            </Badge>
                            {s.pickup_time && (
                              <div className="flex items-center gap-1 text-muted-foreground mt-1 justify-end">
                                <Clock className="h-3 w-3" />
                                <span className="text-[10px]">
                                  {new Date(s.pickup_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {students.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Tidak ada siswa di kelas ini</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center py-6 border-t border-border">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <LiveDot />
            <span>Smart Pickup System • Data kelas {decodedClass} diperbarui otomatis</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicClassMonitoring;
