import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, ArrowDown, Shield, ChevronRight, Zap, Sun, Moon,
  TrendingUp, DollarSign, Users, Building2, BarChart3, Target, Layers,
  CheckCircle2, Rocket, Globe, PieChart, ArrowUpRight, Repeat, CreditCard,
  School, Star, Heart, ShieldCheck, AlertTriangle, BookX, Clock, Eye, EyeOff,
  FileX, QrCode, Bell, Smartphone, BarChart, FileCheck, UserCheck, Wifi } from
"lucide-react";
import { motion } from "framer-motion";
import { Navigate } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 50 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.7 } })
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.8 } }
};

/* ═══════════════════════════════════════════
   LATAR BELAKANG MASALAH
   ═══════════════════════════════════════════ */
const PROBLEMS = [
{
  icon: BookX,
  title: "Absensi Manual Rawan Kesalahan",
  desc: "Pencatatan absensi masih menggunakan buku tulis atau kertas yang mudah rusak, hilang, dan rentan manipulasi data."
},
{
  icon: Clock,
  title: "Proses Rekap Lambat & Memakan Waktu",
  desc: "Guru harus merekap data absensi secara manual setiap hari, minggu, dan bulan — membuang waktu yang bisa digunakan untuk mengajar."
},
{
  icon: EyeOff,
  title: "Orang Tua Tidak Tahu Status Anak",
  desc: "Wali murid tidak memiliki akses real-time untuk mengetahui apakah anaknya sudah hadir di sekolah atau belum."
},
{
  icon: FileX,
  title: "Laporan Tidak Akurat & Sulit Diakses",
  desc: "Data absensi tersebar di banyak buku/kertas sehingga sulit dikompilasi menjadi laporan yang akurat dan komprehensif."
},
{
  icon: AlertTriangle,
  title: "Tidak Ada Sistem Notifikasi Otomatis",
  desc: "Sekolah tidak memiliki cara otomatis untuk menginformasikan status kehadiran siswa kepada wali murid secara instan."
},
{
  icon: Eye,
  title: "Kurangnya Transparansi & Akuntabilitas",
  desc: "Kepala sekolah dan dinas pendidikan kesulitan memantau tingkat kehadiran karena data tidak terpusat dan tidak real-time."
}];


/* ═══════════════════════════════════════════
   SOLUSI ATSKOLLA
   ═══════════════════════════════════════════ */
const SOLUTIONS = [
{
  icon: QrCode,
  problem: "Absensi Manual",
  solution: "Scan Barcode Instan",
  desc: "Siswa cukup scan barcode untuk mencatat kehadiran secara otomatis — akurat, cepat, dan tanpa manipulasi.",
  gradient: "from-blue-500 to-indigo-600"
},
{
  icon: BarChart,
  problem: "Rekap Lambat",
  solution: "Rekap & Export Otomatis",
  desc: "Rekap harian, mingguan, dan bulanan dihasilkan otomatis. Export ke Excel/PDF dalam satu klik.",
  gradient: "from-emerald-500 to-teal-600"
},
{
  icon: Smartphone,
  problem: "Orang Tua Tidak Tahu",
  solution: "Live Monitor & Notifikasi WA",
  desc: "Wali murid bisa memantau kehadiran anak secara real-time melalui link publik dan mendapat notifikasi WhatsApp otomatis.",
  gradient: "from-violet-500 to-purple-600"
},
{
  icon: FileCheck,
  problem: "Laporan Tidak Akurat",
  solution: "Dashboard Analitik Lengkap",
  desc: "Dashboard menampilkan statistik kehadiran per kelas, per siswa, dan per periode dengan visualisasi data yang jelas.",
  gradient: "from-indigo-600 to-blue-600"
},
{
  icon: Bell,
  problem: "Tidak Ada Notifikasi",
  solution: "WhatsApp Otomatis",
  desc: "Setiap kali siswa scan absensi, notifikasi otomatis terkirim ke nomor WhatsApp wali murid — tanpa intervensi manual.",
  gradient: "from-green-500 to-emerald-600"
},
{
  icon: UserCheck,
  problem: "Kurang Transparan",
  solution: "Monitoring Publik Real-time",
  desc: "Link monitoring publik memungkinkan siapa saja memantau status kehadiran kelas secara transparan dan terbuka.",
  gradient: "from-pink-500 to-rose-600"
}];


/* ═══════════════════════════════════════════
   REVENUE STREAMS
   ═══════════════════════════════════════════ */
