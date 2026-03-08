import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const SuperAdminPayments = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("payment_transactions")
        .select("*, schools(name), subscription_plans(name)")
        .order("created_at", { ascending: false });
      setPayments(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const formatRupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
  const statusMap: Record<string, { label: string; cls: string }> = {
    paid: { label: "Lunas", cls: "bg-success/10 text-success border-success/20" },
    pending: { label: "Pending", cls: "bg-warning/10 text-warning border-warning/20" },
    failed: { label: "Gagal", cls: "bg-destructive/10 text-destructive border-destructive/20" },
    expired: { label: "Expired", cls: "bg-muted text-muted-foreground" },
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Riwayat Pembayaran</h1>
        <p className="text-muted-foreground text-sm">Seluruh transaksi pembayaran dari semua sekolah</p>
      </div>

      <Card className="border-0 shadow-card">
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Belum ada transaksi</p>
          ) : (
            <div className="divide-y divide-border">
              {payments.map((p) => {
                const st = statusMap[p.status] || statusMap.pending;
                return (
                  <div key={p.id} className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{p.schools?.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.subscription_plans?.name} • {new Date(p.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      {p.mayar_transaction_id && <p className="text-[10px] text-muted-foreground font-mono mt-0.5">#{p.mayar_transaction_id}</p>}
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-bold text-foreground">{formatRupiah(p.amount)}</p>
                      <Badge className={`text-[10px] ${st.cls}`}>{st.label}</Badge>
                      {p.paid_at && <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(p.paid_at).toLocaleDateString("id-ID")}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminPayments;
