import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Star, Zap, Crown } from "lucide-react";
import { motion } from "framer-motion";

const plans = [
  {
    name: "Basic",
    price: "Rp 99.000",
    icon: Zap,
    description: "Untuk sekolah kecil yang baru memulai",
    features: [
      "Monitoring penjemputan realtime",
      "Scan QR Code",
      "Manajemen siswa",
      "Riwayat penjemputan",
      "Maksimal 200 siswa",
    ],
    highlighted: false,
  },
  {
    name: "School",
    price: "Rp 199.000",
    icon: Star,
    description: "Cocok untuk sekolah dengan banyak siswa",
    features: [
      "Semua fitur Basic",
      "Unlimited siswa",
      "Multi petugas scan",
      "Export laporan Excel",
      "Upload foto siswa",
    ],
    highlighted: true,
  },
  {
    name: "Premium",
    price: "Rp 399.000",
    icon: Crown,
    description: "Untuk sekolah besar & multi cabang",
    features: [
      "Semua fitur School",
      "WhatsApp notifikasi otomatis",
      "Multi cabang sekolah",
      "Custom logo sekolah",
      "Priority support",
      "API Integration",
    ],
    highlighted: false,
  },
];

const Subscription = () => {
  return (
    <div className="space-y-6">
      <div className="text-center max-w-xl mx-auto">
        <h1 className="text-2xl font-bold">Paket Langganan</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Pilih paket yang sesuai dengan kebutuhan sekolah Anda
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card
              className={`shadow-card border-0 relative overflow-hidden ${
                plan.highlighted ? "ring-2 ring-primary" : ""
              }`}
            >
              {plan.highlighted && (
                <div className="gradient-primary text-primary-foreground text-xs font-semibold text-center py-1">
                  Paling Populer
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <div
                  className={`h-12 w-12 rounded-xl flex items-center justify-center mx-auto mb-2 ${
                    plan.highlighted
                      ? "gradient-primary text-primary-foreground"
                      : "bg-secondary text-foreground"
                  }`}
                >
                  <plan.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{plan.description}</p>
                <div className="mt-2">
                  <span className="text-2xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm"> / bulan</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${
                    plan.highlighted
                      ? "gradient-primary hover:opacity-90 text-primary-foreground"
                      : ""
                  }`}
                  variant={plan.highlighted ? "default" : "outline"}
                >
                  Pilih Paket
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Subscription;
