import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Wallet, Copy, DollarSign, TrendingUp, ArrowDownToLine, LogOut, Loader2, Users, Link2, Settings, History, CheckCircle2, Clock, XCircle } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const AffiliateDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<any>(null);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: "", bank_name: "", account_number: "", account_holder: "" });

  const session = JSON.parse(localStorage.getItem('affiliate_session') || 'null');

  const fetchDashboard = useCallback(async () => {
    if (!session?.id) { navigate('/affiliate/login'); return; }
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/affiliate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
        body: JSON.stringify({ action: 'dashboard', affiliate_id: session.id }),
      });
      const data = await res.json();
      if (data.success) {
        setAffiliate(data.affiliate);
        setCommissions(data.commissions || []);
        setWithdrawals(data.withdrawals || []);
      }
    } catch {} finally { setLoading(false); }
  }, [session?.id, navigate]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleCopyLink = () => {
    const link = `${window.location.origin}/register?aff=${affiliate?.affiliate_code}`;
    navigator.clipboard.writeText(link);
    toast.success("Link affiliate disalin!");
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(affiliate?.affiliate_code || '');
    toast.success("Kode affiliate disalin!");
  };

  const handleWithdraw = async () => {
    const amount = parseInt(withdrawForm.amount);
    if (!amount || amount < 500000) { toast.error("Minimum pencairan Rp 500.000"); return; }
    if (!withdrawForm.bank_name || !withdrawForm.account_number || !withdrawForm.account_holder) {
      toast.error("Semua data bank wajib diisi"); return;
    }
    setWithdrawing(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/affiliate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
        body: JSON.stringify({ action: 'withdraw', affiliate_id: session.id, amount, ...withdrawForm }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error);
      toast.success("Request pencairan berhasil diajukan!");
      setWithdrawOpen(false);
      setWithdrawForm({ amount: "", bank_name: "", account_number: "", account_holder: "" });
      fetchDashboard();
    } catch (err: any) { toast.error(err.message); }
    finally { setWithdrawing(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('affiliate_session');
    navigate('/affiliate/login');
  };

  const formatRp = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
  const statusBadge = (s: string) => {
    if (s === 'approved' || s === 'paid') return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="h-3 w-3 mr-1" />{s}</Badge>;
    if (s === 'pending') return <Badge variant="outline" className="text-yellow-600"><Clock className="h-3 w-3 mr-1" />{s}</Badge>;
    return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />{s}</Badge>;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!affiliate) { navigate('/affiliate/login'); return null; }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm">Affiliate Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">{affiliate.full_name}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1">
              <LogOut className="h-4 w-4" /> Keluar
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Wallet className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo Saat Ini</p>
                  <p className="text-lg font-bold text-primary">{formatRp(affiliate.current_balance)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-green-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Pendapatan</p>
                  <p className="text-lg font-bold text-green-600">{formatRp(affiliate.total_earned)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><ArrowDownToLine className="h-5 w-5 text-blue-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Dicairkan</p>
                  <p className="text-lg font-bold text-blue-600">{formatRp(affiliate.total_withdrawn)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center"><DollarSign className="h-5 w-5 text-yellow-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Komisi Rate</p>
                  <p className="text-lg font-bold text-yellow-600">{affiliate.commission_rate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Affiliate Link */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium flex items-center gap-2"><Link2 className="h-4 w-4" /> Link Affiliate Anda</p>
                <p className="text-xs font-mono text-muted-foreground break-all">{window.location.origin}/register?aff={affiliate.affiliate_code}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleCopyLink} className="gap-1"><Copy className="h-3 w-3" /> Salin Link</Button>
                <Button size="sm" variant="outline" onClick={handleCopyCode} className="gap-1"><Copy className="h-3 w-3" /> Salin Kode</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="commissions">
          <TabsList>
            <TabsTrigger value="commissions">Riwayat Komisi</TabsTrigger>
            <TabsTrigger value="withdrawals">Pencairan Dana</TabsTrigger>
          </TabsList>

          <TabsContent value="commissions">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> Riwayat Komisi ({commissions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paket</TableHead>
                      <TableHead>Harga</TableHead>
                      <TableHead>Komisi</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tanggal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.plan_name}</TableCell>
                        <TableCell>{formatRp(c.plan_price)}</TableCell>
                        <TableCell className="font-bold text-primary">{formatRp(c.commission_amount)}</TableCell>
                        <TableCell>{statusBadge(c.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString('id-ID')}</TableCell>
                      </TableRow>
                    ))}
                    {commissions.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Belum ada komisi</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdrawals">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><ArrowDownToLine className="h-4 w-4" /> Pencairan Dana</CardTitle>
                <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1" disabled={affiliate.current_balance < 500000}>
                      <ArrowDownToLine className="h-4 w-4" /> Ajukan Pencairan
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Ajukan Pencairan Dana</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">Saldo tersedia: <span className="font-bold text-primary">{formatRp(affiliate.current_balance)}</span></p>
                      <div className="space-y-2">
                        <Label>Jumlah (min. Rp 500.000)</Label>
                        <Input type="number" value={withdrawForm.amount} onChange={e => setWithdrawForm(f => ({ ...f, amount: e.target.value }))} placeholder="500000" />
                      </div>
                      <div className="space-y-2">
                        <Label>Nama Bank</Label>
                        <Input value={withdrawForm.bank_name} onChange={e => setWithdrawForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="BCA, BNI, Mandiri, dll" />
                      </div>
                      <div className="space-y-2">
                        <Label>Nomor Rekening</Label>
                        <Input value={withdrawForm.account_number} onChange={e => setWithdrawForm(f => ({ ...f, account_number: e.target.value }))} placeholder="1234567890" />
                      </div>
                      <div className="space-y-2">
                        <Label>Nama Pemilik Rekening</Label>
                        <Input value={withdrawForm.account_holder} onChange={e => setWithdrawForm(f => ({ ...f, account_holder: e.target.value }))} placeholder="Sesuai rekening" />
                      </div>
                      <Button onClick={handleWithdraw} className="w-full gap-2" disabled={withdrawing}>
                        {withdrawing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />}
                        Ajukan Pencairan
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jumlah</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead>No. Rekening</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tanggal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map(w => (
                      <TableRow key={w.id}>
                        <TableCell className="font-bold">{formatRp(w.amount)}</TableCell>
                        <TableCell>{w.bank_name}</TableCell>
                        <TableCell className="font-mono text-xs">{w.account_number}</TableCell>
                        <TableCell>{statusBadge(w.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString('id-ID')}</TableCell>
                      </TableRow>
                    ))}
                    {withdrawals.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Belum ada pencairan</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AffiliateDashboard;
