import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ScanLine, Monitor, MessageSquare, FileBarChart,
  ArrowRight, CheckCircle2, Mail, Phone, MapPin,
  Zap, Bell, QrCode, Users, GraduationCap,
  UserCheck, BarChart3, Shield, Smartphone, Star, TrendingUp, Lock,
  ChevronRight, Sparkles, Play, ArrowDown,
  AlertTriangle, XCircle, Clock, FileText, Globe, Camera,
} from "lucide-react";
import heroDashboard from "@/assets/hero-dashboard.png";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const FEATURES = [
  { icon: QrCode, title: "Scan Barcode", desc: "Absensi instan kurang dari 1 detik dengan scan barcode siswa.", color: "from-blue-500 to-indigo-600" },
  { icon: UserCheck, title: "Face Recognition", desc: "Pengenalan wajah berbasis AI. Tanpa kartu, tanpa sentuhan.", color: "from-violet-500 to-purple-600" },
  { icon: Monitor, title: "Dashboard Real-Time", desc: "Pantau statistik kehadiran secara live dengan grafik interaktif.", color: "from-emerald-500 to-teal-600" },
  { icon: FileBarChart, title: "Rekap & Export", desc: "Rekap otomatis harian, mingguan, bulanan. Export ke Excel & PDF.", color: "from-amber-500 to-orange-600" },
  { icon: Bell, title: "Notifikasi WhatsApp", desc: "Notifikasi otomatis ke orang tua saat anak tercatat hadir.", color: "from-pink-500 to-rose-600" },
  { icon: GraduationCap, title: "Multi Sekolah", desc: "Arsitektur SaaS multi-tenant. Satu platform untuk banyak sekolah.", color: "from-cyan-500 to-blue-600" },
];

const STATS = [
  { value: "<1s", label: "Waktu Scan", icon: Zap },
  { value: "AI", label: "Face Recognition", icon: UserCheck },
  { value: "100%", label: "Data Aman", icon: Shield },
  { value: "24/7", label: "Monitoring", icon: Monitor },
];

const WHY_ITEMS = [
  { icon: Lock, title: "Keamanan Tingkat Tinggi", desc: "Data terenkripsi end-to-end dengan standar keamanan enterprise." },
  { icon: Smartphone, title: "Akses dari Mana Saja", desc: "Web-based, responsive di semua perangkat tanpa install aplikasi." },
  { icon: TrendingUp, title: "Skalabel Tanpa Batas", desc: "Dari 30 siswa hingga ribuan. Infrastruktur yang tumbuh bersama Anda." },
  { icon: Star, title: "Setup 5 Menit", desc: "Import data, aktifkan scan, langsung pakai. Tanpa training rumit." },
];

const WORKFLOW = [
  { step: "01", title: "Daftar & Setup", desc: "Buat akun sekolah dan import data siswa dalam hitungan menit." },
  { step: "02", title: "Siswa Scan", desc: "Siswa scan barcode atau gunakan face recognition untuk absensi." },
  { step: "03", title: "Monitoring Live", desc: "Pantau kehadiran real-time dan terima notifikasi otomatis." },
  { step: "04", title: "Rekap & Laporan", desc: "Download rekap lengkap dalam format Excel atau PDF." },
];

const PROBLEMS = [
  { icon: AlertTriangle, title: "Absensi Manual", desc: "Pencatatan kehadiran masih pakai buku tulis, rawan kesalahan dan manipulasi data." },
  { icon: Clock, title: "Proses Lambat", desc: "Guru harus memanggil siswa satu per satu untuk absensi, memakan waktu belajar." },
  { icon: XCircle, title: "Tidak Ada Rekap Digital", desc: "Sekolah kesulitan membuat laporan kehadiran bulanan karena data tidak terdigitalisasi." },
  { icon: Users, title: "Orang Tua Tidak Tahu", desc: "Wali murid tidak mendapat informasi real-time tentang kehadiran anaknya." },
  { icon: FileText, title: "Laporan Tidak Akurat", desc: "Data absensi manual sulit diaudit dan sering terjadi ketidakcocokan." },
  { icon: Globe, title: "Tidak Transparan", desc: "Tidak ada monitoring kehadiran yang bisa diakses orang tua secara online." },
];

