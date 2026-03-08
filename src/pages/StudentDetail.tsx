import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  User,
  Phone,
  GraduationCap,
  Hash,
  Clock,
  UserCheck,
  UserX,
  Calendar,
  QrCode,
  Shield,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import QRCodeDisplay from "@/components/QRCodeDisplay";

const StudentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [student, setStudent] = useState<any>(null);
  const [pickupHistory, setPickupHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id || !profile?.school_id) return;

      const [studentRes, logsRes] = await Promise.all([
        supabase.from("students").select("*").eq("id", id).eq("school_id", profile.school_id).single(),
        supabase
          .from("pickup_logs")
          .select("*")
          .eq("student_id", id)
          .eq("school_id", profile.school_id)
          .order("pickup_time", { ascending: false })
          .limit(20),
      ]);

      setStudent(studentRes.data);
      setPickupHistory(logsRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [id, profile?.school_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center mx-auto animate-pulse">
            <User className="h-6 w-6 text-primary-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-muted-foreground">Siswa tidak ditemukan</p>
        <Button variant="outline" onClick={() => navigate("/students")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
        </Button>
      </div>
    );
  }

  const todayLogs = pickupHistory.filter((l) => {
    const logDate = new Date(l.pickup_time);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  });

  const isPickedUpToday = todayLogs.length > 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
      </Button>

      {/* Profile Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="shadow-elevated border-0 overflow-hidden">
          <div className="gradient-hero h-28" />
          <CardContent className="relative px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-14">
              <div className="h-24 w-24 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground text-3xl font-bold border-4 border-card shadow-elevated shrink-0">
                {student.name.charAt(0)}
              </div>
              <div className="text-center sm:text-left flex-1 pb-1">
                <h1 className="text-2xl font-bold">{student.name}</h1>
                <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    <GraduationCap className="h-3 w-3 mr-1" />
                    Kelas {student.class}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <Hash className="h-3 w-3 mr-1" />
                    NIS: {student.student_id}
                  </Badge>
                  {isPickedUpToday ? (
                    <Badge className="bg-success/10 text-success border-0 text-xs">
                      <UserCheck className="h-3 w-3 mr-1" />
                      Sudah Dijemput
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      <UserX className="h-3 w-3 mr-1" />
                      Belum Dijemput
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Identity Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="shadow-card border-0 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Identitas Lengkap
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoItem icon={User} label="Nama Lengkap" value={student.name} />
                <InfoItem icon={GraduationCap} label="Kelas" value={student.class} />
                <InfoItem icon={Hash} label="NIS" value={student.student_id} />
                <InfoItem icon={Calendar} label="Terdaftar" value={new Date(student.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} />
              </div>

              <div className="border-t pt-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data Wali / Orang Tua</p>
                <InfoItem icon={User} label="Nama Wali" value={student.parent_name} />
                <InfoItem icon={Phone} label="No. HP Wali" value={student.parent_phone} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* QR Code */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="shadow-card border-0 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <QrCode className="h-4 w-4 text-primary" />
                QR Code Siswa
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-4">
              <QRCodeDisplay
                data={student.qr_code || student.student_id}
                size={200}
                studentName={student.name}
              />
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Scan kode ini untuk memproses penjemputan
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Pickup History */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="shadow-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Riwayat Penjemputan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pickupHistory.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Belum ada riwayat penjemputan</p>
            ) : (
              <div className="space-y-3">
                {pickupHistory.map((log, i) => (
                  <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center text-success shrink-0">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Dijemput oleh {log.pickup_by}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.pickup_time).toLocaleDateString("id-ID", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}{" "}
                        •{" "}
                        {new Date(log.pickup_time).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <Badge className="bg-success/10 text-success border-0 text-[10px] shrink-0">Selesai</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

const InfoItem = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="space-y-1">
    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary shrink-0" />
      <span className="text-sm font-medium">{value}</span>
    </div>
  </div>
);

export default StudentDetail;
