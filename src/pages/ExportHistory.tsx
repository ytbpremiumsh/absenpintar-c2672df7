import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, FileText, Crown, Lock, ClipboardList, Clock, CalendarDays, Download, Users, CheckCircle2, Thermometer, FileWarning, XCircle, LayoutGrid } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  photo_url: string | null;
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
  const [students, setStudents] = useState<{ id: string; name: string; student_id: string; photo_url: string | null }[]>([]);
  const [datangLogs, setDatangLogs] = useState<any[]>([]);
  const [pulangLogs, setPulangLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState("");
  const [schoolAddress, setSchoolAddress] = useState("");
  const [waliKelasName, setWaliKelasName] = useState("");
  const [rekapTab, setRekapTab] = useState<"datang" | "pulang">("datang");
  const [departureEndTime, setDepartureEndTime] = useState("17:00:00");
  const tableRef = useRef<HTMLDivElement>(null);

  const isTeacherOnly = roles.includes("teacher") && !roles.includes("school_admin") && !roles.includes("staff");
  const isPremiumFeature = !features.canExportReport;

  // Teacher subject schedule options
  const [teacherSchedules, setTeacherSchedules] = useState<{ id: string; class_name: string; subject_name: string; label: string }[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");

  // Fetch classes - merge from classes table + distinct student classes
  useEffect(() => {
    if (!profile?.school_id) { setLoading(false); return; }
    const fetchClasses = async () => {
      if (isTeacherOnly && user) {
        // For teachers: fetch classes they teach from teaching_schedules
        const [schedulesRes, classesRes, subjectsRes] = await Promise.all([
          supabase.from("teaching_schedules").select("id, class_id, subject_id").eq("school_id", profile.school_id).eq("teacher_id", user.id).eq("is_active", true),
          supabase.from("classes").select("id, name").eq("school_id", profile.school_id),
          supabase.from("subjects").select("id, name").eq("school_id", profile.school_id),
        ]);
        const classMap = Object.fromEntries((classesRes.data || []).map(c => [c.id, c.name]));
        const subjectMap = Object.fromEntries((subjectsRes.data || []).map(s => [s.id, s.name]));
        const schedules = (schedulesRes.data || []).map(s => ({
          id: s.id,
          class_name: classMap[s.class_id] || "-",
          subject_name: subjectMap[s.subject_id] || "-",
          label: `${classMap[s.class_id] || "-"} - ${subjectMap[s.subject_id] || "-"}`,
        }));
        // Deduplicate by label
        const uniqueSchedules = schedules.filter((s, i, arr) => arr.findIndex(x => x.label === s.label) === i);
        setTeacherSchedules(uniqueSchedules);
        // Use class names as "classes" for teacher
        const uniqueClasses = [...new Set(uniqueSchedules.map(s => s.class_name))].sort();
        setClasses(uniqueClasses);
        if (uniqueSchedules.length > 0) {
          setSelectedScheduleId(uniqueSchedules[0].id);
          setSelectedClass(uniqueSchedules[0].class_name);
        }
      } else {
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
  }, [profile?.school_id, user, isTeacherOnly]);

  // Fetch school info + pickup settings
  useEffect(() => {
    if (!profile?.school_id) return;
    const fetchSchool = async () => {
      const [schoolRes, settingsRes] = await Promise.all([
        supabase.from("schools").select("name, address, city").eq("id", profile.school_id).maybeSingle(),
        supabase.from("pickup_settings").select("departure_end_time").eq("school_id", profile.school_id).maybeSingle(),
      ]);
      if (schoolRes.data) { setSchoolName(schoolRes.data.name); setSchoolAddress((schoolRes.data as any).city || schoolRes.data.address || ""); }
      if (settingsRes.data?.departure_end_time) { setDepartureEndTime(settingsRes.data.departure_end_time); }
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

      const studentsRes = await supabase.from("students").select("id, name, student_id, photo_url").eq("school_id", profile.school_id).eq("class", selectedClass).order("name");
      setStudents(studentsRes.data || []);

      if (isTeacherOnly && user) {
        // For teachers: use subject_attendance data
        const { data: subjectLogs } = await supabase
          .from("subject_attendance")
          .select("student_id, date, status")
          .eq("school_id", profile.school_id)
          .eq("teacher_id", user.id)
          .gte("date", startDate)
          .lte("date", endDate);
        // Map subject_attendance to the same format as attendance_logs
        const mapped = (subjectLogs || []).map(l => ({ ...l, attendance_type: "datang" }));
        setDatangLogs(mapped);
        setPulangLogs([]);
      } else {
        const [datangRes, pulangRes] = await Promise.all([
          supabase.from("attendance_logs").select("student_id, date, status, attendance_type").eq("school_id", profile.school_id).eq("attendance_type", "datang").gte("date", startDate).lte("date", endDate),
          supabase.from("attendance_logs").select("student_id, date, status, attendance_type").eq("school_id", profile.school_id).eq("attendance_type", "pulang").gte("date", startDate).lte("date", endDate),
        ]);
        setDatangLogs(datangRes.data || []);
        setPulangLogs(pulangRes.data || []);
      }
      setLoading(false);
    };
    fetchData();
  }, [profile?.school_id, selectedClass, currentMonth, isTeacherOnly, user]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();

  const buildStudentRows = (logs: any[], isPulang = false): StudentRow[] => {
    const studentIds = new Set(students.map(s => s.id));
    const filteredLogs = logs.filter(l => studentIds.has(l.student_id));

    return students.map(s => {
      const days: Record<number, string> = {};
      const totals = { H: 0, S: 0, I: 0, A: 0 };
      filteredLogs.filter(l => l.student_id === s.id).forEach(l => {
        const day = parseInt(l.date.split("-")[2]);
        if (isPulang) {
          days[day] = "✓";
          totals.H++;
        } else {
          const code = STATUS_CODES[l.status] || "";
          days[day] = code;
          if (code in totals) totals[code as keyof typeof totals]++;
        }
      });

      return { id: s.id, name: s.name, student_id: s.student_id, photo_url: s.photo_url, days, totals };
    });
  };

  const studentRows: StudentRow[] = useMemo(() => buildStudentRows(datangLogs, false), [students, datangLogs, departureEndTime, currentMonth, daysInMonth]);
  const pulangRows: StudentRow[] = useMemo(() => buildStudentRows(pulangLogs, true), [students, pulangLogs, departureEndTime, currentMonth, daysInMonth]);
  const activeRows = rekapTab === "datang" ? studentRows : pulangRows;
  const isPulangMode = rekapTab === "pulang";

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
      .check { background: ${STATUS_EXCEL_COLORS.H.bg}; color: ${STATUS_EXCEL_COLORS.H.fg}; font-weight: bold; }
    </style></head><body><table>`;

    const ketCols = isPulangMode ? 1 : 4;
    const totalCols = 3 + daysInMonth + ketCols;
    html += `<tr><td colspan="${totalCols}" class="title">${titleLabel}</td></tr>`;
    html += `<tr><td colspan="${totalCols}" class="subtitle">BULAN : ${monthLabel.toUpperCase()}</td></tr>`;
    html += `<tr><td colspan="${totalCols}" class="subtitle">Kelas : ${selectedClass}</td></tr>`;
    html += `<tr><td colspan="${totalCols}"></td></tr>`;

    // Header
    html += `<tr><th rowspan="2">NO</th><th rowspan="2">NIS</th><th rowspan="2" class="name">NAMA SISWA</th>`;
    html += `<th colspan="${daysInMonth}">TANGGAL</th><th colspan="${ketCols}">KET</th></tr>`;
    html += `<tr>`;
    for (let d = 1; d <= daysInMonth; d++) html += `<th>${d}</th>`;
    if (isPulangMode) {
      html += `<th class="H">✓</th></tr>`;
    } else {
      html += `<th class="H">H</th><th class="S">S</th><th class="I">I</th><th class="A">A</th></tr>`;
    }

    // Data
    activeRows.forEach((s, i) => {
      html += `<tr><td>${i + 1}</td><td>${s.student_id}</td><td class="name">${s.name}</td>`;
      for (let d = 1; d <= daysInMonth; d++) {
        const code = s.days[d] || "";
        const cls = code === "✓" ? "check" : code;
        html += `<td${cls ? ` class="${cls}"` : ""}>${code}</td>`;
      }
      if (isPulangMode) {
        html += `<td class="H">${s.totals.H || ""}</td></tr>`;
      } else {
        html += `<td class="H">${s.totals.H || ""}</td><td class="S">${s.totals.S || ""}</td>`;
        html += `<td class="I">${s.totals.I || ""}</td><td class="A">${s.totals.A || ""}</td></tr>`;
      }
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

    const head = isPulangMode
      ? [["NO", "NIS", "NAMA", ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1)), "V"]]
      : [["NO", "NIS", "NAMA", ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1)), "H", "S", "I", "A"]];
    const body = activeRows.map((s, i) => {
      const row: (string | number)[] = [i + 1, s.student_id, s.name];
      for (let d = 1; d <= daysInMonth; d++) {
        const val = s.days[d] || "";
        row.push(val === "✓" ? "V" : val);
      }
      if (isPulangMode) {
        row.push(s.totals.H);
      } else {
        row.push(s.totals.H, s.totals.S, s.totals.I, s.totals.A);
      }
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
          if (colIdx >= 3 && colIdx < totalCols) {
            if (cellText in statusColors) {
              data.cell.styles.fillColor = statusColors[cellText].bg;
              data.cell.styles.textColor = statusColors[cellText].fg;
              data.cell.styles.fontStyle = "bold";
            } else if (cellText === "V") {
              data.cell.styles.fillColor = statusColors.H.bg;
              data.cell.styles.textColor = statusColors.H.fg;
              data.cell.styles.fontStyle = "bold";
            }
          }
          // Color summary columns
          if (colIdx >= totalCols) {
            if (isPulangMode) {
              data.cell.styles.textColor = statusColors.H.fg;
              data.cell.styles.fontStyle = "bold";
            } else {
              const summaryMap = ["H", "S", "I", "A"];
              const key = summaryMap[colIdx - totalCols];
              if (key && statusColors[key]) {
                data.cell.styles.textColor = statusColors[key].fg;
                data.cell.styles.fontStyle = "bold";
              }
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

  // Export Student Analytics
  const exportStudentAnalytics = () => {
    if (isPremiumFeature) { toast.error("Upgrade ke paket Basic untuk export"); return; }
    if (!activeRows.length) { toast.error("Tidak ada data"); return; }

    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><style>
      td, th { border: 1px solid #999; padding: 4px 8px; font-family: Arial; font-size: 10pt; }
      th { background: #4f46e5; color: white; font-weight: bold; text-align: center; }
      .name { text-align: left; min-width: 160px; }
      .title { font-size: 14pt; font-weight: bold; text-align: center; border: none; }
      .subtitle { font-size: 11pt; text-align: center; border: none; }
      .good { background: #dcfce7; color: #16a34a; font-weight: bold; }
      .warn { background: #fef9c3; color: #ca8a04; font-weight: bold; }
      .bad { background: #fecaca; color: #dc2626; font-weight: bold; }
    </style></head><body><table>`;

    html += `<tr><td colspan="9" class="title">ANALYTIC KEHADIRAN SISWA</td></tr>`;
    html += `<tr><td colspan="9" class="subtitle">Kelas: ${selectedClass} — ${monthLabel}</td></tr>`;
    html += `<tr><td colspan="9"></td></tr>`;
    html += `<tr><th>NO</th><th>NIS</th><th class="name">NAMA SISWA</th><th>Hadir</th><th>Sakit</th><th>Izin</th><th>Alfa</th><th>Total Hari</th><th>% Kehadiran</th></tr>`;

    activeRows.forEach((s, i) => {
      const totalDays = s.totals.H + s.totals.S + s.totals.I + s.totals.A;
      const pct = totalDays > 0 ? Math.round((s.totals.H / totalDays) * 100) : 0;
      const cls = pct >= 80 ? "good" : pct >= 60 ? "warn" : "bad";
      html += `<tr><td style="text-align:center">${i + 1}</td><td style="text-align:center">${s.student_id}</td><td class="name">${s.name}</td>`;
      html += `<td style="text-align:center" class="good">${s.totals.H}</td>`;
      html += `<td style="text-align:center">${s.totals.S}</td>`;
      html += `<td style="text-align:center">${s.totals.I}</td>`;
      html += `<td style="text-align:center" class="bad">${s.totals.A}</td>`;
      html += `<td style="text-align:center">${totalDays}</td>`;
      html += `<td style="text-align:center" class="${cls}">${pct}%</td></tr>`;
    });

    html += `</table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Analytic-Siswa-${selectedClass}-${monthLabel}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Analytic siswa berhasil diunduh!");
  };

  const getCellColor = (code: string) => {
    if (code === "✓") return "bg-success/15 text-success";
    switch (code) {
      case "H": return "bg-success/15 text-success";
      case "S": return "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400";
      case "I": return "bg-warning/15 text-warning";
      case "A": return "bg-destructive/15 text-destructive";
      default: return "";
    }
  };

  const selectedMonth = currentMonth.getMonth();
  const selectedYear = currentMonth.getFullYear();
  const setMonth = (m: string) => setCurrentMonth(new Date(selectedYear, parseInt(m), 1));
  const setYear = (y: string) => setCurrentMonth(new Date(parseInt(y), selectedMonth, 1));
  const years = Array.from({ length: 5 }, (_, i) => selectedYear - 2 + i);

  const handleShow = () => {
    // triggers re-fetch via useEffect
    setCurrentMonth(new Date(selectedYear, selectedMonth, 1));
  };

  const getCellBadge = (code: string) => {
    switch (code) {
      case "H": case "✓": return "bg-emerald-500 text-white";
      case "S": return "bg-violet-500 text-white";
      case "I": return "bg-amber-400 text-white";
      case "A": return "bg-red-500 text-white";
      default: return "";
    }
  };

  return (
    <PremiumGate featureLabel="Rekap & Export" featureKey="canExportReport" requiredPlan="Basic">
      <div className="space-y-5">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-[#5B6CF9] flex items-center justify-center shadow-md">
              <ClipboardList className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Rekap & Export</h1>
              <p className="text-muted-foreground text-xs sm:text-sm">Rekap kehadiran bulanan & export laporan</p>
            </div>
          </div>
        </div>

        {isPremiumFeature && !features.loading && (
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

        {/* Filter Bar */}
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Bulan</label>
            <Select value={String(selectedMonth)} onValueChange={setMonth}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Tahun</label>
            <Select value={String(selectedYear)} onValueChange={setYear}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Kelas</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
              <SelectContent>
                {classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleShow} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm gap-2">
            <CalendarDays className="h-4 w-4" /> Tampilkan
          </Button>
          <Button variant="outline" disabled={isPremiumFeature} onClick={exportExcel} className="gap-2 border-primary/30 text-primary hover:bg-primary/5">
            <Download className="h-4 w-4" /> Export Excel {isPremiumFeature && <Lock className="h-3 w-3" />}
          </Button>
          <Button variant="outline" disabled={isPremiumFeature} onClick={exportStudentAnalytics} className="gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5">
            <Users className="h-4 w-4" /> Download Analytic Siswa {isPremiumFeature && <Lock className="h-3 w-3" />}
          </Button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5"><span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-emerald-500 text-white text-[10px] font-bold">H</span> Hadir</div>
          <div className="flex items-center gap-1.5"><span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-violet-500 text-white text-[10px] font-bold">S</span> Sakit</div>
          <div className="flex items-center gap-1.5"><span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-amber-400 text-white text-[10px] font-bold">I</span> Izin</div>
          <div className="flex items-center gap-1.5"><span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-red-500 text-white text-[10px] font-bold">A</span> Alfa</div>
          <div className="flex items-center gap-1.5"><span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-muted border border-border text-[10px]"></span> Tidak hadir/data kosong</div>
        </div>

        {/* Tabs */}
        <Tabs value={rekapTab} onValueChange={(v) => setRekapTab(v as "datang" | "pulang")}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="datang" className="flex-1 sm:flex-none text-xs sm:text-sm gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" /> Rekap Kehadiran
            </TabsTrigger>
            <TabsTrigger value="pulang" className="flex-1 sm:flex-none text-xs sm:text-sm gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Rekap Kepulangan
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Recap Table */}
        <Card className="border-0 shadow-card overflow-hidden">
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-base font-bold text-foreground">
                Rekapitulasi — {monthLabel}{" "}
                <span className="text-muted-foreground font-normal text-sm">({activeRows.length} siswa)</span>
              </h2>
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
                    <tr className="border-b border-border">
                      <th rowSpan={2} className="px-3 py-2.5 text-left font-semibold text-muted-foreground w-10 sticky left-0 bg-card z-10">No</th>
                      <th rowSpan={2} className="px-3 py-2.5 text-left font-semibold text-muted-foreground min-w-[180px]">Nama Siswa</th>
                      <th colSpan={daysInMonth} className="px-1 py-2 text-center font-bold text-primary uppercase text-[10px] tracking-wider">Tanggal</th>
                      {isPulangMode ? (
                        <th className="px-1 py-2 text-center font-bold text-primary uppercase text-[10px] tracking-wider">Keterangan</th>
                      ) : (
                        <th colSpan={4} className="px-1 py-2 text-center font-bold text-primary uppercase text-[10px] tracking-wider">Keterangan</th>
                      )}
                    </tr>
                    <tr className="border-b border-border bg-muted/30">
                      {Array.from({ length: daysInMonth }, (_, i) => (
                        <th key={i} className="px-0.5 py-1.5 text-center font-medium text-muted-foreground w-7 text-[10px]">{i + 1}</th>
                      ))}
                      {isPulangMode ? (
                        <th className="px-1 py-1.5 text-center font-bold text-success w-7 text-[10px]">✓</th>
                      ) : (
                        <>
                          <th className="px-1 py-1.5 text-center font-bold text-emerald-600 w-7 text-[10px]">H</th>
                          <th className="px-1 py-1.5 text-center font-bold text-violet-600 w-7 text-[10px]">S</th>
                          <th className="px-1 py-1.5 text-center font-bold text-amber-600 w-7 text-[10px]">I</th>
                          <th className="px-1 py-1.5 text-center font-bold text-red-600 w-7 text-[10px]">A</th>
                          <th className="px-1 py-1.5 text-center font-bold text-primary w-10 text-[10px]">%</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {activeRows.map((s, i) => (
                      <tr key={s.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-3 text-center font-medium text-muted-foreground sticky left-0 bg-card z-10">{i + 1}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-8 w-8 shrink-0">
                              {s.photo_url && <AvatarImage src={s.photo_url} alt={s.name} />}
                              <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">{s.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-[12px] font-semibold text-foreground truncate">{s.name}</p>
                              <p className="text-[10px] text-muted-foreground">{s.student_id}</p>
                            </div>
                          </div>
                        </td>
                        {Array.from({ length: daysInMonth }, (_, d) => {
                          const code = s.days[d + 1] || "";
                          const badgeClass = getCellBadge(code);
                          return (
                            <td key={d} className="px-0 py-2 text-center">
                              {code ? (
                                <span className={`inline-flex items-center justify-center h-6 w-6 rounded-md text-[10px] font-bold ${badgeClass}`}>
                                  {code === "✓" ? "H" : code}
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-muted/40 border border-border/30" />
                              )}
                            </td>
                          );
                        })}
                        {isPulangMode ? (
                          <td className="px-1 py-2 text-center font-bold text-emerald-600">{s.totals.H || 0}</td>
                        ) : (
                          <>
                            <td className="px-1 py-2 text-center font-bold text-emerald-600">{s.totals.H || 0}</td>
                            <td className="px-1 py-2 text-center font-bold text-violet-600">{s.totals.S || 0}</td>
                            <td className="px-1 py-2 text-center font-bold text-amber-600">{s.totals.I || 0}</td>
                            <td className="px-1 py-2 text-center font-bold text-red-600">{s.totals.A || 0}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Signature footer */}
            {activeRows.length > 0 && (
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
