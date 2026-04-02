import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Users, Wallet, ArrowDownToLine, CheckCircle2, XCircle, Clock, Loader2, Search, Ban, Play } from "lucide-react";

const SuperAdminAffiliate = () => {
  const [loading, setLoading] = useState(true);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [affRes, comRes, wdRes] = await Promise.all([
      supabase.from('affiliates').select('*').order('created_at', { ascending: false }),
      supabase.from('affiliate_commissions').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('affiliate_withdrawals').select('*, affiliates(full_name, email, affiliate_code)').order('created_at', { ascending: false }),
    ]);
    setAffiliates((affRes.data as any) || []);
    setCommissions((comRes.data as any) || []);
    setWithdrawals((wdRes.data as any) || []);
    setLoading(false);
  };

  const toggleAffiliateStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    await supabase.from('affiliates').update({ status: newStatus }).eq('id', id);
    toast.success(`Affiliate ${newStatus === 'active' ? 'diaktifkan' : 'ditangguhkan'}`);
    fetchAll();
  };

  const handleWithdrawalAction = async (action: 'approved' | 'rejected') => {
    if (!selectedWithdrawal) return;
    setProcessing(true);
    try {
      await supabase.from('affiliate_withdrawals').update({
        status: action,
        admin_notes: adminNotes || null,
        processed_at: new Date().toISOString(),
      }).eq('id', selectedWithdrawal.id);

      if (action === 'rejected') {
        // Refund balance
        const { data: aff } = await supabase.from('affiliates').select('current_balance, total_withdrawn').eq('id', selectedWithdrawal.affiliate_id).single();
        if (aff) {
          await supabase.from('affiliates').update({
            current_balance: (aff as any).current_balance + selectedWithdrawal.amount,
            total_withdrawn: (aff as any).total_withdrawn - selectedWithdrawal.amount,
          }).eq('id', selectedWithdrawal.affiliate_id);
        }
      }

      toast.success(`Pencairan ${action === 'approved' ? 'disetujui' : 'ditolak'}`);
      setSelectedWithdrawal(null);
      setAdminNotes("");
      fetchAll();
    } catch (err: any) { toast.error(err.message); }
    finally { setProcessing(false); }
  };

  const formatRp = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

  const filteredAffiliates = affiliates.filter(a =>
    a.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.affiliate_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalBalance = affiliates.reduce((s, a) => s + (a.current_balance || 0), 0);
  const totalEarned = affiliates.reduce((s, a) => s + (a.total_earned || 0), 0);
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Manajemen Affiliate</h1>
        <p className="text-sm text-muted-foreground">Kelola affiliate, komisi, dan pencairan dana</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground">Total Affiliate</p><p className="text-2xl font-bold">{affiliates.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground">Total Komisi Dibayar</p><p className="text-2xl font-bold text-green-600">{formatRp(totalEarned)}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground">Saldo Terhutang</p><p className="text-2xl font-bold text-primary">{formatRp(totalBalance)}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground">Pending Pencairan</p><p className="text-2xl font-bold text-yellow-600">{pendingWithdrawals.length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="affiliates">
        <TabsList>
          <TabsTrigger value="affiliates">Affiliate ({affiliates.length})</TabsTrigger>
          <TabsTrigger value="commissions">Komisi ({commissions.length})</TabsTrigger>
          <TabsTrigger value="withdrawals">
            Pencairan {pendingWithdrawals.length > 0 && <Badge className="ml-1 bg-yellow-500/20 text-yellow-600">{pendingWithdrawals.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="affiliates">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Cari nama, email, kode..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Kode</TableHead>
                    <TableHead>Komisi</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAffiliates.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.full_name}</TableCell>
                      <TableCell className="text-xs">{a.email}</TableCell>
                      <TableCell className="font-mono text-xs">{a.affiliate_code}</TableCell>
                      <TableCell>{a.commission_rate}%</TableCell>
                      <TableCell className="font-bold text-primary">{formatRp(a.current_balance)}</TableCell>
                      <TableCell>
                        <Badge variant={a.status === 'active' ? 'default' : 'destructive'}>{a.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => toggleAffiliateStatus(a.id, a.status)} className="gap-1">
                          {a.status === 'active' ? <><Ban className="h-3 w-3" /> Suspend</> : <><Play className="h-3 w-3" /> Aktifkan</>}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions">
          <Card>
            <CardHeader><CardTitle className="text-base">Riwayat Komisi</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paket</TableHead>
                    <TableHead>Harga</TableHead>
                    <TableHead>Rate</TableHead>
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
                      <TableCell>{c.commission_rate}%</TableCell>
                      <TableCell className="font-bold text-primary">{formatRp(c.commission_amount)}</TableCell>
                      <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                      <TableCell className="text-xs">{new Date(c.created_at).toLocaleDateString('id-ID')}</TableCell>
                    </TableRow>
                  ))}
                  {commissions.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada komisi</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals">
          <Card>
            <CardHeader><CardTitle className="text-base">Pencairan Dana</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Affiliate</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>No. Rek</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map(w => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium text-xs">{(w as any).affiliates?.full_name || '-'}</TableCell>
                      <TableCell className="font-bold">{formatRp(w.amount)}</TableCell>
                      <TableCell>{w.bank_name}</TableCell>
                      <TableCell className="font-mono text-xs">{w.account_number}</TableCell>
                      <TableCell>
                        <Badge variant={w.status === 'approved' ? 'default' : w.status === 'rejected' ? 'destructive' : 'outline'}>
                          {w.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{new Date(w.created_at).toLocaleDateString('id-ID')}</TableCell>
                      <TableCell>
                        {w.status === 'pending' && (
                          <Button size="sm" variant="outline" onClick={() => { setSelectedWithdrawal(w); setAdminNotes(""); }}>
                            Review
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {withdrawals.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Belum ada pencairan</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Withdrawal Review Dialog */}
          <Dialog open={!!selectedWithdrawal} onOpenChange={(o) => !o && setSelectedWithdrawal(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Review Pencairan Dana</DialogTitle></DialogHeader>
              {selectedWithdrawal && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-muted-foreground">Affiliate</p><p className="font-medium">{(selectedWithdrawal as any).affiliates?.full_name}</p></div>
                    <div><p className="text-muted-foreground">Jumlah</p><p className="font-bold text-primary">{formatRp(selectedWithdrawal.amount)}</p></div>
                    <div><p className="text-muted-foreground">Bank</p><p className="font-medium">{selectedWithdrawal.bank_name}</p></div>
                    <div><p className="text-muted-foreground">No. Rekening</p><p className="font-mono">{selectedWithdrawal.account_number}</p></div>
                    <div className="col-span-2"><p className="text-muted-foreground">Atas Nama</p><p className="font-medium">{selectedWithdrawal.account_holder}</p></div>
                  </div>
                  <div className="space-y-2">
                    <Label>Catatan Admin (opsional)</Label>
                    <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Catatan..." />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleWithdrawalAction('approved')} disabled={processing} className="flex-1 gap-1 bg-green-600 hover:bg-green-700">
                      {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Setujui
                    </Button>
                    <Button onClick={() => handleWithdrawalAction('rejected')} disabled={processing} variant="destructive" className="flex-1 gap-1">
                      {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Tolak
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperAdminAffiliate;
