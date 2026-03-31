import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  UserCheck, Clock, Users, GraduationCap, Activity, AlertTriangle,
  Thermometer, FileText, School, LogIn, LogOut,
  Maximize, Minimize, Camera, CameraOff, Volume2, VolumeX,
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
  const [cameraVisible, setCameraVisible] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
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
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
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

      if (!initialLoad.current && json.liveFeed?.length > 0) {
        const newEntry = json.liveFeed.find((e: LiveEntry) => !prevLogIds.current.has(e.id));
        if (newEntry) {
          setNewEntryId(newEntry.id);
          setTimeout(() => setNewEntryId(null), 4000);
          if (soundEnabled) {
            const type = (newEntry as any).attendance_type === "pulang" ? "pulang" : "datang";
            announceAttendance(newEntry.student_name, newEntry.student_class, type);
          }
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
    const interval = setInterval(fetchData, 5000);
    const channel = supabase
      .channel("public-attendance-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "attendance_logs" }, () => fetchData())
      .subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, [schoolId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#5B6CF9] to-[#4c5ded] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/30">
            <School className="h-10 w-10 text-white" />
          </motion.div>
          <p className="text-lg text-slate-400 font-medium">Memuat monitoring absensi...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center">
        <p className="text-slate-400 text-lg">Sekolah tidak ditemukan</p>
      </div>
    );
  }

  const { stats } = data;
  const percentage = stats.total ? Math.round(((stats.total - stats.belum) / stats.total) * 100) : 0;
  const classNames = Object.keys(data.classes).sort();
  const currentTime = lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const currentDate = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-white/5">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              {data.school.logo ? (
                <img src={data.school.logo} alt="" className="h-11 w-11 sm:h-14 sm:w-14 rounded-xl object-cover ring-2 ring-white/10" />
              ) : (
                <div className="h-11 w-11 sm:h-14 sm:w-14 rounded-xl bg-gradient-to-br from-[#5B6CF9] to-[#4c5ded] flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <School className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-white truncate max-w-[200px] sm:max-w-none">{data.school.name}</h1>
                <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-400">
                  <LiveDot />
                  <span className="hidden sm:inline">Live Monitoring</span>
                  <span className="sm:hidden">Live</span>
                  <span className="hidden md:inline">•</span>
                  <span className="hidden md:inline">{currentDate}</span>
                  <Badge className={`text-[9px] sm:text-[10px] border-0 ${data.currentMode === "pulang" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                    {data.currentMode === "pulang" ? <LogOut className="h-2.5 w-2.5 mr-0.5" /> : <LogIn className="h-2.5 w-2.5 mr-0.5" />}
                    {data.currentMode === "pulang" ? "Pulang" : "Datang"}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Sound toggle */}
              <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)}
                className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white">
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              {/* Camera toggle */}
              <Button variant="ghost" size="icon" onClick={() => setCameraVisible(!cameraVisible)}
                className={`h-8 w-8 sm:h-10 sm:w-10 rounded-xl ${cameraVisible ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 text-slate-400"} hover:bg-white/10 hover:text-white`}>
                {cameraVisible ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
              </Button>
              {/* Fullscreen */}
              <Button variant="ghost" size="icon" onClick={toggleFullscreen}
                className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white">
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
              <div className="text-right hidden sm:block">
                <p className="text-2xl lg:text-3xl font-mono font-bold text-white tabular-nums">{currentTime}</p>
                <div className="flex items-center justify-end gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] text-slate-500">Auto-refresh 5s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
        {/* Stats Row */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
          {[
            { icon: Users, value: stats.total, label: "Total", color: "text-indigo-400", bg: "bg-indigo-500/10", ring: "ring-indigo-500/20" },
            { icon: UserCheck, value: stats.hadir, label: "Hadir", color: "text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-500/20" },
            { icon: FileText, value: stats.izin, label: "Izin", color: "text-amber-400", bg: "bg-amber-500/10", ring: "ring-amber-500/20" },
            { icon: Thermometer, value: stats.sakit, label: "Sakit", color: "text-sky-400", bg: "bg-sky-500/10", ring: "ring-sky-500/20" },
            { icon: AlertTriangle, value: stats.alfa, label: "Alfa", color: "text-red-400", bg: "bg-red-500/10", ring: "ring-red-500/20" },
            { icon: Clock, value: stats.belum, label: "Belum", color: "text-slate-400", bg: "bg-slate-500/10", ring: "ring-slate-500/20" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <div className={`rounded-xl ${stat.bg} ring-1 ${stat.ring} p-3 sm:p-4`}>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`h-8 w-8 sm:h-9 sm:w-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <div>
                    <p className={`text-lg sm:text-2xl font-extrabold leading-tight ${stat.color}`}>{stat.value}</p>
                    <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium uppercase tracking-wider">{stat.label}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="rounded-xl bg-white/5 ring-1 ring-white/10 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <Activity className="h-4 w-4 text-indigo-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-300 whitespace-nowrap">Progress</span>
            <div className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500"
                initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 1.2 }}
              />
            </div>
            <span className="text-base font-extrabold text-white whitespace-nowrap tabular-nums">{percentage}%</span>
            <span className="text-[10px] text-slate-500 whitespace-nowrap tabular-nums">{stats.total - stats.belum}/{stats.total}</span>
          </div>
        </div>

        {/* Main Content: Camera (toggle) + Live Feed */}
        <div className={`grid ${cameraVisible ? "lg:grid-cols-5" : ""} gap-4`}>
          {/* Camera Scanner */}
          <AnimatePresence>
            {cameraVisible && (
              <motion.div
                className="lg:col-span-2"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                {schoolId && (
                  <PublicAttendanceScanner schoolId={schoolId} onAttendanceRecorded={fetchData} currentMode={data?.currentMode || "datang"} canFaceRecognition={data?.canFaceRecognition ?? false} />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Live Feed */}
          <div className={cameraVisible ? "lg:col-span-3" : ""}>
            <div className="rounded-xl bg-white/5 ring-1 ring-white/10 overflow-hidden h-full">
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-bold text-white">Live Feed</h2>
                  <p className="text-[9px] text-slate-500">20 absensi terbaru • realtime</p>
                </div>
                <LiveDot />
              </div>
              <div className="overflow-y-auto max-h-[400px] lg:max-h-[500px]">
                {data.liveFeed.length === 0 ? (
                  <div className="p-10 text-center">
                    <Clock className="h-10 w-10 text-slate-700 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Belum ada absensi hari ini</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    <AnimatePresence initial={false}>
                      {data.liveFeed.slice(0, 20).map((entry) => {
                        const isNew = entry.id === newEntryId;
                        return (
                          <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4 }}
                            className={`flex items-center gap-3 px-4 py-3 transition-colors ${isNew ? "bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/20" : "hover:bg-white/5"}`}
                          >
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden ring-2 ${
                              entry.status === "hadir" ? "ring-emerald-500/30 bg-emerald-500/10 text-emerald-400" :
                              entry.status === "izin" ? "ring-amber-500/30 bg-amber-500/10 text-amber-400" :
                              entry.status === "sakit" ? "ring-sky-500/30 bg-sky-500/10 text-sky-400" :
                              "ring-red-500/30 bg-red-500/10 text-red-400"
                            }`}>
                              {entry.photo_url ? (
                                <img src={entry.photo_url} alt="" className="h-full w-full rounded-full object-cover" />
                              ) : entry.student_name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-sm text-white truncate">{entry.student_name}</p>
                                {isNew && (
                                  <Badge className="bg-emerald-500 text-white text-[7px] px-1.5 py-0 animate-pulse shadow-lg shadow-emerald-500/30">BARU</Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500">{entry.student_class} • {entry.student_id}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex flex-col items-end gap-0.5">
                                <Badge variant="secondary" className={`text-[9px] px-2 py-0.5 border-0 ${
                                  entry.status === "hadir" ? "bg-emerald-500/15 text-emerald-400" :
                                  entry.status === "izin" ? "bg-amber-500/15 text-amber-400" :
                                  entry.status === "sakit" ? "bg-sky-500/15 text-sky-400" :
                                  "bg-red-500/15 text-red-400"
                                }`}>
                                  {STATUS_LABELS[entry.status] || entry.status}
                                </Badge>
                                {entry.status === "hadir" && (
                                  <Badge variant="outline" className={`text-[7px] px-1.5 py-0 border-0 ${
                                    entry.attendance_type === "pulang" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"
                                  }`}>
                                    {entry.attendance_type === "pulang" ? "↗ Pulang" : "↙ Datang"}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs font-mono text-slate-500 font-semibold min-w-[36px] text-right tabular-nums">{entry.time?.slice(0, 5)}</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Per Class Summary */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="h-5 w-5 text-indigo-400" />
            <h2 className="text-base lg:text-lg font-bold text-white">Ringkasan Per Kelas</h2>
            <Badge variant="secondary" className="text-[10px] bg-white/5 text-slate-400 border-0">{classNames.length} kelas</Badge>
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
                  <div className={`rounded-xl ring-1 p-4 transition-all ${
                    allDone
                      ? "bg-emerald-500/5 ring-emerald-500/20 shadow-lg shadow-emerald-500/5"
                      : "bg-white/5 ring-white/10"
                  }`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                        allDone ? "bg-emerald-500/15 text-emerald-400" : "bg-indigo-500/15 text-indigo-400"
                      }`}>
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-sm text-white">{cls}</h3>
                          {allDone && <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[8px]">✓ Lengkap</Badge>}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span className="flex items-center gap-0.5"><Users className="h-2.5 w-2.5" /> {classStudents.length}</span>
                          <span className="flex items-center gap-0.5 text-emerald-400"><UserCheck className="h-2.5 w-2.5" /> {hadir}</span>
                          <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {belum}</span>
                        </div>
                      </div>
                      <p className={`text-xl font-extrabold tabular-nums ${allDone ? "text-emerald-400" : "text-indigo-400"}`}>{pct}%</p>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <motion.div className={`h-full rounded-full ${allDone ? "bg-emerald-500" : "bg-gradient-to-r from-indigo-500 to-violet-500"}`}
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4 border-t border-white/5">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <LiveDot />
            <span>ATSkolla — Absensi Digital Sekolah • Auto-refresh setiap 5 detik</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicAttendanceMonitoring;
