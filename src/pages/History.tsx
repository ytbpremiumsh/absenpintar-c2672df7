import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Loader2, Lock, FileSpreadsheet, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

const History = () => {
  const { profile } = useAuth();
  const features = useSubscriptionFeatures();
  const [search, setSearch] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.school_id) return;
    const fetchLogs = async () => {
      const { data } = await supabase
        .from("pickup_logs")
        .select("*, students(name, class, parent_name)")
        .eq("school_id", profile.school_id)
        .order("pickup_time", { ascending: false })
        .limit(500);
      setLogs(data || []);
      setLoading(false);
    };
    fetchLogs();
  }, [profile?.school_id]);

  const filtered = logs.filter((l) => {
    const name = l.students?.name || "";
    const cls = l.students?.class || "";
    return name.toLowerCase().includes(search.toLowerCase()) || cls.toLowerCase().includes(search.toLowerCase());
  });

  // Today's logs for daily report
  const todayLogs = filtered.filter((l) => new Date(l.pickup_time).toDateString() === new Date().toDateString());

  const exportCSV = () => {
    const header = "Nama Siswa,Kelas,Penjemput,Petugas,Waktu\n";
    const rows = filtered.map((l) =>
      `${l.students?.name},${l.students?.class},${l.students?.parent_name},${l.pickup_by},${new Date(l.pickup_time).toLocaleString("id-ID")}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `riwayat-penjemputan-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const exportDailyExcel = () => {
    if (!features.canExportReport) {
      toast.error("Fitur export laporan tersedia di paket Basic ke atas");
      return;
    }
    const data = todayLogs.map((l, i) => ({
      "No": i + 1,
      "Nama Siswa": l.students?.name || "-",
      "Kelas": l.students?.class || "-",
      "Penjemput": l.students?.parent_name || "-",
      "Petugas": l.pickup_by,
      "Waktu": new Date(l.pickup_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Harian");
    XLSX.writeFile(wb, `laporan-harian-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Laporan harian Excel berhasil diunduh!");
  };

  const exportDailyPDF = () => {
    if (!features.canExportReport) {
      toast.error("Fitur export laporan tersedia di paket Basic ke atas");
      return;
    }
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    
    doc.setFontSize(16);
    doc.text("Laporan Penjemputan Harian", 14, 20);
    doc.setFontSize(10);
    doc.text(`Tanggal: ${today}`, 14, 28);
    doc.text(`Total: ${todayLogs.length} siswa dijemput`, 14, 34);

    const tableData = todayLogs.map((l, i) => [
      i + 1,
      l.students?.name || "-",
      l.students?.class || "-",
      l.students?.parent_name || "-",
      l.pickup_by,
      new Date(l.pickup_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    ]);

    (doc as any).autoTable({
      startY: 40,
      head: [["No", "Nama Siswa", "Kelas", "Penjemput", "Petugas", "Waktu"]],
      body: tableData,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`laporan-harian-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("Laporan harian PDF berhasil diunduh!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Riwayat Penjemputan</h1>
          <p className="text-muted-foreground text-sm">Lihat semua riwayat penjemputan siswa</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportDailyExcel} disabled={!features.canExportReport} className={!features.canExportReport ? "opacity-50" : ""}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Laporan Excel
            {!features.canExportReport && <Lock className="h-3 w-3 ml-1" />}
          </Button>
          <Button variant="outline" size="sm" onClick={exportDailyPDF} disabled={!features.canExportReport} className={!features.canExportReport ? "opacity-50" : ""}>
            <FileText className="h-4 w-4 mr-1" /> Laporan PDF
            {!features.canExportReport && <Lock className="h-3 w-3 ml-1" />}
          </Button>
        </div>
      </div>

      <Card className="shadow-card border-0">
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari nama siswa, kelas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Siswa</TableHead>
                  <TableHead className="hidden sm:table-cell">Kelas</TableHead>
                  <TableHead className="hidden md:table-cell">Penjemput</TableHead>
                  <TableHead className="hidden lg:table-cell">Petugas</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada riwayat penjemputan</TableCell></TableRow>
                ) : filtered.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.students?.name || "-"}</TableCell>
                    <TableCell className="hidden sm:table-cell">{log.students?.class || "-"}</TableCell>
                    <TableCell className="hidden md:table-cell">{log.students?.parent_name || "-"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{log.pickup_by}</TableCell>
                    <TableCell className="text-xs">
                      {new Date(log.pickup_time).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-success/10 text-success">Dijemput</span>
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
