import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const History = () => {
  const { profile } = useAuth();
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
        .limit(100);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Riwayat Penjemputan</h1>
          <p className="text-muted-foreground text-sm">Lihat semua riwayat penjemputan siswa</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" /> CSV
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
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Belum ada riwayat penjemputan
                    </TableCell>
                  </TableRow>
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
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-success/10 text-success">
                        Dijemput
                      </span>
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
