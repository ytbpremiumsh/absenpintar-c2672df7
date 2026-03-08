import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowDown, Shield, QrCode, Monitor, Users, GraduationCap, BarChart3, Clock, Bell, Globe, FileText, Settings, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Navigate } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } }),
};

const SECTIONS = [
  {
    id: "dashboard",
    title: "Dashboard Utama",
    desc: "Pantau seluruh aktivitas penjemputan secara real-time dari satu halaman. Dashboard menampilkan ringkasan statistik harian: total siswa, jumlah yang sudah dijemput, yang masih menunggu, dan jumlah scan hari ini. Dilengkapi grafik aktivitas per jam dan chart status penjemputan untuk analisis cepat. Bagian bawah menampilkan log penjemputan terbaru lengkap dengan nama siswa, kelas, waktu, dan siapa yang menjemput.",
    image: "/images/presentation/dashboard.png",
    icon: BarChart3,
    color: "from-blue-500 to-indigo-600",
  },
  {
    id: "monitoring",
    title: "Monitoring Penjemputan",
    desc: "Halaman monitoring real-time yang menampilkan progress penjemputan per kelas secara detail. Setiap kelas ditampilkan dalam card terpisah lengkap dengan jumlah siswa, yang sudah dijemput, dan yang masih menunggu. Progress bar visual memudahkan identifikasi kelas mana yang belum dijemput. Terdapat fitur 'Pulangkan' untuk melakukan penjemputan manual langsung dari halaman ini, serta toggle Aktif/Nonaktif dan tombol Reset Harian.",
    image: "/images/presentation/monitoring.jpeg",
    icon: Monitor,
    color: "from-emerald-500 to-teal-600",
  },
  {
    id: "scan-qr",
    title: "Scan QR / Input NIS",
    desc: "Fitur inti sistem penjemputan — scan kartu QR siswa menggunakan kamera perangkat atau input NIS secara manual. Sistem akan langsung mengenali siswa, menampilkan detail lengkap, membunyikan suara pengumuman otomatis (Text-to-Speech), dan mencatat log penjemputan. Mendukung perangkat mobile dan desktop. Waktu penjemputan aktif ditampilkan di bagian atas agar staf sekolah selalu aware jam operasional.",
    image: "/images/presentation/scan-qr.jpeg",
    icon: QrCode,
    color: "from-violet-500 to-purple-600",
  },
  {
    id: "classes",
    title: "Manajemen Kelas",
    desc: "Kelola seluruh kelas dalam satu halaman yang terorganisir. Setiap card kelas menampilkan nama kelas, jumlah siswa, progress penjemputan harian, serta badge status (dijemput/menunggu). Terdapat statistik agregat di bagian atas: total kelas, total siswa, dijemput hari ini, dan belum dijemput. Admin dapat menambah kelas baru dengan mudah melalui tombol 'Tambah Kelas'.",
    image: "/images/presentation/classes.jpeg",
    icon: GraduationCap,
    color: "from-amber-500 to-orange-600",
  },
  {
    id: "students",
    title: "Data Siswa",
    desc: "Database siswa lengkap yang dikelompokkan per kelas dengan tampilan accordion yang rapi. Setiap siswa menampilkan nama, NIS, nama wali, dan nomor HP. Admin dapat mencari siswa, mengimpor data dari Excel, mengekspor data, menambah siswa baru, mengelola foto, melihat detail, mencetak kartu QR, atau menghapus data. Fitur 'Naik Kelas' memungkinkan perpindahan kelas massal di awal tahun ajaran.",
    image: "/images/presentation/students.jpeg",
    icon: Users,
    color: "from-cyan-500 to-blue-600",
  },
  {
    id: "parents",
    title: "Data Wali Murid",
    desc: "Tampilan khusus data wali/orang tua yang terdaftar dalam sistem. Setiap card wali menampilkan nama, nomor telepon, dan daftar anak beserta kelas mereka. Dilengkapi statistik ringkas (total wali, total siswa, jumlah kelas) dan fitur pencarian. Halaman ini memudahkan admin mengelola relasi antara wali dan siswa untuk keperluan notifikasi WhatsApp penjemputan.",
    image: "/images/presentation/parents.jpeg",
    icon: Users,
    color: "from-pink-500 to-rose-600",
  },
];

