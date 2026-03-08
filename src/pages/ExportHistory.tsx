import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, FileText, Calendar, ChevronLeft, ChevronRight, Crown, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const STATUS_LABELS: Record<string, string> = { hadir: "Hadir", izin: "Izin", sakit: "Sakit", alfa: "Alfa" };

const ExportHistory = () => {
  const { profile } = useAuth();
  const features = useSubscriptionFeatures();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (!profile?.school_id) return;
    const fetchLogs = async () => {
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().slice(0, 10);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().slice(0, 10);
      const { data } = await supabase.from("attendance_logs")
        .select("*, students(name, class, parent_name)")
        .eq("school_id", profile.school_id)
        .gte("date", startOfMonth)
        .lte("date", endOfMonth)
        .order("date", { ascending: false });
      setLogs(data || []);
      setLoading(false);
    };
    fetchLogs();
  }, [profile?.school_id, currentMonth]);

  const dailyStats = useMemo(() => {
    const map: Record<string, number> = {};
    logs.forEach(l => { map[l.date] = (map[l.date] || 0) + 1; });
    return map;
  }, [logs]);

  const chartData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, d) => {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d + 1).padStart(2, "0")}`;
      return { day: d + 1, jumlah: dailyStats[dateStr] || 0 };
    });
  }, [currentMonth, dailyStats]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: { date: number; dateStr: string; count: number }[] = [];
    for (let i = 0; i < firstDay; i++) days.push({ date: 0, dateStr: "", count: 0 });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ date: d, dateStr, count: dailyStats[dateStr] || 0 });
    }
    return days;
  }, [currentMonth, dailyStats]);

  const getLogsForDate = (dateStr: string) => logs.filter(l => l.date === dateStr);

  const exportDateExcel = (dateStr: string) => {
    const dayLogs = getLogsForDate(dateStr);
    if (!dayLogs.length) { toast.error("Tidak ada data"); return; }
    const data = dayLogs.map((l, i) => ({
      "No": i + 1, "Nama Siswa": l.students?.name || "-", "Kelas": l.students?.class || "-",
      "Jam": l.time?.slice(0, 5), "Metode": l.method, "Status": STATUS_LABELS[l.status] || l.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Absensi");
    XLSX.writeFile(wb, `absensi-${dateStr}.xlsx`);
    toast.success("Excel berhasil diunduh!");
  };

  const exportDatePDF = (dateStr: string) => {
    const dayLogs = getLogsForDate(dateStr);
    if (!dayLogs.length) { toast.error("Tidak ada data"); return; }
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Laporan Absensi Harian", 14, 20);
    doc.setFontSize(10);
    doc.text(`Tanggal: ${new Date(dateStr).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`, 14, 28);
    const tableData = dayLogs.map((l, i) => [i + 1, l.students?.name || "-", l.students?.class || "-", l.time?.slice(0, 5), l.method, STATUS_LABELS[l.status] || l.status]);
    (doc as any).autoTable({ startY: 36, head: [["No", "Nama", "Kelas", "Jam", "Metode", "Status"]], body: tableData,
      styles: { fontSize: 9 }, headStyles: { fillColor: [79, 70, 229] } });
    doc.save(`absensi-${dateStr}.pdf`);
    toast.success("PDF berhasil diunduh!");
  };

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selectedLogs = selectedDate ? getLogsForDate(selectedDate) : [];

  const getDotColor = (count: number) => {
    if (count === 0) return "";
    if (count <= 5) return "bg-primary/30";
    if (count <= 15) return "bg-primary/60";
    return "bg-primary";
  };

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const totalThisMonth = logs.length;
  const daysWithActivity = Object.keys(dailyStats).length;
  const avgPerDay = daysWithActivity ? Math.round(totalThisMonth / daysWithActivity) : 0;

  const isPremiumFeature = !features.canExportReport;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Rekap & Export Absensi</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">Lihat statistik kehadiran dan export laporan per hari</p>
      </div>

      {isPremiumFeature && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-card bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
                  <Crown className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5" /> Fitur Premium
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Export laporan ke Excel & PDF tersedia di paket <span className="font-semibold">Basic</span> ke atas. Upgrade sekarang untuk akses penuh!
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={() => navigate("/subscription")} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shrink-0">
                <Crown className="h-3.5 w-3.5 mr-1.5" /> Upgrade Sekarang
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Absensi", value: totalThisMonth, color: "text-primary" },
          { label: "Hari Aktif", value: daysWithActivity, color: "text-success" },
          { label: "Rata-rata/Hari", value: avgPerDay, color: "text-foreground" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-0 shadow-card">
              <CardContent className="p-3 text-center">
                <p className={`text-xl sm:text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <h3 className="text-sm font-bold text-foreground mb-3">Statistik Absensi Harian</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  labelFormatter={(v) => `Tanggal ${v}`} formatter={(v: number) => [`${v} siswa`, "Absensi"]} />
                <Line type="monotone" dataKey="jumlah" className="stroke-primary" strokeWidth={2} dot={false} activeDot={{ r: 4, className: "fill-primary" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}><ChevronLeft className="h-3.5 w-3.5" /></Button>
              <h3 className="text-xs font-bold text-foreground">{currentMonth.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}><ChevronRight className="h-3.5 w-3.5" /></Button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 mb-0.5">
              {["Mi", "Se", "Sl", "Ra", "Ka", "Ju", "Sa"].map(d => (
                <div key={d} className="text-center text-[9px] font-semibold text-muted-foreground py-0.5">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.map((day, idx) => (
                <button key={idx} disabled={day.date === 0} onClick={() => day.date > 0 && setSelectedDate(day.dateStr)}
                  className={`relative rounded-md flex flex-col items-center justify-center text-[11px] py-1.5 transition-all
                    ${day.date === 0 ? "invisible" : "hover:bg-muted cursor-pointer"}
                    ${selectedDate === day.dateStr ? "ring-1.5 ring-primary bg-primary/10" : ""}
                    ${new Date().toISOString().slice(0, 10) === day.dateStr ? "bg-primary/5 font-bold" : ""}
                  `}>
                  <span className="text-foreground leading-none">{day.date || ""}</span>
                  {day.count > 0 && <span className={`h-1 w-1 rounded-full mt-0.5 ${getDotColor(day.count)}`} />}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedDate ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-0 shadow-card h-full">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      {new Date(selectedDate).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                    </h3>
                    <p className="text-xs text-muted-foreground">{selectedLogs.length} absensi tercatat</p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" disabled={isPremiumFeature} onClick={() => isPremiumFeature ? toast.error("Upgrade ke paket Basic untuk export") : exportDateExcel(selectedDate)} className="text-xs h-7 px-2">
                      <FileSpreadsheet className="h-3 w-3 mr-1" /> Excel {isPremiumFeature && <Lock className="h-3 w-3 ml-1" />}
                    </Button>
                    <Button variant="outline" size="sm" disabled={isPremiumFeature} onClick={() => isPremiumFeature ? toast.error("Upgrade ke paket Basic untuk export") : exportDatePDF(selectedDate)} className="text-xs h-7 px-2">
                      <FileText className="h-3 w-3 mr-1" /> PDF {isPremiumFeature && <Lock className="h-3 w-3 ml-1" />}
                    </Button>
                  </div>
                </div>
                {selectedLogs.length > 0 ? (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto">
                    {selectedLogs.map((l, i) => (
                      <div key={l.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                        <span className="text-muted-foreground text-xs w-5">{i + 1}.</span>
                        <span className="font-medium text-foreground flex-1 truncate">{l.students?.name || "-"}</span>
                        <Badge variant="secondary" className="text-[10px]">{l.students?.class}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{STATUS_LABELS[l.status] || l.status}</Badge>
                        <span className="text-xs text-muted-foreground">{l.time?.slice(0, 5)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Tidak ada data absensi</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <Card className="border-0 shadow-card flex items-center justify-center">
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Pilih tanggal di kalender untuk melihat detail</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ExportHistory;