const REVENUE_STREAMS = [
{
  icon: Repeat,
  title: "Langganan Bulanan (SaaS)",
  desc: "Sekolah membayar biaya bulanan tetap untuk menggunakan sistem — pendapatan stabil setiap bulan.",
  details: [
  "Paket bertingkat (Basic, School, Premium) sesuai ukuran dan kebutuhan sekolah",
  "Upgrade otomatis saat jumlah siswa bertambah melebihi kuota",
  "Sekolah akan terus berlangganan karena sistem sudah jadi bagian rutinitas harian",
  "Data sudah terintegrasi sehingga sekolah tidak mudah pindah ke platform lain"],
  gradient: "from-emerald-500 via-teal-500 to-cyan-600",
  glow: "shadow-emerald-500/20",
  badge: "Pendapatan Utama"
},
{
  icon: Building2,
  title: "Paket Yayasan & Multi Cabang",
  desc: "Paket khusus untuk yayasan atau grup sekolah yang punya beberapa cabang — dikelola dalam satu dashboard.",
  details: [
  "Harga khusus untuk yayasan yang mengelola banyak sekolah sekaligus",
  "Satu dashboard untuk memantau kehadiran di semua cabang",
  "Setiap cabang bisa punya branding dan logo sendiri",
  "Ada tim khusus yang mendampingi klien enterprise",
  "Jaminan layanan (SLA) dengan uptime 99.9%"],
  gradient: "from-violet-500 via-purple-500 to-indigo-600",
  glow: "shadow-violet-500/20",
  badge: "Bernilai Tinggi"
},
{
  icon: CreditCard,
  title: "Kartu Pelajar Digital + Barcode",
  desc: "Barcode siswa bisa dicetak jadi kartu pelajar resmi yang langsung terhubung ke sistem absensi.",
  details: [
  "Setiap siswa punya barcode unik yang tercetak di kartu pelajar",
  "Desain profesional lengkap dengan logo sekolah, foto, dan data siswa",
  "Biaya cetak per kartu menjadi tambahan pendapatan dari sekolah",
  "Kartu bisa dipakai untuk absensi, perpustakaan, dan identifikasi",
  "Setiap tahun ajaran baru, sekolah pesan cetak ulang — pendapatan berulang"],
  gradient: "from-blue-500 via-indigo-500 to-violet-600",
  glow: "shadow-blue-500/20",
  badge: "Produk Fisik"
},
{
  icon: Globe,
  title: "Notifikasi WhatsApp Terintegrasi",
  desc: "Notifikasi otomatis ke wali murid sudah termasuk dalam paket bulanan — tanpa biaya tambahan per pesan.",
  details: [
  "Kuota pesan bulanan sudah include di setiap paket langganan",
  "Paket SCHOOL: hingga 1.000 pesan/bulan sudah termasuk",
  "Paket PREMIUM: pesan unlimited tanpa batasan",
  "Wali murid otomatis dapat notifikasi saat anak hadir/pulang",
  "Tidak ada biaya tersembunyi — semuanya sudah dalam satu paket simpel"],
  gradient: "from-green-500 via-emerald-500 to-teal-600",
  glow: "shadow-green-500/20",
  badge: "Termasuk Paket"
},
{
  icon: Layers,
  title: "Kustomisasi & White Label",
  desc: "Layanan khusus untuk sekolah yang ingin sistem dengan branding dan fitur sesuai keinginan mereka.",
  details: [
  "Sistem bisa dibuat dengan brand sekolah sepenuhnya (white-label)",
  "Fitur tambahan bisa dikembangkan sesuai permintaan",
  "Bisa dihubungkan dengan sistem akademik sekolah yang sudah ada",
  "Biaya setup sekali bayar + biaya perawatan bulanan",
  "Peluang kerja sama jangka panjang dengan institusi besar"],
  gradient: "from-indigo-500 via-blue-500 to-cyan-500",
  glow: "shadow-indigo-500/20",
  badge: "Layanan Premium"
}];


