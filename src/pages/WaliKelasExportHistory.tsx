import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";

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

const WaliKelasExportHistory = () => {
  const { user, profile } = useAuth();
  const features = useSubscriptionFeatures();

  const [assignments, setAssignments] = useState<{ class_name: string; school_id: string }[]>([]);
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
  const tableRef = useRef<HTMLDivElement>(null);

  const isPremiumFeature = !features.canExportReport;

  // Fetch wali kelas assignments
  useEffect(() => {
    if (!user) return;
    supabase.from("class_teachers").select("class_name, school_id").eq("user_id", user.id).then(({ data }) => {
      const assigns = data || [];
      setAssignments(assigns);
      if (assigns.length > 0) setSelectedClass(assigns[0].class_name);
    });
  }, [user]);

  // Fetch school info
  useEffect(() => {
    if (!profile?.school_id) return;
    supabase.from("schools").select("name, address, city").eq("id", profile.school_id).maybeSingle().then(({ data }) => {
      if (data) { setSchoolName(data.name); setSchoolAddress((data as any).city || data.address || ""); }
    });
  }, [profile?.school_id]);

  // Fetch wali kelas name
  useEffect(() => {
    if (!profile?.school_id || !selectedClass) return;
    supabase.from("class_teachers").select("user_id").eq("school_id", profile.school_id).eq("class_name", selectedClass).maybeSingle().then(({ data }) => {
      if (data?.user_id) {
        supabase.from("profiles").select("full_name").eq("user_id", data.user_id).maybeSingle().then(({ data: prof }) => {
          setWaliKelasName(prof?.full_name || "");
        });
      } else setWaliKelasName("");
    });
  }, [profile?.school_id, selectedClass]);

  // Fetch students & attendance
  useEffect(() => {
    if (!profile?.school_id || !selectedClass) { setLoading(false); return; }
    const fetchData = async () => {
      setLoading(true);
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, "0")}`;

      const [studentsRes, datangRes, pulangRes] = await Promise.all([
        supabase.from("students").select("id, name, student_id, photo_url").eq("school_id", profile.school_id!).eq("class", selectedClass).order("name"),
        supabase.from("attendance_logs").select("student_id, date, status").eq("school_id", profile.school_id!).eq("attendance_type", "datang").gte("date", startDate).lte("date", endDate).in("student_id", []),
        supabase.from("attendance_logs").select("student_id, date, status").eq("school_id", profile.school_id!).eq("attendance_type", "pulang").gte("date", startDate).lte("date", endDate).in("student_id", []),
      ]);

      const studentData = studentsRes.data || [];
      setStudents(studentData);

      if (studentData.length > 0) {
        const ids = studentData.map(s => s.id);
        const [d, p] = await Promise.all([
          supabase.from("attendance_logs").select("student_id, date, status").eq("school_id", profile.school_id!).eq("attendance_type", "datang").gte("date", startDate).lte("date", endDate).in("student_id", ids),
          supabase.from("attendance_logs").select("student_id, date, status").eq("school_id", profile.school_id!).eq("attendance_type", "pulang").gte("date", startDate).lte("date", endDate).in("student_id", ids),
        ]);
        setDatangLogs(d.data || []);
        setPulangLogs(p.data || []);
      } else {
        setDatangLogs([]);
        setPulangLogs([]);
      }
      setLoading(false);
    };
    fetchData();
  }, [profile?.school_id, selectedClass, currentMonth]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();

  const buildRows = (logs: any[]): StudentRow[] => {
    return students.map(s => {
      const days: Record<number, string> = {};
      const totals = { H: 0, S: 0, I: 0, A: 0 };
      logs.filter(l => l.student_id === s.id).forEach(l => {
        const day = new Date(l.date).getDate();
        const code = STATUS_CODES[l.status] || "";
        days[day] = code;
        if (code in totals) totals[code as keyof typeof totals]++;
      });
      return { ...s, days, totals };
    });
  };

  const rows = buildRows(rekapTab === "datang" ? datangLogs : pulangLogs);
  const classNames = assignments.map(a => a.class_name);

  const handleMonthChange = (offset: number) => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() + offset);
    setCurrentMonth(d);
  };

  if (assignments.length === 0 && !loading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={ClipboardList} title="Rekap Absensi Kelas" subtitle="Rekap absensi umum kelas wali" />
        <Card className="border-0 shadow-card">
          <CardContent className="p-10 text-center text-muted-foreground">
            Anda belum ditugaskan sebagai wali kelas.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={ClipboardList} title="Rekap Absensi Kelas" subtitle="Rekap absensi umum (Datang/Pulang) untuk kelas wali Anda" />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
          <SelectContent>
            {classNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleMonthChange(-1)}>Prev</Button>
          <span className="text-sm font-semibold min-w-[140px] text-center">
            {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <Button variant="outline" size="sm" onClick={() => handleMonthChange(1)}>Next</Button>
        </div>

        <Tabs value={rekapTab} onValueChange={(v) => setRekapTab(v as any)}>
          <TabsList>
            <TabsTrigger value="datang">Datang</TabsTrigger>
            <TabsTrigger value="pulang">Pulang</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table */}
      {loading ? (
        <Card className="border-0 shadow-card"><CardContent className="p-10 text-center text-muted-foreground">Memuat data...</CardContent></Card>
      ) : (
        <Card className="border-0 shadow-card overflow-hidden">
          <div className="overflow-x-auto" ref={tableRef}>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-primary/5">
                  <th className="sticky left-0 bg-primary/5 z-10 p-2 text-left border border-border min-w-[40px]">No</th>
                  <th className="sticky left-[40px] bg-primary/5 z-10 p-2 text-left border border-border min-w-[150px]">Nama</th>
                  {Array.from({ length: daysInMonth }, (_, i) => (
                    <th key={i} className="p-1.5 text-center border border-border min-w-[28px]">{i + 1}</th>
                  ))}
                  <th className="p-1.5 text-center border border-border bg-emerald-50 dark:bg-emerald-900/20 min-w-[28px]">H</th>
                  <th className="p-1.5 text-center border border-border bg-blue-50 dark:bg-blue-900/20 min-w-[28px]">S</th>
                  <th className="p-1.5 text-center border border-border bg-amber-50 dark:bg-amber-900/20 min-w-[28px]">I</th>
                  <th className="p-1.5 text-center border border-border bg-red-50 dark:bg-red-900/20 min-w-[28px]">A</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={daysInMonth + 6} className="p-8 text-center text-muted-foreground">Tidak ada data siswa</td></tr>
                ) : rows.map((r, i) => (
                  <tr key={r.id} className="hover:bg-secondary/30">
                    <td className="sticky left-0 bg-background z-10 p-1.5 border border-border text-center">{i + 1}</td>
                    <td className="sticky left-[40px] bg-background z-10 p-1.5 border border-border truncate max-w-[150px]">{r.name}</td>
                    {Array.from({ length: daysInMonth }, (_, d) => {
                      const code = r.days[d + 1] || "";
                      const colorMap: Record<string, string> = {
                        H: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 font-bold",
                        S: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 font-bold",
                        I: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 font-bold",
                        A: "text-red-600 bg-red-50 dark:bg-red-900/20 font-bold",
                      };
                      return (
                        <td key={d} className={`p-1 text-center border border-border ${colorMap[code] || ""}`}>{code}</td>
                      );
                    })}
                    <td className="p-1.5 text-center border border-border bg-emerald-50 dark:bg-emerald-900/20 font-bold text-emerald-600">{r.totals.H || ""}</td>
                    <td className="p-1.5 text-center border border-border bg-blue-50 dark:bg-blue-900/20 font-bold text-blue-600">{r.totals.S || ""}</td>
                    <td className="p-1.5 text-center border border-border bg-amber-50 dark:bg-amber-900/20 font-bold text-amber-600">{r.totals.I || ""}</td>
                    <td className="p-1.5 text-center border border-border bg-red-50 dark:bg-red-900/20 font-bold text-red-600">{r.totals.A || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-border text-xs text-muted-foreground flex flex-wrap gap-4">
            <span>Kelas: <strong>{selectedClass}</strong></span>
            {waliKelasName && <span>Wali Kelas: <strong>{waliKelasName}</strong></span>}
            <span>Bulan: <strong>{MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}</strong></span>
            <span>Total Siswa: <strong>{students.length}</strong></span>
          </div>
        </Card>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {[
          { code: "H", label: "Hadir", color: "bg-emerald-100 text-emerald-700" },
          { code: "S", label: "Sakit", color: "bg-blue-100 text-blue-700" },
          { code: "I", label: "Izin", color: "bg-amber-100 text-amber-700" },
          { code: "A", label: "Alfa", color: "bg-red-100 text-red-700" },
        ].map(s => (
          <Badge key={s.code} className={`${s.color} border-0`}>{s.code} = {s.label}</Badge>
        ))}
      </div>
    </div>
  );
};

export default WaliKelasExportHistory;
