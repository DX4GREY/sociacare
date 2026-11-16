<div align="center">

# 💙 SociaCare AI
### Sahabat Konseling Hubungan Sosial Siswa Berbasis AI & Manajemen Bimbingan Konseling (BK)

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![React Router](https://img.shields.io/badge/React_Router-7.18.5-CA4245?style=for-the-badge&logo=react-router&logoColor=white)](https://reactrouter.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.15-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-5.4.11-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.0.0-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.21.1-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-8.13.1-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![SQLite](https://img.shields.io/badge/SQLite-Native_Node22-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini_AI-API-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)

<p align="center">
  <b>SociaCare AI</b> adalah platform konseling sebaya interaktif berbasis kecerdasan buatan (AI) yang dirancang khusus untuk mendampingi siswa, remaja, dan pelajar dalam memahami serta menyelesaikan dinamika hubungan sosial di lingkungan sekolah secara aman, empatik, dan suportif.
</p>

[Fitur Utama](#-fitur-utama) • [Teknologi](#-teknologi--arsitektur) • [Instalasi](#-panduan-instalasi--menjalankan-aplikasi) • [Struktur Rute](#-struktur-rute-aplikasi-spa) • [Skema Database](#-skema-basis-data) • [Panel Admin](#-panel-admin--guru-bk)

---

</div>

## 🌟 Latar Belakang & Tujuan

Permasalahan sosial seperti pertemanan tidak sehat (*toxic friendship*), kesulitan komunikasi antar teman, krisis percaya diri, hingga ancaman perundungan (*bullying*) sering kali dialami siswa namun enggan diceritakan karena rasa takut, malu, atau ragu mendatangi ruang Bimbingan Konseling (BK). 

**SociaCare AI** hadir sebagai jembatan hangat dan privat yang:
1. Menyediakan ruang bercerita 24/7 tanpa penghakiman (*non-judgmental space*).
2. Memberikan panduan solutif terstruktur dengan pendekatan konseling sebaya.
3. Mendeteksi dini kondisi gawat darurat (*emergency safety guard*).
4. Memfasilitasi siswa untuk menjadwalkan konseling tatap muka langsung dengan Guru BK sekolah.

---

## ✨ Fitur Utama

### 💬 1. Ruang Konseling Interaktif (*AI Counseling Workspace*)
- **Persona Empatik:** AI bertindak sebagai konselor sebaya yang ramah, hangat, dan solutif.
- **Respons Terstruktur (*Structured Output*):**
  - **Empathetic Listening:** Validasi emosi dan perasaan siswa.
  - **Checklist Solusi Nyata:** Langkah praktis yang dapat langsung dicoba siswa.
  - **Kotak Tips Tambahan (💡):** Wawasan psikologi sosial ringkas.
  - **Pertanyaan Reflektif:** Mendorong siswa memahami sudut pandang baru.
  - **Quick Reply Chips:** Tombol opsi balasan cepat untuk memudahkan alur percakapan.
- **Auto-scroll Responsif:** Navigasi scroll mulus tanpa lag di perangkat desktop maupun mobile.

### 🎯 2. Empat Fokus Topik Sosial
1. **Hubungan Pertemanan yang Tidak Sehat (*Friendship*):** Mengatasi rasa dijauhi, *circle* pertemanan yang merugikan, atau perasaan tidak dihargai.
2. **Komunikasi Efektif (*Communication*):** Belajar menyampaikan pendapat asertif, meredakan salah paham, dan mendengar aktif.
3. **Membangun Kepercayaan Diri (*Confidence*):** Mengatasi rasa minder, cemas saat tampil di depan kelas, dan mengenali potensi diri.
4. **Mencegah Perundungan (*Anti-Bullying*):** Panduan aman menghadapi, melaporkan, dan melindungi diri dari tindakan perundungan fisik, verbal, maupun sosial di sekolah.

### 🚨 3. Deteksi & Perlindungan Gawat Darurat (*AI Safety Protocol*)
- **Pemindaian Risiko Otomatis:** Memindai pola kata kunci krisis (*self-harm*, keputusasaan ekstrem, kekerasan berat, ancaman bahaya).
- **Red Emergency Mode:** Saat bahaya terdeteksi, tema visual otomatis berganti ke mode darurat merah menyala.
- **Emergency Modal & Banner:** Menampilkan nomor kontak bantuan darurat 24 jam (Kemenkes **119 ext 8** dan Layanan SAPA **129**).
- **Eskalasi Prioritas Guru BK:** Otomatis menandai profil siswa di Panel Admin Guru BK agar mendapatkan intervensi langsung.

### 📚 4. Portal Fitur Lainnya (*Extras Hub*)
- **💡 Tips Sosial:** Kumpulan kartu panduan pergaulan sehat yang dapat disimpan (*bookmark*).
- **📖 Artikel Informasi:** Bacaan edukasi psikologi & perkembangan sosial remaja.
- **🎧 Hubungi Guru BK:** Formulir pengajuan jadwal konseling privat tatap muka bersama Guru BK sekolah dengan pilihan waktu istirahat atau sepulang sekolah.
- **🕒 Riwayat Chat:** Daftar seluruh riwayat sesi percakapan siswa yang tersimpan aman di database SQL.

### 🛡️ 5. Panel Administrator & Guru BK (`/admin`)
- **Server Health & Monitoring:** Uptime, penggunaan memori RAM, CPU load, latency database, dan logs server *real-time*.
- **AI Token Usage Analytics:** Monitoring penggunaan prompt tokens, completion tokens, total request, dan estimasi biaya Gemini AI.
- **Database Management & SQL Runner:** Eksekusi query SQL langsung dari browser, serta fitur **Backup & Restore Database JSON** satu klik.
- **Daftar Siswa & Emergency Watch:** Memantau siswa aktif, status darurat, dan riwayat transkrip chat lengkap.
- **Kelola Pengajuan Guru BK:** Menerima pengajuan konseling siswa dan mengirimkan balasan/jadwal temu.
- **Kustomisasi Persona AI:** Mengatur pesan sambutan global, sambutan per topik, persona sistem, dan tombol aksi tanpa *restart* server.

---

## 🛠 Teknologi & Arsitektur

### Frontend (`client/`)
- **React.js 18.3** — Komponen modular dengan React Hooks & Context API.
- **React Router v7** — Navigasi Single Page Application (SPA) berbasis rute terarah.
- **Tailwind CSS 3.4** — Desain modern, ceria, aksesibel, dan sepenuhnya responsif (*mobile-first*).
- **Lucide React** — Ikonografi visual modern.
- **Vite 5.4** — Bundler frontend berkecepatan tinggi dengan HMR.

### Backend (`server/`)
- **Node.js (>= 22.0.0)** — Runtime performa tinggi.
- **Express.js 4.21** — RESTful API backend & static file server.
- **Dual Database Engine Support:**
  - **PostgreSQL (`pg`):** Digunakan untuk lingkungan produksi *cloud* melalui `DATABASE_URL`.
  - **Native Node 22 SQLite (`node:sqlite`):** Otomatis aktif saat PostgreSQL belum dikonfigurasi (zero-setup lokal).
- **Google Gemini AI API:** Integrasi model Gemini Flash melalui agen HTTPS IPv4 dengan strategi *fail-safe* offline fallback.

---

## 📁 Struktur Direktori Proyek

```plaintext
sociacare/
├── client/                      # Frontend Application (React + Vite)
│   ├── src/
│   │   ├── components/          # Komponen UI Reusable
│   │   │   ├── AdminPanel.jsx   # Portal Bimbingan Konseling & Admin
│   │   │   ├── EmergencyModal.jsx # Modal Peringatan Bahaya AI
│   │   │   └── Illustrations.jsx  # SVG Logo & Ilustrasi Karakter Siswa
│   │   ├── constants/           # Konstanta Topik Konseling
│   │   │   └── topics.js
│   │   ├── context/             # Global State Management (User, Sesi, Auth)
│   │   │   └── AppContext.jsx
│   │   ├── pages/               # Halaman Berbasis Rute (SPA)
│   │   │   ├── HomePage.jsx     # Beranda & Form Identitas Siswa
│   │   │   ├── TopicsPage.jsx   # Pemilihan Topik Konseling
│   │   │   ├── ChatPage.jsx     # Ruang Chat Konseling Interaktif
│   │   │   ├── ExtrasPage.jsx   # Tips, Artikel, Hubungi BK, & Riwayat
│   │   │   ├── ClosingPage.jsx  # Pesan Penutup & Apresiasi Sesi
│   │   │   └── NotFoundPage.jsx # Halaman 404 Not Found
│   │   ├── App.jsx              # Routing Wrapper (BrowserRouter & Routes)
│   │   ├── index.css            # Tailwind & Custom Font Setup
│   │   └── main.jsx             # Entry Point React
│   ├── package.json
│   └── vite.config.js
│
├── server/                      # Backend API Server (Node.js + Express)
│   ├── index.js                 # API Endpoints & Server Controller
│   ├── db.js                    # Dual Engine Database Adapter (PG & SQLite)
│   ├── geminiService.js         # Logika Integrasi AI, Prompts, & Safety Guard
│   ├── counselorData.js         # Bank Data Tips Sosial, Artikel, & Topik
│   ├── schema.sql               # Skema Tabel Database SQL
│   ├── .env.example             # Contoh Konfigurasi Environment Variables
│   └── package.json
│
├── package.json                 # Root Workspace Scripts
└── README.md                    # Dokumentasi Proyek
```

---

## 🚀 Panduan Instalasi & Menjalankan Aplikasi

### 1. Prasyarat Sistem
- **Node.js**: Versi `22.0.0` atau yang lebih baru ([Unduh Node.js](https://nodejs.org/)).
- **NPM**: Versi `10.0.0` atau yang lebih baru.
- *(Opsional)* Database **PostgreSQL** jika ingin menggunakan PostgreSQL di server produksi.

---

### 2. Kloning Repositori
```bash
git clone https://github.com/username/sociacare.git
cd sociacare
```

---

### 3. Konfigurasi Environment Variables
Masuk ke folder `server/` dan salin file contoh environment:
```bash
cp server/.env.example server/.env
```

Buka file `server/.env` lalu sesuaikan pengaturannya:
```env
# Port Backend Server
PORT=3001

# (Opsional) URL PostgreSQL. Jika dikosongkan/tidak aktif, sistem otomatis memakai SQLite lokal
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/sociacare

# Google Gemini API Key (Dapatkan di: https://aistudio.google.com/)
GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere

# Password Masuk Panel Admin (/admin)
ADMIN_PASSWORD=admin123
```

---

### 4. Instalasi Dependensi
Jalankan perintah instalasi dari folder *root* proyek:
```bash
# Menginstall dependensi root, client, dan server sekaligus
npm install
npm --prefix client install
npm --prefix server install
```

---

### 5. Menjalankan Aplikasi

#### Mode Pengembangan (*Development Mode*):
Jalankan server backend dan client Vite secara terpisah di dua terminal:

**Terminal 1 (Backend):**
```bash
npm run dev:server
# Server berjalan di http://localhost:3001
```

**Terminal 2 (Frontend Client):**
```bash
npm run dev:client
# Aplikasi berjalan di http://localhost:5173
```

Buka peramban di **`http://localhost:5173`**.

---

#### Mode Produksi (*Production Build & Run*):
Kompilasi frontend menjadi aset statis dan jalankan server tunggal Express:
```bash
# 1. Build aplikasi client
npm run build

# 2. Jalankan server produksi
npm start
```
Aplikasi siap diakses di **`http://localhost:3001`**.

---

## 🗺 Struktur Rute Aplikasi (SPA)

| Rute URL | Komponen Halaman | Deskripsi |
| :--- | :--- | :--- |
| **`/`** | `HomePage` | Halaman utama penyambutan, formulir nama & avatar siswa, info profil aktif. |
| **`/topics`** | `TopicsPage` | Halaman pemilihan 4 fokus permasalahan hubungan sosial. |
| **`/chat`** | `ChatPage` | Otomatis mengarahkan ke sesi terakhir atau membuat sesi baru. |
| **`/chat/:sessionId`** | `ChatPage` | Ruang konseling spesifik per sesi ID lengkap dengan pesan interaktif. |
| **`/extras`** | `ExtrasPage` | Menu portal fitur tambahan siswa. |
| **`/extras/tips`** | `ExtrasPage` | Tab tips sosial & bookmark tips. |
| **`/extras/articles`** | `ExtrasPage` | Tab artikel informasi & edukasi psikologi remaja. |
| **`/extras/articles/:articleId`** | `ExtrasPage` | Halaman membaca artikel lengkap. |
| **`/extras/counselor`** | `ExtrasPage` | Formulir pengajuan jadwal konseling bersama Guru BK. |
| **`/extras/history`** | `ExtrasPage` | Riwayat sesi percakapan yang tersimpan. |
| **`/closing`** | `ClosingPage` | Halaman apresiasi & refleksi akhir sesi konseling. |
| **`/admin/*`** | `AdminPanel` | Portal lengkap Guru BK & Administrator. |
| **`*`** | `NotFoundPage` | Halaman penanganan error 404 (Not Found). |

---

## 🗄 Skema Basis Data

Sistem menggunakan database relasional SQL dengan struktur tabel berikut:

1. **`users`**: Menyimpan identitas siswa (nama, gaya avatar, status mode darurat, tanggal pembuatan).
2. **`chat_sessions`**: Menyimpan data sesi konseling (topik permasalahan, status sesi aktif/selesai, status darurat).
3. **`chat_messages`**: Menyimpan seluruh riwayat percakapan antara siswa dan AI (konten teks, metadata JSON terstruktur, waktu pengiriman).
4. **`counselor_requests`**: Menyimpan formulir pengajuan konseling tatap muka dengan Guru BK (topik, jadwal yang diinginkan, pesan siswa, status konfirmasi, dan balasan guru BK).
5. **`user_saved_tips`**: Menyimpan ID tips sosial yang di-*bookmark* oleh siswa.
6. **`token_usage`**: Mencatat metrik penggunaan token Google Gemini AI per request.
7. **`ai_settings`**: Menyimpan konfigurasi dinamis format pesan pembuka dan persona sistem AI.

---

## 🔐 Keamanan, Etika, & Privasi

- **Device-Isolated Account (Anti-Pembajakan Sesi Antar-Perangkat):** Identitas dan percakapan siswa terikat secara unik dengan *Device Token UUID* per perangkat/browser. Siswa yang memasukkan nama sama di perangkat berbeda **tidak akan pernah bercampur** atau membuka data milik siswa lain.
- **Konfirmasi Keluar 2 Tahap (*Double Warning*) & Penghapusan Permanen (*Wipe on Exit*):** Karena sesi konseling bersifat privat dan sementara (*ephemeral*), siswa diperingatkan dua kali sebelum keluar. Saat dikonfirmasi, seluruh data percakapan dan sesi langsung dihapus total dari database dan perangkat demi menjamin kerahasiaan siswa saat perangkat dipakai orang lain.
- **Tanpa Kewajiban Akun Rumit:** Siswa cukup memasukkan nama panggilan dan avatar untuk memulai konseling, mengurangi hambatan psikologis dalam mencari pertolongan.
- **SQL Sanitization:** Semua query database menggunakan *parameterized queries* (`$1`, `$2`) untuk mencegah kerentanan SQL Injection.
- **Bimbingan Konseling Beretika:** AI dirancang sebagai pendamping awal (*peer counselor*) dan **bukan pengganti psikolog klinis**. Setiap indikasi bahaya berat secara otomatis diarahkan ke tenaga profesional Guru BK sekolah dan hotline resmi Kemenkes RI.
- **Panel Admin Terproteksi:** Halaman `/admin` dilindungi oleh autentikasi token berbasis password administrator yang dapat diubah kapan saja.

---

## 🤝 Kontribusi

Kontribusi untuk pengembangan SociaCare AI sangat terbuka! Silakan ikuti langkah berikut:
1. *Fork* repositori ini.
2. Buat branch fitur baru (`git checkout -b fitur/fitur-keren`).
3. Lakukan *commit* perubahan (`git commit -m 'Menambahkan fitur keren'`).
4. *Push* ke branch Anda (`git push origin fitur/fitur-keren`).
5. Buat sebuah *Pull Request* baru.

---

## 📄 Lisensi

Proyek ini didistribusikan di bawah lisensi **MIT**. Silakan lihat file `LICENSE` untuk detail lebih lanjut.

---

<div align="center">
  <b>Dibuat dengan rasa peduli 💙 untuk masa depan pergaulan siswa yang sehat dan bahagia.</b>
</div>
