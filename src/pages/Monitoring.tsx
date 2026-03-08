import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { UserCheck, UserX, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

interface StudentWithStatus {
  id: string;
  name: string;
  class: string;
  parent_name: string;
  status: "waiting" | "picked_up";
  pickup_time?: string;
  pickup_by?: string;
}

const Monitoring = () => {
  const { profile } = useAuth();
  const [students, setStudents] = useState<StudentWithStatus[]>([]);

  const fetchData = async () => {
    if (!profile?.school_id) return;
    const schoolId = profile.school_id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [studentsRes, logsRes] = await Promise.all([
      supabase.from("students").select("*").eq("school_id", schoolId),
      supabase.from("pickup_logs").select("*").eq("school_id", schoolId).gte("pickup_time", today.toISOString()),
    ]);

    const allStudents = studentsRes.data || [];
    const logs = logsRes.data || [];

    const mapped: StudentWithStatus[] = allStudents.map((s) => {
      const log = logs.find((l) => l.student_id === s.id);
      return {
        id: s.id,
        name: s.name,
        class: s.class,
        parent_name: s.parent_name,
        status: log ? "picked_up" : "waiting",
        pickup_time: log?.pickup_time,
        pickup_by: log?.pickup_by,
      };
    });

    setStudents(mapped);
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("monitoring-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pickup_logs" }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.school_id]);

  const waiting = students.filter((s) => s.status === "waiting");
  const pickedUp = students.filter((s) => s.status === "picked_up");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Monitoring Penjemputan</h1>
        <p className="text-muted-foreground text-sm">Pantau status penjemputan siswa secara realtime</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Belum Dijemput */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
            <h2 className="font-semibold">Belum Dijemput ({waiting.length})</h2>
          </div>
          <div className="space-y-3">
            {waiting.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="shadow-card border-0 border-l-4 border-l-destructive">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-full bg-destructive/10 flex items-center justify-center text-destructive font-bold">
                        {s.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.class} • Wali: {s.parent_name}</p>
                      </div>
                      <div className="flex items-center gap-1 text-destructive">
                        <UserX className="h-4 w-4" />
                        <span className="text-xs font-medium">Menunggu</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {waiting.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">Semua siswa sudah dijemput 🎉</p>
            )}
          </div>
        </div>

        {/* Sudah Dijemput */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-success" />
            <h2 className="font-semibold">Sudah Dijemput ({pickedUp.length})</h2>
          </div>
          <div className="space-y-3">
            {pickedUp.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="shadow-card border-0 border-l-4 border-l-success">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-full bg-success/10 flex items-center justify-center text-success font-bold">
                        {s.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.class} • Wali: {s.parent_name}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-success">
                          <UserCheck className="h-4 w-4" />
                          <span className="text-xs font-medium">Dijemput</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3" />
                          <span className="text-[11px]">
                            {s.pickup_time
                              ? new Date(s.pickup_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                              : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {pickedUp.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">Belum ada siswa yang dijemput</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Monitoring;
