import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  UserCheck, Clock, Users, GraduationCap, Activity, AlertTriangle,
  Thermometer, FileText, Scan, RefreshCw, School, LogIn, LogOut, CreditCard,
  Maximize, Minimize,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import PublicAttendanceScanner from "@/components/PublicAttendanceScanner";
import { announceAttendance } from "@/lib/announceAttendance";

const STATUS_LABELS: Record<string, string> = { hadir: "Hadir", izin: "Izin", sakit: "Sakit", alfa: "Alfa", belum: "Belum" };
const STATUS_BG: Record<string, string> = {
  hadir: "bg-success/10 text-success border-success/20",
  izin: "bg-warning/10 text-warning border-warning/20",
  sakit: "bg-blue-50 text-blue-500 border-blue-200",
  alfa: "bg-destructive/10 text-destructive border-destructive/20",
  belum: "bg-muted text-muted-foreground border-border",
};
const METHOD_LABELS: Record<string, string> = { barcode: "Barcode", face_recognition: "Face Recognition", rfid: "Kartu RFID", manual: "Manual" };
const TYPE_LABELS: Record<string, string> = { datang: "Datang", pulang: "Pulang" };

interface LiveEntry {
  id: string; student_name: string; student_class: string; student_id: string;
  photo_url: string | null; status: string; method: string; time: string; created_at: string;
}

interface AttendanceData {
  school: { name: string; logo: string | null };
  classes: Record<string, { id: string; name: string; student_id: string; photo_url: string | null; status: string; time: string | null; method: string | null }[]>;
  liveFeed: (LiveEntry & { attendance_type?: string })[];
  stats: { total: number; hadir: number; izin: number; sakit: number; alfa: number; belum: number };
  date: string;
  currentMode?: string;
  pulangStats?: { total: number; recorded: number };
  timeSettings?: { attStart: string; attEnd: string; depStart: string; depEnd: string };
  canFaceRecognition?: boolean;
}

const LiveDot = () => (
  <span className="relative flex h-3 w-3">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
    <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
  </span>
);

