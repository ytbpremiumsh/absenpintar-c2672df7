import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Download, Loader2, FileSpreadsheet, Clock,
  CheckCircle2, FileText, Thermometer, XCircle, Users, CalendarDays, ScanLine,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const STATUS_COLORS: Record<string, string> = {
  hadir: "bg-success/10 text-success border-success/20",
  izin: "bg-warning/10 text-warning border-warning/20",
  sakit: "bg-primary/10 text-primary border-primary/20",
  alfa: "bg-destructive/10 text-destructive border-destructive/20",
};

const STATUS_LABELS: Record<string, string> = {
  hadir: "Hadir",
  izin: "Izin",
  sakit: "Sakit",
  alfa: "Alfa",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  hadir: CheckCircle2,
  izin: FileText,
  sakit: Thermometer,
  alfa: XCircle,
};

const METHOD_LABELS: Record<string, string> = {
  barcode: "QR Code",
  face_recognition: "Face",
  rfid: "RFID",
  manual: "Manual",
};

const History = () => {
  const { profile } = useAuth();
  const features = useSubscriptionFeatures();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.school_id) return;
    const fetchLogs = async () => {
      let query = supabase
        .from("attendance_logs")
        .select("*, students(name, class, parent_name, photo_url)")
        .eq("school_id", profile.school_id)
        .order("date", { ascending: false })
        .order("time", { ascending: false })
        .limit(500);

      if (dateFilter) query = query.eq("date", dateFilter);

      const { data } = await query;
      setLogs(data || []);
      setLoading(false);
    };
    fetchLogs();
  }, [profile?.school_id, dateFilter]);

  const filtered = logs.filter((l) => {
    const name = l.students?.name || "";
    const cls = l.students?.class || "";
    const matchSearch = name.toLowerCase().includes(search.toLowerCase()) || cls.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Stats from filtered data
  const stats = {
    total: filtered.length,
    hadir: filtered.filter(l => l.status === "hadir").length,
    izin: filtered.filter(l => l.status === "izin").length,
    sakit: filtered.filter(l => l.status === "sakit").length,
    alfa: filtered.filter(l => l.status === "alfa").length,
  };

  const exportCSV = () => {
    const header = "Nama Siswa,Kelas,Tanggal,Jam,Metode,Status\n";
    const rows = filtered.map((l) =>
      `${l.students?.name},${l.students?.class},${l.date},${l.time?.slice(0, 5)},${l.method},${STATUS_LABELS[l.status] || l.status}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `riwayat-absensi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const exportExcel = () => {
    if (!features.canExportReport) {
      toast.error("Fitur export tersedia di paket Basic ke atas");
      return;
    }
    const data = filtered.map((l, i) => ({
      "No": i + 1,
      "Nama Siswa": l.students?.name || "-",
      "Kelas": l.students?.class || "-",
      "Tanggal": l.date,
      "Jam": l.time?.slice(0, 5),
      "Metode": METHOD_LABELS[l.method] || l.method,
      "Status": STATUS_LABELS[l.status] || l.status,
      "Dicatat Oleh": l.recorded_by || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Riwayat Absensi");
    XLSX.writeFile(wb, `riwayat-absensi-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Data berhasil diexport!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center shadow-md">
            <Clock className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Riwayat Absensi</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">Lihat semua riwayat kehadiran siswa</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="h-9 gap-1.5 text-xs font-medium">
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel} className="h-9 gap-1.5 text-xs font-medium">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </Button>
        </div>
      </div>

      {/* Mini Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { icon: Users, value: stats.total, label: "Total", color: "text-foreground", bg: "bg-secondary" },
          { icon: CheckCircle2, value: stats.hadir, label: "Hadir", color: "text-success", bg: "bg-success/10" },
          { icon: FileText, value: stats.izin, label: "Izin", color: "text-warning", bg: "bg-warning/10" },
          { icon: Thermometer, value: stats.sakit, label: "Sakit", color: "text-primary", bg: "bg-primary/10" },
          { icon: XCircle, value: stats.alfa, label: "Alfa", color: "text-destructive", bg: "bg-destructive/10" },
        ].map((stat) => (
          <Card key={stat.label} className="border-0 shadow-card">
            <CardContent className="p-3 flex items-center gap-2.5">
              <div className={`h-8 w-8 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <p className={`text-lg font-extrabold leading-tight ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + Table */}
      <Card className="shadow-card border-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama siswa, kelas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 bg-background"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="h-9 w-auto pl-9 bg-background"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[130px] bg-background">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="hadir">Hadir</SelectItem>
                  <SelectItem value="izin">Izin</SelectItem>
                  <SelectItem value="sakit">Sakit</SelectItem>
                  <SelectItem value="alfa">Alfa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="font-semibold">Nama Siswa</TableHead>
                  <TableHead className="hidden sm:table-cell font-semibold">Kelas</TableHead>
                  <TableHead className="font-semibold">Tanggal</TableHead>
                  <TableHead className="hidden md:table-cell font-semibold">Jam</TableHead>
                  <TableHead className="hidden lg:table-cell font-semibold">Metode</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                      <p className="text-xs text-muted-foreground mt-2">Memuat data...</p>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Belum ada riwayat absensi</p>
                    </TableCell>
                  </TableRow>
                ) : filtered.map((log) => {
                  const StatusIcon = STATUS_ICONS[log.status] || Clock;
                  return (
                    <TableRow key={log.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold shrink-0 overflow-hidden">
                            {log.students?.photo_url ? (
                              <img src={log.students.photo_url} alt="" className="h-full w-full rounded-full object-cover" />
                            ) : (log.students?.name || "-").charAt(0)}
                          </div>
                          <span className="font-medium text-sm">{log.students?.name || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary" className="text-[10px] font-medium">{log.students?.class || "-"}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(log.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs font-mono text-muted-foreground">{log.time?.slice(0, 5)}</span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <ScanLine className="h-2.5 w-2.5" />
                          {METHOD_LABELS[log.method] || log.method}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-[10px] font-medium gap-1 ${STATUS_COLORS[log.status] || ""}`}>
                          <StatusIcon className="h-3 w-3" />
                          {STATUS_LABELS[log.status] || log.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {filtered.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border bg-muted/20 text-xs text-muted-foreground">
              Menampilkan {filtered.length} dari {logs.length} data
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default History;
