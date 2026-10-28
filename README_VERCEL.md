# Panduan Deploy ke Vercel

Aplikasi ini dapat di-online-kan melalui Vercel dengan mengikuti langkah-langkah berikut:

## 1. Persiapan Repository
Pastikan semua file sudah di-push ke repository GitHub, GitLab, atau Bitbucket Anda.

## 2. Impor Proyek di Vercel
1. Buka [Vercel Dashboard](https://vercel.com/dashboard).
2. Klik **"Add New"** -> **"Project"**.
3. Pilih repository Anda.

## 3. Konfigurasi Build
Vercel akan secara otomatis mendeteksi bahwa ini adalah proyek **Vite**.
- **Framework Preset:** Vite
- **Root Directory:** `./`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

## 4. Konfigurasi Environment Variables (PENTING)
Di bagian **"Environment Variables"**, tambahkan variabel berikut:
- **Key:** `GEMINI_API_KEY`
- **Value:** (Masukkan API Key Gemini Anda dari [Google AI Studio](https://aistudio.google.com/app/apikey))

## 5. Deploy
Klik tombol **"Deploy"**. Vercel akan memproses build dan memberikan URL publik (misalnya: `https://ktp-mbg-scanner-pro.vercel.app`).

## Catatan Penting
- **SPA Routing:** File `vercel.json` sudah ditambahkan untuk menangani routing Single Page Application (SPA) agar tidak terjadi error 404 saat halaman di-refresh.
- **Google Apps Script:** Pastikan URL `GAS_URL` di `App.tsx` sudah benar dan Google Apps Script Anda sudah di-deploy sebagai "Web App" dengan akses "Anyone".
- **Kamera & Lokasi:** Browser akan meminta izin akses kamera dan lokasi saat aplikasi dibuka. Pastikan Anda memberikan izin tersebut.
