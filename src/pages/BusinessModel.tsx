import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, ArrowDown, Shield, ChevronRight, Zap, Sun, Moon, Sparkles,
  TrendingUp, DollarSign, Users, Building2, BarChart3, Target, Layers,
  CheckCircle2, Rocket, Globe, PieChart, ArrowUpRight, Repeat, CreditCard,
  School, Star, Award, Heart, Lightbulb, ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { Navigate } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 50 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.7 } }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.8 } },
};

const REVENUE_STREAMS = [
  {
    icon: Repeat,
    title: "Langganan Bulanan (SaaS Recurring)",
    desc: "Pendapatan berulang yang stabil dan terprediksi setiap bulan dari setiap sekolah yang berlangganan.",
    details: [
      "Model subscription per sekolah — pembayaran otomatis setiap bulan",
      "Paket bertingkat (Starter, Professional, Enterprise) menyesuaikan skala sekolah",
      "Upgrade otomatis saat jumlah siswa melebihi kuota paket",
      "Retensi tinggi karena sistem menjadi bagian dari operasional harian sekolah",
      "Revenue churn sangat rendah — sekolah tidak mudah berpindah setelah data terintegrasi",
    ],
    gradient: "from-emerald-500 via-teal-500 to-cyan-600",
    glow: "shadow-emerald-500/20",
    badge: "Primary Revenue",
  },
  {
    icon: Building2,
    title: "Enterprise & Multi-Cabang",
    desc: "Paket khusus untuk yayasan atau grup sekolah yang mengelola beberapa cabang sekaligus dalam satu dashboard terpusat.",
    details: [
      "Harga premium untuk manajemen multi-cabang terpusat",
      "Dashboard grup dengan analitik lintas cabang",
      "Custom branding per cabang sekolah",
      "Dedicated account manager untuk enterprise client",
      "SLA (Service Level Agreement) khusus dengan uptime 99.9%",
    ],
    gradient: "from-violet-500 via-purple-500 to-indigo-600",
    glow: "shadow-violet-500/20",
    badge: "High Value",
  },
  {
    icon: Globe,
    title: "WhatsApp Notification Service",
    desc: "Layanan notifikasi WhatsApp otomatis sebagai add-on premium yang menghasilkan pendapatan tambahan per pesan.",
    details: [
      "Biaya per pesan atau paket pesan bulanan sebagai add-on",
      "Margin tinggi karena volume penggunaan besar per sekolah",
      "Notifikasi otomatis ke wali murid setiap anak dijemput",
      "Meningkatkan kepuasan dan loyalitas pelanggan",
      "Potensi ekspansi ke notifikasi akademik, jadwal, dan pengumuman",
    ],
    gradient: "from-green-500 via-emerald-500 to-teal-600",
    glow: "shadow-green-500/20",
    badge: "Add-on Revenue",
  },
  {
    icon: Layers,
    title: "Kustomisasi & White Label",
    desc: "Layanan kustomisasi untuk sekolah yang menginginkan branding sendiri dan fitur khusus sesuai kebutuhan unik mereka.",
    details: [
      "White-label solution dengan branding sekolah sepenuhnya",
      "Custom development untuk fitur tambahan",
      "Integrasi dengan sistem akademik atau ERP sekolah yang sudah ada",
      "One-time setup fee + maintenance recurring",
      "Potensi partnership jangka panjang dengan institusi besar",
    ],
    gradient: "from-amber-500 via-orange-500 to-red-500",
    glow: "shadow-amber-500/20",
    badge: "Premium Service",
  },
];

const PRICING_TIERS = [
  {
    name: "Starter",
    price: "Rp 99.000",
    period: "/bulan",
    students: "≤ 100 siswa",
    features: ["Dashboard & Monitoring", "Scan QR Code", "Kartu QR Siswa", "Riwayat 30 Hari", "1 Admin"],
    highlight: false,
    gradient: "from-slate-500 to-slate-600",
  },
  {
    name: "Professional",
    price: "Rp 249.000",
    period: "/bulan",
    students: "≤ 500 siswa",
    features: ["Semua fitur Starter", "Notifikasi WhatsApp", "Export Laporan", "Live Monitor Publik", "Multi Admin & Staff", "Riwayat Unlimited"],
    highlight: true,
    gradient: "from-indigo-500 to-violet-600",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    students: "Unlimited",
    features: ["Semua fitur Professional", "Multi Cabang", "White Label", "Dedicated Support", "Custom Integration", "SLA 99.9%"],
    highlight: false,
    gradient: "from-amber-500 to-orange-600",
  },
];

