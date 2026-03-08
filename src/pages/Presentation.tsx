import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowDown, Shield, QrCode, Monitor, Users, GraduationCap, BarChart3, Clock, Bell, Globe, FileText, Settings, ChevronRight, CheckCircle2, Zap, Lock, Smartphone, Star, TrendingUp, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Navigate } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 50 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] } }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};

const SECTIONS = [
  {
    id: "dashboard",
    title: "Dashboard Analitik Real-Time",
    subtitle: "Pusat Kendali Sekolah Anda",
    desc: "Dashboard utama yang dirancang untuk memberikan gambaran menyeluruh tentang aktivitas penjemputan di sekolah Anda — dalam satu layar.",
    details: [
      "Statistik harian real-time: total siswa, sudah dijemput, belum dijemput, dan jumlah scan hari ini",
      "Grafik aktivitas per jam untuk mengidentifikasi pola penjemputan dan jam sibuk",
      "Donut chart status penjemputan dengan persentase visual yang mudah dipahami",
      "Log penjemputan terbaru lengkap dengan nama siswa, kelas, waktu, dan penanggung jawab",
      "Data diperbarui otomatis tanpa perlu refresh halaman",
    ],
    image: "/images/presentation/dashboard.png",
    icon: BarChart3,
    gradient: "from-blue-600 via-indigo-600 to-violet-700",
    glow: "shadow-blue-500/20",
    badge: "Core Feature",
  },
  {
    id: "monitoring",
    title: "Monitoring Penjemputan Live",
    subtitle: "Pantau Setiap Siswa Secara Real-Time",
    desc: "Sistem monitoring canggih yang memungkinkan staf sekolah memantau progress penjemputan seluruh kelas secara simultan dengan update otomatis.",
    details: [
      "Progress bar visual per kelas — lihat sekilas kelas mana yang sudah selesai dan mana yang masih menunggu",
      "Card per kelas menampilkan jumlah total siswa, sudah dijemput (hijau), dan menunggu (merah)",
      "Tombol 'Pulangkan' untuk penjemputan manual langsung dari halaman monitoring",
      "Toggle Aktif/Nonaktif sistem dan tombol 'Reset Harian' untuk memulai hari baru",
      "Indikator real-time dengan timestamp terakhir diperbarui",
      "Daftar siswa per kelas yang bisa langsung di-pulangkan satu per satu",
    ],
    image: "/images/presentation/monitoring.jpeg",
    icon: Monitor,
    gradient: "from-emerald-500 via-teal-600 to-cyan-700",
    glow: "shadow-emerald-500/20",
    badge: "Real-Time",
  },
  {
    id: "scan-qr",
    title: "Scan QR Code & Input NIS",
    subtitle: "Proses Penjemputan Instan",
    desc: "Fitur inti yang menjadikan proses penjemputan aman dan efisien — cukup scan kartu QR siswa atau ketik NIS, sistem langsung mencatat dan mengumumkan.",
    details: [
      "Scan QR Code menggunakan kamera perangkat — mendukung smartphone, tablet, dan laptop",
      "Input NIS manual sebagai alternatif jika kartu QR tidak tersedia",
      "Pengumuman suara otomatis (Text-to-Speech) saat siswa di-scan: nama siswa dan kelas diumumkan keras",
      "Pop-up konfirmasi dengan detail lengkap siswa setelah scan berhasil",
      "Indikator waktu penjemputan aktif (jam operasional) di bagian atas halaman",
      "Pencegahan scan ganda — siswa yang sudah dijemput tidak bisa di-scan ulang",
    ],
    image: "/images/presentation/scan-qr.jpeg",
    icon: QrCode,
    gradient: "from-violet-600 via-purple-600 to-fuchsia-700",
    glow: "shadow-violet-500/20",
    badge: "Smart Scan",
  },
  {
    id: "qr-card",
    title: "Kartu QR Code Siswa",
    subtitle: "Identitas Digital Setiap Siswa",
    desc: "Setiap siswa mendapatkan kartu QR Code unik yang berfungsi sebagai identitas digital untuk proses penjemputan. Kartu ini bisa dicetak dan diberikan ke wali murid.",
    details: [
      "QR Code unik untuk setiap siswa — tidak ada duplikasi, 100% aman",
      "Desain kartu menampilkan QR Code besar yang mudah di-scan dari jarak wajar",
      "Informasi siswa tertera jelas: nama, kelas, dan NIS",
      "Tombol download QR Code dalam format gambar berkualitas tinggi",
      "QR Code bisa dicetak untuk ditempelkan di kartu pelajar atau digantung sebagai ID card",
      "Wali murid cukup menunjukkan kartu QR saat menjemput — proses verifikasi instan",
    ],
    image: "/images/presentation/qr-code.png",
    icon: QrCode,
    gradient: "from-indigo-600 via-blue-600 to-sky-600",
    glow: "shadow-indigo-500/20",
    badge: "ID Card",
  },
  {
    id: "classes",
    title: "Manajemen Kelas Terpusat",
    subtitle: "Organisasi Data yang Rapi & Terstruktur",
    desc: "Kelola seluruh kelas dalam satu halaman yang terorganisir dengan statistik lengkap dan aksi cepat untuk setiap kelas.",
    details: [
      "Card visual per kelas dengan nama, jumlah siswa, dan progress penjemputan harian",
      "Badge status berwarna: hijau untuk dijemput, merah untuk menunggu — mudah dibaca",
      "Statistik agregat di header: total kelas, total siswa, dijemput hari ini, belum dijemput",
      "Tambah kelas baru dengan satu klik melalui tombol 'Tambah Kelas'",
      "Hapus kelas yang tidak diperlukan dengan konfirmasi keamanan",
      "Navigasi cepat ke detail siswa per kelas",
    ],
    image: "/images/presentation/classes.jpeg",
    icon: GraduationCap,
    gradient: "from-amber-500 via-orange-500 to-red-500",
    glow: "shadow-amber-500/20",
    badge: "Organized",
  },
  {
    id: "students",
    title: "Database Siswa Komprehensif",
    subtitle: "Semua Data Siswa dalam Genggaman",
    desc: "Sistem manajemen data siswa lengkap dengan fitur CRUD, import/export massal, pencetakan kartu QR, dan pengelolaan kenaikan kelas otomatis.",
    details: [
      "Tampilan accordion per kelas — data terorganisir dan mudah dinavigasi",
      "Informasi lengkap per siswa: nama, NIS, wali murid, nomor HP, dan foto",
      "Fitur Import dari Excel — tambahkan puluhan siswa sekaligus tanpa input manual",
      "Export data ke Excel untuk dokumentasi dan pelaporan",
      "Cetak kartu QR Code individual atau massal",
      "Fitur 'Naik Kelas' — perpindahan kelas massal di awal tahun ajaran baru",
      "Pencarian global: cari berdasarkan nama siswa, NIS, kelas, atau nama wali",
    ],
    image: "/images/presentation/students.jpeg",
    icon: Users,
    gradient: "from-cyan-500 via-blue-600 to-indigo-600",
    glow: "shadow-cyan-500/20",
    badge: "Complete",
  },
  {
    id: "parents",
    title: "Data Wali Murid",
    subtitle: "Koneksi Langsung dengan Orang Tua",
    desc: "Halaman khusus yang menampilkan seluruh wali murid beserta anak-anak yang terdaftar, memudahkan komunikasi dan verifikasi identitas saat penjemputan.",
    details: [
      "Card visual per wali: nama, nomor telepon, dan daftar anak terdaftar",
      "Relasi wali-siswa yang jelas — satu wali bisa memiliki beberapa anak di kelas berbeda",
      "Statistik ringkas: total wali, total siswa, dan jumlah kelas",
      "Pencarian cepat berdasarkan nama wali, siswa, atau kelas",
      "Data wali terintegrasi dengan sistem notifikasi WhatsApp",
      "Nomor telepon wali digunakan untuk pengiriman notifikasi otomatis saat anak dijemput",
    ],
    image: "/images/presentation/parents.jpeg",
    icon: Users,
    gradient: "from-pink-500 via-rose-500 to-red-500",
    glow: "shadow-pink-500/20",
    badge: "Connected",
  },
];

