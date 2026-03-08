import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  ScanLine, Monitor, MessageSquare, FileBarChart,
  ArrowRight, CheckCircle2, School, Mail, Phone, MapPin,
  Shield, Zap, HeadphonesIcon, BarChart3, Smartphone, Layout,
} from "lucide-react";

const iconMap: Record<string, any> = {
  scan: ScanLine,
  monitor: Monitor,
  message: MessageSquare,
  chart: FileBarChart,
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("landing_content")
      .select("key, value")
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data || []).forEach((item: any) => { map[item.key] = item.value; });
        setContent(map);
        setLoading(false);
      });
  }, []);

  const get = (key: string, fallback = "") => content[key] || fallback;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Memuat...</div>
      </div>
    );
  }

  const features = [1, 2, 3, 4, 5, 6].map((i) => ({
    title: get(`feature_${i}_title`),
    desc: get(`feature_${i}_desc`),
    icon: iconMap[get(`feature_${i}_icon`, "scan")] || CheckCircle2,
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {get("footer_logo") ? (
              <img src={get("footer_logo")} alt="Logo" className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                <School className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
            <span className="font-bold text-foreground text-sm">{get("hero_title", "Smart Pickup")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>Masuk</Button>
            <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => navigate("/register")}>Daftar</Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 relative">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6"
            >
              <CheckCircle2 className="h-4 w-4" /> Sistem Penjemputan Digital #1
            </motion.div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground leading-tight">
              {get("hero_title", "Smart Pickup School")}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
              {get("hero_subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" className="gradient-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow" onClick={() => navigate("/register")}>
                {get("cta_text", "Mulai Sekarang")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/login")}>
                Masuk
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap justify-center items-center gap-6 text-sm text-muted-foreground">
              {["Gratis Uji Coba", "Tanpa Kartu Kredit", "Setup Instan"].map((t, i) => (
                <motion.span
                  key={t}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4 text-success" /> {t}
                </motion.span>
              ))}
            </div>
          </motion.div>

          {/* Centered Hero Image */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-14 max-w-4xl mx-auto"
          >
            {get("hero_image") ? (
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-2xl blur-lg opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                <img
                  src={get("hero_image")}
                  alt="Hero"
                  className="relative w-full rounded-2xl shadow-2xl shadow-foreground/10 border border-border/50 transition-transform duration-500 group-hover:scale-[1.01]"
                />
              </div>
            ) : (
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-2xl blur-lg opacity-40" />
                <div className="relative w-full aspect-[16/9] rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center shadow-2xl shadow-foreground/10 border border-border/50">
                  <School className="h-24 w-24 text-primary/20" />
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Fitur Unggulan</h2>
            <p className="mt-3 text-muted-foreground max-w-md mx-auto">Semua yang Anda butuhkan untuk mengelola sistem penjemputan siswa</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.5 }}
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                >
                  <Card className="border-0 shadow-card h-full hover:shadow-elevated transition-all duration-300">
                    <CardContent className="p-6 text-center">
                      <motion.div
                        whileHover={{ rotate: [0, -10, 10, 0], transition: { duration: 0.4 } }}
                        className="mx-auto mb-4 h-14 w-14 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20"
                      >
                        <Icon className="h-7 w-7 text-primary-foreground" />
                      </motion.div>
                      <h3 className="font-bold text-foreground mb-2">{f.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 sm:py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Text Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="text-primary font-semibold text-sm">Kenapa Harus {get("hero_title", "Smart Pickup")} ?</span>
              <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground leading-tight">
                Solusi Lengkap untuk Keamanan Penjemputan Siswa.
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Kami tidak hanya menyediakan alat, tapi juga solusi menyeluruh untuk membantu sekolah Anda mengelola penjemputan siswa dengan aman, cepat, dan terstruktur.
              </p>

              <div className="mt-8 space-y-6">
                {[
                  {
                    icon: Layout,
                    title: "Fitur Lengkap dan Terintegrasi",
                    desc: "Semua kebutuhan penjemputan tersedia dalam satu platform, mulai dari scan QR hingga notifikasi otomatis.",
                  },
                  {
                    icon: Smartphone,
                    title: "Antarmuka Ramah Pengguna",
                    desc: "Desain yang intuitif dan mudah digunakan, memungkinkan siapa pun mengelola penjemputan tanpa perlu keahlian teknis khusus.",
                  },
                  {
                    icon: BarChart3,
                    title: "Analisa Data Cerdas",
                    desc: "Dapatkan insight berbasis data real-time untuk mendukung pengambilan keputusan yang tepat dan strategis.",
                  },
                  {
                    icon: HeadphonesIcon,
                    title: "Dukungan Pelanggan Premium 24/7",
                    desc: "Tim support kami siap membantu Anda kapan saja dengan cepat, profesional, dan ramah.",
                  },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.4 }}
                    className="flex gap-4"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">{item.title}</h4>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right: Device Mockups */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative flex items-center justify-center"
            >
              {/* Desktop mockup (background) */}
              <div className="relative w-full max-w-md lg:max-w-lg">
                <div className="absolute -inset-4 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 rounded-3xl blur-2xl opacity-60" />
                <div className="relative rounded-2xl border border-border bg-background shadow-2xl shadow-foreground/10 overflow-hidden">
                  <div className="flex items-center gap-1.5 px-4 py-2.5 bg-muted/50 border-b border-border">
                    <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
                    <div className="ml-3 flex-1 h-5 rounded-md bg-muted/80" />
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex gap-3">
                      <div className="w-1/3 space-y-2">
                        <div className="h-3 bg-primary/15 rounded w-full" />
                        <div className="h-3 bg-muted rounded w-4/5" />
                        <div className="h-3 bg-muted rounded w-3/5" />
                        <div className="h-3 bg-muted rounded w-4/5" />
                        <div className="h-3 bg-primary/10 rounded w-full mt-4" />
                        <div className="h-3 bg-muted rounded w-3/4" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          {[1, 2, 3].map((n) => (
                            <div key={n} className="rounded-lg bg-muted/60 p-3 space-y-1.5">
                              <div className="h-2 bg-primary/20 rounded w-2/3" />
                              <div className="h-4 bg-foreground/10 rounded w-full font-bold" />
                              <div className="h-1.5 bg-muted rounded w-1/2" />
                            </div>
                          ))}
                        </div>
                        <div className="rounded-lg bg-muted/40 p-3 h-24 flex items-end gap-1">
                          {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 50, 68].map((h, i) => (
                            <div key={i} className="flex-1 bg-primary/30 rounded-t" style={{ height: `${h}%` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Phone mockup (overlaid) */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="absolute -bottom-8 -left-8 sm:-left-12 w-32 sm:w-40"
                >
                  <div className="rounded-[1.5rem] border-[3px] border-foreground/20 bg-background shadow-xl overflow-hidden">
                    <div className="mx-auto mt-2 w-12 h-1 rounded-full bg-foreground/15" />
                    <div className="p-2.5 space-y-2 mt-1">
                      <div className="h-2 bg-primary/20 rounded w-3/4" />
                      <div className="h-2 bg-muted rounded w-full" />
                      <div className="rounded-md bg-muted/50 p-2 space-y-1">
                        <div className="h-1.5 bg-foreground/10 rounded w-2/3" />
                        <div className="h-1.5 bg-primary/15 rounded w-full" />
                      </div>
                      <div className="rounded-md bg-primary/10 p-2 flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-primary/25 flex-shrink-0" />
                        <div className="space-y-0.5 flex-1">
                          <div className="h-1.5 bg-foreground/10 rounded w-3/4" />
                          <div className="h-1 bg-muted rounded w-1/2" />
                        </div>
                      </div>
                      <div className="rounded-md bg-muted/50 p-2 space-y-1">
                        <div className="h-1.5 bg-foreground/10 rounded w-1/2" />
                        <div className="h-1.5 bg-primary/15 rounded w-full" />
                      </div>
                      <div className="h-6 rounded-md gradient-primary mt-1" />
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Download / CTA Banner */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="relative rounded-3xl gradient-primary overflow-hidden min-h-[280px] sm:min-h-[320px]">
            {/* Background decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-foreground/5 rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-foreground/5 rounded-full translate-y-1/3 -translate-x-1/4" />

            <div className="relative grid lg:grid-cols-2 items-center h-full">
              {/* Left text */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="p-8 sm:p-12 lg:p-14"
              >
                <span className="text-primary-foreground/70 text-xs sm:text-sm font-semibold tracking-widest uppercase">
                  Mulai Sekarang
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 block w-fit bg-primary-foreground text-primary border-0 hover:bg-primary-foreground/90 hover:text-primary font-semibold shadow-lg"
                  onClick={() => navigate("/register")}
                >
                  Daftar Sekarang
                </Button>
                <h2 className="mt-6 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-primary-foreground leading-tight">
                  Kelola Penjemputan Lebih Mudah Bersama {get("hero_title", "Smart Pickup")}
                </h2>
              </motion.div>

              {/* Right phone mockup */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="hidden lg:flex justify-center items-end h-full"
              >
                <div className="relative -mb-1">
                  {/* Phone frame */}
                  <div className="w-52 rounded-[2rem] border-[4px] border-foreground/80 bg-background shadow-2xl overflow-hidden">
                    {/* Notch */}
                    <div className="mx-auto mt-2 w-16 h-1.5 rounded-full bg-foreground/20" />
                    {/* Screen content */}
                    <div className="p-3 mt-1 space-y-2.5">
                      <div className="rounded-xl bg-primary/15 p-3 space-y-1">
                        <div className="h-2 bg-primary/30 rounded w-1/2" />
                        <div className="h-4 bg-primary/20 rounded w-3/4 font-bold" />
                        <div className="h-1.5 bg-muted rounded w-1/3 mt-1" />
                      </div>
                      <div className="text-[8px] font-semibold text-foreground/50 px-1">Menu Utama</div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[1, 2, 3, 4].map((n) => (
                          <div key={n} className="flex flex-col items-center gap-0.5">
                            <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
                              <div className="w-4 h-4 rounded-md bg-primary/20" />
                            </div>
                            <div className="h-1 bg-muted rounded w-6" />
                          </div>
                        ))}
                      </div>
                      <div className="text-[8px] font-semibold text-foreground/50 px-1">Aktivitas</div>
                      <div className="space-y-1.5">
                        {[1, 2].map((n) => (
                          <div key={n} className="rounded-lg bg-muted/50 p-2 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/15 flex-shrink-0" />
                            <div className="flex-1 space-y-0.5">
                              <div className="h-1.5 bg-foreground/10 rounded w-3/4" />
                              <div className="h-1 bg-muted rounded w-1/2" />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="h-7 rounded-lg gradient-primary opacity-80" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground/[0.03] border-t border-border py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
            <div className="flex items-center gap-3">
              {get("footer_logo") ? (
                <img src={get("footer_logo")} alt="Logo" className="h-10 w-10 rounded-xl object-cover shadow-md" />
              ) : (
                <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-md">
                  <School className="h-5 w-5 text-primary-foreground" />
                </div>
              )}
              <div>
                <p className="font-bold text-foreground text-sm">{get("hero_title", "Smart Pickup School")}</p>
                <p className="text-xs text-muted-foreground">Sistem Penjemputan Digital</p>
              </div>
            </div>

            <div className="flex flex-col items-center sm:items-end gap-2 text-sm text-muted-foreground">
              {get("footer_address") && (
                <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {get("footer_address")}</span>
              )}
              {get("footer_email") && (
                <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {get("footer_email")}</span>
              )}
              {get("footer_phone") && (
                <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {get("footer_phone")}</span>
              )}
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} {get("hero_title", "Smart Pickup School")}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
