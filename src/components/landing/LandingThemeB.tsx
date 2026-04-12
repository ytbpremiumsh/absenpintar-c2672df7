import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor, FileBarChart, ArrowRight, CheckCircle2, Mail, Phone, MapPin,
  Zap, Bell, QrCode, GraduationCap, UserCheck, Shield,
  Star, ChevronRight, Sparkles, Play,
  Quote, ChevronLeft, Code, HeartHandshake, Award,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import heroMockup from "@/assets/hero-mockup-theme2.png";
import illustrationScan from "@/assets/illustration-scan.png";
import illustrationRegister from "@/assets/illustration-register.png";
import illustrationMonitor from "@/assets/illustration-monitor.png";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

interface PlanRow { id: string; name: string; price: number; description: string | null; features: any; max_students: number | null; sort_order: number; }
interface TrustedSchool { name: string; initials: string; logo_url: string | null; }
interface Testimonial { name: string; role: string; text: string; rating: number; }

const DEFAULT_FEATURES = [
  { icon: Code, title: "Mudah Digunakan", desc: "Interface sederhana yang bisa digunakan oleh semua guru tanpa pelatihan teknis.", color: "bg-indigo-50 dark:bg-indigo-500/10", iconColor: "text-indigo-600 dark:text-indigo-400" },
  { icon: HeartHandshake, title: "Customer Support", desc: "Tim support siap membantu Anda kapan saja melalui WhatsApp dan email.", color: "bg-emerald-50 dark:bg-emerald-500/10", iconColor: "text-emerald-600 dark:text-emerald-400" },
  { icon: Shield, title: "Aman & Terlindungi", desc: "Data terenkripsi end-to-end dengan standar keamanan enterprise terbaik.", color: "bg-amber-50 dark:bg-amber-500/10", iconColor: "text-amber-600 dark:text-amber-400" },
  { icon: QrCode, title: "Scan Barcode Instan", desc: "Absensi hanya butuh kurang dari 1 detik dengan scan barcode cepat.", color: "bg-pink-50 dark:bg-pink-500/10", iconColor: "text-pink-600 dark:text-pink-400" },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Daftar Akun", desc: "Buat akun sekolah Anda dan import data siswa dengan mudah.", img: illustrationRegister },
  { step: "02", title: "Scan Absensi", desc: "Siswa scan barcode atau gunakan face recognition untuk absensi instan.", img: illustrationScan },
  { step: "03", title: "Monitoring Live", desc: "Pantau kehadiran siswa secara real-time dan terima notifikasi otomatis.", img: illustrationMonitor },
];

const DEFAULT_TESTIMONIALS = [
  { name: "Ibu Sari Dewi", role: "Kepala Sekolah, SD Negeri 1 Jakarta", text: "Sejak menggunakan ATSkolla, proses absensi jadi lebih cepat dan akurat. Guru-guru sangat terbantu.", rating: 5 },
  { name: "Pak Ahmad Fauzi", role: "Wakil Kepala Sekolah, SMP Islam Al-Azhar", text: "Dashboard real-time memudahkan kami memantau kehadiran siswa. Rekap otomatis menghemat waktu 80%.", rating: 5 },
  { name: "Ibu Rina Kartika", role: "Guru Kelas, TK Bunda Mulia", text: "Fitur scan barcode sangat memudahkan. Notifikasi ke orang tua membuat mereka lebih tenang.", rating: 5 },
];

const DEFAULT_TRUSTED_SCHOOLS = [
  { name: "SD Negeri 1 Jakarta", initials: "SDN1", logo_url: null },
  { name: "SMP Islam Al-Azhar", initials: "SIA", logo_url: null },
  { name: "TK Bunda Mulia", initials: "TBM", logo_url: null },
  { name: "SD IT Nurul Fikri", initials: "SINF", logo_url: null },
  { name: "SMP Negeri 5 Bandung", initials: "SMP5", logo_url: null },
  { name: "SD Muhammadiyah 9", initials: "SDM9", logo_url: null },
];

