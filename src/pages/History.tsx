import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Loader2, FileSpreadsheet, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const STATUS_COLORS: Record<string, string> = {
  hadir: "bg-success/10 text-success",
  izin: "bg-warning/10 text-warning",
  sakit: "bg-blue-100 text-blue-600",
  alfa: "bg-destructive/10 text-destructive",
};

const STATUS_LABELS: Record<string, string> = {
  hadir: "Hadir",
  izin: "Izin",
  sakit: "Sakit",
  alfa: "Alfa",
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

  const exportCSV = () => {
    const header = "Nama Siswa,Kelas,Tanggal,Jam,Metode,Status\n";
    const rows = filtered.map((l) =>
      `${l.students?.name},${l.students?.class},${l.date},${l.time?.slice(0,5)},${l.method},${STATUS_LABELS[l.status] || l.status}`
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
      "Metode": l.method === "face" ? "Face Recognition" : "Barcode",
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Riwayat Absensi</h1>
          <p className="text-muted-foreground text-sm">Lihat semua riwayat kehadiran siswa</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
          </Button>
        </div>
      </div>

      <Card className="shadow-card border-0">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari nama siswa, kelas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
            </div>
            <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="h-10 w-auto" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="hadir">Hadir</SelectItem>
                <SelectItem value="izin">Izin</SelectItem>
                <SelectItem value="sakit">Sakit</SelectItem>
                <SelectItem value="alfa">Alfa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Siswa</TableHead>
                  <TableHead className="hidden sm:table-cell">Kelas</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="hidden md:table-cell">Jam</TableHead>
                  <TableHead className="hidden lg:table-cell">Metode</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada riwayat absensi</TableCell></TableRow>
                ) : filtered.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold shrink-0">
                          {(log.students?.name || "-").charAt(0)}
                        </div>
                        <span className="font-medium">{log.students?.name || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{log.students?.class || "-"}</TableCell>
                    <TableCell className="text-xs">
                      {new Date(log.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{log.time?.slice(0, 5)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">
                      {log.method === "face" ? "Face" : "Barcode"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-[10px] font-medium ${STATUS_COLORS[log.status] || ""}`}>
                        {STATUS_LABELS[log.status] || log.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default History;