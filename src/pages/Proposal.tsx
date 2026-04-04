import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft, BookOpen, Target, TrendingUp, Users, DollarSign,
  Shield, Layers, Rocket, BarChart3, Globe, Building2, Zap,
  CheckCircle2, AlertTriangle, Star, ChevronRight, Smartphone,
  QrCode, Bell, FileCheck, UserCheck, Wifi, Heart, ShieldCheck,
  Clock, Eye, Download, Award, ClipboardList
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } })
};

const Section = ({ id, children, className = "" }: { id: string; children: React.ReactNode; className?: string }) => (
  <section id={id} className={`py-12 sm:py-16 ${className}`}>
    <div className="max-w-5xl mx-auto px-4 sm:px-6">{children}</div>
  </section>
);

const SectionTitle = ({ bab, title, icon: Icon }: { bab: string; title: string; icon: any }) => (
  <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
    className="mb-8 sm:mb-10">
    <div className="flex items-center gap-3 mb-2">
      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <span className="text-xs font-bold text-primary uppercase tracking-widest">{bab}</span>
    </div>
    <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{title}</h2>
    <div className="mt-3 h-1 w-16 rounded-full bg-gradient-to-r from-primary to-primary/40" />
  </motion.div>
);

const NAV = [
  { id: "bab1", label: "BAB I - Pendahuluan" },
  { id: "bab2", label: "BAB II - Strategi Usaha" },
  { id: "bab3", label: "BAB III - Produk" },
  { id: "bab4", label: "BAB IV - Organisasi" },
  { id: "bab5", label: "BAB V - Keuangan" },
  { id: "bab6", label: "BAB VI - Kesimpulan" },
  { id: "bab7", label: "BAB VII - Daftar Pustaka" },
  { id: "bab8", label: "BAB VIII - Lampiran" },
  { id: "kriteria", label: "Kriteria Penilaian" },
];

const BMC = {
  keyPartners: [
    "Sekolah dan Yayasan Pendidikan di seluruh Indonesia",
    "Penyedia WhatsApp API seperti Fonnte untuk pengiriman pesan otomatis",
    "Layanan cloud computing Supabase untuk penyimpanan data",
    "Dinas Pendidikan tingkat kabupaten, kota, dan provinsi",
  ],
  keyActivities: [
    "Mengembangkan dan memperbaiki fitur platform secara berkala",
    "Melakukan integrasi teknologi barcode dan pengenalan wajah (face recognition)",
    "Menjalankan pemasaran digital dan kunjungan langsung ke sekolah",
    "Memberikan pelatihan dan pendampingan kepada sekolah baru",
    "Mengelola server, keamanan data, dan layanan bantuan teknis",
  ],
  keyResources: [
    "Tim pengembang (developer) yang berpengalaman di bidang web dan mobile",
    "Server cloud yang bisa menampung banyak pengguna sekaligus",
    "Database berisi data siswa, guru, dan catatan absensi",
    "Sistem kecerdasan buatan untuk pengenalan wajah",
    "Tim customer success yang siap membantu sekolah",
  ],
  valueProposition: [
    "Absensi digital secara langsung (real-time) lewat scan barcode dan pengenalan wajah",
    "Orang tua langsung dapat notifikasi WhatsApp saat anak tiba di sekolah",
    "Dashboard untuk memantau kehadiran seluruh siswa dalam satu layar",
    "Laporan dan rekap otomatis: harian, mingguan, dan bulanan",
    "Menghemat waktu guru sampai 80% dibanding absensi manual",
    "Meningkatkan transparansi dan keamanan di lingkungan sekolah",
  ],
  customerRelationships: [
    "Pendampingan dan pelatihan gratis untuk sekolah baru",
    "Layanan bantuan lewat live chat dan tiket dukungan",
    "Program referral dan poin loyalitas untuk pengguna setia",
    "Komunitas sesama pengguna sekolah untuk berbagi pengalaman",
    "Update fitur baru secara berkala sesuai kebutuhan sekolah",
  ],
  channels: [
    "Website resmi dan halaman pendaftaran online",
    "Media sosial seperti Instagram, TikTok, dan YouTube",
    "Kunjungan langsung ke sekolah untuk demo produk",
    "Pemasaran lewat WhatsApp dan grup pendidikan",
    "Webinar edukasi bertema digitalisasi sekolah",
    "Program affiliate untuk menjangkau lebih banyak sekolah",
  ],
  customerSegments: [
    "Sekolah jenjang SD/MI, SMP/MTs, SMA/MA/SMK",
    "Sekolah swasta dan sekolah negeri",
    "Yayasan pendidikan yang punya banyak cabang",
    "Lembaga bimbingan belajar dan kursus",
    "Pondok pesantren modern",
  ],
  costStructure: [
    "Biaya sewa server dan layanan cloud setiap bulan",
    "Gaji tim pengembang, desainer, dan customer support",
    "Biaya pengiriman pesan WhatsApp lewat API",
    "Biaya pemasaran dan promosi untuk mendapatkan pelanggan baru",
    "Biaya operasional kantor dan kebutuhan sehari-hari",
  ],
  revenueStreams: [
    "Langganan bulanan paket SaaS (Basic, School, Premium)",
    "Jasa implementasi dan kustomisasi untuk sekolah besar",
    "Layanan tambahan WhatsApp (add-on pesan broadcast)",
    "White-labeling untuk yayasan yang ingin pakai brand sendiri",
  ],
};