/* ─── Testimonial Slider ─── */
const TestimonialSlider = ({ testimonials }: { testimonials: Testimonial[] }) => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const next = useCallback(() => { setDirection(1); setCurrent(p => (p + 1) % testimonials.length); }, [testimonials.length]);
  const prev = useCallback(() => { setDirection(-1); setCurrent(p => (p - 1 + testimonials.length) % testimonials.length); }, [testimonials.length]);
  useEffect(() => { const t = setInterval(next, 6000); return () => clearInterval(t); }, [next]);
  const t = testimonials[current];
  if (!t) return null;
  const variants = { enter: (d: number) => ({ x: d > 0 ? 80 : -80, opacity: 0 }), center: { x: 0, opacity: 1 }, exit: (d: number) => ({ x: d > 0 ? -80 : 80, opacity: 0 }) };

  return (
    <section className="py-20 sm:py-28 bg-slate-50/80 dark:bg-slate-900/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-12">
          <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-4 py-1.5 rounded-full mb-4">Testimoni</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">Apa Kata Pengguna Kami?</h2>
        </motion.div>
        <div className="relative">
          <button onClick={prev} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-6 z-20 h-10 w-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"><ChevronLeft className="h-5 w-5 text-slate-700 dark:text-white" /></button>
          <button onClick={next} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-6 z-20 h-10 w-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"><ChevronRight className="h-5 w-5 text-slate-700 dark:text-white" /></button>
          <div className="overflow-hidden min-h-[220px] flex items-center">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div key={current} custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }} className="w-full">
                <div className="bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/50 rounded-2xl p-8 sm:p-10 text-center relative">
                  <Quote className="h-8 w-8 text-indigo-500/10 absolute top-6 left-6" />
                  <div className="flex justify-center gap-1 mb-4">{Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />)}</div>
                  <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed italic max-w-2xl mx-auto">"{t.text}"</p>
                  <div className="mt-5"><p className="font-bold text-slate-900 dark:text-white text-sm">{t.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{t.role}</p></div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, i) => <button key={i} onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }} className={`h-2 rounded-full transition-all duration-300 ${i === current ? "w-6 bg-indigo-500" : "w-2 bg-slate-300 dark:bg-slate-600"}`} />)}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─── Main Theme B Component ─── */