const EXTRA_FEATURES = [
  { icon: Globe, title: "Live Monitor Publik", desc: "Halaman publik tanpa login — wali murid bisa memantau status penjemputan anak mereka secara real-time dari mana saja melalui link khusus sekolah.", color: "text-emerald-400" },
  { icon: Clock, title: "Riwayat Penjemputan", desc: "Rekam jejak lengkap seluruh aktivitas penjemputan yang bisa difilter berdasarkan tanggal, kelas, siswa, dan metode scan. Tidak ada data yang hilang.", color: "text-blue-400" },
  { icon: FileText, title: "Export Laporan Harian", desc: "Unduh laporan penjemputan harian dalam format Excel siap cetak. Cocok untuk dokumentasi internal dan pelaporan ke manajemen sekolah.", color: "text-amber-400" },
  { icon: Bell, title: "Notifikasi WhatsApp Otomatis", desc: "Setiap kali siswa di-scan, wali murid menerima pesan WhatsApp otomatis berisi konfirmasi bahwa anak mereka sudah dijemput. Aman dan terpercaya.", color: "text-green-400" },
  { icon: Shield, title: "Sistem Langganan Fleksibel", desc: "Pilih paket yang sesuai dengan kebutuhan sekolah Anda. Dari paket gratis untuk sekolah kecil hingga premium untuk institusi besar dengan fitur lengkap.", color: "text-violet-400" },
  { icon: Settings, title: "Pengaturan Komprehensif", desc: "Konfigurasi jam operasional, logo sekolah, instruksi pada kartu QR, integrasi WhatsApp Gateway, dan pengaturan lainnya sesuai kebutuhan.", color: "text-rose-400" },
];