const PRICING_TIERS = [
{
  name: "BASIC",
  price: "Rp 99.000",
  period: "/bulan",
  students: "Maks. 200 siswa",
  features: ["Semua fitur Free", "Import/Export Data Siswa", "Upload Foto Siswa", "Rekap & Export Laporan (PDF/Excel)", "Maks 10 Kelas", "Maks 200 Siswa"],
  highlight: false,
  gradient: "from-blue-500 to-cyan-600"
},
{
  name: "SCHOOL",
  price: "Rp 249.000",
  period: "/bulan",
  students: "Kelas & Siswa Unlimited",
  features: ["Semua fitur Basic", "Custom Logo Sekolah", "Notifikasi WhatsApp Otomatis", "Multi Staff / Operator", "Kelas & Siswa Unlimited", "Prioritas Bantuan"],
  highlight: true,
  gradient: "from-indigo-500 to-violet-600"
},
{
  name: "PREMIUM",
  price: "Rp 399.000",
  period: "/bulan",
  students: "Unlimited",
  features: ["Semua fitur School", "Face Recognition / Scan Wajah", "Multi Cabang Sekolah", "Kelas & Siswa Unlimited", "Dedicated Support", "Fitur Terbaru Lebih Awal"],
  highlight: false,
  gradient: "from-indigo-600 to-blue-600"
}];


const MARKET_DATA = [
{ value: "436.000+", label: "Sekolah TK - SMA/SMK Sederajat di Indonesia", icon: School },
{ value: "52 Juta+", label: "Siswa TK hingga SMA/SMK Sederajat", icon: Users },
{ value: "Rp 1,2 T+", label: "Potensi Pasar Tahunan (TAM)", icon: DollarSign },
{ value: "< 1%", label: "Penetrasi Pasar Digital Saat Ini", icon: Target }];


const GROWTH_MILESTONES = [
{ quarter: "Q1-Q2", title: "Fondasi", schools: "50 sekolah", revenue: "Rp 12.5 jt/bln", focus: "Akuisisi pelanggan awal, memastikan produk sesuai kebutuhan pasar, mengumpulkan testimoni", color: "from-blue-500 to-indigo-500" },
{ quarter: "Q3-Q4", title: "Pertumbuhan", schools: "200 sekolah", revenue: "Rp 50 jt/bln", focus: "Program referral, kerja sama dengan dinas pendidikan, ekspansi ke daerah lain", color: "from-indigo-500 to-violet-500" },
{ quarter: "Tahun 2", title: "Ekspansi", schools: "1.000 sekolah", revenue: "Rp 250 jt/bln", focus: "Tim penjualan khusus, kontrak yayasan besar, ekspansi ke seluruh Indonesia", color: "from-violet-500 to-purple-500" },
{ quarter: "Tahun 3", title: "Dominasi Pasar", schools: "5.000+ sekolah", revenue: "Rp 1.25 M/bln", focus: "Pemimpin pasar, tambah fitur akademik, pendapatan tahunan Rp 15M+", color: "from-purple-500 to-pink-500" }];


const COMPETITIVE_ADVANTAGES = [
{ icon: Zap, title: "Siap Pakai dalam 5 Menit", desc: "Tinggal import data siswa dari Excel, cetak barcode, dan sistem langsung bisa digunakan. Tidak perlu instalasi rumit." },
{ icon: CreditCard, title: "Harga Terjangkau untuk Semua Sekolah", desc: "Mulai dari Rp 99.000/bulan — jauh lebih hemat dibanding solusi mahal yang bisa jutaan per bulan." },
{ icon: ShieldCheck, title: "Data Aman & Terverifikasi", desc: "Setiap absensi diverifikasi lewat barcode digital. Semua data tersimpan aman di cloud dengan perlindungan maksimal." },
{ icon: Heart, title: "Mudah Digunakan Siapa Saja", desc: "Tampilan modern dan intuitif. Guru, staf, dan wali murid bisa langsung pakai tanpa pelatihan khusus." },
{ icon: Globe, title: "Wali Murid Selalu Tahu", desc: "Monitoring kehadiran bisa diakses online + notifikasi WhatsApp otomatis — orang tua tidak perlu khawatir lagi." },
{ icon: Rocket, title: "Bisa Dipakai Sekolah Kecil hingga Besar", desc: "Sistem berbasis cloud yang bisa melayani dari 30 siswa hingga ribuan siswa tanpa masalah performa." }];


const UNIT_ECONOMICS = [
{ label: "Biaya Akuisisi Pelanggan", value: "Rp 150.000", note: "Lewat referral & pemasaran digital" },
{ label: "Pendapatan Rata-rata / Sekolah", value: "Rp 200.000/bln", note: "Rata-rata paket School" },
{ label: "Nilai Pelanggan Seumur Hidup", value: "Rp 7.200.000", note: "Rata-rata berlangganan 36 bulan" },
{ label: "Rasio Nilai / Biaya Akuisisi", value: "48x", note: "Sangat sehat (standar industri > 3x)" },
{ label: "Balik Modal", value: "< 1 Bulan", note: "Tercepat di industri EdTech" },
{ label: "Margin Keuntungan Kotor", value: "85-90%", note: "Margin tinggi khas bisnis SaaS" }];