const Proposal = () => {
  const [activeNav, setActiveNav] = useState("bab1");
  const contentRef = useRef<HTMLDivElement>(null);

  const scrollTo = (id: string) => {
    setActiveNav(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDownload = () => {
    if (!contentRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Proposal Bisnis ATSkolla</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.7; font-size: 14px; }
        h1 { text-align: center; font-size: 28px; margin-bottom: 8px; }
        h2 { font-size: 20px; margin-top: 32px; border-bottom: 2px solid #2563eb; padding-bottom: 6px; color: #2563eb; }
        h3 { font-size: 16px; margin-top: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
        th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
        th { background: #eff6ff; font-weight: 700; }
        ul { padding-left: 20px; }
        li { margin-bottom: 4px; }
        .cover-sub { text-align: center; color: #666; margin-bottom: 40px; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <h1>Proposal Rencana Bisnis</h1>
      <h1 style="color:#2563eb; margin-top:0;">ATSkolla</h1>
      <p class="cover-sub">Sistem Absensi Digital Sekolah Berbasis Barcode dan Face Recognition<br/>dengan Notifikasi WhatsApp Real-time</p>
      <hr/>
      
      <h2>BAB I - PENDAHULUAN</h2>
      <h3>1.1 Latar Belakang</h3>
      <p>Saat ini, sebagian besar sekolah di Indonesia masih menggunakan cara lama dalam mencatat kehadiran siswa, yaitu dengan buku absensi, lembar kertas, dan tanda tangan manual. Cara ini memakan waktu cukup lama, sekitar 15 sampai 30 menit untuk setiap kelas setiap harinya. Selain itu, cara manual juga sangat rentan terhadap kesalahan pencatatan, kehilangan data, bahkan manipulasi absensi oleh siswa.</p>
      <p>Di sisi lain, para orang tua juga memiliki kekhawatiran yang tinggi terhadap kehadiran dan keselamatan anak mereka di sekolah. Berdasarkan data Kemendikbud tahun 2024, lebih dari 72% wali murid menginginkan adanya pemberitahuan secara langsung (real-time) mengenai status kehadiran anak mereka. Sayangnya, sebagian besar sekolah belum punya sistem digital yang bisa mewujudkan hal tersebut.</p>
      <p>Berangkat dari permasalahan inilah, ATSkolla hadir sebagai solusi yang menyeluruh. ATSkolla adalah platform digital yang menggabungkan teknologi scan barcode, pengenalan wajah (face recognition), notifikasi otomatis lewat WhatsApp, dan dashboard pemantauan secara langsung. Dengan ATSkolla, proses absensi yang tadinya manual bisa berubah menjadi serba digital dan otomatis.</p>
      
      <h3>1.2 Deskripsi Usaha</h3>
      <p>ATSkolla adalah platform berbasis Software-as-a-Service (SaaS) yang menyediakan sistem absensi digital dan pemantauan kehadiran secara real-time untuk sekolah-sekolah di Indonesia. Platform ini berada di sektor EdTech (teknologi pendidikan) dan menggunakan model bisnis berlangganan (B2B). Target utama kami adalah sekolah mulai dari jenjang SD, SMP, hingga SMA/SMK, serta pesantren dan lembaga pendidikan lainnya.</p>
      
      <h3>1.3 Visi dan Misi Usaha</h3>
      <p><strong>Visi:</strong> Menjadi platform absensi digital yang paling banyak digunakan di sekolah-sekolah Indonesia, sehingga bisa membantu sekolah lebih modern, orang tua lebih tenang, dan siswa lebih aman.</p>
      <p><strong>Misi:</strong></p>
      <ul>
        <li>Menyediakan sistem absensi digital yang mudah digunakan dan harganya terjangkau untuk semua sekolah</li>
        <li>Menggunakan teknologi terbaru seperti AI dan barcode supaya data absensi lebih akurat</li>
        <li>Membangun komunikasi langsung antara sekolah dan orang tua lewat notifikasi WhatsApp otomatis</li>
        <li>Membantu sekolah dalam mendigitalisasi proses administrasi secara menyeluruh</li>
      </ul>
      
      <h3>1.4 Analisis Pasar</h3>
      <p>Indonesia memiliki lebih dari 436.000 sekolah dengan total sekitar 50 juta siswa yang tersebar di 34 provinsi. Dari jumlah tersebut, sekitar 85% sekolah masih menggunakan cara manual untuk absensi. Ini artinya peluang pasar untuk sistem absensi digital sangatlah besar.</p>
      <p>Target pasar utama kami adalah sekolah swasta yang memiliki 200 sampai 1.000 siswa dan sudah punya anggaran untuk digitalisasi. Target kedua adalah sekolah negeri unggulan dan pesantren modern yang ingin meningkatkan keamanan. Target ketiga adalah yayasan pendidikan yang punya banyak cabang dan butuh sistem pemantauan terpusat.</p>
      
      <h3>1.5 Analisis Kompetitor</h3>
      <p>Di pasar saat ini, sudah ada beberapa aplikasi absensi digital. Namun kebanyakan hanya menawarkan fitur dasar seperti scan barcode atau dashboard sederhana. ATSkolla berbeda karena menggabungkan barcode, pengenalan wajah AI, dan notifikasi WhatsApp otomatis dalam satu platform terpadu. Ditambah lagi, harga ATSkolla mulai dari Rp 99.000 per bulan saja, menjadikannya solusi paling lengkap sekaligus paling terjangkau di pasar EdTech Indonesia.</p>
      
      <h2>BAB II - STRATEGI USAHA</h2>
      <h3>2.1 Model Bisnis (Business Model Canvas)</h3>
      <p>Model bisnis ATSkolla dirancang agar setiap bagian saling mendukung. Mitra utama kami (Key Partners) yaitu sekolah dan penyedia API WhatsApp menyediakan jaringan dan infrastruktur. Aktivitas utama kami (Key Activities) meliputi pengembangan platform, integrasi teknologi, dan pemasaran. Semua ini menghasilkan nilai (Value Proposition) berupa sistem absensi digital yang lengkap dan mudah digunakan.</p>
      <p>Pendapatan (Revenue Streams) berasal dari langganan bulanan dengan 3 pilihan paket: Basic Rp 99.000, School Rp 249.000, dan Premium Rp 399.000. Ada juga pendapatan tambahan dari jasa kustomisasi untuk sekolah besar dan layanan white-labeling.</p>
      <p>Biaya operasional (Cost Structure) terdiri dari biaya server cloud sekitar 20%, gaji tim sekitar 40%, biaya WhatsApp API sekitar 15%, dan biaya pemasaran sekitar 25%. Dengan model SaaS ini, diperkirakan margin keuntungan kotor bisa mencapai 60-70% setelah tahun pertama beroperasi.</p>
      
      <h3>2.2 Rencana Pemasaran</h3>
      <p><strong>Strategi Mendapatkan Pelanggan:</strong></p>
      <ul>
        <li>Memberikan masa uji coba gratis selama 14 hari untuk sekolah yang baru mendaftar</li>
        <li>Melakukan demo langsung dan kunjungan ke sekolah-sekolah target</li>
        <li>Mengadakan webinar edukasi bertema "Digitalisasi Absensi di Era Modern"</li>
        <li>Bekerja sama dengan Dinas Pendidikan di berbagai daerah</li>
      </ul>
      <p><strong>Branding dan Promosi:</strong></p>
      <ul>
        <li>Membuat konten edukasi menarik di Instagram, TikTok, dan YouTube</li>
        <li>Menampilkan testimoni dari sekolah yang sudah menggunakan ATSkolla</li>
        <li>Menjalankan program referral: pengguna dapat poin setiap kali mengajak sekolah lain</li>
        <li>Membuka program affiliate untuk komunitas pendidikan dan individu</li>
      </ul>
      
      <h2>BAB III - PRODUK ATAU JASA</h2>
      <h3>3.1 Deskripsi Produk</h3>
      <p>ATSkolla menawarkan beberapa fitur utama yang saling melengkapi:</p>
      <ul>
        <li><strong>Scan Barcode:</strong> Siswa cukup menunjukkan kartu pelajar digital mereka, lalu guru atau petugas tinggal scan. Prosesnya kurang dari 2 detik per siswa.</li>
        <li><strong>Face Recognition AI:</strong> Untuk sekolah yang ingin keamanan lebih, tersedia fitur pengenalan wajah otomatis yang memverifikasi identitas siswa.</li>
        <li><strong>Notifikasi WhatsApp:</strong> Setiap kali siswa melakukan scan absensi, orang tua langsung menerima pemberitahuan lewat WhatsApp secara otomatis.</li>
        <li><strong>Dashboard Real-time:</strong> Kepala sekolah dan guru bisa memantau kehadiran seluruh siswa dalam satu tampilan yang mudah dibaca.</li>
        <li><strong>Laporan Otomatis:</strong> Sistem secara otomatis membuat rekap absensi harian, mingguan, dan bulanan yang siap dicetak atau diekspor.</li>
      </ul>
      
      <h3>3.2 Proses Pemberian Layanan</h3>
      <ol>
        <li><strong>Registrasi:</strong> Sekolah mendaftarkan akun dan memasukkan data siswa ke dalam sistem</li>
        <li><strong>Setup:</strong> Tim ATSkolla membantu sekolah mengatur barcode atau face recognition untuk setiap siswa</li>
        <li><strong>Operasional:</strong> Setiap hari, siswa melakukan scan absensi dan datanya langsung masuk ke dashboard</li>
        <li><strong>Notifikasi:</strong> Orang tua otomatis menerima kabar lewat WhatsApp setiap kali anak mereka absen</li>
        <li><strong>Monitoring:</strong> Sekolah bisa memantau dan mengunduh laporan kapan saja dan dari mana saja</li>
      </ol>
      
      <h3>3.3 Kualitas dan Pengendalian Kualitas</h3>
      <ul>
        <li><strong>Uptime 99,9%:</strong> Server kami menggunakan infrastruktur cloud dengan backup ganda sehingga sistem hampir tidak pernah mati</li>
        <li><strong>Kecepatan respon kurang dari 500ms:</strong> Proses scan dan pengiriman data sangat cepat sehingga tidak ada antrian</li>
        <li><strong>Data terenkripsi:</strong> Semua data siswa diamankan dengan enkripsi sehingga terjaga kerahasiaannya</li>
        <li><strong>Dukungan teknis 24/7:</strong> Tim kami siap membantu kapan saja lewat chat, tiket, atau WhatsApp</li>
      </ul>
      
      <h2>BAB IV - MANAJEMEN DAN ORGANISASI</h2>
      <h3>4.1 Struktur Organisasi</h3>
      <p>Struktur organisasi ATSkolla terdiri dari CEO/Founder yang bertanggung jawab atas strategi bisnis dan arah pengembangan produk. Di bawahnya ada tiga divisi utama: CTO (Chief Technology Officer) yang mengurus pengembangan teknologi, CMO (Chief Marketing Officer) yang menangani pemasaran dan penjualan, serta COO (Chief Operating Officer) yang mengelola operasional harian dan layanan pelanggan.</p>
      
      <h3>4.2 Tim Manajemen</h3>
      <p>Tim ATSkolla terdiri dari anak-anak muda yang punya semangat tinggi di bidang teknologi pendidikan. Anggota tim memiliki keahlian di berbagai bidang seperti pengembangan web (React, Node.js), desain antarmuka (UI/UX), pemasaran digital, dan pelayanan pelanggan. Dengan kombinasi keahlian ini, kami yakin bisa memberikan produk dan layanan terbaik untuk sekolah-sekolah di Indonesia.</p>
      
      <h2>BAB V - ANALISIS KEUANGAN</h2>
      <h3>5.1 Proyeksi Pendapatan dan Pengeluaran (2 Tahun)</h3>
      <table>
        <tr><th>Keterangan</th><th>Tahun 1</th><th>Tahun 2</th></tr>
        <tr><td>Jumlah Sekolah Berlangganan</td><td>50</td><td>200</td></tr>
        <tr><td>Pendapatan SaaS</td><td>Rp 120.000.000</td><td>Rp 600.000.000</td></tr>
        <tr><td>Pendapatan Enterprise</td><td>Rp 30.000.000</td><td>Rp 150.000.000</td></tr>
        <tr><td>Pendapatan Add-on</td><td>Rp 10.000.000</td><td>Rp 50.000.000</td></tr>
        <tr style="font-weight:bold"><td>Total Pendapatan</td><td>Rp 160.000.000</td><td>Rp 800.000.000</td></tr>
        <tr><td>Biaya Server dan Cloud</td><td>Rp 24.000.000</td><td>Rp 60.000.000</td></tr>
        <tr><td>Gaji Tim</td><td>Rp 72.000.000</td><td>Rp 180.000.000</td></tr>
        <tr><td>Marketing</td><td>Rp 30.000.000</td><td>Rp 80.000.000</td></tr>
        <tr><td>WhatsApp API</td><td>Rp 12.000.000</td><td>Rp 40.000.000</td></tr>
        <tr><td>Operasional Lain</td><td>Rp 10.000.000</td><td>Rp 20.000.000</td></tr>
        <tr style="font-weight:bold"><td>Total Pengeluaran</td><td>Rp 148.000.000</td><td>Rp 380.000.000</td></tr>
        <tr style="font-weight:bold; color:green"><td>Laba Bersih</td><td>Rp 12.000.000</td><td>Rp 420.000.000</td></tr>
      </table>
      
      <h3>5.2 Perencanaan Modal</h3>
      <p>Modal awal yang dibutuhkan adalah sebesar Rp 50.000.000 dengan pembagian sebagai berikut:</p>
      <ul>
        <li>Pengembangan Platform: Rp 20.000.000 (40%)</li>
        <li>Marketing dan Akuisisi Pelanggan: Rp 12.500.000 (25%)</li>
        <li>Infrastruktur Cloud untuk 6 bulan pertama: Rp 7.500.000 (15%)</li>
        <li>Operasional dan Dana Cadangan: Rp 10.000.000 (20%)</li>
      </ul>
      
      <h3>5.3 Analisis Risiko</h3>
      <table>
        <tr><th>Risiko</th><th>Tingkat</th><th>Cara Mengatasi</th></tr>
        <tr><td>Sekolah lambat dalam mengadopsi teknologi baru</td><td>Sedang</td><td>Memberikan uji coba gratis 14 hari, demo langsung, dan pendampingan penuh</td></tr>
        <tr><td>Gangguan teknis atau server mati</td><td>Rendah</td><td>Menggunakan server cloud dengan auto-scaling, backup harian, dan pemantauan 24 jam</td></tr>
        <tr><td>Munculnya kompetitor baru</td><td>Sedang</td><td>Terus berinovasi dengan fitur baru seperti Face AI, harga tetap kompetitif, dan memperkuat keunikan produk</td></tr>
        <tr><td>Ketergantungan pada WhatsApp API</td><td>Rendah</td><td>Menyiapkan jalur cadangan seperti SMS, email, dan push notification</td></tr>
      </table>
      
      <h2>BAB VI - KESIMPULAN</h2>
      <p>ATSkolla adalah solusi absensi digital yang dibuat untuk menjawab masalah nyata di dunia pendidikan Indonesia. Dengan menggabungkan teknologi scan barcode, pengenalan wajah AI, notifikasi WhatsApp otomatis, dan dashboard pemantauan langsung, ATSkolla menawarkan sistem yang lengkap dan mudah digunakan oleh sekolah mana pun.</p>
      <p>Melihat potensi pasar yang sangat besar yaitu lebih dari 436.000 sekolah, ditambah dengan model bisnis SaaS yang sudah terbukti bisa bertahan lama, serta keunggulan produk yang jelas dibanding kompetitor, kami yakin ATSkolla bisa menjadi salah satu pemain utama di industri EdTech Indonesia.</p>
      <p>Harapan kami, ATSkolla bukan cuma sekadar alat untuk absensi saja. Lebih dari itu, ATSkolla ingin menjadi bagian dari perubahan besar dalam dunia pendidikan Indonesia, di mana sekolah jadi lebih efisien, orang tua jadi lebih tenang, dan siswa jadi lebih aman.</p>
      
      <h2>BAB VII - DAFTAR PUSTAKA</h2>
      <ol>
        <li>Kementerian Pendidikan dan Kebudayaan. (2024). Data Referensi Pendidikan. https://referensi.data.kemdikbud.go.id</li>
        <li>Badan Pusat Statistik. (2024). Statistik Pendidikan Indonesia.</li>
        <li>Osterwalder, A., dan Pigneur, Y. (2010). Business Model Generation. John Wiley and Sons.</li>
        <li>McKinsey and Company. (2023). The State of EdTech in Southeast Asia.</li>
        <li>Fonnte. (2024). WhatsApp API Documentation. https://fonnte.com</li>
      </ol>
      
      <h2>BAB VIII - LAMPIRAN</h2>
      <p>Berikut adalah lampiran-lampiran yang bisa disertakan untuk melengkapi proposal ini:</p>
      <ol>
        <li>Tangkapan layar (screenshot) tampilan dashboard ATSkolla</li>
        <li>Contoh kartu pelajar digital dengan barcode</li>
        <li>Contoh notifikasi WhatsApp yang diterima oleh wali murid</li>
        <li>Sertifikat dan penghargaan yang dimiliki tim</li>
        <li>Surat kerja sama atau MoU dengan sekolah mitra</li>
        <li>Dokumentasi kegiatan demo dan pelatihan di sekolah</li>
      </ol>
      
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>
          <h1 className="text-sm font-bold text-foreground">Proposal Bisnis - ATSkolla</h1>
          <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Download
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* SIDEBAR */}
        <aside className="hidden lg:block w-64 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto border-r border-border p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Daftar Isi</p>
          <nav className="space-y-1">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => scrollTo(n.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeNav === n.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}>
                {n.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 min-w-0" ref={contentRef}>
          {/* COVER */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10 py-16 sm:py-24">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.08)_0%,transparent_50%)]" />
            <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-6">
                  <BookOpen className="h-3.5 w-3.5" /> Proposal Rencana Bisnis
                </div>
                <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-tight mb-4">
                  ATSkolla
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  Sistem Absensi Digital Sekolah Berbasis Barcode dan Face Recognition
                  dengan Notifikasi WhatsApp Real-time
                </p>
                <div className="mt-6">
                  <Button onClick={handleDownload} className="gap-2 gradient-primary hover:opacity-90">
                    <Download className="h-4 w-4" /> Download Proposal Lengkap
                  </Button>
                </div>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {["SaaS Platform", "Face AI", "WhatsApp API", "Real-time Dashboard"].map((t) => (
                    <span key={t} className="px-3 py-1 rounded-full bg-card border border-border text-xs font-medium text-foreground">
                      {t}
                    </span>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>

          {/* BAB I */}
          <Section id="bab1">
            <SectionTitle bab="BAB I" title="Pendahuluan" icon={BookOpen} />

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1} className="mb-10">
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="text-primary">1.1</span> Latar Belakang
              </h3>
              <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed space-y-3">
                <p>
                  Kalau kita lihat kondisi di lapangan, sebagian besar sekolah di Indonesia sampai sekarang 
                  masih pakai cara lama buat mencatat kehadiran siswa. Masih pakai buku absensi, lembar 
                  kertas, dan tanda tangan manual. Padahal, cara ini lumayan memakan waktu, bisa sekitar 
                  15 sampai 30 menit untuk satu kelas setiap harinya. Belum lagi risikonya: data bisa 
                  hilang, salah catat, atau bahkan dimanipulasi oleh siswa yang titip absen.
                </p>
                <p>
                  Di sisi lain, orang tua juga punya kekhawatiran sendiri. Mereka ingin tahu apakah anak 
                  mereka benar-benar sudah sampai di sekolah atau belum. Berdasarkan data dari Kemendikbud 
                  tahun 2024, lebih dari 72% wali murid menginginkan adanya pemberitahuan langsung soal 
                  kehadiran anak mereka. Tapi sayangnya, kebanyakan sekolah belum punya sistem digital 
                  yang bisa memberikan informasi itu secara real-time.
                </p>
                <p>
                  Nah, dari sinilah ide ATSkolla muncul. Kami ingin membuat sebuah platform yang bisa 
                  mengubah proses absensi yang tadinya ribet dan manual, jadi serba digital dan otomatis. 
                  ATSkolla menggabungkan teknologi scan barcode, pengenalan wajah (face recognition), 
                  notifikasi otomatis lewat WhatsApp, dan dashboard pemantauan langsung. Semua ini 
                  dirancang supaya sekolah bisa lebih efisien, dan orang tua bisa lebih tenang.
                </p>
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2} className="mb-10">
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="text-primary">1.2</span> Deskripsi Usaha
              </h3>
              <Card className="border-0 shadow-sm bg-card/50">
                <CardContent className="p-5 space-y-3 text-sm text-muted-foreground">
                  <p>
                    ATSkolla adalah platform digital berbasis SaaS (Software-as-a-Service) yang fokus 
                    menyediakan sistem absensi dan pemantauan kehadiran siswa secara real-time. 
                    Platform ini dibuat khusus untuk sekolah-sekolah di Indonesia yang ingin beralih 
                    dari cara manual ke cara digital yang lebih praktis dan akurat.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { label: "Sektor", value: "EdTech (Teknologi Pendidikan)" },
                      { label: "Model Bisnis", value: "SaaS Berlangganan (B2B)" },
                      { label: "Produk Utama", value: "Platform Absensi Digital Sekolah" },
                      { label: "Target Pasar", value: "Sekolah SD, SMP, SMA/SMK, Pesantren" },
                    ].map((item) => (
                      <div key={item.label} className="bg-muted/30 rounded-lg p-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{item.label}</p>
                        <p className="text-sm font-medium text-foreground mt-0.5">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={3} className="mb-10">
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="text-primary">1.3</span> Visi dan Misi Usaha
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Eye className="h-5 w-5 text-primary" />
                      <h4 className="font-bold text-foreground">Visi</h4>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Menjadi platform absensi digital yang paling banyak digunakan di sekolah-sekolah 
                      Indonesia, sehingga bisa membantu sekolah jadi lebih modern, orang tua lebih 
                      tenang, dan siswa lebih aman setiap harinya.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-accent/30 to-accent/10">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Rocket className="h-5 w-5 text-primary" />
                      <h4 className="font-bold text-foreground">Misi</h4>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      {[
                        "Menyediakan sistem absensi digital yang mudah digunakan dan harganya terjangkau untuk semua sekolah",
                        "Menggunakan teknologi terbaru seperti AI dan barcode supaya data absensi lebih akurat dan cepat",
                        "Membangun komunikasi langsung antara sekolah dan orang tua lewat notifikasi WhatsApp otomatis",
                        "Membantu sekolah dalam mendigitalisasi proses administrasi secara menyeluruh",
                      ].map((m, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={4} className="mb-10">
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="text-primary">1.4</span> Analisis Pasar
              </h3>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Indonesia punya lebih dari <strong className="text-foreground">436.000 sekolah</strong> dengan 
                  total sekitar <strong className="text-foreground">50 juta siswa</strong> yang tersebar di 34 
                  provinsi. Yang menarik, sekitar 85% dari sekolah-sekolah ini masih pakai cara manual buat absensi. 
                  Artinya, peluang pasar untuk sistem absensi digital itu sangat besar dan masih terbuka lebar.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: Building2, value: "436K+", label: "Total Sekolah", color: "text-emerald-500" },
                    { icon: Users, value: "50M+", label: "Total Siswa", color: "text-amber-500" },
                    { icon: Globe, value: "34", label: "Provinsi", color: "text-cyan-500" },
                    { icon: TrendingUp, value: "85%", label: "Masih Manual", color: "text-rose-500" },
                  ].map((stat, i) => (
                    <Card key={i} className="border-0 shadow-sm">
                      <CardContent className="p-4 text-center">
                        <stat.icon className={`h-6 w-6 mx-auto mb-2 ${stat.color}`} />
                        <p className="text-xl font-extrabold text-foreground">{stat.value}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    <h4 className="text-sm font-bold text-foreground">Siapa Saja Target Pasar Kita?</h4>
                    <div className="grid sm:grid-cols-3 gap-3">
                      {[
                        { title: "Target Utama", desc: "Sekolah swasta yang punya 200 sampai 1.000 siswa dan sudah punya anggaran untuk digitalisasi. Mereka biasanya lebih cepat dalam mengadopsi teknologi baru." },
                        { title: "Target Kedua", desc: "Sekolah negeri unggulan dan pesantren modern yang ingin meningkatkan keamanan dan transparansi dalam pengelolaan kehadiran siswa." },
                        { title: "Target Ketiga", desc: "Yayasan pendidikan yang mengelola banyak cabang sekolah dan membutuhkan sistem pemantauan terpusat dari satu tempat." },
                      ].map((seg) => (
                        <div key={seg.title} className="bg-muted/30 rounded-lg p-3">
                          <p className="text-xs font-bold text-primary mb-1">{seg.title}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{seg.desc}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={5}>
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="text-primary">1.5</span> Analisis Kompetitor
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-3 font-bold text-foreground rounded-tl-lg">Fitur</th>
                      <th className="text-center p-3 font-bold text-primary">ATSkolla</th>
                      <th className="text-center p-3 font-bold text-muted-foreground">Kompetitor A</th>
                      <th className="text-center p-3 font-bold text-muted-foreground rounded-tr-lg">Kompetitor B</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      ["Scan Barcode", true, true, false],
                      ["Face Recognition AI", true, false, false],
                      ["Notifikasi WhatsApp", true, false, true],
                      ["Dashboard Real-time", true, true, true],
                      ["Multi-cabang / Grup Sekolah", true, false, false],
                      ["Harga Mulai Rp 99.000", true, false, true],
                      ["White-labeling", true, false, false],
                    ].map(([fitur, a, b, c], i) => (
                      <tr key={i} className="hover:bg-muted/20 transition">
                        <td className="p-3 text-muted-foreground">{fitur as string}</td>
                        <td className="p-3 text-center">{a ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" /> : <span className="text-muted-foreground">-</span>}</td>
                        <td className="p-3 text-center">{b ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" /> : <span className="text-muted-foreground">-</span>}</td>
                        <td className="p-3 text-center">{c ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" /> : <span className="text-muted-foreground">-</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Card className="border-0 shadow-sm mt-4">
                <CardContent className="p-4">
                  <p className="text-xs font-bold text-foreground mb-1">Apa yang Membuat ATSkolla Berbeda? (Unique Selling Point)</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    ATSkolla jadi satu-satunya platform yang menggabungkan scan barcode, pengenalan wajah 
                    AI, dan notifikasi WhatsApp otomatis dalam satu sistem yang terpadu. Dengan harga mulai 
                    dari Rp 99.000 per bulan, ATSkolla menjadi solusi paling lengkap sekaligus paling 
                    terjangkau di pasar EdTech Indonesia saat ini.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </Section>

          {/* BAB II */}
          <Section id="bab2" className="bg-muted/20">
            <SectionTitle bab="BAB II" title="Strategi Usaha" icon={Target} />

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1} className="mb-10">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <span className="text-primary">2.1</span> Model Bisnis - Business Model Canvas
              </h3>

              {/* BMC VISUAL */}
              <div className="overflow-x-auto pb-4">
                <div className="min-w-[800px] grid grid-cols-10 grid-rows-[auto_auto_auto] gap-[2px] bg-border rounded-xl overflow-hidden text-[10px] sm:text-xs">
                  <BmcBlock title="Key Partners" items={BMC.keyPartners} icon={Building2} className="col-span-2 row-span-2 bg-rose-50 dark:bg-rose-950/30" color="text-rose-600 dark:text-rose-400" />
                  <BmcBlock title="Key Activities" items={BMC.keyActivities} icon={Zap} className="col-span-2 bg-amber-50 dark:bg-amber-950/30" color="text-amber-600 dark:text-amber-400" />
                  <BmcBlock title="Value Propositions" items={BMC.valueProposition} icon={Heart} className="col-span-2 row-span-2 bg-primary/5" color="text-primary" />
                  <BmcBlock title="Customer Relationships" items={BMC.customerRelationships} icon={Users} className="col-span-2 bg-cyan-50 dark:bg-cyan-950/30" color="text-cyan-600 dark:text-cyan-400" />
                  <BmcBlock title="Customer Segments" items={BMC.customerSegments} icon={Target} className="col-span-2 row-span-2 bg-violet-50 dark:bg-violet-950/30" color="text-violet-600 dark:text-violet-400" />
                  <BmcBlock title="Key Resources" items={BMC.keyResources} icon={Layers} className="col-span-2 bg-emerald-50 dark:bg-emerald-950/30" color="text-emerald-600 dark:text-emerald-400" />
                  <BmcBlock title="Channels" items={BMC.channels} icon={Globe} className="col-span-2 bg-indigo-50 dark:bg-indigo-950/30" color="text-indigo-600 dark:text-indigo-400" />
                  <BmcBlock title="Cost Structure" items={BMC.costStructure} icon={DollarSign} className="col-span-5 bg-red-50 dark:bg-red-950/30" color="text-red-600 dark:text-red-400" />
                  <BmcBlock title="Revenue Streams" items={BMC.revenueStreams} icon={TrendingUp} className="col-span-5 bg-green-50 dark:bg-green-950/30" color="text-green-600 dark:text-green-400" />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-5 space-y-3 text-sm text-muted-foreground leading-relaxed">
                    <p>
                      <strong className="text-foreground">Bagaimana semua bagian BMC ini saling berhubungan?</strong> Jadi 
                      begini, mitra utama kita (sekolah dan penyedia API WhatsApp) menyediakan jaringan dan infrastruktur 
                      yang kita butuhkan. Lalu, aktivitas utama kita yaitu mengembangkan platform, mengintegrasikan teknologi, 
                      dan melakukan pemasaran. Dari semua aktivitas ini, tercipta nilai (value proposition) berupa sistem 
                      absensi digital yang lengkap dan gampang dipakai. Nilai inilah yang kita sampaikan ke pelanggan 
                      lewat berbagai saluran seperti website, media sosial, dan kunjungan langsung ke sekolah.
                    </p>
                    <p>
                      <strong className="text-foreground">Dari mana pendapatannya?</strong> Pendapatan utama berasal dari 
                      langganan bulanan. Kita punya 3 pilihan paket: Basic seharga Rp 99.000, School seharga Rp 249.000, 
                      dan Premium seharga Rp 399.000 per bulan. Selain itu, ada juga pendapatan tambahan dari jasa 
                      kustomisasi untuk sekolah besar, layanan add-on WhatsApp, dan white-labeling untuk yayasan 
                      yang mau pakai brand sendiri.
                    </p>
                    <p>
                      <strong className="text-foreground">Bagaimana soal biaya operasional?</strong> Biaya utama terdiri dari 
                      infrastruktur cloud sekitar 20%, gaji tim pengembang dan support sekitar 40%, biaya WhatsApp 
                      API sekitar 15%, dan biaya pemasaran sekitar 25%. Dengan model bisnis SaaS seperti ini, 
                      diperkirakan margin keuntungan kotor bisa mencapai 60-70% setelah melewati tahun pertama.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}>
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <span className="text-primary">2.2</span> Rencana Pemasaran
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  {
                    title: "Strategi Mendapatkan Pelanggan",
                    icon: Target,
                    items: [
                      "Kasih kesempatan uji coba gratis selama 14 hari buat sekolah yang baru daftar, biar mereka bisa coba dulu tanpa risiko",
                      "Datang langsung ke sekolah buat demo produk secara tatap muka supaya pihak sekolah bisa lihat langsung manfaatnya",
                      "Adakan webinar edukasi online dengan tema seperti 'Digitalisasi Absensi di Era Modern' biar makin banyak sekolah yang tahu",
                      "Jalin kerja sama dengan Dinas Pendidikan di berbagai daerah supaya ATSkolla bisa direkomendasikan ke sekolah-sekolah",
                    ],
                  },
                  {
                    title: "Branding dan Promosi",
                    icon: Star,
                    items: [
                      "Buat konten edukasi yang menarik dan informatif di Instagram, TikTok, dan YouTube supaya makin banyak yang kenal ATSkolla",
                      "Tampilkan cerita dan testimoni dari sekolah yang sudah pakai ATSkolla, biar sekolah lain jadi tertarik",
                      "Jalankan program referral: setiap pengguna yang berhasil mengajak sekolah lain bergabung, dapat poin yang bisa ditukar hadiah",
                      "Buka program affiliate untuk komunitas pendidikan dan individu yang mau bantu promosikan ATSkolla",
                    ],
                  },
                ].map((strat) => (
                  <Card key={strat.title} className="border-0 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <strat.icon className="h-5 w-5 text-primary" />
                        <h4 className="font-bold text-foreground text-sm">{strat.title}</h4>
                      </div>
                      <ul className="space-y-2">
                        {strat.items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <ChevronRight className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          </Section>

          {/* BAB III */}
          <Section id="bab3">
            <SectionTitle bab="BAB III" title="Produk atau Jasa" icon={Layers} />

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1} className="mb-10">
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="text-primary">3.1</span> Deskripsi Produk
              </h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                ATSkolla menawarkan beberapa fitur utama yang saling melengkapi satu sama lain. 
                Setiap fitur dirancang supaya mudah dipakai oleh guru, staf sekolah, maupun orang tua 
                tanpa perlu keahlian teknis khusus.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { icon: QrCode, title: "Scan Barcode", desc: "Siswa cukup tunjukkan kartu pelajar digital, lalu guru tinggal scan. Prosesnya cepat banget, kurang dari 2 detik per siswa. Jadi tidak ada lagi antrian panjang saat jam masuk." },
                  { icon: UserCheck, title: "Face Recognition AI", desc: "Buat sekolah yang mau keamanan lebih, ada fitur pengenalan wajah otomatis. Jadi sistem bisa memverifikasi identitas siswa tanpa harus bawa kartu." },
                  { icon: Bell, title: "Notifikasi WhatsApp", desc: "Setiap kali siswa scan absensi, orang tua langsung dapat pemberitahuan lewat WhatsApp secara otomatis. Orang tua jadi tahu anaknya sudah sampai sekolah atau sudah pulang." },
                  { icon: BarChart3, title: "Dashboard Real-time", desc: "Kepala sekolah dan guru bisa memantau kehadiran seluruh siswa dalam satu layar. Datanya selalu terupdate secara langsung, jadi tidak perlu menunggu rekap manual." },
                  { icon: FileCheck, title: "Laporan Otomatis", desc: "Sistem secara otomatis membuat rekap absensi harian, mingguan, dan bulanan. Laporannya bisa langsung dicetak atau diekspor ke format Excel kapan saja." },
                  { icon: ShieldCheck, title: "Keamanan Data", desc: "Semua data siswa dan absensi diamankan dengan enkripsi. Hanya pihak sekolah yang berwenang yang bisa mengakses data tersebut." },
                ].map((f, i) => (
                  <Card key={i} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <f.icon className="h-8 w-8 text-primary mb-3" />
                      <h4 className="text-sm font-bold text-foreground mb-1">{f.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2} className="mb-10">
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="text-primary">3.2</span> Proses Pemberian Layanan
              </h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Berikut ini adalah alur bagaimana sekolah mulai menggunakan ATSkolla, dari awal 
                mendaftar sampai bisa memantau kehadiran siswa setiap hari:
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                {[
                  { step: "1", title: "Registrasi", desc: "Sekolah mendaftarkan akun dan memasukkan data siswa ke dalam sistem ATSkolla" },
                  { step: "2", title: "Setup", desc: "Tim kami bantu sekolah mengatur barcode atau face recognition untuk setiap siswa" },
                  { step: "3", title: "Operasional", desc: "Setiap hari, siswa tinggal scan absensi dan datanya langsung masuk ke dashboard" },
                  { step: "4", title: "Notifikasi", desc: "Orang tua otomatis dapat kabar lewat WhatsApp setiap kali anaknya melakukan absensi" },
                  { step: "5", title: "Monitoring", desc: "Sekolah bisa pantau dan download laporan kapan saja dan dari mana saja" },
                ].map((s, i) => (
                  <div key={i} className="flex-1 relative">
                    <Card className="border-0 shadow-sm h-full">
                      <CardContent className="p-4 text-center">
                        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mx-auto mb-2">
                          {s.step}
                        </div>
                        <h4 className="text-xs font-bold text-foreground mb-1">{s.title}</h4>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">{s.desc}</p>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={3}>
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="text-primary">3.3</span> Kualitas dan Pengendalian Kualitas
              </h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Kami sangat memperhatikan kualitas layanan supaya sekolah yang menggunakan ATSkolla 
                selalu mendapat pengalaman terbaik. Berikut adalah standar kualitas yang kami jaga:
              </p>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      { icon: ShieldCheck, title: "Server aktif 99,9% sepanjang waktu", desc: "Kami pakai infrastruktur cloud dengan backup ganda, jadi sistem hampir tidak pernah mati. Sekolah bisa pakai kapan saja tanpa khawatir." },
                      { icon: Wifi, title: "Kecepatan respon kurang dari 500ms", desc: "Proses scan dan pengiriman data sangat cepat, jadi tidak ada antrian saat jam masuk atau pulang sekolah." },
                      { icon: Shield, title: "Data siswa terenkripsi dan aman", desc: "Semua informasi siswa dilindungi dengan enkripsi tingkat tinggi. Hanya pihak yang berwenang yang bisa mengakses data." },
                      { icon: Smartphone, title: "Tim dukungan siap 24 jam setiap hari", desc: "Kalau ada masalah atau pertanyaan, tim kami siap bantu kapan saja lewat chat, tiket dukungan, atau WhatsApp." },
                    ].map((q, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <q.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{q.title}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{q.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </Section>

          {/* BAB IV */}
          <Section id="bab4" className="bg-muted/20">
            <SectionTitle bab="BAB IV" title="Manajemen dan Organisasi" icon={Users} />

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1} className="mb-10">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <span className="text-primary">4.1</span> Struktur Organisasi
              </h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Struktur organisasi ATSkolla dibuat sederhana tapi efektif. Di puncak ada CEO/Founder 
                yang bertanggung jawab atas arah bisnis dan pengembangan produk. Di bawahnya ada tiga 
                divisi utama yang masing-masing punya peran penting:
              </p>
              <div className="flex flex-col items-center">
                <OrgCard title="CEO / Founder" name="[Nama Founder]" desc="Bertanggung jawab atas strategi bisnis dan arah pengembangan produk" color="bg-primary" />
                <div className="h-6 w-px bg-border" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
                  <OrgCard title="CTO" name="[Nama CTO]" desc="Mengurus pengembangan teknologi, server, dan keamanan sistem" color="bg-cyan-500" />
                  <OrgCard title="CMO" name="[Nama CMO]" desc="Menangani pemasaran, penjualan, dan menarik pelanggan baru" color="bg-amber-500" />
                  <OrgCard title="COO" name="[Nama COO]" desc="Mengelola operasional harian, layanan pelanggan, dan pelatihan" color="bg-emerald-500" />
                </div>
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}>
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <span className="text-primary">4.2</span> Tim Manajemen
              </h3>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    Tim ATSkolla terdiri dari anak-anak muda yang punya semangat tinggi di bidang teknologi 
                    dan pendidikan. Meskipun tim kami masih kecil, tapi setiap orang punya keahlian yang 
                    saling melengkapi. Dengan kombinasi keahlian ini, kami yakin bisa terus mengembangkan 
                    ATSkolla jadi platform yang semakin baik dan bermanfaat buat banyak sekolah.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { role: "Full-Stack Developer", count: "2 orang", skill: "Ahli di bidang React, Node.js, dan Supabase untuk membangun dan merawat platform" },
                      { role: "UI/UX Designer", count: "1 orang", skill: "Mendesain tampilan yang mudah dipahami dan nyaman dipakai oleh pengguna" },
                      { role: "Sales dan Marketing", count: "2 orang", skill: "Menjalankan pemasaran digital dan kunjungan langsung ke sekolah" },
                      { role: "Customer Success", count: "1 orang", skill: "Mendampingi sekolah baru mulai dari pelatihan sampai bisa mandiri" },
                    ].map((member) => (
                      <div key={member.role} className="bg-muted/30 rounded-lg p-3">
                        <p className="text-sm font-bold text-foreground">{member.role}</p>
                        <p className="text-xs text-primary font-medium">{member.count}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{member.skill}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </Section>

          {/* BAB V */}
          <Section id="bab5">
            <SectionTitle bab="BAB V" title="Analisis Keuangan" icon={DollarSign} />

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1} className="mb-10">
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="text-primary">5.1</span> Proyeksi Pendapatan dan Pengeluaran (2 Tahun)
              </h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Berikut ini adalah perkiraan pendapatan dan pengeluaran ATSkolla selama dua tahun ke 
                depan. Angka-angka ini berdasarkan asumsi bahwa kita berhasil mendapat 50 sekolah di 
                tahun pertama dan 200 sekolah di tahun kedua.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-3 font-bold text-foreground rounded-tl-lg">Keterangan</th>
                      <th className="text-right p-3 font-bold text-foreground">Tahun 1</th>
                      <th className="text-right p-3 font-bold text-foreground rounded-tr-lg">Tahun 2</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      ["Jumlah Sekolah Berlangganan", "50", "200"],
                      ["Pendapatan dari Langganan SaaS", "Rp 120.000.000", "Rp 600.000.000"],
                      ["Pendapatan dari Jasa Enterprise", "Rp 30.000.000", "Rp 150.000.000"],
                      ["Pendapatan dari Layanan Add-on", "Rp 10.000.000", "Rp 50.000.000"],
                      ["Total Pendapatan", "Rp 160.000.000", "Rp 800.000.000"],
                      ["", "", ""],
                      ["Biaya Server dan Cloud", "Rp 24.000.000", "Rp 60.000.000"],
                      ["Gaji Tim", "Rp 72.000.000", "Rp 180.000.000"],
                      ["Biaya Marketing", "Rp 30.000.000", "Rp 80.000.000"],
                      ["Biaya WhatsApp API", "Rp 12.000.000", "Rp 40.000.000"],
                      ["Operasional Lainnya", "Rp 10.000.000", "Rp 20.000.000"],
                      ["Total Pengeluaran", "Rp 148.000.000", "Rp 380.000.000"],
                      ["", "", ""],
                      ["Laba Bersih", "Rp 12.000.000", "Rp 420.000.000"],
                    ].map(([label, y1, y2], i) => (
                      label === "" ? <tr key={i}><td colSpan={3} className="h-2" /></tr> :
                      <tr key={i} className={`hover:bg-muted/20 transition ${label.includes("Total") || label.includes("Laba") ? "font-bold" : ""}`}>
                        <td className={`p-3 ${label.includes("Laba") ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>{label}</td>
                        <td className={`p-3 text-right ${label.includes("Laba") ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>{y1}</td>
                        <td className={`p-3 text-right ${label.includes("Laba") ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>{y2}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2} className="mb-10">
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="text-primary">5.2</span> Perencanaan Modal
              </h3>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Untuk memulai bisnis ini, kami membutuhkan modal awal sebesar 
                    <strong className="text-foreground"> Rp 50.000.000</strong>. Dana ini akan 
                    dialokasikan ke beberapa kebutuhan utama berikut:
                  </p>
                  <div className="space-y-2">
                    {[
                      { label: "Pengembangan Platform", pct: 40, amount: "Rp 20.000.000", desc: "Untuk biaya pengembangan fitur-fitur utama platform" },
                      { label: "Marketing dan Akuisisi Pelanggan", pct: 25, amount: "Rp 12.500.000", desc: "Untuk biaya promosi dan mendapatkan pelanggan baru" },
                      { label: "Infrastruktur Cloud (6 bulan pertama)", pct: 15, amount: "Rp 7.500.000", desc: "Untuk sewa server dan layanan cloud" },
                      { label: "Operasional dan Dana Cadangan", pct: 20, amount: "Rp 10.000.000", desc: "Untuk kebutuhan operasional dan dana darurat" },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium text-foreground">{item.amount} ({item.pct}%)</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${item.pct}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={3}>
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="text-primary">5.3</span> Analisis Risiko
              </h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Setiap bisnis pasti punya risiko. Yang penting adalah kita sudah memikirkan cara 
                untuk mengatasinya dari awal. Berikut adalah risiko-risiko yang mungkin terjadi 
                beserta rencana penanganannya:
              </p>
              <div className="space-y-3">
                {[
                  {
                    risk: "Sekolah lambat dalam mengadopsi teknologi baru",
                    level: "Sedang",
                    mitigation: "Kami siapkan uji coba gratis 14 hari supaya sekolah bisa coba dulu tanpa risiko. Selain itu, tim kami juga akan datang langsung untuk demo dan mendampingi proses awal sampai sekolah terbiasa.",
                  },
                  {
                    risk: "Gangguan teknis atau server mati (downtime)",
                    level: "Rendah",
                    mitigation: "Kami pakai server cloud yang punya kemampuan auto-scaling dan backup harian. Selain itu, ada tim yang memantau performa server selama 24 jam penuh, jadi kalau ada masalah bisa langsung ditangani.",
                  },
                  {
                    risk: "Munculnya kompetitor baru dengan produk serupa",
                    level: "Sedang",
                    mitigation: "Kami terus berinovasi dengan menambahkan fitur-fitur baru yang belum ada di kompetitor, seperti Face AI. Harga juga tetap kami jaga supaya kompetitif dan terjangkau oleh semua sekolah.",
                  },
                  {
                    risk: "Ketergantungan pada penyedia WhatsApp API",
                    level: "Rendah",
                    mitigation: "Selain WhatsApp, kami juga menyiapkan jalur komunikasi cadangan seperti SMS, email, dan push notification. Jadi kalau ada gangguan di satu jalur, notifikasi tetap bisa terkirim lewat jalur lain.",
                  },
                ].map((r, i) => (
                  <Card key={i} className="border-0 shadow-sm">
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="flex items-center gap-2 shrink-0">
                        <AlertTriangle className={`h-4 w-4 ${r.level === "Rendah" ? "text-emerald-500" : "text-amber-500"}`} />
                        <div>
                          <p className="text-sm font-bold text-foreground">{r.risk}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.level === "Rendah" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}>{r.level}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground flex-1 leading-relaxed">
                        <strong>Cara mengatasinya:</strong> {r.mitigation}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          </Section>

          {/* BAB VI */}
          <Section id="bab6" className="bg-muted/20">
            <SectionTitle bab="BAB VI" title="Kesimpulan" icon={CheckCircle2} />
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6 space-y-4 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    ATSkolla adalah solusi absensi digital yang dibuat untuk menjawab masalah nyata 
                    di dunia pendidikan Indonesia. Dengan menggabungkan teknologi scan barcode, pengenalan 
                    wajah AI, notifikasi WhatsApp otomatis, dan dashboard pemantauan langsung, ATSkolla 
                    menawarkan sistem yang lengkap dan mudah digunakan oleh sekolah mana pun.
                  </p>
                  <p>
                    Kalau kita lihat dari sisi pasar, potensinya sangat besar. Ada lebih dari 436.000 
                    sekolah di Indonesia dan 85% di antaranya masih pakai cara manual. Dengan model bisnis 
                    SaaS yang sudah terbukti bisa bertahan lama, ditambah dengan keunggulan produk yang 
                    jelas dibanding kompetitor, kami yakin ATSkolla bisa menjadi salah satu pemain utama 
                    di industri EdTech Indonesia.
                  </p>
                  <p>
                    Harapan kami, ATSkolla bukan cuma sekadar alat untuk absensi saja. Lebih dari itu, 
                    kami ingin ATSkolla jadi bagian dari perubahan besar dalam dunia pendidikan Indonesia. 
                    Sekolah jadi lebih efisien dalam mengelola administrasi, orang tua jadi lebih tenang 
                    karena selalu dapat kabar tentang anaknya, dan siswa jadi lebih aman karena semua 
                    proses tercatat secara digital.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </Section>

          {/* BAB VII */}
          <Section id="bab7">
            <SectionTitle bab="BAB VII" title="Daftar Pustaka" icon={BookOpen} />
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5 space-y-2 text-xs text-muted-foreground">
                  {[
                    "Kementerian Pendidikan dan Kebudayaan. (2024). Data Referensi Pendidikan. https://referensi.data.kemdikbud.go.id",
                    "Badan Pusat Statistik. (2024). Statistik Pendidikan Indonesia.",
                    "Osterwalder, A., dan Pigneur, Y. (2010). Business Model Generation. John Wiley and Sons.",
                    "McKinsey and Company. (2023). The State of EdTech in Southeast Asia.",
                    "Fonnte. (2024). WhatsApp API Documentation. https://fonnte.com",
                  ].map((ref, i) => (
                    <p key={i} className="pl-6 -indent-6">[{i + 1}] {ref}</p>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </Section>

          {/* BAB VIII */}
          <Section id="bab8" className="bg-muted/20">
            <SectionTitle bab="BAB VIII" title="Lampiran" icon={FileCheck} />
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5 space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>Berikut adalah lampiran-lampiran yang bisa disertakan untuk melengkapi proposal ini:</p>
                  <ul className="space-y-2">
                    {[
                      "Tangkapan layar (screenshot) tampilan dashboard ATSkolla",
                      "Contoh kartu pelajar digital yang dilengkapi dengan barcode",
                      "Contoh notifikasi WhatsApp yang diterima oleh wali murid",
                      "Sertifikat dan penghargaan yang dimiliki oleh tim",
                      "Surat kerja sama atau MoU dengan sekolah mitra",
                      "Dokumentasi kegiatan demo dan pelatihan di sekolah",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary font-bold text-xs">{i + 1}.</span>
                        <span className="text-xs">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </Section>

          {/* KRITERIA PENILAIAN */}
          <Section id="kriteria">
            <SectionTitle bab="LAMPIRAN" title="Kriteria Penilaian" icon={Award} />

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1} className="mb-10">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                1. Kriteria Penilaian Karya Proposal dan Business Model Canvas
              </h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary/5">
                      <TableHead className="font-bold text-foreground w-12">No</TableHead>
                      <TableHead className="font-bold text-foreground" colSpan={2}>Kriteria</TableHead>
                      <TableHead className="font-bold text-foreground text-center w-24">Bobot</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell rowSpan={2} className="font-bold text-foreground align-top">1</TableCell>
                      <TableCell className="font-semibold text-foreground align-top" rowSpan={2}>Kreativitas</TableCell>
                      <TableCell className="text-muted-foreground">Gagasan (Unik dan Bermanfaat)</TableCell>
                      <TableCell className="text-center font-semibold">20%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground">Keunggulan produk/jasa</TableCell>
                      <TableCell className="text-center font-semibold">15%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell rowSpan={2} className="font-bold text-foreground align-top">2</TableCell>
                      <TableCell className="font-semibold text-foreground align-top" rowSpan={2}>Potensi Program</TableCell>
                      <TableCell className="text-muted-foreground">Kelayakan Usaha</TableCell>
                      <TableCell className="text-center font-semibold">25%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground">Potensi Perolehan Profit</TableCell>
                      <TableCell className="text-center font-semibold">20%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-bold text-foreground">3</TableCell>
                      <TableCell className="font-semibold text-foreground">Kelayakan Anggaran</TableCell>
                      <TableCell className="text-muted-foreground">Penyusunan Anggaran Biaya</TableCell>
                      <TableCell className="text-center font-semibold">20%</TableCell>
                    </TableRow>
                    <TableRow className="bg-primary/5">
                      <TableCell colSpan={3} className="font-bold text-foreground text-right">Total</TableCell>
                      <TableCell className="text-center font-bold text-primary text-lg">100%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2} className="pb-10">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                2. Kriteria Perilaku Presentasi
              </h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary/5">
                      <TableHead className="font-bold text-foreground w-12">No</TableHead>
                      <TableHead className="font-bold text-foreground" colSpan={2}>Kriteria</TableHead>
                      <TableHead className="font-bold text-foreground text-center w-24">Bobot</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell rowSpan={3} className="font-bold text-foreground align-top">1</TableCell>
                      <TableCell className="font-semibold text-foreground align-top" rowSpan={3}>Kreativitas</TableCell>
                      <TableCell className="text-muted-foreground">Gagasan Usaha (analisis peluang pasar, dukungan sumber daya yang dimiliki)</TableCell>
                      <TableCell className="text-center font-semibold">15%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground">Keunggulan Produk (berbasis IPTEK, unik, dan bermanfaat)</TableCell>
                      <TableCell className="text-center font-semibold">20%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground">Rancangan Usaha</TableCell>
                      <TableCell className="text-center font-semibold">20%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell rowSpan={2} className="font-bold text-foreground align-top">2</TableCell>
                      <TableCell className="font-semibold text-foreground align-top" rowSpan={2}>Potensi Program</TableCell>
                      <TableCell className="text-muted-foreground">Potensi Pelaksanaan dan Perolehan Profit</TableCell>
                      <TableCell className="text-center font-semibold">20%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground">Potensi Keberlanjutan Usaha</TableCell>
                      <TableCell className="text-center font-semibold">15%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-bold text-foreground">3</TableCell>
                      <TableCell className="font-semibold text-foreground">Penjadwalan Kegiatan dan Personalia</TableCell>
                      <TableCell className="text-muted-foreground">Lengkap, Jelas, Waktu, dan Personalianya Sesuai</TableCell>
                      <TableCell className="text-center font-semibold">5%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-bold text-foreground">4</TableCell>
                      <TableCell className="font-semibold text-foreground">Penyusunan Anggaran Biaya</TableCell>
                      <TableCell className="text-muted-foreground">Lengkap, Rinci, Wajar, dan Jelas Peruntukannya</TableCell>
                      <TableCell className="text-center font-semibold">5%</TableCell>
                    </TableRow>
                    <TableRow className="bg-primary/5">
                      <TableCell colSpan={3} className="font-bold text-foreground text-right">Total</TableCell>
                      <TableCell className="text-center font-bold text-primary text-lg">100%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </motion.div>
          </Section>
        </main>
      </div>
    </div>
  );
};

const BmcBlock = ({ title, items, icon: Icon, className, color }: {
  title: string; items: string[]; icon: any; className: string; color: string;
}) => (
  <div className={`p-3 sm:p-4 ${className}`}>
    <div className="flex items-center gap-1.5 mb-2">
      <Icon className={`h-3.5 w-3.5 ${color}`} />
      <h4 className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${color}`}>{title}</h4>
    </div>
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="text-[9px] sm:text-[10px] text-muted-foreground leading-snug flex items-start gap-1">
          <span className={`mt-1 h-1 w-1 rounded-full shrink-0 ${color.replace("text-", "bg-")}`} />
          {item}
        </li>
      ))}
    </ul>
  </div>
);

const OrgCard = ({ title, name, desc, color }: { title: string; name: string; desc: string; color: string }) => (
  <Card className="border-0 shadow-sm">
    <CardContent className="p-4 text-center">
      <div className={`h-10 w-10 rounded-full ${color} text-white text-xs font-bold flex items-center justify-center mx-auto mb-2`}>
        {title.split(" ")[0].charAt(0)}
      </div>
      <p className="text-xs font-bold text-foreground">{title}</p>
      <p className="text-[10px] text-primary font-medium">{name}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{desc}</p>
    </CardContent>
  </Card>
);

export default Proposal;