const SOLUTIONS = [
  { icon: QrCode, problem: "Absensi Manual", solution: "Scan Barcode Instan", desc: "Siswa cukup scan barcode untuk mencatat kehadiran. Proses kurang dari 1 detik." },
  { icon: UserCheck, problem: "Proses Lambat", solution: "Face Recognition AI", desc: "AI mengenali wajah siswa dan mencatat absensi secara otomatis tanpa sentuhan." },
  { icon: BarChart3, problem: "Tidak Ada Rekap", solution: "Rekap Otomatis", desc: "Rekap harian, mingguan, dan bulanan dibuat otomatis dengan statistik lengkap." },
  { icon: Monitor, problem: "Tidak Transparan", solution: "Dashboard Real-Time", desc: "Dashboard menampilkan statistik kehadiran secara live — hadir, izin, sakit, alfa." },
  { icon: Bell, problem: "Orang Tua Tidak Tahu", solution: "Notifikasi WhatsApp", desc: "Wali murid otomatis menerima notifikasi WhatsApp saat anak tercatat hadir." },
  { icon: FileBarChart, problem: "Laporan Tidak Akurat", solution: "Export Excel & PDF", desc: "Laporan kehadiran lengkap bisa di-export dalam format Excel atau PDF kapan saja." },
];

interface PlanRow {
  id: string;
  name: string;
  price: number;
  description: string | null;
  features: any;
  max_students: number | null;
  sort_order: number;
}