const STATS = [
{ value: "Rp 15M+", label: "Target Pendapatan Tahun 3" },
{ value: "85-90%", label: "Margin Keuntungan" },
{ value: "48x", label: "Rasio Nilai Pelanggan" },
{ value: "< 5%", label: "Churn Bulanan" }];


const BusinessModel = () => {
  const [loading, setLoading] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [title, setTitle] = useState("ATSkolla");
  const [subtitle, setSubtitle] = useState("");
  const [dark, setDark] = useState(false);
  const [headerLogo, setHeaderLogo] = useState("/images/logo-atskolla.png");

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.
      from("platform_settings").
      select("key, value").
      in("key", ["business_model_is_public", "business_model_title", "business_model_subtitle", "header_logo_url"]);
      if (data) {
        const map = Object.fromEntries(data.map((d) => [d.key, d.value]));
        setIsPublic(map.business_model_is_public === "true");
        if (map.business_model_title) setTitle(map.business_model_title);
        if (map.business_model_subtitle) setSubtitle(map.business_model_subtitle);
        if (map.header_logo_url) setHeaderLogo(map.header_logo_url);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;
  if (!isPublic) return <Navigate to="/" replace />;

  const bg = dark ? "bg-slate-950 text-white" : "bg-white text-slate-900";
  const navBg = dark ? "bg-slate-950/80 border-white/5" : "bg-white/80 border-slate-200";
  const navText = dark ? "text-white" : "text-slate-900";
  const mutedText = dark ? "text-slate-400" : "text-slate-500";
  const subtleText = dark ? "text-slate-500" : "text-slate-400";
  const sectionAlt = dark ? "bg-white/[0.01]" : "bg-slate-50/80";
  const cardBg = dark ? "bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.06]" : "bg-white border-slate-200/80 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5";
  const checkColor = dark ? "text-emerald-400" : "text-emerald-500";
  const detailText = dark ? "text-slate-400" : "text-slate-500";
  const dividerColor = dark ? "bg-slate-700" : "bg-slate-300";
  const badgeLabel = dark ? "text-slate-500" : "text-slate-400";
  const footerBg = dark ? "border-white/5" : "border-slate-200";
  const footerText = dark ? "text-slate-600" : "text-slate-400";
  const ambientGlow1 = dark ? "bg-indigo-600/8" : "bg-indigo-200/40";
  const ambientGlow2 = dark ? "bg-orange-600/6" : "bg-orange-200/30";
  const statGradient = dark ? "from-amber-400 to-orange-300" : "from-indigo-600 to-blue-500";
  const heroBadgeBg = dark ? "bg-white/5 border-white/10 text-indigo-300" : "bg-indigo-50 border-indigo-100 text-indigo-700";
  const heroTitle = dark ? "from-white via-white to-white/60" : "from-slate-900 via-slate-800 to-amber-700";
  const ctaBg = dark ? "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-orange-500 shadow-indigo-600/30 hover:shadow-indigo-500/50" : "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-amber-400 hover:to-orange-500 shadow-indigo-600/20 hover:shadow-indigo-500/40";
  const secondaryBtn = dark ? "bg-white/5 hover:bg-white/10 border-white/10 text-white" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700";
  const ambientSection = dark ? "via-amber-950/10" : "via-amber-50/50";
  const ctaSectionBg = dark ? "from-indigo-950/20" : "from-indigo-50/60";
  const whyCardBg = dark ? "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]" : "bg-white border-slate-200/80 hover:border-indigo-200 hover:shadow-lg";
  const whyIconBg = dark ? "bg-gradient-to-br from-indigo-600 to-blue-600 shadow-indigo-500/20" : "bg-gradient-to-br from-indigo-600 to-blue-600 shadow-indigo-500/20";
  const highlightCardBg = dark ? "bg-gradient-to-br from-indigo-950/60 to-orange-950/60 border-indigo-500/30" : "bg-gradient-to-br from-indigo-50 to-orange-50 border-indigo-300";
  const problemCardBg = dark ? "bg-red-950/20 border-red-500/20" : "bg-red-50/80 border-red-200/80";
  const problemIconBg = dark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-500";
  const solutionCardBg = dark ? "bg-emerald-950/20 border-emerald-500/20" : "bg-emerald-50/50 border-emerald-200/80";

  return (
    <div className={`min-h-screen ${bg} overflow-x-hidden transition-colors duration-300`} style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className={`absolute top-0 left-1/4 w-[600px] h-[600px] ${ambientGlow1} rounded-full blur-[150px]`} />
        <div className={`absolute bottom-1/4 right-1/4 w-[500px] h-[500px] ${ambientGlow2} rounded-full blur-[150px]`} />
      </div>

      {/* Sticky Nav */}
      <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b ${navBg} transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={headerLogo} alt="ATSkolla" className="h-9 object-contain" />
            
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark(!dark)}
              className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-300 ${dark ? "bg-white/10 hover:bg-white/15 text-yellow-300" : "bg-slate-100 hover:bg-slate-200 text-slate-600"}`}>
              
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <a href="/presentation" className={`inline-flex items-center gap-1.5 ${secondaryBtn} px-4 py-2 rounded-full text-sm font-semibold transition-all border`}>
              Lihat Produk
            </a>
            <a href="/register" className={`inline-flex items-center gap-1.5 ${ctaBg} text-white px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-lg`}>
              Mulai Sekarang <ChevronRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <section className="min-h-screen flex flex-col items-center justify-center relative px-4 text-center pt-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-6">
          <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium border ${heroBadgeBg}`}>
            <BarChart3 className="h-3.5 w-3.5" /> Model Bisnis & Proyeksi Pertumbuhan
          </span>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.8 }} className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter leading-[0.9]">
          <span className={`bg-gradient-to-b ${heroTitle} bg-clip-text text-transparent`}>{title}</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }} className={`mt-4 text-lg sm:text-xl font-semibold ${dark ? "text-indigo-300" : "text-indigo-600"}`}>
          ATSkolla — Absensi Digital Sekolah
        </motion.p>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.7 }} className={`mt-4 text-base sm:text-lg md:text-xl ${mutedText} max-w-2xl leading-relaxed`}>
          {subtitle || "Bisnis EdTech dengan model SaaS yang menghasilkan pendapatan berulang setiap bulan, margin keuntungan 85%+, dan peluang pasar ratusan miliar rupiah di Indonesia."}
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-10 flex flex-col sm:flex-row gap-3">
          <a href="#problems" className={`inline-flex items-center justify-center gap-2 ${ctaBg} text-white px-8 py-3.5 rounded-2xl font-semibold transition-all shadow-2xl text-sm`}>
            <AlertTriangle className="h-4 w-4" /> Lihat Permasalahan
          </a>
          <a href="#revenue" className={`inline-flex items-center justify-center gap-2 ${secondaryBtn} px-8 py-3.5 rounded-2xl font-semibold transition-all text-sm border`}>
            Model Pendapatan <ArrowDown className="h-4 w-4" />
          </a>
        </motion.div>

        {/* Stats bar */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 w-full max-w-3xl">
          {STATS.map((s) =>
          <div key={s.label} className="text-center">
              <div className={`text-2xl sm:text-3xl font-extrabold bg-gradient-to-r ${statGradient} bg-clip-text text-transparent`}>{s.value}</div>
              <div className={`text-xs ${subtleText} mt-1 font-medium`}>{s.label}</div>
            </div>
          )}
        </motion.div>

        <div className="absolute bottom-8 animate-bounce">
          <ArrowDown className={`h-5 w-5 ${subtleText}`} />
        </div>
      </section>

      {/* ═══════════ LATAR BELAKANG MASALAH ═══════════ */}
      <section id="problems" className={`py-20 sm:py-32 px-4 ${sectionAlt}`}>
        <div className="max-w-7xl mx-auto">
          <motion.div custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${dark ? "text-red-400" : "text-red-600"} mb-4 block`}>Latar Belakang Masalah</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">Permasalahan Absensi di Sekolah</h2>
            <p className={`mt-4 ${mutedText} max-w-2xl mx-auto`}>
              Mayoritas sekolah di Indonesia masih menggunakan sistem absensi manual yang menimbulkan berbagai kendala serius bagi guru, sekolah, dan orang tua.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PROBLEMS.map((p, i) =>
            <motion.div key={p.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className={`rounded-2xl p-6 sm:p-8 transition-all duration-300 border ${problemCardBg}`}>
                <div className={`h-12 w-12 rounded-xl ${problemIconBg} flex items-center justify-center mb-5`}>
                  <p.icon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg mb-2">{p.title}</h3>
                <p className={`${detailText} text-sm leading-relaxed`}>{p.desc}</p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════ SOLUSI ═══════════ */}
      <section id="solutions" className="py-20 sm:py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${dark ? "text-emerald-400" : "text-emerald-600"} mb-4 block`}>Solusi ATSkolla</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">Solusi untuk Setiap Masalah</h2>
            <p className={`mt-4 ${mutedText} max-w-2xl mx-auto`}>
              ATSkolla hadir sebagai solusi digital yang menjawab setiap permasalahan absensi di sekolah — dari pencatatan hingga pelaporan.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SOLUTIONS.map((s, i) =>
            <motion.div key={s.solution} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className={`rounded-2xl p-6 sm:p-8 transition-all duration-300 border ${solutionCardBg}`}>
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-5 shadow-lg`}>
                  <s.icon className="h-6 w-6 text-white" />
                </div>
                <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${dark ? "text-red-400/60" : "text-red-400"}`}>
                  ✕ {s.problem}
                </div>
                <h3 className={`font-bold text-lg mb-2 ${dark ? "text-emerald-300" : "text-emerald-700"}`}>✓ {s.solution}</h3>
                <p className={`${detailText} text-sm leading-relaxed`}>{s.desc}</p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════ PRODUCT SHOWCASE ═══════════ */}
      <section className="py-20 sm:py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${dark ? "text-indigo-400" : "text-indigo-600"} mb-4 block`}>Produk</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">Tampilan Produk ATSkolla</h2>
            <p className={`mt-4 ${mutedText} max-w-2xl mx-auto`}>Sistem absensi digital yang sudah siap digunakan dengan tampilan modern dan fitur lengkap.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { src: "/images/presentation/ss-dashboard.png", label: "Dashboard Analitik Real-Time" },
              { src: "/images/presentation/ss-monitoring.png", label: "Live Monitoring Kehadiran" },
              { src: "/images/presentation/ss-scan.png", label: "Scan Multi-Metode (QR/Face/NIS)" },
              { src: "/images/presentation/ss-whatsapp.png", label: "Notifikasi WhatsApp Otomatis" },
              { src: "/images/presentation/ss-rekap.png", label: "Rekap & Export Absensi" },
              { src: "/images/presentation/ss-langganan.png", label: "Sistem Langganan Fleksibel" },
            ].map((item, i) => (
              <motion.div key={item.label} custom={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "100px" }} transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`group rounded-2xl overflow-hidden border transition-all duration-300 ${cardBg}`}>
                <div className="aspect-video overflow-hidden">
                  <img src={item.src} alt={item.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-4">
                  <p className="font-semibold text-sm">{item.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ MARKET OPPORTUNITY ═══════════ */}
      <section id="market" className={`py-20 sm:py-32 px-4 ${sectionAlt}`}>
        <div className="max-w-7xl mx-auto">
          <motion.div custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${dark ? "text-emerald-400" : "text-emerald-600"} mb-4 block`}>Peluang Pasar</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">Pasar yang Sangat Besar & Belum Banyak Digarap</h2>
            <p className={`mt-4 ${mutedText} max-w-2xl mx-auto`}>Indonesia punya ratusan ribu sekolah dari TK hingga SMA/SMK yang belum punya sistem absensi digital. Ini peluang besar yang masih terbuka lebar.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {MARKET_DATA.map((m, i) =>
            <motion.div key={m.label} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className={`group relative rounded-2xl p-6 sm:p-8 text-center transition-all duration-300 border ${cardBg}`}>
                <m.icon className={`h-8 w-8 mx-auto mb-4 ${dark ? "text-indigo-400" : "text-indigo-500"}`} />
                <div className={`text-2xl sm:text-3xl font-extrabold bg-gradient-to-r ${statGradient} bg-clip-text text-transparent mb-2`}>{m.value}</div>
                <p className={`${detailText} text-sm`}>{m.label}</p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════ REVENUE STREAMS ═══════════ */}
      <section id="revenue" className="py-20 sm:py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${dark ? "text-indigo-400" : "text-indigo-600"} mb-4 block`}>Sumber Pendapatan</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">5 Sumber Pendapatan</h2>
            <p className={`mt-4 ${mutedText} max-w-2xl mx-auto`}>ATSkolla punya beberapa cara menghasilkan uang — tidak hanya dari satu sumber, tapi dari lima pilar yang saling menguatkan.</p>
          </motion.div>

          {REVENUE_STREAMS.map((stream, idx) =>
          <div key={stream.title} className={`${idx > 0 ? "mt-20 sm:mt-28" : ""}`}>
              <motion.div custom={0} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} className="mb-12 sm:mb-16">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${badgeLabel}`}>0{idx + 1}</span>
                  <div className={`h-px w-8 ${dividerColor}`} />
                  <span className={`text-[11px] font-bold uppercase tracking-[0.15em] bg-gradient-to-r ${stream.gradient} bg-clip-text text-transparent`}>{stream.badge}</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">{stream.title}</h2>
                <p className={`${mutedText} mt-2 text-base sm:text-lg`}>{stream.desc}</p>
              </motion.div>

              <div className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${idx % 2 === 1 ? "lg:[direction:rtl]" : ""}`}>
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={scaleIn} className={`${idx % 2 === 1 ? "lg:[direction:ltr]" : ""}`}>
                  <div className={`relative rounded-2xl overflow-hidden border p-8 sm:p-12 ${cardBg} ${stream.glow}`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${stream.gradient} opacity-5`} />
                    <div className="relative z-10 flex flex-col items-center gap-6">
                      <div className={`h-20 w-20 rounded-2xl bg-gradient-to-br ${stream.gradient} flex items-center justify-center shadow-2xl`}>
                        <stream.icon className="h-10 w-10 text-white" />
                      </div>
                      <div className="text-center">
                        <h3 className="font-extrabold text-xl mb-2">{stream.title}</h3>
                        <p className={`${detailText} text-sm`}>{stream.desc}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div custom={1} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className={`space-y-3 ${idx % 2 === 1 ? "lg:[direction:ltr]" : ""}`}>
                  {stream.details.map((detail, i) =>
                <motion.div key={i} custom={i + 2} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="flex gap-3 items-start">
                      <CheckCircle2 className={`h-5 w-5 shrink-0 mt-0.5 ${checkColor}`} />
                      <span className={`${detailText} text-sm leading-relaxed`}>{detail}</span>
                    </motion.div>
                )}
                </motion.div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════ PRICING ═══════════ */}
      <section className={`py-20 sm:py-32 px-4 ${sectionAlt}`}>
        <div className="max-w-7xl mx-auto">
          <motion.div custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${dark ? "text-indigo-400" : "text-indigo-600"} mb-4 block`}>Struktur Harga</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">Harga Terjangkau, Keuntungan Besar</h2>
            <p className={`mt-4 ${mutedText} max-w-xl mx-auto`}>Tiga pilihan paket yang dirancang agar sekolah mudah memilih dan kami tetap untung besar.</p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {PRICING_TIERS.map((tier, i) =>
            <motion.div key={tier.name} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className={`relative rounded-2xl p-6 sm:p-8 transition-all duration-300 border ${tier.highlight ? highlightCardBg : cardBg}`}>
                {tier.highlight &&
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${tier.gradient} shadow-lg`}>
                      <Star className="h-3 w-3" /> Most Popular
                    </span>
                  </div>
              }
                <div className={`text-sm font-bold uppercase tracking-wider bg-gradient-to-r ${tier.gradient} bg-clip-text text-transparent mb-2`}>{tier.name}</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-extrabold">{tier.price}</span>
                  <span className={`text-sm ${subtleText}`}>{tier.period}</span>
                </div>
                <p className={`text-xs ${subtleText} mb-6`}>{tier.students}</p>
                <div className="space-y-2.5">
                  {tier.features.map((f) =>
                <div key={f} className="flex items-center gap-2">
                      <CheckCircle2 className={`h-4 w-4 shrink-0 ${checkColor}`} />
                      <span className={`text-sm ${detailText}`}>{f}</span>
                    </div>
                )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════ UNIT ECONOMICS ═══════════ */}
      <section className="py-20 sm:py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${dark ? "text-cyan-400" : "text-cyan-600"} mb-4 block`}>Angka-Angka Penting</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">Fondasi Bisnis yang Kokoh</h2>
            <p className={`mt-4 ${mutedText} max-w-xl mx-auto`}>Angka-angka kunci yang membuktikan bisnis ATSkolla berkelanjutan dan menguntungkan.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {UNIT_ECONOMICS.map((item, i) =>
            <motion.div key={item.label} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className={`rounded-2xl p-6 sm:p-8 transition-all duration-300 border ${cardBg}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${subtleText} mb-3`}>{item.label}</p>
                <div className={`text-2xl sm:text-3xl font-extrabold bg-gradient-to-r ${statGradient} bg-clip-text text-transparent mb-2`}>{item.value}</div>
                <p className={`text-xs ${detailText}`}>{item.note}</p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════ GROWTH ROADMAP ═══════════ */}
      <section className={`py-20 sm:py-32 px-4 ${sectionAlt}`}>
        <div className="max-w-5xl mx-auto">
          <motion.div custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${dark ? "text-pink-400" : "text-pink-600"} mb-4 block`}>Peta Pertumbuhan</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">Rencana Pertumbuhan 3 Tahun</h2>
            <p className={`mt-4 ${mutedText} max-w-xl mx-auto`}>Rencana realistis untuk tumbuh secara bertahap — fokus pada kepuasan pelanggan dan rekomendasi dari mulut ke mulut.</p>
          </motion.div>

          <div className="space-y-5">
            {GROWTH_MILESTONES.map((m, i) =>
            <motion.div key={m.quarter} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className={`flex flex-col sm:flex-row gap-5 sm:gap-8 items-start rounded-2xl p-6 sm:p-8 transition-all duration-300 border ${whyCardBg}`}>
                <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center shrink-0 shadow-lg`}>
                  <span className="text-white font-extrabold text-sm">{m.quarter}</span>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg">{m.title}</h3>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${dark ? "bg-white/5 text-white/70" : "bg-slate-100 text-slate-600"}`}>{m.schools}</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full bg-gradient-to-r ${m.color} text-white`}>{m.revenue}</span>
                  </div>
                  <p className={`${detailText} text-sm leading-relaxed`}>{m.focus}</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════ COMPETITIVE ADVANTAGES ═══════════ */}
      <section className="py-20 sm:py-32 px-4 relative">
        <div className={`absolute inset-0 bg-gradient-to-b from-transparent ${ambientSection} to-transparent pointer-events-none`} />
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${dark ? "text-violet-400" : "text-indigo-500"} mb-4 block`}>Kenapa Kami Unggul</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">Keunggulan Kami</h2>
            <p className={`mt-4 ${mutedText} max-w-xl mx-auto`}>Kombinasi teknologi mudah, harga terjangkau, dan pengalaman pengguna terbaik yang sulit ditiru kompetitor.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {COMPETITIVE_ADVANTAGES.map((f, i) =>
            <motion.div key={f.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className={`group relative rounded-2xl p-6 sm:p-8 transition-all duration-300 border ${cardBg}`}>
                <div className={`h-12 w-12 rounded-xl ${whyIconBg} flex items-center justify-center mb-5 shadow-lg`}>
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className={`${detailText} text-sm leading-relaxed`}>{f.desc}</p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="py-20 sm:py-32 px-4 relative">
        <div className={`absolute inset-0 bg-gradient-to-t ${ctaSectionBg} to-transparent pointer-events-none`} />
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="max-w-3xl mx-auto text-center relative z-10">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/30">
            <Rocket className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Siap Bergabung dalam <br className="hidden sm:block" />Revolusi EdTech Indonesia?
          </h2>
          <p className={`${mutedText} text-base sm:text-lg mb-10 max-w-xl mx-auto`}>
            Pasar besar, bisnis yang sudah terbukti menguntungkan, dan produk yang siap pakai — ATSkolla adalah peluang bisnis EdTech yang layak dipertimbangkan.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/register" className={`inline-flex items-center justify-center gap-2 ${ctaBg} text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-2xl text-base`}>
              <Zap className="h-5 w-5" /> Mulai Sekarang
            </a>
            <a href="/presentation" className={`inline-flex items-center justify-center gap-2 ${secondaryBtn} px-10 py-4 rounded-2xl font-bold transition-all text-base border`}>
              Lihat Demo Produk <ArrowUpRight className="h-5 w-5" />
            </a>
          </div>
          <p className={`${subtleText} text-xs mt-4`}>Produk sudah aktif • Siap menghasilkan • Bisa berkembang ke seluruh Indonesia</p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className={`border-t ${footerBg} py-8 px-4 text-center transition-colors duration-300`}>
        <p className={`${footerText} text-xs`}>© {new Date().getFullYear()} ATSkolla — Absensi Digital Sekolah. All rights reserved.</p>
      </footer>
    </div>);

};

export default BusinessModel;