const PublicAttendanceMonitoring = () => {
  const { schoolId } = useParams<{ schoolId: string }>();
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [newEntryId, setNewEntryId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLogIds = useRef<Set<string>>(new Set());
  const initialLoad = useRef(true);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const fetchData = async () => {
    if (!schoolId) return;
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-attendance?school_id=${schoolId}`;
      const res = await fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
      const json = await res.json();
      if (json.error) return;

      // Detect new entries for animation
      if (!initialLoad.current && json.liveFeed?.length > 0) {
        const newEntry = json.liveFeed.find((e: LiveEntry) => !prevLogIds.current.has(e.id));
        if (newEntry) {
          setNewEntryId(newEntry.id);
          setTimeout(() => setNewEntryId(null), 4000);
          // Announce with sound + speech
          const type = (newEntry as any).attendance_type === "pulang" ? "pulang" : "datang";
          announceAttendance(newEntry.student_name, newEntry.student_class, type);
        }
      }
      initialLoad.current = false;
      prevLogIds.current = new Set(json.liveFeed?.map((e: LiveEntry) => e.id) || []);

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
    const interval = setInterval(fetchData, 8000);
    const channel = supabase
      .channel("public-attendance-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "attendance_logs" }, () => fetchData())
      .subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, [schoolId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="h-20 w-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
            <School className="h-10 w-10 text-primary-foreground" />
          </motion.div>
          <p className="text-lg text-muted-foreground font-medium">Memuat monitoring absensi...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-lg">Sekolah tidak ditemukan</p>
      </div>
    );
  }

  const { stats } = data;
  const percentage = stats.total ? Math.round(((stats.total - stats.belum) / stats.total) * 100) : 0;
  const classNames = Object.keys(data.classes).sort();
  const currentTime = lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const currentDate = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div ref={containerRef} className="min-h-screen bg-background">
      {/* Header - Smartboard optimized */}
      <header className="gradient-hero text-primary-foreground sticky top-0 z-50 shadow-elevated">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {data.school.logo ? (
                <img src={data.school.logo} alt="" className="h-14 w-14 rounded-xl object-cover bg-white/20" />
              ) : (
                <div className="h-14 w-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <School className="h-7 w-7" />
                </div>
              )}
              <div>
                <h1 className="text-xl lg:text-2xl font-bold">{data.school.name}</h1>
                <div className="flex items-center gap-3 text-sm opacity-80">
                  <LiveDot />
                  <span>Live Monitoring Absensi</span>
                  <span>•</span>
                  <span>{currentDate}</span>
                  <span>•</span>
                  <Badge className={`text-xs ${data.currentMode === "pulang" ? "bg-warning/20 text-warning border-warning/30" : "bg-success/20 text-success border-success/30"}`}>
                    {data.currentMode === "pulang" ? <LogOut className="h-3 w-3 mr-1" /> : <LogIn className="h-3 w-3 mr-1" />}
                    Mode: {data.currentMode === "pulang" ? "Pulang" : "Datang"}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 text-primary-foreground"
              >
                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </Button>
              <div className="text-right">
                <p className="text-3xl lg:text-4xl font-mono font-bold">{currentTime}</p>
                <p className="text-xs opacity-70">Auto-refresh aktif</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1920px] mx-auto px-6 py-5 space-y-5">
        {/* Stats Row - Compact */}
        <div className="grid grid-cols-6 gap-3">
          {[
            { icon: Users, value: stats.total, label: "Total", color: "text-primary", bg: "bg-primary/10" },
            { icon: UserCheck, value: stats.hadir, label: "Hadir", color: "text-success", bg: "bg-success/10" },
            { icon: FileText, value: stats.izin, label: "Izin", color: "text-warning", bg: "bg-warning/10" },
            { icon: Thermometer, value: stats.sakit, label: "Sakit", color: "text-blue-500", bg: "bg-blue-50" },
            { icon: AlertTriangle, value: stats.alfa, label: "Alfa", color: "text-destructive", bg: "bg-destructive/10" },
            { icon: Clock, value: stats.belum, label: "Belum", color: "text-muted-foreground", bg: "bg-muted" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="border-0 shadow-card">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                    <stat.icon className={`h-4.5 w-4.5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className={`text-xl font-extrabold leading-tight ${stat.color}`}>{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Progress Bar - Compact */}
        <Card className="border-0 shadow-card">
          <CardContent className="px-4 py-2">
            <div className="flex items-center gap-3">
              <Activity className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs font-semibold text-foreground whitespace-nowrap">Progress Absensi</span>
              <div className="flex-1 h-3 rounded-full bg-secondary overflow-hidden">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-primary via-primary/80 to-success"
                  initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 1.2 }} />
              </div>
              <span className="text-sm font-extrabold text-primary whitespace-nowrap">{percentage}%</span>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{stats.total - stats.belum}/{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        {/* Two-column: Scanner (left) | Live Feed (right) - equal width */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Left: Scanner */}
          <div>
            {schoolId && (
              <PublicAttendanceScanner schoolId={schoolId} onAttendanceRecorded={fetchData} currentMode={data?.currentMode || "datang"} canFaceRecognition={data?.canFaceRecognition ?? false} />
            )}
          </div>

          {/* Right: Live Feed */}
          <div>
            <Card className="border-0 shadow-card overflow-hidden h-full">
              <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-success/10 flex items-center justify-center">
                  <Activity className="h-3.5 w-3.5 text-success" />
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-bold text-foreground leading-tight">Live Feed</h2>
                  <p className="text-[9px] text-muted-foreground">Kedatangan terbaru</p>
                </div>
                <LiveDot />
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {data.liveFeed.length === 0 ? (
                  <div className="p-8 text-center">
                    <Clock className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Belum ada absensi hari ini</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    <AnimatePresence initial={false}>
                      {data.liveFeed.slice(0, 30).map((entry) => {
                        const isNew = entry.id === newEntryId;
                        return (
                          <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, x: -20, backgroundColor: "hsl(var(--success) / 0.2)" }}
                            animate={{ opacity: 1, x: 0, backgroundColor: "hsl(0 0% 100% / 0)" }}
                            transition={{ duration: 0.4, backgroundColor: { duration: 3 } }}
                            className={`flex items-center gap-3 px-3 py-2.5 ${isNew ? "ring-2 ring-success/40 bg-success/10" : ""}`}
                          >
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden ${
                              entry.status === "hadir" ? "bg-success/15 text-success" :
                              entry.status === "izin" ? "bg-warning/15 text-warning" :
                              entry.status === "sakit" ? "bg-blue-50 text-blue-500" :
                              "bg-destructive/15 text-destructive"
                            }`}>
                              {entry.photo_url ? (
                                <img src={entry.photo_url} alt="" className="h-full w-full rounded-full object-cover" />
                              ) : entry.student_name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <p className="font-semibold text-xs text-foreground truncate">{entry.student_name}</p>
                                {isNew && <Badge className="bg-success text-success-foreground text-[7px] px-1 py-0 animate-pulse">BARU</Badge>}
                              </div>
                              <p className="text-[9px] text-muted-foreground">{entry.student_class} • {entry.student_id}</p>
                            </div>
                            <div className="flex flex-col items-end gap-0 shrink-0">
                              <Badge variant="secondary" className={`text-[8px] px-1 py-0 ${STATUS_BG[entry.status] || ""}`}>
                                {STATUS_LABELS[entry.status] || entry.status}
                              </Badge>
                              {entry.status === "hadir" && (
                                <Badge variant="outline" className={`text-[7px] px-1 py-0 ${
                                  (entry as any).attendance_type === "pulang" ? "border-warning/30 text-warning" : "border-success/30 text-success"
                                }`}>
                                  {(entry as any).attendance_type === "pulang" ? "Pulang" : "Datang"}
                                </Badge>
                              )}
                              <span className="text-[8px] font-mono text-muted-foreground">{entry.time?.slice(0, 5)}</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Per Class Summary */}
        <div>
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="h-5 w-5 text-primary" />
              <h2 className="text-base lg:text-lg font-bold text-foreground">Ringkasan Per Kelas</h2>
              <Badge variant="secondary" className="text-xs">{classNames.length} kelas</Badge>
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {classNames.map((cls) => {
                const classStudents = data.classes[cls];
                const hadir = classStudents.filter((s) => s.status === "hadir").length;
                const belum = classStudents.filter((s) => s.status === "belum").length;
                const recorded = classStudents.length - belum;
                const pct = classStudents.length ? Math.round((recorded / classStudents.length) * 100) : 0;
                const allDone = belum === 0;

                return (
                  <motion.div key={cls} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className={`border transition-all ${allDone ? "border-success/30 shadow-[0_0_15px_-3px_hsl(var(--success)/0.15)]" : "border-border shadow-card"}`}>
                      <CardContent className="p-3 lg:p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                            allDone ? "bg-success/15 text-success" : "gradient-primary text-primary-foreground"
                          }`}>
                            <GraduationCap className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-bold text-sm text-foreground">{cls}</h3>
                              {allDone && <Badge className="bg-success/10 text-success border-success/20 text-[8px]">✓</Badge>}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-0.5"><Users className="h-2.5 w-2.5" /> {classStudents.length}</span>
                              <span className="flex items-center gap-0.5 text-success"><UserCheck className="h-2.5 w-2.5" /> {hadir}</span>
                              <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {belum}</span>
                            </div>
                          </div>
                          <p className={`text-xl font-extrabold ${allDone ? "text-success" : "text-primary"}`}>{pct}%</p>
                        </div>
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                          <motion.div className={`h-full rounded-full ${allDone ? "bg-success" : "bg-gradient-to-r from-primary to-primary/70"}`}
                            initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4 border-t border-border">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <LiveDot />
            <span>Smart School Attendance System • Data diperbarui otomatis setiap 8 detik</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicAttendanceMonitoring;
