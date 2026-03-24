import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import TypingEffect from "@/components/TypingEffect";
import {
  ScanLine, Monitor, MessageSquare, FileBarChart,
  ArrowRight, CheckCircle2, Mail, Phone, MapPin,
  Zap, Bell, QrCode, Users, GraduationCap,
  UserCheck, BarChart3, Shield, Smartphone, Star, TrendingUp, Lock,
  ChevronRight, Sparkles, Play, ArrowDown,
  AlertTriangle, XCircle, Clock, FileText, Globe, Camera,
  Quote, ChevronLeft,
} from "lucide-react";
import heroDashboard from "@/assets/hero-dashboard.png";
import { ThemeToggle } from "@/components/ThemeToggle";

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

const DEFAULT_TRUSTED_SCHOOLS = [
  { name: "SD Negeri 1 Jakarta", initials: "SDN1", logo_url: null },
  { name: "SMP Islam Al-Azhar", initials: "SIA", logo_url: null },
  { name: "TK Bunda Mulia", initials: "TBM", logo_url: null },
  { name: "SD IT Nurul Fikri", initials: "SINF", logo_url: null },
  { name: "SMP Negeri 5 Bandung", initials: "SMP5", logo_url: null },
  { name: "TK Aisyiyah Bustanul", initials: "TAB", logo_url: null },
  { name: "SD Muhammadiyah 9", initials: "SDM9", logo_url: null },
  { name: "SMP Labschool", initials: "LAB", logo_url: null },
];

