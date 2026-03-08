import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  UserCheck, UserX, Clock, School, Users, RefreshCw,
  GraduationCap, Activity, TrendingUp, Columns2, Columns3, Columns4,
  Eye, EyeOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  settings?: { is_active: boolean };
}

const LiveDot = () => (
  <span className="relative flex h-2.5 w-2.5">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
  </span>
);

const StudentCard = ({ student, index }: { student: StudentStatus; index: number }) => {
  const isPickedUp = student.status === "picked_up";
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }} transition={{ delay: index * 0.02, type: "spring", stiffness: 400, damping: 30 }}>
      <div className={`group relative flex items-center gap-3 rounded-xl p-3 transition-all duration-300 hover:shadow-elevated ${
        isPickedUp ? "bg-success/5 border border-success/20" : "bg-destructive/5 border border-destructive/20"
      }`}>
        <div className={`relative h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
          isPickedUp ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
        }`}>
          {student.name.charAt(0)}
          {!isPickedUp && <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-destructive animate-pulse border-2 border-card" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{student.name}</p>
          <p className="text-xs text-muted-foreground">NIS: {student.student_id} • {student.parent_name}</p>
        </div>
        <div className="text-right shrink-0">
          {isPickedUp ? (
            <>
              <Badge className="bg-success/10 text-success border-success/20 text-[10px] font-semibold">
                <UserCheck className="h-3 w-3 mr-1" /> Dijemput
              </Badge>
              {student.pickup_time && (
                <div className="flex items-center gap-1 text-muted-foreground mt-1 justify-end">
                  <Clock className="h-3 w-3" />
                  <span className="text-[10px]">{new Date(student.pickup_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              )}
            </>
          ) : (
            <Badge variant="destructive" className="text-[10px] font-semibold animate-pulse">
              <UserX className="h-3 w-3 mr-1" /> Menunggu
            </Badge>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const ClassCard = ({
  className: cls, students, isExpanded, onToggle, showProgress,
}: {
  className: string; students: StudentStatus[]; isExpanded: boolean; onToggle: () => void; showProgress: boolean;
}) => {
  const picked = students.filter((s) => s.status === "picked_up").length;
  const total = students.length;
  const percentage = total ? Math.round((picked / total) * 100) : 0;
  const waiting = total - picked;
  const allDone = waiting === 0;

  return (
    <motion.div layout transition={{ type: "spring", stiffness: 300, damping: 30 }}>
      <Card className={`overflow-hidden border transition-all duration-300 cursor-pointer ${
        allDone ? "border-success/30 shadow-[0_0_15px_-3px_hsl(var(--success)/0.15)]" : "border-border shadow-card hover:shadow-elevated"
      }`}>
        <div onClick={onToggle} className="p-4 flex items-center gap-4">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
            allDone ? "bg-success/15 text-success" : "gradient-primary text-primary-foreground"
          }`}>
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-base text-foreground">{cls}</h3>
              {allDone && <Badge className="bg-success/10 text-success border-success/20 text-[10px]">✓ Selesai</Badge>}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {total} siswa</span>
              <span className="flex items-center gap-1 text-success"><UserCheck className="h-3 w-3" /> {picked}</span>
              <span className="flex items-center gap-1 text-destructive"><UserX className="h-3 w-3" /> {waiting}</span>
            </div>
          </div>
          <p className={`text-xl font-extrabold shrink-0 ${allDone ? "text-success" : "text-primary"}`}>{percentage}%</p>
        </div>

        {showProgress && (
          <div className="px-4 pb-3">
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <motion.div className={`h-full rounded-full ${allDone ? "bg-success" : "bg-gradient-to-r from-primary to-primary/70"}`}
                initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
            </div>
          </div>
        )}

        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
              <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
                {students.sort((a, b) => (a.status === "waiting" ? -1 : 1)).map((s, i) => (
                  <StudentCard key={s.id} student={s} index={i} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

const PublicMonitoring = () => {
  const { schoolId } = useParams<{ schoolId: string }>();
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showProgress, setShowProgress] = useState(true);
  const [columns, setColumns] = useState("2");

  const fetchData = async (showRefresh = false) => {
    if (!schoolId) return;
    if (showRefresh) setIsRefreshing(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-monitoring?school_id=${schoolId}`;
      const res = await fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
      const json = await res.json();
      if (json.error) return;
      setData(json);
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
    const channel = supabase.channel("public-monitoring-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pickup_logs" }, () => fetchData(true))
      .subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, [schoolId]);

  const toggleClass = (cls: string) => {
    setExpandedClasses((prev) => { const n = new Set(prev); if (n.has(cls)) n.delete(cls); else n.add(cls); return n; });
  };

  const expandAll = () => {
    if (!data) return;
    const all = Object.keys(data.classes);
    setExpandedClasses(expandedClasses.size === all.length ? new Set() : new Set(all));
  };

  const colsClass = columns === "1" ? "grid-cols-1" : columns === "2" ? "md:grid-cols-2" : columns === "3" ? "md:grid-cols-3" : "md:grid-cols-4";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
            <School className="h-8 w-8 text-primary-foreground" />
          </motion.div>
          <p className="text-muted-foreground font-medium">Memuat data realtime...</p>
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
  const isActive = data.settings?.is_active !== false;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-hero text-primary-foreground sticky top-0 z-50 shadow-elevated">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <School className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold">{data.school?.name || "Smart Pickup"}</h1>
                <div className="flex items-center gap-2 text-xs opacity-80">
                  {isActive ? <LiveDot /> : <span className="h-2.5 w-2.5 rounded-full bg-destructive" />}
                  <span>{isActive ? "Monitoring Penjemputan Realtime" : "Sistem Penjemputan Nonaktif"}</span>
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

      {/* Inactive Banner */}
      {!isActive && (
        <div className="bg-destructive/10 border-b border-destructive/20 py-3 px-4 text-center">
          <p className="text-sm font-medium text-destructive">⏸ Sistem penjemputan sedang nonaktif. Data tetap ditampilkan untuk referensi.</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Users, value: data.total, label: "Total Siswa", color: "text-primary", bg: "bg-primary/10" },
            { icon: UserCheck, value: data.picked_up, label: "Sudah Dijemput", color: "text-success", bg: "bg-success/10" },
            { icon: UserX, value: waiting, label: "Menunggu", color: "text-destructive", bg: "bg-destructive/10" },
            { icon: TrendingUp, value: `${percentage}%`, label: "Progress", color: "text-primary", bg: "gradient-primary" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-0 shadow-card">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 ${stat.bg.includes("gradient") ? "text-primary-foreground" : stat.color}`} />
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

        {/* Overall Progress */}
        {showProgress && (
          <Card className="border-0 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Progress Keseluruhan</span>
                </div>
                <div className="flex items-center gap-2">
                  <LiveDot />
                  <span className="text-xs text-muted-foreground">Live</span>
                </div>
              </div>
              <div className="h-4 rounded-full bg-secondary overflow-hidden">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-primary via-primary/80 to-success"
                  initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 1.2, ease: "easeOut" }} />
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{data.picked_up} dari {data.total} siswa sudah dijemput</span>
                <span className="font-bold text-primary">{percentage}%</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Per Kelas</h2>
            <Badge variant="secondary" className="text-xs">{classNames.length} kelas</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowProgress(!showProgress)}
              className="text-xs gap-1.5">
              {showProgress ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showProgress ? "Sembunyikan" : "Tampilkan"} Progress
            </Button>
            <Select value={columns} onValueChange={setColumns}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Kolom</SelectItem>
                <SelectItem value="2">2 Kolom</SelectItem>
                <SelectItem value="3">3 Kolom</SelectItem>
                <SelectItem value="4">4 Kolom</SelectItem>
              </SelectContent>
            </Select>
            <button onClick={expandAll} className="text-xs text-primary font-semibold hover:underline">
              {expandedClasses.size === classNames.length ? "Tutup Semua" : "Buka Semua"}
            </button>
          </div>
        </div>

        {/* Class Cards Grid */}
        <div className={`grid ${colsClass} gap-4`}>
          <AnimatePresence>
            {classNames.map((cls) => (
              <ClassCard key={cls} className={cls} students={data.classes[cls]}
                isExpanded={expandedClasses.has(cls)} onToggle={() => toggleClass(cls)} showProgress={showProgress} />
            ))}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="text-center py-6 border-t border-border">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <LiveDot />
            <span>Smart Pickup System • Data diperbarui otomatis setiap 10 detik</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicMonitoring;
