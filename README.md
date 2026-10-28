# KTP MBG Scanner Pro

Aplikasi Pemindai KTP Berbasis AI Gemini dengan Geotagging, Validasi Demografi, dan Integrasi Google Sheets.

## Fitur Utama
- **OCR AI KTP Cepat**: Ekstraksi otomatis data NIK, Nama, Tanggal Lahir, Jenis Kelamin, Alamat, RT/RW, dsb menggunakan model Gemini terbaru.
- **Geotagging Real-time**: Pencatatan koordinat GPS dan akurasi lokasi saat pemindaian.
- **Dashboard Statistik & Demografi**: Kartu agregat jumlah jiwa, perempuan, laki-laki, agama, status perkawinan, usia produktif, pralansia, lansia, serta filter dusun & RT faktual.
- **Sistem Login Sandi**: Autentikasi sandi dari sheet `sandi` pada Google Spreadsheet.
- **Riwayat & Export**: Terintegrasi langsung dengan Google Apps Script Web App.

## Cara Publish Aplikasi (Sangat Mudah & Gratis)
- 🚀 **Rekomendasi Utama (Paling Mudah & Cepat): [PANDUAN_PUBLISH_CLOUDFLARE.md](./PANDUAN_PUBLISH_CLOUDFLARE.md)**
- 🌐 Panduan GitHub & Alternatif Lain (Vercel, GitHub Pages, Render): **[PANDUAN_PUBLISH_GITHUB.md](./PANDUAN_PUBLISH_GITHUB.md)**

## Menjalankan Proyek Secara Lokal
```bash
# Install dependensi
npm install

# Buat file .env.local
cp .env.example .env.local
# Masukkan GEMINI_API_KEY Anda di dalam .env.local

# Jalankan development server
npm run dev
```

## Build Produksi
```bash
npm run build
npm start
```
