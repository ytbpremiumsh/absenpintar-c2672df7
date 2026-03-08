import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Users, UserCheck, UserX, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const Classes = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [todayLogs, setTodayLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.school_id) return;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [studentsRes, logsRes] = await Promise.all([
        supabase.from("students").select("*").eq("school_id", profile.school_id).order("class").order("name"),
        supabase.from("pickup_logs").select("*").eq("school_id", profile.school_id).gte("pickup_time", today.toISOString()),
      ]);

      setStudents(studentsRes.data || []);
      setTodayLogs(logsRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [profile?.school_id]);

  const classData = useMemo(() => {
    const groups: Record<string, { students: any[]; pickedUp: number }> = {};
    for (const s of students) {
      if (!groups[s.class]) groups[s.class] = { students: [], pickedUp: 0 };
      groups[s.class].students.push(s);
      if (todayLogs.some((l) => l.student_id === s.id)) {
        groups[s.class].pickedUp++;
      }
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [students, todayLogs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Daftar Kelas</h1>
        <p className="text-muted-foreground text-sm">Kelola dan lihat statistik per kelas</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="shadow-card border-0">
          <CardContent className="p-4 text-center">
            <GraduationCap className="h-6 w-6 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{classData.length}</p>
            <p className="text-xs text-muted-foreground">Total Kelas</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0">
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{students.length}</p>
            <p className="text-xs text-muted-foreground">Total Siswa</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0">
          <CardContent className="p-4 text-center">
            <UserCheck className="h-6 w-6 mx-auto mb-1 text-success" />
            <p className="text-2xl font-bold text-success">{todayLogs.length}</p>
            <p className="text-xs text-muted-foreground">Dijemput Hari Ini</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0">
          <CardContent className="p-4 text-center">
            <UserX className="h-6 w-6 mx-auto mb-1 text-destructive" />
            <p className="text-2xl font-bold text-destructive">{students.length - todayLogs.length}</p>
            <p className="text-xs text-muted-foreground">Belum Dijemput</p>
          </CardContent>
        </Card>
      </div>

      {/* Class Cards */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Memuat data...</div>
      ) : classData.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Belum ada data kelas</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classData.map(([cls, info], i) => {
            const percentage = info.students.length
              ? Math.round((info.pickedUp / info.students.length) * 100)
              : 0;
            return (
              <motion.div
                key={cls}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  className="shadow-card border-0 hover:shadow-elevated transition-all cursor-pointer group"
                  onClick={() => navigate(`/students?class=${encodeURIComponent(cls)}`)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center">
                          <GraduationCap className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">Kelas {cls}</h3>
                          <p className="text-xs text-muted-foreground">{info.students.length} siswa</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>

                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Penjemputan hari ini</span>
                        <span className="font-semibold">{info.pickedUp}/{info.students.length}</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-success"
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.8, delay: i * 0.05 }}
                        />
                      </div>
                    </div>

                    {/* Status badges */}
                    <div className="flex gap-2 mt-3">
                      <Badge className="bg-success/10 text-success border-0 text-[10px]">
                        <UserCheck className="h-3 w-3 mr-1" />
                        {info.pickedUp} dijemput
                      </Badge>
                      <Badge variant="destructive" className="text-[10px]">
                        <UserX className="h-3 w-3 mr-1" />
                        {info.students.length - info.pickedUp} menunggu
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Classes;
