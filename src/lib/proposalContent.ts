// Shared proposal HTML content for download (Word & PDF)
export const getProposalHTML = () => `
<html><head><title>Proposal Bisnis ATSkolla</title>
<style>
  body { font-family: 'Times New Roman', Times, serif; padding: 40px 60px; color: #1a1a1a; line-height: 1.8; font-size: 13pt; }
  h1 { text-align: center; font-size: 18pt; margin-bottom: 4px; }
  h2 { font-size: 14pt; margin-top: 28px; border-bottom: 2px solid #2563eb; padding-bottom: 6px; color: #2563eb; page-break-after: avoid; }
  h3 { font-size: 12pt; margin-top: 18px; page-break-after: avoid; }
  table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 11pt; }
  th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
  th { background: #eff6ff; font-weight: 700; }
  ul, ol { padding-left: 24px; }
  li { margin-bottom: 4px; }
  .cover-sub { text-align: center; color: #555; margin-bottom: 40px; font-style: italic; }
  p { text-align: justify; }
  .section-header { background: #eff6ff; font-weight: bold; }
  .total-row-green { font-weight: bold; background: #dcfce7; }
  .total-row-red { font-weight: bold; background: #fef2f2; }
  .subtotal { font-weight: bold; }
  @media print { body { padding: 20px 40px; } }
  @page { margin: 2.5cm; }
</style></head><body>
<h1>PROPOSAL RENCANA BISNIS</h1>
<h1 style="color:#2563eb; margin-top:0;">ATSkolla</h1>
<p class="cover-sub">Sistem Absensi Digital Sekolah Berbasis Barcode dan Face Recognition<br/>dengan Notifikasi WhatsApp Secara Real-time</p>
<hr/>

<h2>BAB I - PENDAHULUAN</h2>
<h3>1.1 Latar Belakang</h3>
<p>Pada saat ini, sebagian besar sekolah di Indonesia masih menerapkan metode konvensional dalam pencatatan kehadiran siswa, yakni melalui buku absensi, lembar kertas, dan tanda tangan manual. Metode tersebut memerlukan waktu yang cukup lama, yaitu sekitar 15 hingga 30 menit untuk setiap kelas dalam satu hari. Selain itu, metode manual sangat rentan terhadap kesalahan pencatatan, kehilangan data, serta potensi manipulasi kehadiran oleh siswa.</p>
<p>Di sisi lain, para orang tua dan wali murid memiliki kekhawatiran yang cukup tinggi terhadap kehadiran dan keselamatan anak mereka selama berada di lingkungan sekolah. Berdasarkan data yang dirilis oleh Kementerian Pendidikan dan Kebudayaan pada tahun 2024, lebih dari 72% wali murid menghendaki adanya sistem pemberitahuan secara langsung (real-time) mengenai status kehadiran anak mereka. Namun demikian, sebagian besar sekolah belum memiliki infrastruktur digital yang memadai untuk mewujudkan hal tersebut.</p>
<p>Bertolak dari permasalahan tersebut, ATSkolla hadir sebagai solusi yang bersifat menyeluruh dan terintegrasi. ATSkolla merupakan platform digital yang memadukan teknologi pemindaian barcode, pengenalan wajah (face recognition) berbasis kecerdasan buatan, notifikasi otomatis melalui WhatsApp, serta dashboard pemantauan kehadiran secara langsung. Melalui ATSkolla, proses pencatatan kehadiran yang sebelumnya dilakukan secara manual dapat bertransformasi menjadi sistem yang sepenuhnya digital dan otomatis, sehingga meningkatkan efisiensi, akurasi, dan transparansi dalam pengelolaan kehadiran siswa.</p>

<h3>1.2 Deskripsi Usaha</h3>
<p>ATSkolla merupakan platform berbasis Software-as-a-Service (SaaS) yang menyediakan sistem pencatatan kehadiran digital dan pemantauan secara real-time bagi institusi pendidikan di Indonesia. Platform ini bergerak di sektor EdTech (Education Technology) dengan mengadopsi model bisnis berlangganan yang bersifat Business-to-Business (B2B). Sasaran utama layanan ATSkolla meliputi sekolah pada jenjang SD/MI, SMP/MTs, SMA/MA/SMK, pondok pesantren, serta lembaga pendidikan lainnya yang memerlukan sistem pencatatan kehadiran yang modern dan efisien.</p>

<h3>1.3 Visi dan Misi Usaha</h3>
<p><strong>Visi:</strong> Menjadi platform pencatatan kehadiran digital terdepan yang digunakan secara luas oleh institusi pendidikan di Indonesia, sehingga mampu mendorong modernisasi administrasi sekolah, memberikan ketenangan bagi orang tua, serta meningkatkan keamanan bagi siswa.</p>
<p><strong>Misi:</strong></p>
<ul>
  <li>Menyediakan sistem pencatatan kehadiran digital yang mudah dioperasikan dengan harga yang terjangkau bagi seluruh jenjang pendidikan.</li>
  <li>Mengimplementasikan teknologi mutakhir seperti kecerdasan buatan (AI) dan pemindaian barcode guna meningkatkan akurasi dan kecepatan pencatatan data kehadiran.</li>
  <li>Membangun saluran komunikasi langsung antara pihak sekolah dan orang tua melalui notifikasi WhatsApp secara otomatis.</li>
  <li>Mendukung proses digitalisasi administrasi sekolah secara menyeluruh dan berkelanjutan.</li>
</ul>

<h3>1.4 Analisis Pasar</h3>
<p>Indonesia memiliki lebih dari 436.000 sekolah dengan jumlah siswa mencapai sekitar 50 juta yang tersebar di 34 provinsi. Dari jumlah tersebut, diperkirakan sekitar 85% sekolah masih menggunakan metode pencatatan kehadiran secara manual. Kondisi ini menunjukkan bahwa peluang pasar untuk sistem pencatatan kehadiran digital di Indonesia sangatlah besar dan masih terbuka lebar untuk digarap.</p>
<p>Sasaran pasar utama ATSkolla adalah sekolah swasta yang memiliki jumlah siswa antara 200 hingga 1.000 orang dan telah mengalokasikan anggaran untuk digitalisasi. Sasaran kedua adalah sekolah negeri unggulan serta pondok pesantren modern yang menghendaki peningkatan keamanan dan transparansi. Sasaran ketiga adalah yayasan pendidikan yang mengelola beberapa cabang sekolah dan membutuhkan sistem pemantauan terpusat.</p>

<h3>1.5 Analisis Kompetitor</h3>
<p>Dalam lanskap pasar saat ini, telah terdapat beberapa aplikasi pencatatan kehadiran digital. Namun demikian, sebagian besar aplikasi tersebut hanya menawarkan fitur dasar seperti pemindaian barcode atau dashboard sederhana. ATSkolla memiliki keunggulan kompetitif yang signifikan karena mampu mengintegrasikan teknologi pemindaian barcode, pengenalan wajah berbasis kecerdasan buatan, serta notifikasi WhatsApp otomatis dalam satu platform yang terpadu. Dengan harga berlangganan mulai dari Rp 99.000 per bulan, ATSkolla menjadi solusi yang paling komprehensif sekaligus paling terjangkau di segmen pasar EdTech Indonesia.</p>

<h2>BAB II - STRATEGI USAHA</h2>
<h3>2.1 Model Bisnis (Business Model Canvas)</h3>
<p>Model bisnis ATSkolla dirancang dengan pendekatan sistematis di mana setiap elemen saling mendukung dan berkaitan. Mitra utama (Key Partners) yang terdiri dari sekolah, yayasan pendidikan, dan penyedia layanan API WhatsApp menyediakan jaringan distribusi dan infrastruktur teknologi yang diperlukan. Aktivitas utama (Key Activities) mencakup pengembangan platform, integrasi teknologi, serta pelaksanaan strategi pemasaran. Keseluruhan aktivitas tersebut menghasilkan proposisi nilai (Value Proposition) berupa sistem pencatatan kehadiran digital yang komprehensif, akurat, dan mudah digunakan.</p>
<p>Arus pendapatan (Revenue Streams) bersumber dari tiga pilihan paket berlangganan bulanan, yaitu: paket Basic seharga Rp 99.000, paket School seharga Rp 249.000, dan paket Premium seharga Rp 399.000. Selain itu, terdapat pendapatan tambahan dari jasa enterprise (pelatihan &amp; onboarding intensif), serta layanan add-on berupa kuota tambahan WhatsApp broadcast, cetak kartu pelajar (Rp 7.000/kartu), dan white-label branding bagi yayasan.</p>
<p>Struktur biaya (Cost Structure) terdiri dari biaya server &amp; cloud (Rp 500.000/bulan), domain (Rp 250.000/tahun), kompensasi tim 4 orang, serta biaya pemasaran digital. Dengan model bisnis SaaS dan biaya operasional yang efisien, diproyeksikan bahwa margin keuntungan dapat mencapai 50% hingga 80% setelah tahun pertama operasional.</p>

<h3>2.2 Rencana Pemasaran</h3>
<p><strong>Strategi Akuisisi Pelanggan:</strong></p>
<ul>
  <li>Menyediakan masa uji coba gratis selama 14 hari bagi sekolah yang baru mendaftarkan diri, sehingga pihak sekolah dapat mengevaluasi manfaat platform tanpa risiko finansial.</li>
  <li>Melaksanakan demonstrasi produk secara langsung melalui kunjungan ke sekolah-sekolah yang menjadi sasaran pemasaran.</li>
  <li>Menyelenggarakan webinar edukatif dengan tema "Digitalisasi Sistem Kehadiran di Era Modern" guna meningkatkan kesadaran pasar.</li>
  <li>Menjalin kerja sama strategis dengan Dinas Pendidikan di berbagai daerah agar ATSkolla dapat direkomendasikan kepada sekolah-sekolah di wilayah tersebut.</li>
</ul>
<p><strong>Strategi Branding dan Promosi:</strong></p>
<ul>
  <li>Mengembangkan konten edukatif yang informatif dan menarik di platform media sosial seperti Instagram, TikTok, dan YouTube.</li>
  <li>Menampilkan testimoni dan pengalaman positif dari sekolah-sekolah yang telah menggunakan ATSkolla sebagai bukti sosial (social proof).</li>
  <li>Menjalankan program referral di mana setiap pengguna yang berhasil merekomendasikan sekolah lain akan memperoleh poin yang dapat ditukarkan dengan reward tertentu.</li>
  <li>Membuka program afiliasi bagi komunitas pendidikan dan individu yang berkeinginan turut serta mempromosikan ATSkolla.</li>
</ul>

<h2>BAB III - PRODUK ATAU JASA</h2>
<h3>3.1 Deskripsi Produk</h3>
<p>ATSkolla menawarkan sejumlah fitur unggulan yang saling terintegrasi dan melengkapi satu sama lain, antara lain:</p>
<ul>
  <li><strong>Pemindaian Barcode:</strong> Siswa cukup menunjukkan kartu pelajar digital mereka, kemudian petugas melakukan pemindaian. Proses pencatatan kehadiran berlangsung kurang dari 2 detik per siswa, sehingga meniadakan antrian yang memakan waktu.</li>
  <li><strong>Pengenalan Wajah (Face Recognition) Berbasis AI:</strong> Bagi sekolah yang menghendaki tingkat keamanan yang lebih tinggi, tersedia fitur pengenalan wajah otomatis yang mampu memverifikasi identitas siswa secara akurat.</li>
  <li><strong>Notifikasi WhatsApp Otomatis:</strong> Setiap kali siswa melakukan pemindaian kehadiran, orang tua atau wali murid akan menerima pemberitahuan secara langsung melalui WhatsApp secara otomatis.</li>
  <li><strong>Dashboard Pemantauan Real-time:</strong> Kepala sekolah dan tenaga pendidik dapat memantau kehadiran seluruh siswa dalam satu tampilan yang informatif dan mudah dipahami.</li>
  <li><strong>Laporan dan Rekapitulasi Otomatis:</strong> Sistem secara otomatis menghasilkan rekapitulasi kehadiran (harian, mingguan, dan bulanan) yang siap dicetak atau diekspor ke dalam format yang dibutuhkan.</li>
</ul>

<h3>3.2 Proses Pemberian Layanan</h3>
<p>Proses pemberian layanan ATSkolla kepada institusi pendidikan dilaksanakan melalui tahapan-tahapan berikut:</p>
<ol>
  <li><strong>Registrasi:</strong> Pihak sekolah mendaftarkan akun dan menginput data siswa ke dalam sistem ATSkolla.</li>
  <li><strong>Konfigurasi Awal (Setup):</strong> Tim ATSkolla membantu pihak sekolah dalam mengatur barcode atau sistem pengenalan wajah untuk setiap siswa.</li>
  <li><strong>Operasional Harian:</strong> Setiap hari, siswa melakukan pemindaian kehadiran dan data secara otomatis tercatat ke dalam dashboard.</li>
  <li><strong>Notifikasi:</strong> Orang tua atau wali murid menerima pemberitahuan secara otomatis melalui WhatsApp setiap kali siswa melakukan pencatatan kehadiran.</li>
  <li><strong>Pemantauan dan Pelaporan:</strong> Pihak sekolah dapat memantau data kehadiran serta mengunduh laporan kapan saja dan dari mana saja.</li>
</ol>

<h3>3.3 Kualitas dan Pengendalian Kualitas</h3>
<p>ATSkolla menerapkan standar kualitas yang ketat guna memastikan pengalaman pengguna yang optimal, meliputi:</p>
<ul>
  <li><strong>Ketersediaan Sistem (Uptime) 99,9%:</strong> Infrastruktur cloud yang digunakan dilengkapi dengan sistem backup ganda, sehingga layanan dapat diakses secara berkelanjutan tanpa gangguan yang berarti.</li>
  <li><strong>Waktu Respons Kurang dari 500 Milidetik:</strong> Proses pemindaian dan pengiriman data berlangsung sangat cepat, sehingga tidak menimbulkan antrian saat jam masuk maupun pulang sekolah.</li>
  <li><strong>Enkripsi Data:</strong> Seluruh data siswa dan kehadiran diamankan dengan teknologi enkripsi sehingga kerahasiaan informasi terjaga.</li>
  <li><strong>Layanan Dukungan Teknis 24/7:</strong> Tim dukungan teknis siap memberikan bantuan melalui berbagai kanal komunikasi, termasuk live chat, tiket dukungan, dan WhatsApp.</li>
</ul>

<h2>BAB IV - MANAJEMEN DAN ORGANISASI</h2>
<h3>4.1 Struktur Organisasi</h3>
<p>Struktur organisasi ATSkolla dirancang secara efisien dan fungsional. Pada posisi puncak terdapat CEO/Founder yang bertanggung jawab atas perumusan strategi bisnis dan penentuan arah pengembangan produk. Di bawahnya terdapat tiga divisi utama, yaitu: CTO (Chief Technology Officer) yang membawahi pengembangan teknologi dan keamanan sistem, CMO (Chief Marketing Officer) yang menangani strategi pemasaran dan penjualan, serta COO (Chief Operating Officer) yang mengelola operasional harian dan layanan pelanggan.</p>

<h3>4.2 Tim Manajemen</h3>
<p>Tim ATSkolla terdiri dari individu-individu muda yang memiliki dedikasi tinggi di bidang teknologi pendidikan. Setiap anggota tim memiliki kompetensi yang saling melengkapi, mencakup bidang pengembangan web (React, Node.js), desain antarmuka pengguna (UI/UX), pemasaran digital, dan pelayanan pelanggan. Kombinasi keahlian tersebut menjadi landasan keyakinan bahwa ATSkolla mampu menghadirkan produk dan layanan berkualitas tinggi bagi institusi pendidikan di Indonesia.</p>

<h2>BAB V - ANALISIS KEUANGAN</h2>
<h3>5.1 Proyeksi Pendapatan dan Pengeluaran (2 Tahun)</h3>
<p>Proyeksi disusun berdasarkan target realistis: <strong>50 sekolah</strong> di tahun pertama dan <strong>200 sekolah</strong> di tahun kedua, dengan komposisi 65% paket Premium.</p>

<p><strong>Komposisi Sekolah per Paket:</strong></p>
<table>
  <tr><th>Komposisi Sekolah</th><th>Tahun 1 (50 Sekolah)</th><th>Tahun 2 (200 Sekolah)</th></tr>
  <tr><td>Paket Basic (15%)</td><td style="text-align:center">8 sekolah</td><td style="text-align:center">30 sekolah</td></tr>
  <tr><td>Paket School (20%)</td><td style="text-align:center">10 sekolah</td><td style="text-align:center">40 sekolah</td></tr>
  <tr><td>Paket Premium (65%)</td><td style="text-align:center"><strong>32 sekolah</strong></td><td style="text-align:center"><strong>130 sekolah</strong></td></tr>
</table>

<p><strong>A. PENDAPATAN</strong></p>
<table>
  <tr><th>Keterangan</th><th>Rincian</th><th style="text-align:right">Tahun 1</th><th style="text-align:right">Tahun 2</th></tr>
  <tr class="section-header"><td colspan="4">Pendapatan Langganan SaaS</td></tr>
  <tr><td style="padding-left:20px">Paket Basic (Rp 99.000/bln)</td><td>8 sekolah &times; 12 bulan</td><td style="text-align:right">Rp 9.504.000</td><td style="text-align:right">Rp 35.640.000</td></tr>
  <tr><td style="padding-left:20px">Paket School (Rp 249.000/bln)</td><td>10 sekolah &times; 12 bulan</td><td style="text-align:right">Rp 29.880.000</td><td style="text-align:right">Rp 119.520.000</td></tr>
  <tr><td style="padding-left:20px">Paket Premium (Rp 399.000/bln)</td><td>32 sekolah &times; 12 bulan</td><td style="text-align:right">Rp 153.216.000</td><td style="text-align:right">Rp 622.440.000</td></tr>
  <tr class="subtotal"><td>Subtotal Langganan SaaS</td><td></td><td style="text-align:right">Rp 192.600.000</td><td style="text-align:right">Rp 777.600.000</td></tr>

  <tr class="section-header"><td colspan="4">Pendapatan Jasa Enterprise</td></tr>
  <tr><td style="padding-left:20px">Pelatihan &amp; onboarding intensif</td><td>Rp 1.000.000/sesi</td><td style="text-align:right">Rp 15.000.000</td><td style="text-align:right">Rp 50.000.000</td></tr>
  <tr class="subtotal"><td>Subtotal Jasa Enterprise</td><td></td><td style="text-align:right">Rp 15.000.000</td><td style="text-align:right">Rp 50.000.000</td></tr>

  <tr class="section-header"><td colspan="4">Pendapatan Layanan Add-on</td></tr>
  <tr><td style="padding-left:20px">Kuota tambahan WA broadcast</td><td>Rp 50.000/1.000 pesan</td><td style="text-align:right">Rp 5.000.000</td><td style="text-align:right">Rp 20.000.000</td></tr>
  <tr><td style="padding-left:20px">Cetak Kartu Pelajar</td><td>Rp 7.000/kartu</td><td style="text-align:right">Rp 14.000.000</td><td style="text-align:right">Rp 56.000.000</td></tr>
  <tr><td style="padding-left:20px">White-label branding yayasan</td><td>Rp 2 jt/yayasan/tahun</td><td style="text-align:right">Rp 2.000.000</td><td style="text-align:right">Rp 10.000.000</td></tr>
  <tr class="subtotal"><td>Subtotal Layanan Add-on</td><td></td><td style="text-align:right">Rp 21.000.000</td><td style="text-align:right">Rp 86.000.000</td></tr>

  <tr class="total-row-green"><td>TOTAL PENDAPATAN</td><td></td><td style="text-align:right">Rp 228.600.000</td><td style="text-align:right">Rp 913.600.000</td></tr>
</table>

<p><strong>B. PENGELUARAN</strong></p>
<table>
  <tr><th>Keterangan</th><th>Rincian</th><th style="text-align:right">Tahun 1</th><th style="text-align:right">Tahun 2</th></tr>
  <tr><td>Biaya Server &amp; Cloud</td><td>Rp 500.000/bulan</td><td style="text-align:right">Rp 6.000.000</td><td style="text-align:right">Rp 6.000.000</td></tr>
  <tr><td>Domain</td><td>Domain .com per tahun</td><td style="text-align:right">Rp 250.000</td><td style="text-align:right">Rp 250.000</td></tr>
  <tr><td>Kompensasi Tim (4 Orang)</td><td>Rp 1.500.000/org/bln &rarr; Rp 2.500.000</td><td style="text-align:right">Rp 72.000.000</td><td style="text-align:right">Rp 120.000.000</td></tr>
  <tr><td>Biaya Pemasaran Digital</td><td>Iklan sosmed, konten, kunjungan</td><td style="text-align:right">Rp 12.000.000</td><td style="text-align:right">Rp 24.000.000</td></tr>
  <tr><td>Biaya Operasional Lainnya</td><td>WA API, pulsa, transportasi, tools</td><td style="text-align:right">Rp 6.000.000</td><td style="text-align:right">Rp 12.000.000</td></tr>
  <tr class="total-row-red"><td>TOTAL PENGELUARAN</td><td></td><td style="text-align:right">Rp 96.250.000</td><td style="text-align:right">Rp 162.250.000</td></tr>
  <tr style="font-weight:bold;color:#16a34a"><td>LABA BERSIH</td><td></td><td style="text-align:right">Rp 132.350.000</td><td style="text-align:right">Rp 751.350.000</td></tr>
</table>

<h3>5.2 Perencanaan Modal</h3>
<p>Modal awal yang dibutuhkan untuk memulai operasional bisnis adalah sebesar <strong>Rp 15.000.000</strong>, dengan alokasi sebagai berikut:</p>
<ul>
  <li><strong>Pengembangan Platform &amp; Tools (17% - Rp 2.500.000):</strong> Biaya tools development, library berbayar, dan testing.</li>
  <li><strong>Pemasaran Awal &amp; Akuisisi (33% - Rp 5.000.000):</strong> Iklan digital, cetak brosur, dan kunjungan sekolah 3 bulan pertama.</li>
  <li><strong>Infrastruktur &amp; Domain 6 bulan (23% - Rp 3.500.000):</strong> Server cloud Rp 500.000/bln &times; 6 + domain Rp 250.000 + WA API.</li>
  <li><strong>Operasional &amp; Dana Cadangan (27% - Rp 4.000.000):</strong> Kebutuhan operasional harian, transportasi, dan dana darurat.</li>
</ul>

<h3>5.3 Analisis Risiko</h3>
<table>
  <tr><th>Risiko</th><th>Tingkat</th><th>Strategi Mitigasi</th></tr>
  <tr><td>Lambatnya adopsi teknologi oleh pihak sekolah</td><td>Sedang</td><td>Menyediakan uji coba gratis selama 14 hari. Tim melaksanakan demonstrasi langsung dan memberikan pendampingan penuh selama proses transisi.</td></tr>
  <tr><td>Gangguan teknis atau downtime pada server</td><td>Rendah</td><td>Menggunakan infrastruktur cloud dengan auto-scaling dan backup harian. Tim memantau performa server 24 jam.</td></tr>
  <tr><td>Kemunculan kompetitor baru</td><td>Sedang</td><td>Melakukan inovasi berkelanjutan dengan fitur-fitur baru, menjaga daya saing harga, serta memperkuat keunikan produk.</td></tr>
  <tr><td>Ketergantungan pada WhatsApp API</td><td>Rendah</td><td>Menyiapkan kanal komunikasi alternatif seperti SMS, email, dan push notification sebagai jalur cadangan.</td></tr>
</table>

<h2>BAB VI - KESIMPULAN</h2>
<p>ATSkolla merupakan solusi pencatatan kehadiran digital yang dikembangkan untuk menjawab permasalahan nyata yang dihadapi oleh institusi pendidikan di Indonesia. Dengan mengintegrasikan teknologi pemindaian barcode, pengenalan wajah berbasis kecerdasan buatan, notifikasi WhatsApp otomatis, dan dashboard pemantauan secara langsung, ATSkolla menawarkan sistem yang komprehensif, akurat, dan mudah digunakan oleh berbagai jenjang pendidikan.</p>
<p>Melihat potensi pasar yang sangat besar -- lebih dari 436.000 sekolah dengan 85% di antaranya masih menggunakan metode manual -- serta didukung oleh model bisnis SaaS yang telah terbukti keberlanjutannya dan keunggulan produk yang nyata dibandingkan kompetitor, terdapat keyakinan kuat bahwa ATSkolla memiliki prospek untuk menjadi salah satu pemain utama di industri EdTech Indonesia.</p>
<p>Harapan yang ingin diwujudkan melalui ATSkolla bukan sekadar menyediakan alat pencatatan kehadiran, melainkan turut berkontribusi dalam transformasi digital di dunia pendidikan Indonesia. Sekolah menjadi lebih efisien, orang tua memperoleh ketenangan, dan siswa memperoleh perlindungan yang lebih baik melalui sistem pencatatan yang terdigitalisasi.</p>

<h2>BAB VII - DAFTAR PUSTAKA</h2>
<ol>
  <li>Kementerian Pendidikan dan Kebudayaan. (2024). <em>Data Referensi Pendidikan</em>. https://referensi.data.kemdikbud.go.id</li>
  <li>Badan Pusat Statistik. (2024). <em>Statistik Pendidikan Indonesia</em>.</li>
  <li>Osterwalder, A., dan Pigneur, Y. (2010). <em>Business Model Generation</em>. John Wiley and Sons.</li>
  <li>McKinsey and Company. (2023). <em>The State of EdTech in Southeast Asia</em>.</li>
  <li>Onesender. (2024). <em>WhatsApp API Documentation</em>. https://onesender.net</li>
</ol>

<h2>BAB VIII - LAMPIRAN</h2>
<p>Berikut adalah dokumen-dokumen pendukung yang dapat disertakan untuk melengkapi proposal ini:</p>
<ol>
  <li>Tangkapan layar (screenshot) tampilan dashboard ATSkolla.</li>
  <li>Contoh kartu pelajar digital yang dilengkapi dengan barcode.</li>
  <li>Contoh notifikasi WhatsApp yang diterima oleh orang tua/wali murid.</li>
  <li>Sertifikat dan penghargaan yang dimiliki oleh tim.</li>
  <li>Surat kerja sama atau Memorandum of Understanding (MoU) dengan sekolah mitra.</li>
  <li>Dokumentasi kegiatan demonstrasi dan pelatihan di sekolah mitra.</li>
</ol>

</body></html>`;

export const downloadAsWord = () => {
  const html = getProposalHTML();
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Proposal_Bisnis_ATSkolla.doc';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadAsPDF = () => {
  const html = getProposalHTML();
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => { printWindow.print(); }, 500);
};
