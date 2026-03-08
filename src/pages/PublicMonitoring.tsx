import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCheck, UserX, Clock, School, Users, RefreshCw } from "lucide-react";
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

interface MonitoringData {
  school: { name: string; logo: string | null } | null;
  classes: Record<string, StudentStatus[]>;
  total: number;
  picked_up: number;
}

const PublicMonitoring = () => {
  const { schoolId } = useParams<{ schoolId: string }>();
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeClass, setActiveClass] = useState<string>("all");
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchData = async () => {
    if (!schoolId) return;
    try {
      const { data: result, error } = await supabase.functions.invoke("public-monitoring", {
        body: null,
        method: "GET",
        headers: {},
      });
      
      // Use fetch directly since we need query params
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-monitoring?school_id=${schoolId}`;
      const res = await fetch(url, {
        headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      });
      const json = await res.json();
      
      if (json.error) {
        console.error(json.error);
        return;
      }
      
      setData(json);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Realtime via polling every 10s (public page, no auth for realtime channel)
    const interval = setInterval(fetchData, 10000);

    // Also try realtime channel
    const channel = supabase
      .channel("public-monitoring-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pickup_logs" }, () => fetchData())
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [schoolId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto animate-pulse">
            <School className="h-8 w-8 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Data tidak ditemukan</p>
      </div>
    );
  }

  const classNames = Object.keys(data.classes).sort();
  const waiting = data.total - data.picked_up;
  const percentage = data.total ? Math.round((data.picked_up / data.total) * 100) : 0;

  const displayStudents: StudentStatus[] = activeClass === "all"
    ? Object.values(data.classes).flat()
    : data.classes[activeClass] || [];

  const waitingStudents = displayStudents.filter((s) => s.status === "waiting");
  const pickedStudents = displayStudents.filter((s) => s.status === "picked_up");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-hero text-primary-foreground sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                <School className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold">{data.school?.name || "Smart Pickup"}</h1>
                <p className="text-xs opacity-80">Monitoring Penjemputan Realtime</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs opacity-70">
              <RefreshCw className="h-3 w-3" />
              <span>{lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Banner */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="shadow-card border-0">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold">{data.total}</p>
              <p className="text-[11px] text-muted-foreground">Total Siswa</p>
            </CardContent>
          </Card>
          <Card className="shadow-card border-0">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <UserCheck className="h-4 w-4 text-success" />
              </div>
              <p className="text-2xl font-bold text-success">{data.picked_up}</p>
              <p className="text-[11px] text-muted-foreground">Sudah Dijemput</p>
            </CardContent>
          </Card>
          <Card className="shadow-card border-0">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <UserX className="h-4 w-4 text-destructive" />
              </div>
              <p className="text-2xl font-bold text-destructive">{waiting}</p>
              <p className="text-[11px] text-muted-foreground">Menunggu</p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card className="shadow-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress Penjemputan</span>
              <span className="text-sm font-bold text-primary">{percentage}%</span>
            </div>
            <div className="h-3 rounded-full bg-secondary overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-success"
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Class Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setActiveClass("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeClass === "all"
                ? "gradient-primary text-primary-foreground shadow-elevated"
                : "bg-card text-muted-foreground hover:bg-secondary"
            }`}
          >
            Semua Kelas
          </button>
          {classNames.map((cls) => {
            const classStudents = data.classes[cls];
            const classPicked = classStudents.filter((s) => s.status === "picked_up").length;
            return (
              <button
                key={cls}
                onClick={() => setActiveClass(cls)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeClass === cls
                    ? "gradient-primary text-primary-foreground shadow-elevated"
                    : "bg-card text-muted-foreground hover:bg-secondary"
                }`}
              >
                {cls} ({classPicked}/{classStudents.length})
              </button>
            );
          })}
        </div>

        {/* Two columns: Waiting & Picked Up */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Belum Dijemput */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
              <h2 className="font-semibold text-sm">Belum Dijemput ({waitingStudents.length})</h2>
            </div>
            <AnimatePresence>
              {waitingStudents.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className="shadow-card border-0 border-l-4 border-l-destructive">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive font-bold text-sm">
                          {s.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.class} • {s.parent_name}</p>
                        </div>
                        <Badge variant="destructive" className="text-[10px] shrink-0">
                          <UserX className="h-3 w-3 mr-1" />
                          Menunggu
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
            {waitingStudents.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">Semua sudah dijemput 🎉</p>
            )}
          </div>

          {/* Sudah Dijemput */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-success" />
              <h2 className="font-semibold text-sm">Sudah Dijemput ({pickedStudents.length})</h2>
            </div>
            <AnimatePresence>
              {pickedStudents.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className="shadow-card border-0 border-l-4 border-l-success">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center text-success font-bold text-sm">
                          {s.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.class} • {s.parent_name}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge className="bg-success/10 text-success border-0 text-[10px]">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Dijemput
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
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
            {pickedStudents.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">Belum ada yang dijemput</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-6 border-t">
          <p className="text-xs text-muted-foreground">
            Smart Pickup System • Data diperbarui otomatis setiap 10 detik
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicMonitoring;