const EXTRA_FEATURES = [
  { icon: Globe, title: "Live Monitor Publik", desc: "Halaman publik yang bisa diakses wali tanpa login untuk memantau status penjemputan secara real-time." },
  { icon: Clock, title: "Riwayat Penjemputan", desc: "Log lengkap seluruh aktivitas penjemputan yang bisa difilter berdasarkan tanggal, kelas, dan siswa." },
  { icon: FileText, title: "Export Harian", desc: "Export laporan harian ke format Excel untuk dokumentasi dan pelaporan sekolah." },
  { icon: Bell, title: "Notifikasi WhatsApp", desc: "Kirim notifikasi otomatis ke wali murid saat anak dijemput melalui integrasi WhatsApp Gateway." },
  { icon: Shield, title: "Manajemen Langganan", desc: "Sistem paket berlangganan dengan berbagai level fitur dan batasan jumlah siswa." },
  { icon: Settings, title: "Pengaturan Sekolah", desc: "Konfigurasi jam operasional, logo sekolah, instruksi QR, dan integrasi pihak ketiga." },
];

const Presentation = () => {
  const [loading, setLoading] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [title, setTitle] = useState("Smart Pickup School System");
  const [subtitle, setSubtitle] = useState("");

  useEffect(() => {
    const fetch = async () => {
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
    fetch();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isPublic) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-x-hidden">
      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center relative px-4 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} className="mb-8">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center mx-auto shadow-2xl shadow-primary/30">
            <Shield className="h-10 w-10 text-white" />
          </div>
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }} className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-white via-blue-100 to-violet-200 bg-clip-text text-transparent">
          {title}
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.6 }} className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl">
          {subtitle}
        </motion.p>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="mt-16 animate-bounce">
          <ArrowDown className="h-6 w-6 text-slate-400" />
        </motion.div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent_70%)] pointer-events-none" />
      </section>

      {/* Feature Sections */}
      {SECTIONS.map((section, idx) => (
        <section key={section.id} className="py-16 sm:py-24 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div custom={0} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} className="mb-8 flex items-center gap-3">
              <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center shadow-lg shrink-0`}>
                <section.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">0{idx + 1}</span>
                <h2 className="text-2xl sm:text-3xl font-bold">{section.title}</h2>
              </div>
            </motion.div>
            <div className={`grid md:grid-cols-2 gap-8 items-center ${idx % 2 === 1 ? "md:flex-row-reverse" : ""}`}>
              <motion.div custom={1} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className={idx % 2 === 1 ? "md:order-2" : ""}>
                <p className="text-slate-300 text-base sm:text-lg leading-relaxed">{section.desc}</p>
              </motion.div>
              <motion.div custom={2} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className={`rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/40 ${idx % 2 === 1 ? "md:order-1" : ""}`}>
                <img src={section.image} alt={section.title} className="w-full h-auto" loading="lazy" />
              </motion.div>
            </div>
          </div>
        </section>
      ))}

      {/* Extra Features */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.h2 custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-2xl sm:text-3xl font-bold text-center mb-12">
            Fitur Lainnya
          </motion.h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {EXTRA_FEATURES.map((f, i) => (
              <motion.div key={f.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
                <f.icon className="h-8 w-8 text-primary mb-4" />
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 sm:py-24 px-4 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">Siap Menggunakan Smart Pickup?</h2>
          <p className="text-slate-400 mb-8">Daftarkan sekolah Anda sekarang dan nikmati kemudahan sistem penjemputan modern.</p>
          <a href="/register" className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-xl font-semibold transition-colors shadow-lg shadow-primary/30">
            Daftar Sekarang <ChevronRight className="h-4 w-4" />
          </a>
        </motion.div>
      </section>
    </div>
  );
};

export default Presentation;
