import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, FileText, ChevronLeft, ChevronRight, Crown, Lock, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { motion } from "framer-motion";
import { PremiumGate } from "@/components/PremiumGate";

const STATUS_CODES: Record<string, string> = { hadir: "H", sakit: "S", izin: "I", alfa: "A" };
const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

interface StudentRow {
  id: string;
  name: string;
  student_id: string;
  days: Record<number, string>;
  totals: { H: number; S: number; I: number; A: number };
}

const STATUS_EXCEL_COLORS: Record<string, { bg: string; fg: string }> = {
  H: { bg: "#dcfce7", fg: "#16a34a" },
  S: { bg: "#dbeafe", fg: "#2563eb" },
  I: { bg: "#fef9c3", fg: "#ca8a04" },
  A: { bg: "#fecaca", fg: "#dc2626" },
};

const ExportHistory = () => {
  const { user, profile, roles } = useAuth();
  const features = useSubscriptionFeatures();
  const navigate = useNavigate();

  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [students, setStudents] = useState<{ id: string; name: string; student_id: string }[]>([]);
  const [datangLogs, setDatangLogs] = useState<any[]>([]);
  const [pulangLogs, setPulangLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState("");
  const [schoolAddress, setSchoolAddress] = useState("");
  const [waliKelasName, setWaliKelasName] = useState("");
  const [rekapTab, setRekapTab] = useState<"datang" | "pulang">("datang");
  const tableRef = useRef<HTMLDivElement>(null);

  const isTeacher = roles.includes("teacher");
  const isPremiumFeature = !features.canExportReport;

  // Fetch classes - merge from classes table + distinct student classes
  useEffect(() => {
    if (!profile?.school_id) return;
    const fetchClasses = async () => {
      if (isTeacher && user) {
        const { data } = await supabase
          .from("class_teachers")
          .select("class_name")
          .eq("user_id", user.id)
          .eq("school_id", profile.school_id);
        const names = (data || []).map(d => d.class_name);
        setClasses(names);
        if (names.length > 0) setSelectedClass(names[0]);
      } else {
        // Fetch from classes table AND distinct student classes, merge unique
        const [classesRes, studentsRes] = await Promise.all([
          supabase.from("classes").select("name").eq("school_id", profile.school_id).order("name"),
          supabase.from("students").select("class").eq("school_id", profile.school_id),
        ]);
        const fromClasses = (classesRes.data || []).map(d => d.name);
        const fromStudents = [...new Set((studentsRes.data || []).map(d => d.class))];
        const merged = [...new Set([...fromClasses, ...fromStudents])].sort();
        setClasses(merged);
        if (merged.length > 0) setSelectedClass(merged[0]);
      }
    };
    fetchClasses();
  }, [profile?.school_id, user, isTeacher]);

  // Fetch school info
  useEffect(() => {
    if (!profile?.school_id) return;
    const fetchSchool = async () => {
      const { data } = await supabase.from("schools").select("name, address").eq("id", profile.school_id).maybeSingle();
      if (data) { setSchoolName(data.name); setSchoolAddress(data.address || ""); }
    };
    fetchSchool();
  }, [profile?.school_id]);

  // Fetch wali kelas name
  useEffect(() => {
    if (!profile?.school_id || !selectedClass) return;
    const fetchWali = async () => {
      const { data } = await supabase
        .from("class_teachers")
        .select("user_id")
        .eq("school_id", profile.school_id)
        .eq("class_name", selectedClass)
        .maybeSingle();
      if (data?.user_id) {
        const { data: prof } = await supabase.from("profiles").select("full_name").eq("user_id", data.user_id).maybeSingle();
        setWaliKelasName(prof?.full_name || "");
      } else {
        setWaliKelasName("");
      }
    };
    fetchWali();
  }, [profile?.school_id, selectedClass]);

  // Fetch students & attendance for selected class + month
  useEffect(() => {
    if (!profile?.school_id || !selectedClass) { setLoading(false); return; }
    const fetchData = async () => {
      setLoading(true);
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, "0")}`;

      const [studentsRes, datangRes, pulangRes] = await Promise.all([
        supabase.from("students").select("id, name, student_id").eq("school_id", profile.school_id).eq("class", selectedClass).order("name"),
        supabase.from("attendance_logs").select("student_id, date, status, attendance_type").eq("school_id", profile.school_id).eq("attendance_type", "datang").gte("date", startDate).lte("date", endDate),
        supabase.from("attendance_logs").select("student_id, date, status, attendance_type").eq("school_id", profile.school_id).eq("attendance_type", "pulang").gte("date", startDate).lte("date", endDate),
      ]);
      setStudents(studentsRes.data || []);
      setDatangLogs(datangRes.data || []);
      setPulangLogs(pulangRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [profile?.school_id, selectedClass, currentMonth]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();

  const buildStudentRows = (logs: any[]): StudentRow[] => {
    const studentIds = new Set(students.map(s => s.id));
    const filteredLogs = logs.filter(l => studentIds.has(l.student_id));
    return students.map(s => {
      const days: Record<number, string> = {};
      const totals = { H: 0, S: 0, I: 0, A: 0 };
      filteredLogs.filter(l => l.student_id === s.id).forEach(l => {
        const day = parseInt(l.date.split("-")[2]);
        const code = STATUS_CODES[l.status] || "";
        days[day] = code;
        if (code in totals) totals[code as keyof typeof totals]++;
      });
      return { id: s.id, name: s.name, student_id: s.student_id, days, totals };
    });
  };

  const studentRows: StudentRow[] = useMemo(() => buildStudentRows(datangLogs), [students, datangLogs]);
  const pulangRows: StudentRow[] = useMemo(() => buildStudentRows(pulangLogs), [students, pulangLogs]);
  const activeRows = rekapTab === "datang" ? studentRows : pulangRows;

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const monthLabel = `${MONTH_NAMES[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  // Export Excel with colored cells via HTML table blob
  const exportExcel = () => {
    if (isPremiumFeature) { toast.error("Upgrade ke paket Basic untuk export"); return; }
    if (!activeRows.length) { toast.error("Tidak ada data"); return; }
    const titleLabel = rekapTab === "datang" ? "ABSENSI SISWA" : "REKAP KEPULANGAN SISWA";

    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><style>
      td, th { border: 1px solid #999; padding: 3px 4px; font-family: Arial; font-size: 9pt; text-align: center; }
      th { background: #4f46e5; color: white; font-weight: bold; }
      .name { text-align: left; min-width: 120px; }
      .title { font-size: 14pt; font-weight: bold; text-align: center; border: none; }
      .subtitle { font-size: 11pt; text-align: center; border: none; }
      .H { background: ${STATUS_EXCEL_COLORS.H.bg}; color: ${STATUS_EXCEL_COLORS.H.fg}; font-weight: bold; }
      .S { background: ${STATUS_EXCEL_COLORS.S.bg}; color: ${STATUS_EXCEL_COLORS.S.fg}; font-weight: bold; }
      .I { background: ${STATUS_EXCEL_COLORS.I.bg}; color: ${STATUS_EXCEL_COLORS.I.fg}; font-weight: bold; }
      .A { background: ${STATUS_EXCEL_COLORS.A.bg}; color: ${STATUS_EXCEL_COLORS.A.fg}; font-weight: bold; }
    </style></head><body><table>`;

    const totalCols = 3 + daysInMonth + 4;
    html += `<tr><td colspan="${totalCols}" class="title">${titleLabel}</td></tr>`;
    html += `<tr><td colspan="${totalCols}" class="subtitle">BULAN : ${monthLabel.toUpperCase()}</td></tr>`;
    html += `<tr><td colspan="${totalCols}" class="subtitle">Kelas : ${selectedClass}</td></tr>`;
    html += `<tr><td colspan="${totalCols}"></td></tr>`;

    // Header
    html += `<tr><th rowspan="2">NO</th><th rowspan="2">NIS</th><th rowspan="2" class="name">NAMA SISWA</th>`;
    html += `<th colspan="${daysInMonth}">TANGGAL</th><th colspan="4">KET</th></tr>`;
    html += `<tr>`;
    for (let d = 1; d <= daysInMonth; d++) html += `<th>${d}</th>`;
    html += `<th class="H">H</th><th class="S">S</th><th class="I">I</th><th class="A">A</th></tr>`;

    // Data
    activeRows.forEach((s, i) => {
      html += `<tr><td>${i + 1}</td><td>${s.student_id}</td><td class="name">${s.name}</td>`;
      for (let d = 1; d <= daysInMonth; d++) {
        const code = s.days[d] || "";
        html += `<td${code ? ` class="${code}"` : ""}>${code}</td>`;
      }
      html += `<td class="H">${s.totals.H || ""}</td><td class="S">${s.totals.S || ""}</td>`;
      html += `<td class="I">${s.totals.I || ""}</td><td class="A">${s.totals.A || ""}</td></tr>`;
    });

    // Signature
    html += `<tr><td colspan="${totalCols}"></td></tr><tr><td colspan="${totalCols}"></td></tr>`;
    html += `<tr><td colspan="${totalCols}" style="text-align:right;border:none">${schoolAddress || schoolName}, ........................ ${currentMonth.getFullYear()}</td></tr>`;
    html += `<tr><td colspan="${totalCols}" style="text-align:right;border:none;font-weight:bold">WALI KELAS ${selectedClass}</td></tr>`;
    html += `<tr><td colspan="${totalCols}" style="border:none"></td></tr>`;
    html += `<tr><td colspan="${totalCols}" style="border:none"></td></tr>`;
    html += `<tr><td colspan="${totalCols}" style="border:none"></td></tr>`;
    html += `<tr><td colspan="${totalCols}" style="text-align:right;border:none;font-weight:bold">${waliKelasName ? `( ${waliKelasName} )` : "(..................................)"}</td></tr>`;

    html += `</table></body></html>`;

    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const filePrefix = rekapTab === "datang" ? "Absensi" : "Kepulangan";
    a.download = `${filePrefix}-${selectedClass}-${monthLabel}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Excel berhasil diunduh!");
  };

  // Export PDF
  const exportPDF = () => {
    if (isPremiumFeature) { toast.error("Upgrade ke paket Basic untuk export"); return; }
    if (!activeRows.length) { toast.error("Tidak ada data"); return; }
    const titleLabel = rekapTab === "datang" ? "ABSENSI SISWA" : "REKAP KEPULANGAN SISWA";

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFontSize(14);
    doc.text(titleLabel, doc.internal.pageSize.getWidth() / 2, 15, { align: "center" });
    doc.setFontSize(11);
    doc.text(`BULAN : ${monthLabel.toUpperCase()}`, doc.internal.pageSize.getWidth() / 2, 22, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Kelas : ${selectedClass}`, 14, 30);

    const head = [["NO", "NIS", "NAMA", ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1)), "H", "S", "I", "A"]];
    const body = activeRows.map((s, i) => {
      const row: (string | number)[] = [i + 1, s.student_id, s.name];
      for (let d = 1; d <= daysInMonth; d++) row.push(s.days[d] || "");
      row.push(s.totals.H, s.totals.S, s.totals.I, s.totals.A);
      return row;
    });

    const statusColors: Record<string, { bg: [number, number, number]; fg: [number, number, number] }> = {
      H: { bg: [220, 252, 231], fg: [22, 163, 74] },
      S: { bg: [219, 234, 254], fg: [37, 99, 235] },
      I: { bg: [254, 249, 195], fg: [202, 138, 4] },
      A: { bg: [254, 202, 202], fg: [220, 38, 38] },
    };

    (doc as any).autoTable({
      startY: 35,
      head,
      body,
      styles: { fontSize: 5.5, cellPadding: 1, halign: "center", lineWidth: 0.1, lineColor: [180, 180, 180] },
      headStyles: { fillColor: [79, 70, 229], fontSize: 5.5, textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 7 },
        1: { cellWidth: 13 },
        2: { cellWidth: 28, halign: "left" },
      },
      didParseCell: (data: any) => {
        if (data.section === "body") {
          const cellText = String(data.cell.raw);
          const colIdx = data.column.index;
          const totalCols = 3 + daysInMonth;
          // Color status cells in the day columns
          if (colIdx >= 3 && colIdx < totalCols && cellText in statusColors) {
            data.cell.styles.fillColor = statusColors[cellText].bg;
            data.cell.styles.textColor = statusColors[cellText].fg;
            data.cell.styles.fontStyle = "bold";
          }
          // Color summary columns
          const summaryMap = ["H", "S", "I", "A"];
          if (colIdx >= totalCols) {
            const key = summaryMap[colIdx - totalCols];
            if (key && statusColors[key]) {
              data.cell.styles.textColor = statusColors[key].fg;
              data.cell.styles.fontStyle = "bold";
            }
          }
        }
      },
      didDrawPage: () => {
        const pageH = doc.internal.pageSize.getHeight();
        const pageW = doc.internal.pageSize.getWidth();
        doc.setFontSize(9);
        doc.text(`${schoolAddress || schoolName}, ........................ ${currentMonth.getFullYear()}`, pageW - 14, pageH - 35, { align: "right" });
        doc.text(`WALI KELAS ${selectedClass}`, pageW - 14, pageH - 30, { align: "right" });
        doc.text(waliKelasName ? `( ${waliKelasName} )` : "(..................................)", pageW - 14, pageH - 12, { align: "right" });
      },
    });

    const filePrefix = rekapTab === "datang" ? "Absensi" : "Kepulangan";
    doc.save(`${filePrefix}-${selectedClass}-${monthLabel}.pdf`);
    toast.success("PDF berhasil diunduh!");
  };

  const getCellColor = (code: string) => {
    switch (code) {
      case "H": return "bg-success/15 text-success";
      case "S": return "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400";
      case "I": return "bg-warning/15 text-warning";
      case "A": return "bg-destructive/15 text-destructive";
      default: return "";
    }
  };

  return (
    <PremiumGate featureLabel="Rekap & Export" featureKey="canExportReport" requiredPlan="Basic">
      <div className="space-y-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Rekap & Export Absensi</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Format absensi bulanan nasional per kelas</p>
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
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Lock className="h-3.5 w-3.5" /> Fitur Premium</h3>
                    <p className="text-xs text-muted-foreground">Export laporan ke Excel & PDF tersedia di paket <span className="font-semibold">Basic</span> ke atas.</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => navigate("/subscription")} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shrink-0">
                  <Crown className="h-3.5 w-3.5 mr-1.5" /> Upgrade
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Controls */}
        <Card className="border-0 shadow-card">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1 w-full sm:w-auto">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Kelas</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                  <SelectContent>
                    {classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Bulan</label>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="text-sm font-semibold text-foreground min-w-[140px] text-center">{monthLabel}</span>
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="sm:ml-auto flex gap-2">
                <Button variant="outline" size="sm" disabled={isPremiumFeature} onClick={exportExcel} className="text-xs">
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" /> Excel {isPremiumFeature && <Lock className="h-3 w-3 ml-1" />}
                </Button>
                <Button variant="outline" size="sm" disabled={isPremiumFeature} onClick={exportPDF} className="text-xs">
                  <FileText className="h-3.5 w-3.5 mr-1.5" /> PDF {isPremiumFeature && <Lock className="h-3 w-3 ml-1" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs: Datang / Pulang */}
        <Tabs value={rekapTab} onValueChange={(v) => setRekapTab(v as "datang" | "pulang")}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="datang" className="flex-1 sm:flex-none text-xs sm:text-sm">📋 Rekap Kehadiran</TabsTrigger>
            <TabsTrigger value="pulang" className="flex-1 sm:flex-none text-xs sm:text-sm">🏠 Rekap Kepulangan</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Summary cards */}
        {activeRows.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Siswa", value: activeRows.length, color: "text-primary" },
              { label: rekapTab === "datang" ? "Total Hadir" : "Total Pulang", value: activeRows.reduce((a, s) => a + s.totals.H, 0), color: "text-success" },
              { label: "Total Sakit", value: activeRows.reduce((a, s) => a + s.totals.S, 0), color: "text-blue-500" },
              { label: "Total Alfa", value: activeRows.reduce((a, s) => a + s.totals.A, 0), color: "text-destructive" },
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
        )}

        {/* National format attendance table */}
        <Card className="border-0 shadow-card overflow-hidden">
          <CardContent className="p-0">
            <div className="p-4 border-b border-border text-center">
              <h2 className="text-base font-bold text-foreground tracking-wide">
                {rekapTab === "datang" ? "ABSENSI SISWA" : "REKAP KEPULANGAN SISWA"}
              </h2>
              <p className="text-sm text-muted-foreground font-semibold">BULAN : {monthLabel.toUpperCase()}</p>
              <p className="text-xs text-muted-foreground">Kelas : {selectedClass || "-"}</p>
            </div>

            {loading ? (
              <div className="p-10 text-center text-muted-foreground text-sm">Memuat data...</div>
            ) : activeRows.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm">
                {selectedClass ? "Tidak ada siswa di kelas ini" : "Pilih kelas untuk melihat rekap"}
              </div>
            ) : (
              <div className="overflow-x-auto" ref={tableRef}>
                <table className="w-full text-xs border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-muted/60">
                      <th rowSpan={2} className="border border-border px-2 py-2 text-center font-bold w-10 sticky left-0 bg-muted/60 z-10">NO</th>
                      <th rowSpan={2} className="border border-border px-2 py-2 text-center font-bold w-20">NIS</th>
                      <th rowSpan={2} className="border border-border px-2 py-2 text-left font-bold min-w-[140px]">NAMA SISWA</th>
                      <th colSpan={daysInMonth} className="border border-border px-1 py-1.5 text-center font-bold">TANGGAL</th>
                      <th colSpan={4} className="border border-border px-1 py-1.5 text-center font-bold">KET</th>
                    </tr>
                    <tr className="bg-muted/40">
                      {Array.from({ length: daysInMonth }, (_, i) => (
                        <th key={i} className="border border-border px-0.5 py-1 text-center font-semibold w-7 text-[10px]">{i + 1}</th>
                      ))}
                      <th className="border border-border px-1 py-1 text-center font-bold text-success w-7">H</th>
                      <th className="border border-border px-1 py-1 text-center font-bold text-blue-500 w-7">S</th>
                      <th className="border border-border px-1 py-1 text-center font-bold text-warning w-7">I</th>
                      <th className="border border-border px-1 py-1 text-center font-bold text-destructive w-7">A</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentRows.map((s, i) => (
                      <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                        <td className="border border-border px-1 py-1.5 text-center font-medium sticky left-0 bg-card z-10">{i + 1}</td>
                        <td className="border border-border px-2 py-1.5 text-center font-mono text-[10px]">{s.student_id}</td>
                        <td className="border border-border px-2 py-1.5 text-left font-medium truncate max-w-[160px]">{s.name}</td>
                        {Array.from({ length: daysInMonth }, (_, d) => {
                          const code = s.days[d + 1] || "";
                          return (
                            <td key={d} className={`border border-border px-0 py-1 text-center text-[10px] font-bold ${getCellColor(code)}`}>
                              {code}
                            </td>
                          );
                        })}
                        <td className="border border-border px-1 py-1 text-center font-bold text-success">{s.totals.H || ""}</td>
                        <td className="border border-border px-1 py-1 text-center font-bold text-blue-500">{s.totals.S || ""}</td>
                        <td className="border border-border px-1 py-1 text-center font-bold text-warning">{s.totals.I || ""}</td>
                        <td className="border border-border px-1 py-1 text-center font-bold text-destructive">{s.totals.A || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Signature footer */}
            {studentRows.length > 0 && (
              <div className="p-6 border-t border-border">
                <div className="flex justify-end">
                  <div className="text-center text-xs text-muted-foreground space-y-1">
                    <p>{schoolAddress || schoolName}, ........................ {currentMonth.getFullYear()}</p>
                    <p className="font-semibold text-foreground">WALI KELAS {selectedClass}</p>
                    <div className="h-16" />
                    <p className="font-semibold text-foreground border-b border-foreground inline-block min-w-[180px]">
                      {waliKelasName ? `( ${waliKelasName} )` : "(.................................)"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PremiumGate>
  );
};

export default ExportHistory;
