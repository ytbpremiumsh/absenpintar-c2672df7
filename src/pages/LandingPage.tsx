import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  ScanLine, Monitor, MessageSquare, FileBarChart,
  ArrowRight, ArrowDown, CheckCircle2, School, Mail, Phone, MapPin,
  Shield, Zap, HeadphonesIcon, BarChart3, Smartphone, Layout,
  Lock, Star, TrendingUp, Sparkles, ChevronRight, Globe, Bell, Clock, Settings, FileText, QrCode, Users, GraduationCap,
  AlertTriangle, XCircle, Lightbulb,
} from "lucide-react";

const iconMap: Record<string, any> = {
  scan: ScanLine,
  monitor: Monitor,
  message: MessageSquare,
  chart: FileBarChart,
};

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } }),
};

const STATS = [
  { value: "< 1 detik", label: "Waktu Scan QR" },
  { value: "24/7", label: "Akses Monitoring" },
  { value: "100%", label: "Data Terenkripsi" },
  { value: "∞", label: "Riwayat Tersimpan" },
];

const WHY_ITEMS_FALLBACK = [
  { icon: Lock, title: "Keamanan Terjamin", desc: "Setiap penjemputan melalui verifikasi QR Code atau NIS. Data terenkripsi dan tersimpan aman." },
  { icon: Smartphone, title: "Multi-Platform", desc: "Akses dari perangkat apa saja tanpa perlu install aplikasi. Responsive di semua ukuran layar." },
  { icon: TrendingUp, title: "Skalabel & Fleksibel", desc: "Dari 30 siswa hingga ribuan siswa. Tumbuh bersama sekolah Anda." },
  { icon: Star, title: "Mudah Digunakan", desc: "Setup hanya beberapa menit — import data, cetak QR, langsung pakai." },
];

const EXTRA_FEATURES = [
  { icon: Globe, title: "Live Monitor Publik", desc: "Wali murid bisa pantau status penjemputan real-time tanpa login." },
  { icon: Clock, title: "Riwayat Lengkap", desc: "Log penjemputan bisa difilter berdasarkan tanggal, kelas, dan siswa." },
  { icon: FileText, title: "Export Harian", desc: "Download laporan Excel siap cetak untuk dokumentasi." },
  { icon: Bell, title: "Notifikasi WhatsApp", desc: "Wali murid menerima pesan otomatis saat anak dijemput." },
  { icon: Shield, title: "Langganan Fleksibel", desc: "Paket gratis hingga premium sesuai kebutuhan sekolah." },
  { icon: Settings, title: "Pengaturan Lengkap", desc: "Jam operasional, logo, QR, dan integrasi WhatsApp." },
];

const PROBLEMS = [
  { icon: AlertTriangle, title: "Keamanan Rentan", desc: "Tidak ada verifikasi identitas penjemput. Siapa saja bisa mengaku sebagai wali murid.", color: "text-destructive" },
  { icon: XCircle, title: "Tidak Ada Rekam Jejak", desc: "Sekolah tidak memiliki catatan digital siapa yang menjemput dan jam berapa.", color: "text-destructive" },
  { icon: Clock, title: "Proses Lambat & Kacau", desc: "Area penjemputan tidak teratur. Guru kesulitan memantau ratusan siswa sekaligus.", color: "text-destructive" },
  { icon: Users, title: "Orang Tua Cemas", desc: "Wali murid tidak mendapat informasi real-time apakah anaknya sudah dijemput.", color: "text-destructive" },
  { icon: FileText, title: "Laporan Manual", desc: "Pencatatan masih di buku tulis, rawan hilang, tidak akurat, dan sulit diaudit.", color: "text-destructive" },
  { icon: Globe, title: "Tidak Transparan", desc: "Tidak ada sistem monitoring yang bisa diakses orang tua secara online.", color: "text-destructive" },
];