const MARKET_DATA = [
  { value: "250.000+", label: "Sekolah TK & SD di Indonesia", icon: School },
  { value: "50 Juta+", label: "Siswa TK & SD Potensial", icon: Users },
  { value: "Rp 300M+", label: "Potensi Pasar Tahunan (TAM)", icon: DollarSign },
  { value: "< 1%", label: "Penetrasi Pasar Saat Ini", icon: Target },
];

const GROWTH_MILESTONES = [
  { quarter: "Q1-Q2", title: "Foundation", schools: "50 sekolah", revenue: "Rp 12.5 jt/bln", focus: "Akuisisi awal, product-market fit, testimonial dari early adopters", color: "from-blue-500 to-indigo-500" },
  { quarter: "Q3-Q4", title: "Growth", schools: "200 sekolah", revenue: "Rp 50 jt/bln", focus: "Referral program, partnership dinas pendidikan, ekspansi regional", color: "from-indigo-500 to-violet-500" },
  { quarter: "Tahun 2", title: "Scale", schools: "1.000 sekolah", revenue: "Rp 250 jt/bln", focus: "Tim sales dedicated, enterprise deals, ekspansi nasional", color: "from-violet-500 to-purple-500" },
  { quarter: "Tahun 3", title: "Dominance", schools: "5.000+ sekolah", revenue: "Rp 1.25 M/bln", focus: "Market leader, ekspansi produk (akademik, absensi), ARR Rp 15M+", color: "from-purple-500 to-pink-500" },
];

const COMPETITIVE_ADVANTAGES = [
  { icon: Zap, title: "Time to Value < 5 Menit", desc: "Setup instan — import data siswa dari Excel, cetak QR, langsung operasional. Kompetitor butuh berminggu-minggu untuk implementasi." },
  { icon: CreditCard, title: "Harga Terjangkau", desc: "Mulai dari Rp 99.000/bulan — jauh lebih murah dari solusi enterprise yang bisa mencapai jutaan rupiah per bulan." },
  { icon: ShieldCheck, title: "Keamanan Terverifikasi", desc: "Setiap penjemputan melalui verifikasi QR Code. Tidak ada siswa yang bisa dijemput tanpa proses verifikasi digital." },
  { icon: Heart, title: "Pengalaman Pengguna Terbaik", desc: "UI/UX modern yang intuitif. Staf sekolah dan wali murid bisa menggunakan tanpa pelatihan khusus." },
  { icon: Globe, title: "Transparansi untuk Wali Murid", desc: "Live Monitor Publik + notifikasi WhatsApp otomatis — wali murid selalu tahu status penjemputan anak mereka." },
  { icon: Rocket, title: "Skalabilitas Tanpa Batas", desc: "Arsitektur cloud-native yang bisa melayani dari 30 siswa hingga ribuan siswa tanpa degradasi performa." },
];

const UNIT_ECONOMICS = [
  { label: "Customer Acquisition Cost (CAC)", value: "Rp 150.000", note: "Via referral & digital marketing" },
  { label: "Average Revenue Per User (ARPU)", value: "Rp 200.000/bln", note: "Rata-rata paket Professional" },
  { label: "Customer Lifetime Value (LTV)", value: "Rp 7.200.000", note: "Rata-rata 36 bulan retention" },
  { label: "LTV/CAC Ratio", value: "48x", note: "Sangat sehat (benchmark > 3x)" },
  { label: "Payback Period", value: "< 1 Bulan", note: "ROI tercepat di industri EdTech" },
  { label: "Gross Margin", value: "85-90%", note: "SaaS margin tinggi, biaya infrastruktur rendah" },
];

const STATS = [
  { value: "Rp 15M+", label: "Target ARR Tahun 3" },
  { value: "85-90%", label: "Gross Margin" },
  { value: "48x", label: "LTV/CAC Ratio" },
  { value: "< 5%", label: "Monthly Churn" },
];

