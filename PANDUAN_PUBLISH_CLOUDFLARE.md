# Panduan Mudah Publish Aplikasi ke Cloudflare Pages

Cloudflare Pages adalah pilihan yang sangat tepat: **gratis, sangat cepat, memiliki CDN global, mendukung HTTPS otomatis, dan prosesnya jauh lebih mudah** dibanding GitHub Pages karena tidak memerlukan konfigurasi custom domain yang membingungkan.

---

## Langkah 1: Pastikan Kode Sudah di GitHub
Pastikan seluruh file terbaru di proyek ini (termasuk folder `functions/` dan `public/` yang baru disiapkan) sudah di-push atau di-upload ke repository GitHub Anda.

---

## Langkah 2: Buka Cloudflare Dashboard
1. Buka browser dan login ke: **[https://dash.cloudflare.com/](https://dash.cloudflare.com/)** (Jika belum punya akun, daftar gratis).
2. Di menu navigasi sebelah kiri, klik **Workers & Pages**.
3. Klik tombol biru **Create application**.
4. Pilih tab **Pages**.
5. Klik tombol **Connect to Git**.

---

## Langkah 3: Hubungkan Repository GitHub
1. Klik **Connect GitHub** dan beri izin ke akun GitHub Anda.
2. Pilih repository aplikasi KTP Anda (misal: `ktp-mbg-scanner-pro`).
3. Klik tombol **Begin setup**.

---

## Langkah 4: Pengaturan Build (Sangat Mudah!)
Di halaman konfigurasi, sesuaikan kolom berikut:

| Pengaturan | Nilai / Isi |
| :--- | :--- |
| **Project name** | Biarkan sesuai default (atau ganti sesuai keinginan) |
| **Production branch** | `main` (atau `master`) |
| **Framework preset** | Pilih **`Vite`** |
| **Build command** | `npm run build` *(terisi otomatis jika pilih Vite)* |
| **Build output directory** | `dist` *(terisi otomatis jika pilih Vite)* |

---

## Langkah 5: Masukkan Kunci Gemini API (Environment Variables)
Agar fitur scan OCR KTP berfungsi di Cloudflare Pages:
1. Di halaman setup yang sama, klik menu dropdown **Environment variables (advanced)**.
2. Klik **Add variable**:
   - **Variable name**: `GEMINI_API_KEY`
   - **Value**: Masukkan API Key Gemini Anda dari Google AI Studio.
3. *(Opsional)* Jika ingin cadangan untuk client side, Anda juga bisa menambahkan:
   - **Variable name**: `VITE_GEMINI_API_KEY`
   - **Value**: Masukkan API Key Gemini Anda.

---

## Langkah 6: Simpan & Deploy!
1. Klik tombol hijau **Save and Deploy** di bagian bawah.
2. Tunggu proses build sekitar 30 - 60 detik.
3. Selesai! 🎉 Cloudflare Pages akan langsung memberikan tautan website aktif, contohnya:
   **`https://ktp-mbg-scanner-pro.pages.dev`**
4. Website langsung bisa dibuka di HP, laptop, maupun dibagikan ke orang lain tanpa masalah domain.

---

## Keunggulan Cloudflare Pages untuk Aplikasi Ini:
1. **Routing SPA Aman**: Sudah dilengkapi file `public/_redirects` sehingga halaman tidak akan 404 saat direfresh.
2. **Serverless AI Function Siap Pakai**: Folder `functions/api/extract-ktp.ts` akan otomatis dijalankan oleh Cloudflare Workers untuk memproses pembacaan KTP dengan Gemini API tanpa perlu sewa server backend.
3. **Cepat & Stabil**: Berjalan di jaringan edge Cloudflare Indonesia & internasional.
