# Panduan Lengkap Publish Aplikasi Melalui GitHub

Dokumen ini menjelaskan langkah demi langkah cara mengunggah (*push*) proyek ini ke **GitHub** dan mempublikasikannya (*publish / hosting*) secara online agar dapat diakses oleh siapa saja.

---

## Bagian 1: Cara Upload (Push) Kode ke GitHub

### Langkah 1: Buat Repository Baru di GitHub
1. Buka [github.com](https://github.com) dan login ke akun GitHub Anda.
2. Klik tombol **"+"** di pojok kanan atas, lalu pilih **New repository**.
3. Beri nama repository, misalnya: `ktp-mbg-scanner-pro`.
4. Pilih **Public** (atau Private sesuai kebutuhan).
5. **JANGAN centang** *"Add a README file"*, *"Add .gitignore"*, atau license (karena proyek kita sudah memilikinya).
6. Klik **Create repository**.
7. Salin URL repository Anda, contohnya: `https://github.com/username-anda/ktp-mbg-scanner-pro.git`.

### Langkah 2: Jalankan Perintah Git di Terminal Komputer Anda
Buka folder proyek ini di terminal/command prompt lokal Anda, lalu jalankan perintah berikut secara berurutan:

```bash
# 1. Inisialisasi git di folder proyek
git init

# 2. Tambahkan semua file ke git
git add .

# 3. Buat commit pertama
git commit -m "feat: initial commit ktp scanner pro"

# 4. Ubah nama branch utama menjadi main
git branch -M main

# 5. Sambungkan dengan repository GitHub Anda (ganti URL di bawah dengan URL repo Anda)
git remote add origin https://github.com/username-anda/ktp-mbg-scanner-pro.git

# 6. Push kode ke GitHub
git push -u origin main
```

*(Jika diminta login/autentikasi, gunakan Personal Access Token atau GitHub CLI / browser login).*

---

## Bagian 2: Pilihan Cara Publish (Hosting) dari GitHub

Aplikasi ini memiliki frontend (React/Vite) dan backend serverless AI Gemini (`/api/extract-ktp`). Tersedia 3 opsi publikasi yang sudah siap digunakan:

---

### OPSI 1: Deploy ke Vercel via GitHub (SANGAT DIREKOMENDASIKAN ⭐⭐⭐⭐⭐)
Vercel adalah platform hosting gratis yang terintegrasi langsung dengan GitHub. Setiap kali Anda melakukan `git push`, Vercel otomatis meng-update aplikasi Anda.

1. Buka [vercel.com](https://vercel.com) dan login menggunakan akun **GitHub** Anda.
2. Di dashboard Vercel, klik **"Add New..."** lalu pilih **"Project"**.
3. Cari repository `ktp-mbg-scanner-pro` dari daftar GitHub Anda, lalu klik **"Import"**.
4. Di bagian **Environment Variables**:
   - Name: `GEMINI_API_KEY`
   - Value: *(Isi dengan API Key Gemini Anda dari Google AI Studio)*
5. Klik **"Deploy"**.
6. Selesai! Dalam ~1 menit aplikasi Anda sudah aktif dengan URL publik (contoh: `https://ktp-mbg-scanner-pro.vercel.app`).
   - File `vercel.json` sudah dikonfigurasi untuk menangani routing SPA dan fungsi serverless `/api/extract-ktp`.

---

### OPSI 2: Deploy Otomatis ke GitHub Pages (Gratis dari GitHub)
Proyek ini sudah dilengkapi file workflow otomatis: `.github/workflows/deploy-pages.yml`.

1. Buka repository Anda di GitHub.
2. Masuk ke tab **Settings** (Pengaturan).
3. Di menu sebelah kiri, pilih **Pages**.
4. Di bagian **Build and deployment** -> **Source**, ubah dari *"Deploy from a branch"* menjadi **"GitHub Actions"**.
5. Buka tab **Actions** di repo Anda, Anda akan melihat workflow **"Deploy to GitHub Pages"** berjalan otomatis.
6. Setelah selesai (tanda centang hijau), URL aplikasi Anda akan muncul di halaman GitHub Pages (contoh: `https://username-anda.github.io/ktp-mbg-scanner-pro/`).

*Catatan untuk GitHub Pages:* GitHub Pages hanya menyajikan file statis (HTML/JS/CSS). Agar scanner AI berfungsi di GitHub Pages, backend API perlu diarahkan ke server Vercel/Cloud Run atau menggunakan reverse proxy.

---

### OPSI 3: Deploy ke Render / Railway / Google Cloud Run (Full Container)
Proyek ini sudah dilengkapi file `Dockerfile` siap pakai.
1. Buka [render.com](https://render.com) atau [railway.app](https://railway.app).
2. Login dengan akun GitHub Anda.
3. Pilih **"New Web Service"** dan sambungkan ke repository GitHub Anda.
4. Render/Railway akan otomatis mendeteksi `Dockerfile` dan `npm start`.
5. Tambahkan Environment Variable:
   - `GEMINI_API_KEY` = `kunci-api-gemini-anda`
   - `PORT` = `8080`
6. Klik **Create Web Service**. Aplikasi akan live sebagai full-stack container.

---

## File Konfigurasi yang Sudah Disiapkan untuk GitHub:
- `.github/workflows/deploy-pages.yml` : Workflow otomatis build dan deploy ke GitHub Pages.
- `.github/workflows/ci.yml` : Workflow pengecekan otomatis build dan type-check (lint) saat ada push/PR.
- `vercel.json` : Konfigurasi Vercel untuk rewrite SPA dan route API serverless.
- `Dockerfile` & `.dockerignore` : Konfigurasi container untuk deploy ke Cloud Run / Render / Railway.
- `vite.config.ts` : Konfigurasi `base: "./"` agar aset CSS/JS dapat dimuat di sub-path (seperti GitHub Pages).
- `.gitignore` : Memastikan file sensitif seperti `.env` dan `node_modules` tidak bocor ke publik.