const BusinessModel = () => {
  const [loading, setLoading] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [title, setTitle] = useState("Smart Pickup School System");
  const [subtitle, setSubtitle] = useState("");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", ["business_model_is_public", "business_model_title", "business_model_subtitle"]);
      if (data) {
        const map = Object.fromEntries(data.map((d) => [d.key, d.value]));
        setIsPublic(map.business_model_is_public === "true");
        if (map.business_model_title) setTitle(map.business_model_title);
        if (map.business_model_subtitle) setSubtitle(map.business_model_subtitle);
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
  const sectionDesc = dark ? "text-slate-300" : "text-slate-600";
  const detailText = dark ? "text-slate-400" : "text-slate-500";
  const dividerColor = dark ? "bg-slate-700" : "bg-slate-300";
  const badgeLabel = dark ? "text-slate-500" : "text-slate-400";
  const footerBg = dark ? "border-white/5" : "border-slate-200";
  const footerText = dark ? "text-slate-600" : "text-slate-400";
  const ambientGlow1 = dark ? "bg-violet-600/8" : "bg-indigo-200/40";
  const ambientGlow2 = dark ? "bg-blue-600/6" : "bg-violet-200/30";
  const statGradient = dark ? "from-violet-400 to-indigo-300" : "from-indigo-600 to-violet-500";
  const heroBadgeBg = dark ? "bg-white/5 border-white/10 text-violet-300" : "bg-indigo-50 border-indigo-100 text-indigo-600";
  const heroTitle = dark ? "from-white via-white to-white/60" : "from-slate-900 via-slate-800 to-indigo-700";
  const ctaBg = dark ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-violet-600/30 hover:shadow-violet-500/50" : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-600/20 hover:shadow-indigo-500/40";
  const secondaryBtn = dark ? "bg-white/5 hover:bg-white/10 border-white/10 text-white" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700";
  const ambientSection = dark ? "via-violet-950/10" : "via-indigo-50/50";
  const ctaSectionBg = dark ? "from-violet-950/20" : "from-indigo-50/60";
  const whyCardBg = dark ? "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]" : "bg-white border-slate-200/80 hover:border-indigo-200 hover:shadow-lg";
  const whyIconBg = dark ? "bg-gradient-to-br from-violet-600 to-indigo-600 shadow-violet-500/20" : "bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-500/20";
  const highlightCardBg = dark ? "bg-gradient-to-br from-indigo-950/60 to-violet-950/60 border-indigo-500/30" : "bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-300";

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
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <span className={`font-bold text-sm tracking-tight hidden sm:block ${navText}`}>Smart Pickup — Business Model</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark(!dark)}
              className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-300 ${dark ? "bg-white/10 hover:bg-white/15 text-yellow-300" : "bg-slate-100 hover:bg-slate-200 text-slate-600"}`}
              title={dark ? "Mode Terang" : "Mode Gelap"}
            >
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

      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center relative px-4 text-center pt-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-6">
          <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium border ${heroBadgeBg}`}>
            <BarChart3 className="h-3.5 w-3.5" /> Model Bisnis & Proyeksi Pertumbuhan
          </span>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.8 }} className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter leading-[0.9]">
          <span className={`bg-gradient-to-b ${heroTitle} bg-clip-text text-transparent`}>{title}</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.7 }} className={`mt-6 text-base sm:text-lg md:text-xl ${mutedText} max-w-2xl leading-relaxed`}>
          {subtitle || "Peluang bisnis EdTech dengan model SaaS recurring revenue, gross margin 85%+, dan potensi pasar ratusan miliar rupiah di Indonesia."}
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-10 flex flex-col sm:flex-row gap-3">
          <a href="#market" className={`inline-flex items-center justify-center gap-2 ${ctaBg} text-white px-8 py-3.5 rounded-2xl font-semibold transition-all shadow-2xl text-sm`}>
            <PieChart className="h-4 w-4" /> Lihat Peluang Pasar
          </a>
          <a href="#revenue" className={`inline-flex items-center justify-center gap-2 ${secondaryBtn} px-8 py-3.5 rounded-2xl font-semibold transition-all text-sm border`}>
            Model Pendapatan <ArrowDown className="h-4 w-4" />
          </a>
        </motion.div>

        {/* Stats bar */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 w-full max-w-3xl">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className={`text-2xl sm:text-3xl font-extrabold bg-gradient-to-r ${statGradient} bg-clip-text text-transparent`}>{s.value}</div>
              <div className={`text-xs ${subtleText} mt-1 font-medium`}>{s.label}</div>
            </div>
          ))}
        </motion.div>

        <div className="absolute bottom-8 animate-bounce">
          <ArrowDown className={`h-5 w-5 ${subtleText}`} />
        </div>
      </section>

      {/* Market Opportunity */}
      <section id="market" className={`py-20 sm:py-32 px-4 ${sectionAlt}`}>
        <div className="max-w-7xl mx-auto">
          <motion.div custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${dark ? "text-emerald-400" : "text-emerald-600"} mb-4 block`}>Peluang Pasar</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">Pasar yang Sangat Besar & Belum Tergarap</h2>
            <p className={`mt-4 ${mutedText} max-w-2xl mx-auto`}>Indonesia memiliki ratusan ribu sekolah TK dan SD yang belum memiliki sistem penjemputan digital. Ini adalah peluang blue ocean yang masif.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {MARKET_DATA.map((m, i) => (
              <motion.div key={m.label} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className={`group relative rounded-2xl p-6 sm:p-8 text-center transition-all duration-300 border ${cardBg}`}>
                <m.icon className={`h-8 w-8 mx-auto mb-4 ${dark ? "text-indigo-400" : "text-indigo-500"}`} />
                <div className={`text-2xl sm:text-3xl font-extrabold bg-gradient-to-r ${statGradient} bg-clip-text text-transparent mb-2`}>{m.value}</div>
                <p className={`${detailText} text-sm`}>{m.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Revenue Streams */}
      <section id="revenue" className="py-20 sm:py-32 px-4">
        <div className="max-w-7xl mx-auto">
          {REVENUE_STREAMS.map((stream, idx) => (
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
                {/* Visual */}
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={scaleIn} className={`${idx % 2 === 1 ? "lg:[direction:ltr]" : ""}`}>
                  <div className={`relative rounded-2xl overflow-hidden border p-8 sm:p-12 ${cardBg} ${stream.glow}`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${stream.gradient} opacity-5`} />
                    <div className="relative z-10 flex flex-col items-center gap-6">
                      <div className={`h-20 w-20 rounded-2xl bg-gradient-to-br ${stream.gradient} flex items-center justify-center shadow-2xl`}>
                        <stream.icon className="h-10 w-10 text-white" />
                      </div>
                      <div className={`text-center`}>
                        <h3 className="font-extrabold text-xl mb-2">{stream.title}</h3>
                        <p className={`${detailText} text-sm`}>{stream.desc}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Details */}
                <motion.div custom={1} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className={`space-y-3 ${idx % 2 === 1 ? "lg:[direction:ltr]" : ""}`}>
                  {stream.details.map((detail, i) => (
                    <motion.div key={i} custom={i + 2} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="flex gap-3 items-start">
                      <CheckCircle2 className={`h-5 w-5 shrink-0 mt-0.5 ${checkColor}`} />
                      <span className={`${detailText} text-sm leading-relaxed`}>{detail}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className={`py-20 sm:py-32 px-4 ${sectionAlt}`}>
        <div className="max-w-7xl mx-auto">
          <motion.div custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${dark ? "text-amber-400" : "text-amber-600"} mb-4 block`}>Struktur Harga</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">Harga Kompetitif, Margin Tinggi</h2>
            <p className={`mt-4 ${mutedText} max-w-xl mx-auto`}>Setiap tier dirancang untuk memaksimalkan conversion rate sekaligus menjaga gross margin di atas 85%.</p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {PRICING_TIERS.map((tier, i) => (
              <motion.div key={tier.name} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className={`relative rounded-2xl p-6 sm:p-8 transition-all duration-300 border ${tier.highlight ? highlightCardBg : cardBg}`}>
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${tier.gradient} shadow-lg`}>
                      <Star className="h-3 w-3" /> Most Popular
                    </span>
                  </div>
                )}
                <div className={`text-sm font-bold uppercase tracking-wider bg-gradient-to-r ${tier.gradient} bg-clip-text text-transparent mb-2`}>{tier.name}</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-extrabold">{tier.price}</span>
                  <span className={`text-sm ${subtleText}`}>{tier.period}</span>
                </div>
                <p className={`text-xs ${subtleText} mb-6`}>{tier.students}</p>
                <div className="space-y-2.5">
                  {tier.features.map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <CheckCircle2 className={`h-4 w-4 shrink-0 ${checkColor}`} />
                      <span className={`text-sm ${detailText}`}>{f}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Unit Economics */}
      <section className="py-20 sm:py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${dark ? "text-cyan-400" : "text-cyan-600"} mb-4 block`}>Unit Economics</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">Fundamental Bisnis yang Kuat</h2>
            <p className={`mt-4 ${mutedText} max-w-xl mx-auto`}>Metrik kunci yang menunjukkan keberlanjutan dan profitabilitas model bisnis Smart Pickup.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {UNIT_ECONOMICS.map((item, i) => (
              <motion.div key={item.label} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className={`rounded-2xl p-6 sm:p-8 transition-all duration-300 border ${cardBg}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${subtleText} mb-3`}>{item.label}</p>
                <div className={`text-2xl sm:text-3xl font-extrabold bg-gradient-to-r ${statGradient} bg-clip-text text-transparent mb-2`}>{item.value}</div>
                <p className={`text-xs ${detailText}`}>{item.note}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Growth Roadmap */}
      <section className={`py-20 sm:py-32 px-4 ${sectionAlt}`}>
        <div className="max-w-5xl mx-auto">
          <motion.div custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${dark ? "text-pink-400" : "text-pink-600"} mb-4 block`}>Growth Roadmap</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">Proyeksi Pertumbuhan 3 Tahun</h2>
            <p className={`mt-4 ${mutedText} max-w-xl mx-auto`}>Roadmap realistis berdasarkan penetrasi pasar bertahap dengan fokus pada retensi dan referral.</p>
          </motion.div>

          <div className="space-y-5">
            {GROWTH_MILESTONES.map((m, i) => (
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
            ))}
          </div>
        </div>
      </section>

      {/* Competitive Advantages */}
      <section className="py-20 sm:py-32 px-4 relative">
        <div className={`absolute inset-0 bg-gradient-to-b from-transparent ${ambientSection} to-transparent pointer-events-none`} />
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${dark ? "text-violet-400" : "text-indigo-500"} mb-4 block`}>Competitive Moat</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">Keunggulan Kompetitif yang Sulit Ditiru</h2>
            <p className={`mt-4 ${mutedText} max-w-xl mx-auto`}>Kombinasi teknologi, harga, dan pengalaman pengguna yang menciptakan barrier to entry bagi kompetitor.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {COMPETITIVE_ADVANTAGES.map((f, i) => (
              <motion.div key={f.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className={`group relative rounded-2xl p-6 sm:p-8 transition-all duration-300 border ${cardBg}`}>
                <div className={`h-12 w-12 rounded-xl ${whyIconBg} flex items-center justify-center mb-5 shadow-lg`}>
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className={`${detailText} text-sm leading-relaxed`}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-32 px-4 relative">
        <div className={`absolute inset-0 bg-gradient-to-t ${ctaSectionBg} to-transparent pointer-events-none`} />
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="max-w-3xl mx-auto text-center relative z-10">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/30">
            <Rocket className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Siap Menjadi Bagian dari <br className="hidden sm:block" />Revolusi EdTech Indonesia?
          </h2>
          <p className={`${mutedText} text-base sm:text-lg mb-10 max-w-xl mx-auto`}>
            Dengan pasar yang masif, unit economics yang kuat, dan produk yang sudah siap — Smart Pickup adalah peluang yang tidak boleh dilewatkan.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/register" className={`inline-flex items-center justify-center gap-2 ${ctaBg} text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-2xl text-base`}>
              <Zap className="h-5 w-5" /> Mulai Sekarang
            </a>
            <a href="/presentation" className={`inline-flex items-center justify-center gap-2 ${secondaryBtn} px-10 py-4 rounded-2xl font-bold transition-all text-base border`}>
              Lihat Demo Produk <ArrowUpRight className="h-5 w-5" />
            </a>
          </div>
          <p className={`${subtleText} text-xs mt-4`}>Produk sudah live • Revenue-ready • Skalabel secara nasional</p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className={`border-t ${footerBg} py-8 px-4 text-center transition-colors duration-300`}>
        <p className={`${footerText} text-xs`}>© {new Date().getFullYear()} Smart Pickup School System. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default BusinessModel;