const SOLUTIONS_MAP = [
  { icon: QrCode, problem: "Keamanan Rentan", solution: "Verifikasi QR Code & NIS", desc: "Setiap penjemput wajib memindai kartu QR unik siswa. Sistem memastikan hanya pemegang kartu yang bisa menjemput." },
  { icon: BarChart3, problem: "Tidak Ada Rekam Jejak", solution: "Riwayat Digital Otomatis", desc: "Setiap aktivitas tercatat otomatis dan bisa di-export kapan saja." },
  { icon: Monitor, problem: "Proses Lambat & Kacau", solution: "Monitoring Real-Time", desc: "Dashboard monitoring menampilkan status penjemputan seluruh kelas secara live." },
  { icon: Bell, problem: "Orang Tua Cemas", solution: "Notifikasi WhatsApp Instan", desc: "Wali murid langsung menerima pesan WhatsApp otomatis saat anaknya dijemput." },
  { icon: Globe, problem: "Tidak Transparan", solution: "Live Monitor Publik", desc: "Halaman monitoring publik bisa diakses tanpa login. Status penjemputan terlihat real-time." },
  { icon: Smartphone, problem: "Laporan Manual", solution: "Export & Analitik Digital", desc: "Laporan harian otomatis dalam format Excel dengan grafik dan statistik." },
];

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
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Sticky Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
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
            <button onClick={() => navigate("/login")} className="text-sm font-medium text-muted-foreground hover:text-foreground px-4 py-2 transition-colors">Masuk</button>
            <button onClick={() => navigate("/register")} className="inline-flex items-center gap-1.5 gradient-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40">
              Daftar <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-[90vh] flex flex-col items-center justify-center relative px-4 text-center pt-16">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-6 relative z-10">
          <span className="inline-flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-full px-4 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Solusi Penjemputan Siswa #1 di Indonesia
          </span>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.8 }} className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-[0.95] relative z-10">
          <span className="text-foreground">{get("hero_title", "Smart Pickup").split(" ").slice(0, -1).join(" ")} </span>
          <span className="text-primary">{get("hero_title", "Smart Pickup").split(" ").slice(-1).join(" ")}</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.7 }} className="mt-6 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed relative z-10">
          {get("hero_subtitle", "Sistem penjemputan siswa modern yang mengutamakan keamanan, efisiensi, dan transparansi. Dirancang khusus untuk sekolah Indonesia.")}
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-10 flex flex-col sm:flex-row gap-3 relative z-10">
          <button onClick={() => navigate("/register")} className="inline-flex items-center justify-center gap-2 gradient-primary text-primary-foreground px-8 py-3.5 rounded-2xl font-semibold transition-all shadow-xl shadow-primary/20 hover:shadow-primary/40 text-sm">
            <Zap className="h-4 w-4" /> {get("cta_text", "Mulai Gratis Sekarang")}
          </button>
          <a href="#features" className="inline-flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-foreground px-8 py-3.5 rounded-2xl font-semibold transition-all text-sm border border-border">
            Lihat Fitur <ArrowDown className="h-4 w-4" />
          </a>
        </motion.div>

        {/* Stats bar */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 w-full max-w-3xl relative z-10">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl sm:text-3xl font-extrabold text-primary">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Hero Image */}
        <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7, delay: 0.3 }} className="mt-14 max-w-5xl mx-auto w-full px-2 relative z-10">
          {get("hero_image") ? (
            <div className="relative group">
              <div className="absolute -inset-3 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 rounded-3xl blur-2xl opacity-50 group-hover:opacity-80 transition-opacity duration-500" />
              <img src={get("hero_image")} alt="Hero" className="relative w-full rounded-2xl shadow-2xl shadow-foreground/10 border border-border/50" />
            </div>
          ) : (
            <div className="relative">
              <div className="absolute -inset-3 bg-gradient-to-r from-primary/8 to-primary/8 rounded-3xl blur-2xl opacity-40" />
              <div className="relative w-full aspect-[16/9] rounded-2xl bg-muted/50 flex items-center justify-center shadow-2xl border border-border/50">
                <School className="h-20 w-20 text-primary/10" />
              </div>
            </div>
          )}
        </motion.div>

        {/* Caption */}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-8 text-center text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed px-2 relative z-10">
          {get("hero_caption", "Sistem ini mampu mengelola penjemputan siswa secara otomatis, memantau status real-time, dan mengirim notifikasi WhatsApp ke orang tua.")}
        </motion.p>
      </section>

      {/* Problem & Solution Section */}
      <section className="py-20 sm:py-28 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Problems Header */}
          <motion.div custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-destructive mb-3 block">Latar Belakang</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">Kondisi Permasalahan</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Sistem penjemputan konvensional di sekolah Indonesia masih menyimpan banyak risiko dan ketidakefisienan.</p>
          </motion.div>

          {/* Problem Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
            {PROBLEMS.map((p, i) => (
              <motion.div key={p.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="group rounded-2xl p-6 transition-all duration-300 border bg-destructive/5 border-destructive/10 hover:border-destructive/20 hover:shadow-lg hover:shadow-destructive/5">
                <p.icon className="h-7 w-7 text-destructive mb-3" />
                <h3 className="font-bold text-foreground text-base mb-1.5">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Divider Arrow */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="flex flex-col items-center mb-16">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-success to-success/80 flex items-center justify-center shadow-xl shadow-success/20">
              <ArrowDown className="h-6 w-6 text-success-foreground" />
            </div>
            <p className="mt-3 font-bold text-success text-base">Solusi Kami</p>
          </motion.div>

          {/* Solutions Header */}
          <motion.div custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-success mb-3 block">Jawaban Tepat</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">Smart Pickup School System</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Sistem digital terintegrasi yang menyelesaikan setiap permasalahan penjemputan dengan teknologi modern.</p>
          </motion.div>

          {/* Solution Cards */}
          <div className="grid sm:grid-cols-2 gap-5">
            {SOLUTIONS_MAP.map((s, i) => (
              <motion.div key={s.solution} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="rounded-2xl p-6 transition-all duration-300 border bg-success/5 border-success/10 hover:border-success/20 hover:shadow-lg hover:shadow-success/5">
                <div className="flex items-start gap-4">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-success to-success/80 flex items-center justify-center shrink-0 shadow-lg shadow-success/15">
                    <s.icon className="h-5 w-5 text-success-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">{s.problem}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-success" />
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-success/10 text-success">{s.solution}</span>
                    </div>
                    <h3 className="font-bold text-foreground text-sm mb-1">{s.solution}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3 block">Fitur Unggulan</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">Semua yang Anda Butuhkan</h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">Solusi lengkap untuk mengelola sistem penjemputan siswa yang aman dan efisien</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div key={i} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                  className="group bg-card hover:bg-card/80 border border-border/50 hover:border-primary/20 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                  <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20 mb-5 group-hover:scale-105 transition-transform">
                    <Icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="font-bold text-foreground text-base mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 sm:py-28 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/3 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative">
          <motion.div custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3 block">Kenapa Harus Kami</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              {get("why_title", "Solusi Lengkap untuk Keamanan Penjemputan Siswa")}
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              {get("why_desc", "Kami menyediakan solusi menyeluruh untuk membantu sekolah Anda mengelola penjemputan siswa dengan aman, cepat, dan terstruktur.")}
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-5">
            {WHY_ITEMS_FALLBACK.map((item, i) => (
              <motion.div key={item.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="flex gap-4 sm:gap-5 items-start bg-card border border-border/50 rounded-2xl p-6 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1">
                    {get(`why_item_${i + 1}_title`, item.title)}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {get(`why_item_${i + 1}_desc`, item.desc)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Extra Features */}
      <section className="py-20 sm:py-28 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3 block">Dan masih banyak lagi</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">Fitur Pendukung</h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {EXTRA_FEATURES.map((f, i) => (
              <motion.div key={f.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-card border border-border/50 rounded-2xl p-6 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                <f.icon className="h-7 w-7 text-primary mb-4" />
                <h3 className="font-bold text-foreground text-sm mb-1.5">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Payment Methods */}
      <section className="py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3 block">Pembayaran Mudah</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Kanal Pembayaran</h2>
            <p className="mt-3 text-muted-foreground">Bebas pilih cara bayar! Semua metode populer tersedia.</p>
          </motion.div>
          <div className="space-y-8">
            {[
              { title: "E-Wallet", desc: "Pembayaran melalui e-wallet", img: "/images/payments/ewallet.webp", small: false },
              { title: "Transfer Bank", desc: "Pembayaran melalui transfer antar bank", img: "/images/payments/transfer-bank.webp", small: false },
              { title: "Gerai / Outlet", desc: "Pembayaran melalui gerai Alfamart atau Indomaret", img: "/images/payments/gerai.webp", small: true },
            ].map((category, ci) => (
              <motion.div key={ci} custom={ci} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="border-t border-border pt-5">
                <h4 className="font-bold text-foreground text-sm">{category.title}</h4>
                <p className="text-xs text-muted-foreground mb-3">{category.desc}</p>
                <img src={category.img} alt={category.title} className={category.small ? "h-8 sm:h-10 w-auto object-contain" : "max-w-full sm:max-w-2xl h-auto object-contain"} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 sm:py-28 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-8 shadow-xl shadow-primary/20">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight mb-4">
              {get("cta_banner_text", "Siap Tingkatkan Keamanan Penjemputan Sekolah Anda?")}
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg mb-10 max-w-xl mx-auto">Bergabung sekarang dan rasakan kemudahan sistem penjemputan modern. Setup hanya 5 menit.</p>
            <button onClick={() => navigate("/register")} className="inline-flex items-center gap-2 gradient-primary text-primary-foreground px-10 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-primary/20 hover:shadow-primary/40 text-base">
              <Zap className="h-5 w-5" /> Daftar Gratis Sekarang
            </button>
            <p className="text-muted-foreground/50 text-xs mt-4">Tidak perlu kartu kredit • Setup instan • Batalkan kapan saja</p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/30 border-t border-border py-10">
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
              {get("footer_address") && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {get("footer_address")}</span>}
              {get("footer_email") && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {get("footer_email")}</span>}
              {get("footer_phone") && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {get("footer_phone")}</span>}
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
