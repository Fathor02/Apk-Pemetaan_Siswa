# 🎓 EduCluster AI - Pemetaan Hasil Belajar Siswa
### Algoritma: K-Means Clustering & Silhouette Coefficient

Aplikasi web otomatis untuk menganalisis dan memetakan tingkat hasil belajar siswa dari berkas mentah nilai (CSV / XLSX) ke dalam kategori **Tinggi**, **Sedang**, dan **Rendah** menggunakan algoritma **K-Means Clustering** serta menguji kualitas dan validitas klaster secara matematis menggunakan **Silhouette Coefficient**.

---

## 🚀 Fitur Utama
1. **Userless Architecture**: Pengguna (Guru / Staf Sekolah) dapat langsung mengakses platform, mengunggah data, dan melihat dashboard visualisasi tanpa registrasi / login.
2. **Kalkulasi Otomatis Nilai Akhir**:
   $$\text{Nilai Akhir} = (30\% \times \text{Nilai Harian}) + (30\% \times \text{Nilai UTS}) + (40\% \times \text{Nilai UAS})$$
3. **Pilihan Ruang Fitur Komputasi**:
   - **Matriks 3D**: `[Nilai Harian, Nilai UTS, Nilai UAS]` (Jarak Euclidean 3 Dimensi).
   - **1 Dimensi**: `[Nilai Akhir]`.
4. **Evaluasi Presisi Silhouette Coefficient**:
   $$s(i) = \frac{b(i) - a(i)}{\max(a(i), b(i))}$$
   - $a(i)$: Rata-rata jarak intra-klaster.
   - $b(i)$: Rata-rata jarak inter-klaster ke klaster tetangga terdekat.
   - Interpretasi standar Kaufman & Rousseeuw (Sangat Baik / Baik / Cukup / Buruk).
5. **Invariansi & Caching (< 1 Detik)**:
   - Hasil klasterisasi otomatis disimpan di tabel PostgreSQL `hasil_clustering`.
   - Dashboard dapat dimuat secara instan saat pertama kali dibuka.
6. **Visualisasi Interaktif**:
    - Donut Chart Proporsi Siswa per Klaster. *(Bar & Radar sebagian terintegrasi via dashboard)*
    - Bar Chart Komparasi Centroid (Harian, UTS, UAS).
    - Scatter Plot Distribusi Nilai Akhir vs Skor Silhouette individual siswa (lengkap dengan penanda bintang kuning posisi Centroid).
7. **Pencarian, Filter & Ekspor**:
   - Filter klaster (Tinggi, Sedang, Rendah).
   - Pencarian berdasarkan Nama, NIS, atau Kelas.
   - Ekspor laporan hasil klasterisasi ke format Excel (.xlsx) & Cetak/PDF via `window.print()`.
   - Tombol unduh format template CSV & muat data contoh (dummy).

---

## 🛠️ Teknologi yang Digunakan
- **Framework**: Next.js 15 (App Router, React 19, Server Actions)
- **Styling**: Tailwind CSS & Lucide React
- **Database**: PostgreSQL via Supabase (`@supabase/supabase-js`)
- **Visualisasi**: Recharts
- **Parser**: PapaParse (CSV) & SheetJS `xlsx` (Excel)
- **Bahasa**: TypeScript

---

## 📋 Format Berkas Masukan (CSV / XLSX)
Header kolom wajib pada baris pertama:
| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| `nis` | Teks | Nomor Induk Siswa (kunci unik) |
| `nama_lengkap` | Teks | Nama lengkap siswa |
| `kelas` | Teks | Kelas (misal: XII-MIPA-1) |
| `kode_mapel` | Teks | Kode mata pelajaran (misal: MAT-01) |
| `nama_mapel` | Teks | Nama mata pelajaran |
| `nilai_harian` | Angka | Rentang nilai 0 - 100 |
| `nilai_uts` | Angka | Rentang nilai 0 - 100 |
| `nilai_uas` | Angka | Rentang nilai 0 - 100 |
| `semester` | Angka | Semester (1 atau 2) |

---

## 🗄️ Skema Database PostgreSQL (Supabase)
Jalankan query DDL berikut di SQL Editor Supabase Anda:
```sql
CREATE TABLE IF NOT EXISTS siswa (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nis VARCHAR(50) UNIQUE NOT NULL,
    nama_lengkap VARCHAR(255) NOT NULL,
    kelas VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS mata_pelajaran (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kode_mapel VARCHAR(50) UNIQUE NOT NULL,
    nama_mapel VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS nilai_akademik (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    siswa_id UUID NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
    mapel_id UUID NOT NULL REFERENCES mata_pelajaran(id) ON DELETE CASCADE,
    nilai_harian FLOAT NOT NULL DEFAULT 0 CHECK (nilai_harian BETWEEN 0 AND 100),
    nilai_uts FLOAT NOT NULL DEFAULT 0 CHECK (nilai_uts BETWEEN 0 AND 100),
    nilai_uas FLOAT NOT NULL DEFAULT 0 CHECK (nilai_uas BETWEEN 0 AND 100),
    nilai_akhir FLOAT NOT NULL DEFAULT 0 CHECK (nilai_akhir BETWEEN 0 AND 100),
    semester INT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_nilai_siswa_id ON nilai_akademik(siswa_id);

CREATE TABLE IF NOT EXISTS hasil_clustering (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    siswa_id UUID NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
    klaster VARCHAR(50) NOT NULL,
    periode_analisis VARCHAR(100) NOT NULL,
    jarak_ke_centroid FLOAT,
    nilai_silhouette FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hasil_siswa_id ON hasil_clustering(siswa_id);
```

---

## ⚙️ Menjalankan di Komputer Lokal

1. **Konfigurasi Environment Variable**
   Salin `.env.local.example` ke `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
   *(Catatan: Aplikasi tetap dapat dijalankan penuh dengan penyimpanan cache memori jika kredensial belum diisi).*

2. **Jalankan Development Server**:
   ```bash
   npm run dev
   ```
   Akses di peramban: `http://localhost:3000`

3. **Build untuk Production**:
   ```bash
   npm run build
   npm start
   ```

4. **Verifikasi Silang Algoritma (opsional)**:
   Membandingkan engine K-Means & Silhouette milik proyek dengan library `ml-kmeans` pada dataset uji yang sama:
   ```bash
   npm run verify:kmeans
   ```
   Output yang diharapkan: `LULUS — implementasi identik dengan ml-kmeans`. Library pembanding hanya terpasang sebagai `devDependency`, tidak dipakai di runtime aplikasi.