const LandingThemeB = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState<Record<string, string>>({});
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [showPricing, setShowPricing] = useState(true);
  const [trustedSchools, setTrustedSchools] = useState<TrustedSchool[]>(DEFAULT_TRUSTED_SCHOOLS);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(DEFAULT_TESTIMONIALS);
  const [headerLogo, setHeaderLogo] = useState("/images/logo-atskolla.png");

  useEffect(() => {
    Promise.all([
      supabase.from("landing_content").select("key, value"),
      supabase.from("subscription_plans").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("landing_trusted_schools").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("landing_testimonials").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("platform_settings").select("key, value").in("key", ["header_logo_url"]),
    ]).then(([contentRes, plansRes, schoolsRes, testimonialsRes, settingsRes]) => {
      const map: Record<string, string> = {};
      (contentRes.data || []).forEach((item: any) => { map[item.key] = item.value; });
      setContent(map);
      if (settingsRes.data) {
        const sMap = Object.fromEntries(settingsRes.data.map((d: any) => [d.key, d.value]));
        if (sMap.header_logo_url) setHeaderLogo(sMap.header_logo_url);
      }
      const allPlans = (plansRes.data || []) as any[];
      const landingPlans = allPlans.filter((p: any) => p.show_on_landing !== false);
      setPlans(landingPlans as PlanRow[]);
      setShowPricing(landingPlans.length > 0);
      if (schoolsRes.data && schoolsRes.data.length > 0) setTrustedSchools(schoolsRes.data as TrustedSchool[]);
      if (testimonialsRes.data && testimonialsRes.data.length > 0) setTestimonials(testimonialsRes.data as Testimonial[]);
      setLoading(false);
    });
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const get = (key: string, fallback = "") => content[key] || fallback;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 animate-pulse" />
          <p className="text-slate-500 text-sm">Memuat...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white overflow-x-hidden">

      {/* ─── Top Promo Bar ─── */}
      <div className="bg-indigo-600 text-white text-center py-2 px-4 text-xs font-medium">
        <span className="opacity-90">🎉 Dapatkan <strong>diskon 20%</strong> untuk pendaftaran pertama! Gunakan kode <strong>SEKOLAH20</strong></span>
      </div>

      {/* ─── Navbar ─── */}
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-sm border-b border-slate-200/80 dark:border-slate-800" : "bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={headerLogo} alt="ATSkolla" className="h-9 sm:h-10 object-contain" />
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Fitur</a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Cara Kerja</a>
            {showPricing && <a href="#pricing" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Harga</a>}
            <a href="#contact" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Kontak</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <button onClick={() => navigate("/login")} className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 sm:px-4 py-2 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              Masuk
            </button>
            <button onClick={() => navigate("/register")} className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-md shadow-indigo-500/20">
              Coba Gratis <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section with Curved Background ─── */}
      <section className="relative overflow-hidden">
        {/* Blue curved background */}
        <div className="absolute inset-x-0 top-0 h-[70%] sm:h-[65%] bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-800" />
        <div className="absolute inset-x-0 top-[65%] sm:top-[60%] h-[15%]" style={{ background: "linear-gradient(to bottom, #4338ca, transparent)" }} />
        {/* Decorative circles */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
        {/* SVG curve */}
        <svg className="absolute bottom-0 left-0 right-0 w-full" viewBox="0 0 1440 120" fill="none" preserveAspectRatio="none" style={{ height: "80px" }}>
          <path d="M0,60 C360,120 1080,0 1440,60 L1440,120 L0,120 Z" className="fill-white dark:fill-slate-950" />
        </svg>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-32 sm:pb-44">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Left text */}
            <div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-xs font-bold text-white/90 mb-6">
                  <Sparkles className="h-3.5 w-3.5" /> Platform Absensi Digital #1
                </span>
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.7 }}
                className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-white leading-[1.1] tracking-tight">
                {get("hero_title", "Absensi Digital")} <br />
                <span className="text-indigo-200">Sekolah Modern</span>
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.6 }}
                className="mt-5 text-base sm:text-lg text-white/70 max-w-lg leading-relaxed">
                {get("hero_subtitle", "Platform absensi modern dengan barcode scan & face recognition AI. Dirancang khusus untuk sekolah Indonesia.")}
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="mt-8 flex flex-col sm:flex-row gap-3">
                <button onClick={() => navigate("/register")}
                  className="inline-flex items-center justify-center gap-2 bg-white text-indigo-700 px-7 py-3.5 rounded-xl font-bold text-sm transition-all shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]">
                  <Zap className="h-4 w-4" /> {get("cta_text", "Mulai Gratis Sekarang")}
                </button>
                <a href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-7 py-3.5 rounded-xl font-semibold text-sm transition-all border border-white/20">
                  <Play className="h-4 w-4" /> Lihat Demo
                </a>
              </motion.div>
            </div>

            {/* Right mockup */}
            <motion.div initial={{ opacity: 0, x: 60, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ delay: 0.3, duration: 1, ease: "easeOut" }}
              className="relative hidden lg:block">
              <img src={get("hero_image") || heroMockup} alt="Dashboard ATSkolla" className="w-full h-auto drop-shadow-2xl" width={1280} height={800} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Features Section ─── */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-4 py-1.5 rounded-full mb-4">Fitur Unggulan</span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Semua yang Sekolah Anda Butuhkan
            </h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400 max-w-xl mx-auto">Platform lengkap untuk mengelola absensi siswa secara digital dengan teknologi terkini.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(() => {
              return DEFAULT_FEATURES.map((f, i) => {
                const title = get(`feature_${i + 1}_title`) || f.title;
                const desc = get(`feature_${i + 1}_desc`) || f.desc;
                return (
                  <motion.div key={i} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                    className="group bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 rounded-2xl p-6 hover:border-indigo-200 dark:hover:border-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 hover:-translate-y-1 text-center">
                    <div className={`h-14 w-14 rounded-2xl ${f.color} flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform`}>
                      <f.icon className={`h-7 w-7 ${f.iconColor}`} />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base mb-2">{title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
                  </motion.div>
                );
              });
            })()}
          </div>
        </div>
      </section>

      {/* ─── Trusted Schools & Stats ─── */}
      <section className="py-16 sm:py-24 bg-slate-50/80 dark:bg-slate-900/30 border-y border-slate-200/50 dark:border-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-10">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-4 py-1.5 rounded-full mb-4">Kepercayaan</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">Dipercaya Sekolah di Seluruh Indonesia</h2>
          </motion.div>

          {/* School logos */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
            className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 mb-12">
            {trustedSchools.map((school, i) => (
              <div key={i} className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                {school.logo_url ? <img src={school.logo_url} alt={school.name} className="h-full w-full object-contain p-2" /> : <span className="text-xs sm:text-sm font-extrabold text-indigo-500/60">{school.initials}</span>}
              </div>
            ))}
          </motion.div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {[
              { value: get("hero_stat_1_value", "500+"), label: get("hero_stat_1_label", "Sekolah Aktif") },
              { value: get("hero_stat_2_value", "120K+"), label: get("hero_stat_2_label", "Siswa Terdaftar") },
              { value: get("hero_stat_3_value", "99.9%"), label: get("hero_stat_3_label", "Data Akurat") },
              { value: get("hero_stat_4_value", "34"), label: get("hero_stat_4_label", "Provinsi") },
            ].map((stat, i) => (
              <motion.div key={i} custom={i + 2} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="text-center py-4">
                <p className="text-3xl sm:text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">{stat.value}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Product Showcase (split) ─── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
              <img src={heroMockup} alt="Platform ATSkolla" className="w-full h-auto rounded-2xl" loading="lazy" width={1280} height={800} />
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-4 py-1.5 rounded-full mb-4">Tentang Platform</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                {get("why_title", "Platform Absensi Digital yang Terpercaya")}
              </h2>
              <p className="mt-4 text-slate-500 dark:text-slate-400 leading-relaxed">
                {get("why_desc", "ATSkolla menyediakan solusi menyeluruh untuk membantu sekolah Anda mengelola kehadiran siswa dengan teknologi terkini. Cepat, aman, dan mudah digunakan oleh siapa saja.")}
              </p>
              <div className="mt-6 space-y-3">
                {[
                  get("why_item_1_title", "Keamanan Tingkat Tinggi"),
                  get("why_item_2_title", "Akses dari Mana Saja"),
                  get("why_item_3_title", "Skalabel Tanpa Batas"),
                  get("why_item_4_title", "Setup 5 Menit"),
                ].filter(Boolean).map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-indigo-500 shrink-0" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate("/register")} className="mt-8 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02]">
                Mulai Sekarang <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-slate-50/80 dark:bg-slate-900/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-4 py-1.5 rounded-full mb-4">Cara Kerja</span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Mulai dalam 3 Langkah Mudah</h2>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div key={i} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="relative text-center group">
                <div className="bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 rounded-2xl p-6 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300">
                  <div className="h-28 w-28 mx-auto mb-5 relative">
                    <img src={step.img} alt={step.title} className="h-full w-full object-contain" loading="lazy" width={512} height={512} />
                  </div>
                  <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-indigo-600 text-white text-xs font-bold mb-3">{step.step}</div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden sm:flex absolute top-1/2 -right-4 -translate-y-1/2 z-10">
                    <ChevronRight className="h-5 w-5 text-indigo-500/30" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      {showPricing && (
        <section id="pricing" className="py-20 sm:py-28">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-14">
              <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-4 py-1.5 rounded-full mb-4">Harga</span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Pilih Paket Terbaik</h2>
              <p className="mt-3 text-slate-500 dark:text-slate-400 max-w-lg mx-auto">Harga transparan, tanpa biaya tersembunyi.</p>
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-6 items-stretch">
              {plans.map((plan, i) => {
                const featureList = Array.isArray(plan.features) ? plan.features as string[] : [];
                const isHighlighted = plan.name.toUpperCase() === "SCHOOL" || (plans.length === 2 && i === 1);
                const priceText = plan.price === 0 ? "Gratis" : `Rp ${plan.price.toLocaleString("id-ID")}`;
                return (
                  <motion.div key={plan.id} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="h-full">
                    <div className={`rounded-2xl p-6 sm:p-7 border transition-all h-full flex flex-col relative overflow-hidden ${isHighlighted ? "border-indigo-300 dark:border-indigo-500/30 bg-white dark:bg-slate-800 shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/20 scale-[1.03]" : "border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 hover:border-indigo-200 dark:hover:border-indigo-500/15 hover:shadow-lg"}`}>
                      {isHighlighted && (
                        <div className="absolute -top-0 -right-0">
                          <div className="bg-indigo-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-bl-xl flex items-center gap-1">
                            <Award className="h-3 w-3" /> Rekomendasi
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">{plan.description || ""}</p>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                      <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-3">{priceText}<span className="text-xs text-slate-400 font-normal">/bulan</span></p>
                      {plan.max_students && <p className="text-xs text-slate-500 mt-1">Maks. {plan.max_students} siswa</p>}
                      <ul className="mt-6 space-y-2.5 flex-1">
                        {featureList.map((f: string) => (
                          <li key={f} className="flex items-start gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" /><span className="text-slate-700 dark:text-slate-200">{f}</span></li>
                        ))}
                      </ul>
                      <button onClick={() => navigate("/register")} className={`mt-6 w-full py-3 rounded-xl font-bold text-sm transition-all ${isHighlighted ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-700 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-600"}`}>
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

      {/* ─── Testimonials ─── */}
      <TestimonialSlider testimonials={testimonials} />

      {/* ─── CTA Banner ─── */}
      <section className="py-20 sm:py-28 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
            className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-800 rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3" />
            <div className="relative z-10">
              <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-6">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-4">
                {get("cta_banner_text", "Siap Tingkatkan Absensi Sekolah?")}
              </h2>
              <p className="text-white/80 text-sm sm:text-base mb-8 max-w-lg mx-auto">
                {get("cta_banner_desc", "Bergabung sekarang dan rasakan kemudahan absensi digital. Tanpa biaya setup.")}
              </p>
              <button onClick={() => navigate("/register")} className="inline-flex items-center gap-2 bg-white text-indigo-700 px-8 py-3.5 rounded-xl font-bold text-sm transition-all hover:bg-white/90 shadow-xl hover:scale-[1.02]">
                <Zap className="h-4 w-4" /> Daftar Gratis Sekarang
              </button>
              <p className="text-white/50 text-xs mt-4">Tidak perlu kartu kredit • Setup instan</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer id="contact" className="relative bg-slate-900 dark:bg-slate-950 text-white overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-teal-500" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            <div className="lg:col-span-1 space-y-5">
              <div className="flex items-center gap-3">
                {get("footer_logo") ? <img src={get("footer_logo")} alt="Logo" className="h-11 w-11 rounded-xl object-cover shadow-lg" /> : <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg"><GraduationCap className="h-5 w-5 text-white" /></div>}
                <div><p className="font-bold text-white text-base">{get("footer_brand_name", "ATSkolla")}</p><p className="text-xs text-slate-400">{get("footer_brand_tagline", "Absensi Digital Sekolah")}</p></div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">{get("footer_description", "Solusi absensi digital #1 untuk sekolah modern Indonesia.")}</p>
            </div>
            <div className="space-y-4">
              <p className="text-sm font-bold text-white uppercase tracking-wider">Produk</p>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li><a href="#features" className="hover:text-indigo-400 transition-colors">Fitur Unggulan</a></li>
                <li><a href="#how-it-works" className="hover:text-indigo-400 transition-colors">Cara Kerja</a></li>
                {showPricing && <li><a href="#pricing" className="hover:text-indigo-400 transition-colors">Harga & Paket</a></li>}
                <li><button onClick={() => navigate("/register")} className="hover:text-indigo-400 transition-colors">Daftar Gratis</button></li>
              </ul>
            </div>
            <div className="space-y-4">
              <p className="text-sm font-bold text-white uppercase tracking-wider">Dukungan</p>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li><button onClick={() => navigate("/login")} className="hover:text-indigo-400 transition-colors">Login</button></li>
                {get("footer_link_faq") && <li><a href={get("footer_link_faq")} target="_blank" rel="noreferrer" className="hover:text-indigo-400 transition-colors">FAQ</a></li>}
                {get("footer_link_docs") && <li><a href={get("footer_link_docs")} target="_blank" rel="noreferrer" className="hover:text-indigo-400 transition-colors">Dokumentasi</a></li>}
                {get("footer_link_privacy") && <li><a href={get("footer_link_privacy")} target="_blank" rel="noreferrer" className="hover:text-indigo-400 transition-colors">Kebijakan Privasi</a></li>}
                {get("footer_link_terms") && <li><a href={get("footer_link_terms")} target="_blank" rel="noreferrer" className="hover:text-indigo-400 transition-colors">Syarat & Ketentuan</a></li>}
              </ul>
            </div>
            <div className="space-y-4">
              <p className="text-sm font-bold text-white uppercase tracking-wider">Hubungi Kami</p>
              <div className="flex flex-col gap-3 text-sm text-slate-400">
                {get("footer_address") && <span className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 text-indigo-400 shrink-0" /> {get("footer_address")}</span>}
                {get("footer_email") && <a href={`mailto:${get("footer_email")}`} className="flex items-center gap-2 hover:text-indigo-400 transition-colors"><Mail className="h-4 w-4 text-indigo-400 shrink-0" /> {get("footer_email")}</a>}
                {get("footer_phone") && <a href={`tel:${get("footer_phone")}`} className="flex items-center gap-2 hover:text-indigo-400 transition-colors"><Phone className="h-4 w-4 text-indigo-400 shrink-0" /> {get("footer_phone")}</a>}
              </div>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500">© {new Date().getFullYear()} {get("footer_brand_name", "ATSkolla")} — {get("footer_brand_tagline", "Absensi Digital Sekolah")}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingThemeB;