const DEFAULT_TESTIMONIALS = [
  { name: "Ibu Sari Dewi", role: "Kepala Sekolah, SD Negeri 1 Jakarta", text: "Sejak menggunakan ATSkolla, proses absensi jadi lebih cepat dan akurat. Guru-guru sangat terbantu karena tidak perlu lagi mencatat manual. Orang tua juga senang karena langsung dapat notifikasi WhatsApp.", rating: 5 },
  { name: "Pak Ahmad Fauzi", role: "Wakil Kepala Sekolah, SMP Islam Al-Azhar", text: "Sistem yang luar biasa! Dashboard real-time memudahkan kami memantau kehadiran siswa. Rekap otomatis setiap bulan menghemat waktu administrasi hingga 80%. Sangat direkomendasikan!", rating: 5 },
  { name: "Ibu Rina Kartika", role: "Guru Kelas, TK Bunda Mulia", text: "Fitur scan barcode sangat memudahkan. Anak-anak TK yang belum bisa absen sendiri bisa dibantu dengan cepat. Notifikasi ke orang tua juga membuat mereka lebih tenang.", rating: 5 },
  { name: "Pak Hendra Wijaya", role: "Kepala Sekolah, SD IT Nurul Fikri", text: "Kami sudah mencoba berbagai sistem absensi, tapi ATSkolla yang paling cocok untuk kebutuhan sekolah kami. Setup mudah, harga terjangkau, dan support responsif.", rating: 5 },
  { name: "Ibu Linda Kusuma", role: "Wali Murid, SMP Negeri 5 Bandung", text: "Sebagai orang tua, saya sangat apresiasi notifikasi WhatsApp otomatis. Saya bisa tahu kapan anak saya tiba di sekolah tanpa harus menelepon guru setiap hari.", rating: 5 },
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

interface TrustedSchool { name: string; initials: string; logo_url: string | null; }
interface Testimonial { name: string; role: string; text: string; rating: number; }

const TestimonialSlider = ({ testimonials }: { testimonials: Testimonial[] }) => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const next = useCallback(() => {
    setDirection(1);
    setCurrent((prev) => (prev + 1) % testimonials.length);
  }, [testimonials.length]);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  }, [testimonials.length]);

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  const t = testimonials[current];

  if (!t) return null;

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -80 : 80, opacity: 0 }),
  };

  return (
    <section className="py-16 sm:py-24 bg-indigo-50/40 dark:bg-indigo-950/10 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 mb-3 block">Testimoni</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Apa Kata Mereka?
          </h2>
          <p className="mt-3 text-slate-500 dark:text-slate-400 text-sm max-w-lg mx-auto">Cerita nyata dari pengguna ATSkolla di seluruh Indonesia.</p>
        </motion.div>

        <div className="relative">
          <button onClick={prev} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-6 z-20 h-10 w-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <ChevronLeft className="h-5 w-5 text-slate-700 dark:text-white" />
          </button>
          <button onClick={next} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-6 z-20 h-10 w-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <ChevronRight className="h-5 w-5 text-slate-700 dark:text-white" />
          </button>

          <div className="overflow-hidden min-h-[260px] flex items-center">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={current}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="w-full"
              >
                <div className="bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/50 rounded-2xl p-8 sm:p-10 text-center relative">
                  <Quote className="h-8 w-8 text-indigo-500/15 absolute top-6 left-6" />
                  <div className="flex justify-center gap-1 mb-5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed italic max-w-2xl mx-auto">
                    "{t.text}"
                  </p>
                  <div className="mt-6">
                    <p className="font-bold text-slate-900 dark:text-white text-sm">{t.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, i) => (
              <button key={i} onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
                className={`h-2 rounded-full transition-all duration-300 ${i === current ? "w-6 bg-indigo-500" : "w-2 bg-slate-300 dark:bg-slate-600 hover:bg-indigo-300"}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState<Record<string, string>>({});
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [showPricing, setShowPricing] = useState(true);
  const [trustedSchools, setTrustedSchools] = useState<TrustedSchool[]>(DEFAULT_TRUSTED_SCHOOLS);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(DEFAULT_TESTIMONIALS);

  useEffect(() => {
    Promise.all([
      supabase.from("landing_content").select("key, value"),
      supabase.from("subscription_plans").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("landing_trusted_schools").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("landing_testimonials").select("*").eq("is_active", true).order("sort_order"),
    ]).then(([contentRes, plansRes, schoolsRes, testimonialsRes]) => {
      const map: Record<string, string> = {};
      (contentRes.data || []).forEach((item: any) => { map[item.key] = item.value; });
      setContent(map);
      const allPlans = (plansRes.data || []) as any[];
      const landingPlans = allPlans.filter((p: any) => p.show_on_landing !== false);
      setPlans(landingPlans as PlanRow[]);
      setShowPricing(landingPlans.length > 0);
      if (schoolsRes.data && schoolsRes.data.length > 0) {
        setTrustedSchools(schoolsRes.data as TrustedSchool[]);
      }
      if (testimonialsRes.data && testimonialsRes.data.length > 0) {
        setTestimonials(testimonialsRes.data as Testimonial[]);
      }
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
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 animate-pulse" />
          <p className="text-slate-500 text-sm">Memuat...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white overflow-x-hidden">
      {/* ─── Navbar ─── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl shadow-sm border-b border-slate-200 dark:border-slate-800" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/images/logo-atskolla.png" alt="ATSkolla" className="h-9 sm:h-10 object-contain" />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <button onClick={() => navigate("/login")} className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 sm:px-4 py-2 transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
              Masuk
            </button>
            <button onClick={() => navigate("/register")} className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]">
              Mulai Gratis <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-indigo-500/6 rounded-full blur-[140px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px]" />
          <div className="absolute top-1/4 left-0 w-[350px] h-[350px] bg-blue-400/4 rounded-full blur-[100px]" />
        </div>
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="text-center max-w-3xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="inline-flex items-center gap-2 bg-indigo-500/8 border border-indigo-500/15 rounded-full px-4 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-6">
                <Sparkles className="h-3.5 w-3.5" /> Platform Absensi Digital #1 untuk Sekolah Indonesia
              </span>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.7 }}
              className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight">
              <TypingEffect texts={["ATSkolla — Absensi Digital Sekolah", "Cepat, Aman & Mudah Digunakan", "Solusi Absensi Modern untuk Sekolah"]} speed={60} className="bg-gradient-to-r from-slate-900 via-indigo-800 to-blue-700 dark:from-white dark:via-indigo-200 dark:to-blue-300 bg-clip-text text-transparent" />
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.6 }}
              className="mt-5 text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
              Platform absensi modern dengan barcode scan & face recognition AI. Dirancang khusus untuk sekolah Indonesia — cepat, aman, dan mudah digunakan.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
              className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => navigate("/register")}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-7 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] text-sm">
                <Zap className="h-4 w-4" /> Coba Gratis Sekarang
              </button>
              <a href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-7 py-3.5 rounded-2xl font-semibold transition-all text-sm border border-slate-200 dark:border-slate-700 shadow-sm">
                <Play className="h-4 w-4" /> Cara Kerja
              </a>
            </motion.div>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
              className="mt-5 text-xs text-slate-400 dark:text-slate-500">
              ✓ Penggunaan mudah &nbsp;•&nbsp; ✓ Pembayaran instan &nbsp;•&nbsp; ✓ Siap pakai dalam hitungan menit
            </motion.p>
          </div>

          {/* Hero Image */}
          <motion.div initial={{ opacity: 0, y: 50, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
            className="mt-14 sm:mt-16 relative mx-auto max-w-5xl">
            <div className="absolute -inset-6 bg-gradient-to-br from-indigo-500/15 via-blue-500/8 to-teal-500/5 rounded-[2.5rem] blur-3xl animate-pulse" />
            <div className="absolute -inset-2 bg-gradient-to-br from-indigo-500/8 to-blue-500/5 rounded-3xl" />
            <motion.img
              src={heroDashboard}
              alt="Dashboard ATSkolla"
              className="relative w-full h-auto rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-[0_30px_80px_-15px_rgba(0,0,0,0.25),0_0_50px_-10px_rgba(99,102,241,0.15)]"
              whileHover={{ scale: 1.01, y: -4 }}
              transition={{ duration: 0.4 }}
            />
          </motion.div>
        </div>
      </section>

      {/* ─── Problems ─── */}
      <section className="py-20 sm:py-28 bg-slate-50/80 dark:bg-slate-900/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-red-500/3 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-red-500 mb-3 block">Latar Belakang</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Masalah Absensi di Sekolah
            </h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">Sistem absensi manual di sekolah Indonesia masih menyimpan banyak masalah dan ketidakefisienan.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
            {PROBLEMS.map((p, i) => (
              <motion.div key={p.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="group bg-white dark:bg-slate-800/50 border border-red-100 dark:border-red-500/10 rounded-2xl p-6 hover:border-red-200 dark:hover:border-red-500/25 hover:shadow-lg hover:shadow-red-500/5 transition-all duration-300">
                <div className="h-10 w-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4 group-hover:bg-red-100 dark:group-hover:bg-red-500/15 transition-colors">
                  <p.icon className="h-5 w-5 text-red-500 dark:text-red-400" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1.5">{p.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Arrow */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="flex flex-col items-center mb-16">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shadow-xl shadow-indigo-500/20">
              <ArrowDown className="h-6 w-6 text-white" />
            </div>
            <p className="mt-3 font-bold text-indigo-600 dark:text-indigo-400 text-sm">Solusi Kami</p>
          </motion.div>

          {/* Solutions */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 mb-3 block">Jawaban Tepat</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              ATSkolla — Absensi Digital Sekolah
            </h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">Setiap permasalahan memiliki solusi teknologi modern yang terintegrasi dalam satu platform.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-5">
            {SOLUTIONS.map((s, i) => (
              <motion.div key={s.solution} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="group bg-white dark:bg-slate-800/50 border border-indigo-100 dark:border-indigo-500/10 rounded-2xl p-6 hover:border-indigo-200 dark:hover:border-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/15 group-hover:scale-105 transition-transform">
                    <s.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400">{s.problem}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">{s.solution}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{s.solution}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-20 sm:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 dark:from-slate-900/30 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 mb-3 block">Cara Kerja</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Mulai dalam 4 Langkah Mudah
            </h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400 max-w-lg mx-auto">Proses sederhana dari pendaftaran hingga monitoring kehadiran siswa.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {WORKFLOW.map((w, i) => (
              <motion.div key={w.step} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="relative group">
                <div className="bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-6 h-full hover:border-indigo-200 dark:hover:border-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300">
                  <span className="text-4xl font-black text-indigo-500/15 group-hover:text-indigo-500/25 transition-colors">{w.step}</span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2 mb-2">{w.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{w.desc}</p>
                </div>
                {i < WORKFLOW.length - 1 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-3 -translate-y-1/2 z-10">
                    <ChevronRight className="h-5 w-5 text-indigo-500/30" />
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
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 mb-3 block">Fitur Unggulan</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Semua yang Sekolah Anda Butuhkan
            </h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400 max-w-xl mx-auto">Platform lengkap untuk mengelola absensi siswa secara digital.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="group bg-white dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-6 sm:p-7 hover:border-indigo-200 dark:hover:border-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 hover:-translate-y-1">
                <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-lg mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <f.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Why Choose Us ─── */}
      <section className="py-20 sm:py-28 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-500/3 rounded-full blur-[150px] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 mb-3 block">Kenapa Kami</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                Solusi Absensi Digital yang <span className="text-indigo-600 dark:text-indigo-400">Terpercaya</span>
              </h2>
              <p className="mt-4 text-slate-500 dark:text-slate-400 leading-relaxed">
                Kami menyediakan solusi menyeluruh untuk membantu sekolah Anda mengelola kehadiran siswa dengan teknologi terkini.
              </p>
              <button onClick={() => navigate("/register")}
                className="mt-8 inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold text-sm shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all hover:scale-[1.02]">
                Mulai Sekarang <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {WHY_ITEMS.map((item, i) => (
                <motion.div key={item.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                  className="bg-white dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-5 hover:border-indigo-200 dark:hover:border-indigo-500/20 hover:shadow-lg transition-all duration-300">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-3">
                    <item.icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      {showPricing && (
      <section className="py-20 sm:py-28 bg-slate-50/80 dark:bg-slate-900/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 mb-3 block">Harga</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Pilih Paket Terbaik</h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400 max-w-lg mx-auto">Harga transparan, tanpa biaya tersembunyi. Mulai gratis, upgrade kapan saja.</p>
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
                    ? "border-indigo-300 dark:border-indigo-500/30 bg-white dark:bg-slate-800 shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/20" 
                    : "border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 hover:border-indigo-200 dark:hover:border-indigo-500/15 hover:shadow-lg"
                }`}>
                  {isHighlighted && (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                      ⭐ Rekomendasi
                    </div>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">{plan.description || ""}</p>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                  <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-3">{priceText}<span className="text-xs text-slate-400 font-normal">/bulan</span></p>
                  {plan.max_students && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Maks. {plan.max_students} siswa</p>}
                  <ul className="mt-6 space-y-2.5 flex-1">
                    {featureList.map((f: string) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                        <span className="text-slate-700 dark:text-slate-200">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => navigate("/register")} className={`mt-6 w-full py-3 rounded-xl font-bold text-sm transition-all ${
                    isHighlighted 
                      ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30" 
                      : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-700 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-600"
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
      {/* ─── Trusted By Schools ─── */}
      <section className="py-16 sm:py-20 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 mb-3 block">Kepercayaan</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Telah Dipercaya oleh Sekolah-Sekolah
            </h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400 text-sm max-w-lg mx-auto">Bergabung bersama sekolah-sekolah yang telah merasakan manfaat absensi digital.</p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
            className="flex flex-wrap justify-center items-center gap-5 sm:gap-8">
            {trustedSchools.map((school, i) => (
              <motion.div key={school.name} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="group flex flex-col items-center gap-2">
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center shadow-sm group-hover:border-indigo-200 dark:group-hover:border-indigo-500/25 group-hover:shadow-lg group-hover:shadow-indigo-500/5 transition-all duration-300 overflow-hidden">
                  {school.logo_url ? (
                    <img src={school.logo_url} alt={school.name} className="h-full w-full object-contain p-2" />
                  ) : (
                    <span className="text-sm sm:text-base font-extrabold text-indigo-500/70 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{school.initials}</span>
                  )}
                </div>
                <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 text-center max-w-[90px] leading-tight">{school.name}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <TestimonialSlider testimonials={testimonials} />

      {/* ─── Payment Methods ─── */}
      <section className="py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 mb-3 block">Pembayaran</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">Semua Metode Pembayaran</h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400 text-sm">Bebas pilih cara bayar yang paling nyaman.</p>
          </motion.div>
          <div className="space-y-6">
            {[
              { title: "E-Wallet", img: "/images/payments/ewallet.webp", small: false },
              { title: "Transfer Bank", img: "/images/payments/transfer-bank.webp", small: false },
              { title: "Gerai / Outlet", img: "/images/payments/gerai.webp", small: true },
            ].map((cat, ci) => (
              <motion.div key={ci} custom={ci} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-white dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-5 sm:p-6">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-3">{cat.title}</h4>
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
            className="bg-gradient-to-r from-indigo-600 to-blue-700 rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3" />

            <div className="relative z-10">
              <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-6">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-4">
                Siap Tingkatkan Absensi Sekolah?
              </h2>
              <p className="text-white/80 text-sm sm:text-base mb-8 max-w-lg mx-auto">
                Bergabung sekarang dan rasakan kemudahan absensi digital. Tanpa biaya setup.
              </p>
              <button onClick={() => navigate("/register")}
                className="inline-flex items-center gap-2 bg-white text-indigo-700 px-8 py-3.5 rounded-2xl font-bold text-sm transition-all hover:bg-white/90 shadow-xl hover:scale-[1.02] active:scale-[0.98]">
                <Zap className="h-4 w-4" /> Daftar Gratis Sekarang
              </button>
              <p className="text-white/50 text-xs mt-4">Tidak perlu kartu kredit • Setup instan</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-16 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {get("footer_logo") ? (
                  <img src={get("footer_logo")} alt="Logo" className="h-10 w-10 rounded-xl object-cover shadow-md" />
                ) : (
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shadow-md">
                    <GraduationCap className="h-5 w-5 text-white" />
                  </div>
                )}
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">ATSkolla</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Absensi Digital Sekolah</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Solusi absensi digital #1 untuk sekolah modern. Hemat waktu guru, tingkatkan kedisiplinan siswa, dan beri ketenangan kepada orang tua — semua dalam satu platform.
              </p>
            </div>

            <div className="space-y-3">
              <p className="font-bold text-slate-900 dark:text-white text-sm">Kenapa Sekolah Memilih Kami?</p>
              <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-indigo-500 mt-0.5 shrink-0" /> Scan barcode & face recognition — absensi kurang dari 1 detik</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-indigo-500 mt-0.5 shrink-0" /> Notifikasi WhatsApp otomatis langsung ke orang tua</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-indigo-500 mt-0.5 shrink-0" /> Dashboard real-time untuk kepala sekolah & guru</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-indigo-500 mt-0.5 shrink-0" /> Gratis untuk memulai, tanpa biaya setup</li>
              </ul>
            </div>

            <div className="space-y-3">
              <p className="font-bold text-slate-900 dark:text-white text-sm">Hubungi Kami</p>
              <div className="flex flex-col gap-2 text-xs text-slate-500 dark:text-slate-400">
                {get("footer_address") && <span className="flex items-start gap-1.5"><MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {get("footer_address")}</span>}
                {get("footer_email") && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 shrink-0" /> {get("footer_email")}</span>}
                {get("footer_phone") && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 shrink-0" /> {get("footer_phone")}</span>}
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed pt-2">
                Punya pertanyaan? Tim kami siap membantu Anda kapan saja. Konsultasi gratis untuk kebutuhan sekolah Anda.
              </p>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">© {new Date().getFullYear()} ATSkolla — Absensi Digital Sekolah. All rights reserved.</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Dipercaya sekolah-sekolah di seluruh Indonesia 🇮🇩</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