const LandingPage = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState<Record<string, string>>({});
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [showPricing, setShowPricing] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("landing_content").select("key, value"),
      supabase.from("subscription_plans").select("*").eq("is_active", true).order("sort_order"),
    ]).then(([contentRes, plansRes]) => {
      const map: Record<string, string> = {};
      (contentRes.data || []).forEach((item: any) => { map[item.key] = item.value; });
      setContent(map);
      const allPlans = (plansRes.data || []) as any[];
      const landingPlans = allPlans.filter((p: any) => p.show_on_landing !== false);
      setPlans(landingPlans as PlanRow[]);
      setShowPricing(landingPlans.length > 0);
      setLoading(false);
    });

    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const get = (key: string, fallback = "") => content[key] || fallback;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-primary animate-pulse" />
          <p className="text-muted-foreground text-sm">Memuat...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ─── Navbar ─── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/90 backdrop-blur-xl shadow-sm border-b border-border" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/images/logo-absensi-pintar.png" alt="Absensi Pintar" className="h-9 sm:h-10 object-contain" />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => navigate("/login")} className="text-sm font-semibold text-muted-foreground hover:text-foreground px-3 sm:px-4 py-2 transition-colors rounded-xl hover:bg-muted">
              Masuk
            </button>
            <button onClick={() => navigate("/register")} className="inline-flex items-center gap-1.5 gradient-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]">
              Mulai Gratis <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
          <div className="absolute top-1/3 left-0 w-[300px] h-[300px] bg-primary/3 rounded-full blur-[80px]" />
        </div>
        <div className="absolute inset-0 grid-bg opacity-50 pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          {/* Centered Text */}
          <div className="text-center max-w-3xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="inline-flex items-center gap-2 bg-primary/8 border border-primary/15 rounded-full px-4 py-1.5 text-xs font-bold text-primary mb-6">
                <Sparkles className="h-3.5 w-3.5" /> Sistem Absensi Digital #1 Indonesia
              </span>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.7 }}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-[4.25rem] font-extrabold tracking-tight leading-[1.05]">
              <span className="text-foreground">Absensi Sekolah </span>
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Lebih Cerdas</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.6 }}
              className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Platform absensi modern dengan barcode scan & face recognition AI. Dirancang khusus untuk sekolah Indonesia — cepat, aman, dan mudah digunakan.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
              className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => navigate("/register")}
                className="inline-flex items-center justify-center gap-2 gradient-primary text-primary-foreground px-7 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] text-sm">
                <Zap className="h-4 w-4" /> Coba Gratis Sekarang
              </button>
              <a href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 bg-card hover:bg-muted text-foreground px-7 py-3.5 rounded-2xl font-semibold transition-all text-sm border border-border shadow-sm">
                <Play className="h-4 w-4" /> Cara Kerja
              </a>
            </motion.div>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
              className="mt-5 text-xs text-muted-foreground/60">
              ✓ Gratis tanpa kartu kredit &nbsp;•&nbsp; ✓ Setup 5 menit &nbsp;•&nbsp; ✓ Batalkan kapan saja
            </motion.p>
          </div>

          {/* Centered Hero Image */}
          <motion.div initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.5, duration: 0.9, ease: "easeOut" }}
            className="mt-14 sm:mt-16 relative mx-auto max-w-5xl">
            <div className="absolute -inset-6 bg-gradient-to-br from-primary/20 via-primary/8 to-transparent rounded-[2.5rem] blur-3xl" />
            <div className="absolute -inset-2 bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl" />
            <img
              src={heroDashboard}
              alt="Dashboard Absensi Pintar"
              className="relative w-full h-auto rounded-2xl border border-border/50 shadow-[0_30px_80px_-15px_rgba(0,0,0,0.3),0_0_50px_-10px_hsl(234_89%_60%/0.18)]"
            />
          </motion.div>
        </div>
      </section>

      {/* ─── Problems ─── */}
      <section className="py-20 sm:py-28 bg-muted/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-destructive/3 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-destructive mb-3 block">Latar Belakang</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Masalah Absensi di Sekolah
            </h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Sistem absensi manual di sekolah Indonesia masih menyimpan banyak masalah dan ketidakefisienan.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
            {PROBLEMS.map((p, i) => (
              <motion.div key={p.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="group bg-card border border-destructive/10 rounded-2xl p-6 hover:border-destructive/25 hover:shadow-lg hover:shadow-destructive/5 transition-all duration-300">
                <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center mb-4 group-hover:bg-destructive/15 transition-colors">
                  <p.icon className="h-5 w-5 text-destructive" />
                </div>
                <h3 className="font-bold text-foreground text-base mb-1.5">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Arrow transition */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="flex flex-col items-center mb-16">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-xl shadow-primary/20">
              <ArrowDown className="h-6 w-6 text-primary-foreground" />
            </div>
            <p className="mt-3 font-bold text-primary text-sm">Solusi Kami</p>
          </motion.div>

          {/* Solutions */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3 block">Jawaban Tepat</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Smart School Attendance System
            </h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Setiap permasalahan memiliki solusi teknologi modern yang terintegrasi dalam satu platform.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-5">
            {SOLUTIONS.map((s, i) => (
              <motion.div key={s.solution} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="group bg-card border border-primary/10 rounded-2xl p-6 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/15 group-hover:scale-105 transition-transform">
                    <s.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive">{s.problem}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">{s.solution}</span>
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

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-20 sm:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/50 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3 block">Cara Kerja</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Mulai dalam 4 Langkah Mudah
            </h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">Proses sederhana dari pendaftaran hingga monitoring kehadiran siswa.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {WORKFLOW.map((w, i) => (
              <motion.div key={w.step} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="relative group">
                <div className="bg-card border border-border/60 rounded-2xl p-6 h-full hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                  <span className="text-4xl font-black text-primary/15 group-hover:text-primary/25 transition-colors">{w.step}</span>
                  <h3 className="text-base font-bold text-foreground mt-2 mb-2">{w.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{w.desc}</p>
                </div>
                {i < WORKFLOW.length - 1 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-3 -translate-y-1/2 z-10">
                    <ChevronRight className="h-5 w-5 text-primary/30" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3 block">Fitur Unggulan</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Semua yang Sekolah Anda Butuhkan
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Platform lengkap untuk mengelola absensi siswa secara digital.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="group bg-card border border-border/50 rounded-2xl p-6 sm:p-7 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1">
                <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-lg mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <f.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-foreground text-base mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Why Choose Us ─── */}
      <section className="py-20 sm:py-28 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/3 rounded-full blur-[150px] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left text */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3 block">Kenapa Kami</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
                Solusi Absensi Digital yang <span className="text-primary">Terpercaya</span>
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Kami menyediakan solusi menyeluruh untuk membantu sekolah Anda mengelola kehadiran siswa dengan teknologi terkini.
              </p>
              <button onClick={() => navigate("/register")}
                className="mt-8 inline-flex items-center gap-2 gradient-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold text-sm shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:scale-[1.02]">
                Mulai Sekarang <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>

            {/* Right cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {WHY_ITEMS.map((item, i) => (
                <motion.div key={item.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                  className="bg-card border border-border/50 rounded-2xl p-5 hover:border-primary/20 hover:shadow-lg transition-all duration-300">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      {showPricing && (
      <section className="py-20 sm:py-28 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3 block">Harga</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">Pilih Paket Terbaik</h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">Harga transparan, tanpa biaya tersembunyi. Mulai gratis, upgrade kapan saja.</p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-5 items-stretch">
            {plans.map((plan, i) => {
              const featureList = Array.isArray(plan.features) ? plan.features as string[] : [];
              const isHighlighted = plan.name.toUpperCase() === "SCHOOL" || plans.length === 1;
              const priceText = plan.price === 0 ? "Gratis" : `Rp ${plan.price.toLocaleString("id-ID")}`;
              return (
              <motion.div key={plan.id} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="h-full">
                <div className={`rounded-2xl p-6 sm:p-7 border transition-all h-full flex flex-col relative overflow-hidden ${
                  isHighlighted 
                    ? "border-primary/30 bg-card shadow-xl shadow-primary/10 ring-2 ring-primary/20" 
                    : "border-border/50 bg-card hover:border-primary/15 hover:shadow-lg"
                }`}>
                  {isHighlighted && (
                    <div className="absolute top-0 right-0 gradient-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                      ⭐ Rekomendasi
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground font-medium mb-1">{plan.description || ""}</p>
                  <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                  <p className="text-3xl font-extrabold text-primary mt-3">{priceText}<span className="text-xs text-muted-foreground font-normal">/bulan</span></p>
                  {plan.max_students && <p className="text-xs text-muted-foreground mt-1">Maks. {plan.max_students} siswa</p>}
                  <ul className="mt-6 space-y-2.5 flex-1">
                    {featureList.map((f: string) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => navigate("/register")} className={`mt-6 w-full py-3 rounded-xl font-bold text-sm transition-all ${
                    isHighlighted 
                      ? "gradient-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30" 
                      : "bg-muted text-foreground hover:bg-primary/10 hover:text-primary border border-border"
                  }`}>
                    Mulai Sekarang
                  </button>
                </div>
              </motion.div>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {/* ─── Payment Methods ─── */}
      <section className="py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3 block">Pembayaran</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Semua Metode Pembayaran</h2>
            <p className="mt-3 text-muted-foreground text-sm">Bebas pilih cara bayar yang paling nyaman.</p>
          </motion.div>
          <div className="space-y-6">
            {[
              { title: "E-Wallet", img: "/images/payments/ewallet.webp", small: false },
              { title: "Transfer Bank", img: "/images/payments/transfer-bank.webp", small: false },
              { title: "Gerai / Outlet", img: "/images/payments/gerai.webp", small: true },
            ].map((cat, ci) => (
              <motion.div key={ci} custom={ci} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-card border border-border/50 rounded-2xl p-5 sm:p-6">
                <h4 className="font-bold text-foreground text-sm mb-3">{cat.title}</h4>
                <img src={cat.img} alt={cat.title} className={cat.small ? "h-8 sm:h-10 w-auto object-contain" : "max-w-full sm:max-w-2xl h-auto object-contain"} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ─── */}
      <section className="py-20 sm:py-28 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
            className="gradient-primary rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3" />

            <div className="relative z-10">
              <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-6">
                <GraduationCap className="h-7 w-7 text-primary-foreground" />
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-primary-foreground tracking-tight mb-4">
                Siap Tingkatkan Absensi Sekolah?
              </h2>
              <p className="text-primary-foreground/80 text-sm sm:text-base mb-8 max-w-lg mx-auto">
                Bergabung sekarang dan rasakan kemudahan absensi digital. Tanpa biaya setup.
              </p>
              <button onClick={() => navigate("/register")}
                className="inline-flex items-center gap-2 bg-white text-primary px-8 py-3.5 rounded-2xl font-bold text-sm transition-all hover:bg-white/90 shadow-xl hover:scale-[1.02] active:scale-[0.98]">
                <Zap className="h-4 w-4" /> Daftar Gratis Sekarang
              </button>
              <p className="text-primary-foreground/50 text-xs mt-4">Tidak perlu kartu kredit • Setup instan</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border py-12 bg-card/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
            <div className="flex items-center gap-3">
              {get("footer_logo") ? (
                <img src={get("footer_logo")} alt="Logo" className="h-10 w-10 rounded-xl object-cover shadow-md" />
              ) : (
                <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-md">
                  <GraduationCap className="h-5 w-5 text-primary-foreground" />
                </div>
              )}
              <div>
                <p className="font-bold text-foreground text-sm">Smart School Attendance</p>
                <p className="text-xs text-muted-foreground">Sistem Absensi Digital Modern</p>
              </div>
            </div>
            <div className="flex flex-col items-center md:items-end gap-2 text-sm text-muted-foreground">
              {get("footer_address") && <span className="flex items-center gap-1.5 text-xs"><MapPin className="h-3.5 w-3.5" /> {get("footer_address")}</span>}
              {get("footer_email") && <span className="flex items-center gap-1.5 text-xs"><Mail className="h-3.5 w-3.5" /> {get("footer_email")}</span>}
              {get("footer_phone") && <span className="flex items-center gap-1.5 text-xs"><Phone className="h-3.5 w-3.5" /> {get("footer_phone")}</span>}
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Smart School Attendance System. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