const STATS = [
  { value: "< 1 detik", label: "Waktu Scan QR" },
  { value: "24/7", label: "Akses Monitoring" },
  { value: "100%", label: "Data Terenkripsi" },
  { value: "∞", label: "Riwayat Tersimpan" },
];

const Presentation = () => {
  const [loading, setLoading] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [title, setTitle] = useState("Smart Pickup School System");
  const [subtitle, setSubtitle] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", ["presentation_is_public", "presentation_title", "presentation_subtitle"]);
      if (data) {
        const map = Object.fromEntries(data.map((d) => [d.key, d.value]));
        setIsPublic(map.presentation_is_public === "true");
        if (map.presentation_title) setTitle(map.presentation_title);
        if (map.presentation_subtitle) setSubtitle(map.presentation_subtitle);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-violet-400" /></div>;
  if (!isPublic) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden font-['Inter',sans-serif]">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-600/6 rounded-full blur-[150px]" />
      </div>

      {/* Sticky Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Shield className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight hidden sm:block">Smart Pickup</span>
          </div>
          <a href="/register" className="inline-flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40">
            Mulai Sekarang <ChevronRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center relative px-4 text-center pt-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-6">
          <span className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs font-medium text-violet-300">
            <Sparkles className="h-3.5 w-3.5" /> Solusi Penjemputan Siswa #1 di Indonesia
          </span>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter leading-[0.9]">
          <span className="bg-gradient-to-b from-white via-white to-white/60 bg-clip-text text-transparent">{title}</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.7 }} className="mt-6 text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl leading-relaxed">
          {subtitle || "Sistem penjemputan siswa modern yang mengutamakan keamanan, efisiensi, dan transparansi. Dirancang khusus untuk sekolah Indonesia."}
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-10 flex flex-col sm:flex-row gap-3">
          <a href="/register" className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-8 py-3.5 rounded-2xl font-semibold transition-all shadow-2xl shadow-violet-600/30 hover:shadow-violet-500/50 text-sm">
            <Zap className="h-4 w-4" /> Daftar Gratis Sekarang
          </a>
          <a href="#features" className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-3.5 rounded-2xl font-semibold transition-all text-sm">
            Lihat Fitur <ArrowDown className="h-4 w-4" />
          </a>
        </motion.div>

        {/* Stats bar */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 w-full max-w-3xl">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-violet-400 to-indigo-300 bg-clip-text text-transparent">{s.value}</div>
              <div className="text-xs text-slate-500 mt-1 font-medium">{s.label}</div>
            </div>
          ))}
        </motion.div>

        <div className="absolute bottom-8 animate-bounce">
          <ArrowDown className="h-5 w-5 text-slate-600" />
        </div>
      </section>

      {/* Feature Sections */}
      <div id="features">
        {SECTIONS.map((section, idx) => (
          <section key={section.id} className={`py-20 sm:py-32 px-4 relative ${idx % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
            <div className="max-w-7xl mx-auto">
              {/* Section header */}
              <motion.div custom={0} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} className="mb-12 sm:mb-16">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">0{idx + 1}</span>
                  <div className="h-px w-8 bg-slate-700" />
                  <span className={`text-[11px] font-bold uppercase tracking-[0.15em] bg-gradient-to-r ${section.gradient} bg-clip-text text-transparent`}>{section.badge}</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">{section.title}</h2>
                <p className="text-slate-400 mt-2 text-base sm:text-lg">{section.subtitle}</p>
              </motion.div>

              <div className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${idx % 2 === 1 ? "lg:[direction:rtl]" : ""}`}>
                {/* Image */}
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={scaleIn} className={`${idx % 2 === 1 ? "lg:[direction:ltr]" : ""}`}>
                  <div className={`relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl ${section.glow}`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${section.gradient} opacity-5`} />
                    <img src={section.image} alt={section.title} className="w-full h-auto relative z-10" loading="lazy" />
                  </div>
                </motion.div>

                {/* Content */}
                <motion.div custom={1} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className={`space-y-6 ${idx % 2 === 1 ? "lg:[direction:ltr]" : ""}`}>
                  <p className="text-slate-300 text-base sm:text-lg leading-relaxed">{section.desc}</p>
                  <div className="space-y-3">
                    {section.details.map((detail, i) => (
                      <motion.div key={i} custom={i + 2} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="flex gap-3 items-start">
                        <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-400" />
                        <span className="text-slate-400 text-sm leading-relaxed">{detail}</span>
                      </motion.div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Extra Features Grid */}
      <section className="py-20 sm:py-32 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/10 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-400 mb-4 block">Dan masih banyak lagi</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">Fitur Pendukung Premium</h2>
            <p className="mt-4 text-slate-400 max-w-xl mx-auto">Setiap fitur dirancang untuk menyempurnakan ekosistem penjemputan di sekolah Anda.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {EXTRA_FEATURES.map((f, i) => (
              <motion.div key={f.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-6 sm:p-8 transition-all duration-300">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <f.icon className={`h-8 w-8 ${f.color} mb-5 relative z-10`} />
                <h3 className="font-bold text-lg mb-2 relative z-10">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed relative z-10">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 sm:py-32 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">Mengapa Smart Pickup?</h2>
          </motion.div>

          <div className="space-y-6">
            {[
              { icon: Lock, title: "Keamanan Terjamin", desc: "Setiap penjemputan harus melalui verifikasi QR Code atau input NIS. Tidak ada siswa yang bisa dijemput tanpa proses verifikasi. Data terenkripsi dan tersimpan aman di cloud." },
              { icon: Smartphone, title: "Multi-Platform", desc: "Akses dari perangkat apa saja — smartphone, tablet, laptop, atau desktop. Tampilan responsif yang optimal di semua ukuran layar. Tidak perlu install aplikasi." },
              { icon: TrendingUp, title: "Skalabel & Fleksibel", desc: "Dari sekolah dengan 30 siswa hingga institusi dengan ribuan siswa. Sistem dirancang untuk tumbuh bersama sekolah Anda dengan paket langganan yang fleksibel." },
              { icon: Star, title: "Mudah Digunakan", desc: "Antarmuka intuitif yang bisa digunakan oleh siapa saja tanpa pelatihan khusus. Setup awal hanya membutuhkan beberapa menit — import data siswa, cetak kartu QR, dan sistem siap digunakan." },
            ].map((item, i) => (
              <motion.div key={item.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="flex gap-5 sm:gap-6 items-start bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 sm:p-8 hover:border-white/[0.12] transition-colors">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/20">
                  <item.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-32 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-violet-950/20 to-transparent pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="max-w-3xl mx-auto text-center relative z-10">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-violet-500/30">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Siap Tingkatkan Keamanan <br className="hidden sm:block" />Penjemputan Sekolah Anda?
          </h2>
          <p className="text-slate-400 text-base sm:text-lg mb-10 max-w-xl mx-auto">Bergabung sekarang dan rasakan kemudahan sistem penjemputan modern. Setup hanya 5 menit.</p>
          <a href="/register" className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-2xl shadow-violet-600/30 hover:shadow-violet-500/50 text-base">
            <Zap className="h-5 w-5" /> Daftar Gratis Sekarang
          </a>
          <p className="text-slate-600 text-xs mt-4">Tidak perlu kartu kredit • Setup instan • Batalkan kapan saja</p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-4 text-center">
        <p className="text-slate-600 text-xs">© {new Date().getFullYear()} Smart Pickup School System. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Presentation;
