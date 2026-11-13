# 📋 Product Requirements Document (PRD)
## EduCluster AI - Pemetaan Hasil Belajar Siswa Berbasis K-Means & Silhouette Coefficient

---

## 1. Ringkasan Eksekutif & Latar Belakang

### 1.1 Latar Belakang Masalah
Dalam proses evaluasi pendidikan di sekolah, guru dan institusi pendidikan sering kali menghadapi ratusan hingga ribuan data nilai akademik siswa yang tersebar dalam format berkas spreadsheet mentah (CSV/Excel). Pendekatan tradisional dalam mengelompokkan prestasi siswa umumnya hanya mengandalkan batas nilai KKM (Kriteria Ketuntasan Minimal) atau peringkat manual yang bersifat linear dan memakan waktu lama.

Pendekatan tersebut memiliki beberapa keterbatasan:
1. Tidak mampu melihat pola sebaran multidimensi antara Nilai Harian, UTS, dan UAS secara simultan.
2. Rawan bias subjektivitas pengelompokan.
3. Tidak memiliki validasi kualitas matematis untuk mengukur apakah pemisahan kelompok nilai benar-benar terpisah secara alamiah.

### 1.2 Solusi Produk
**EduCluster AI** adalah platform analitik web modern berbasis kecerdasan buatan dan penambangan data (*data mining*) yang dirancang khusus untuk tenaga pengajar. Platform ini memanfaatkan algoritma **K-Means Clustering** untuk mengelompokkan siswa secara otomatis ke dalam kategori **Tinggi**, **Sedang**, dan **Rendah**, serta memvalidasi kualitas pemisahan kelompok secara matematis menggunakan **Silhouette Coefficient**.

---

## 2. Karakteristik Pengguna & Persona

Platform dirancang dengan arsitektur **Userless (Tanpa Registrasi/Login)** untuk meminimalkan hambatan adopsi:

1. **Guru Mata Pelajaran / Wali Kelas:**
   - *Tujuan:* Mengunggah berkas nilai siswa kelasnya, melihat siswa yang membutuhkan bimbingan intensif/remedial, dan mengunduh laporan akademik per kelas.
   - *Kebutuhan:* Alur kerja cepat, tampilan visual mudah dipahami tanpa perlu memahami statistik rumit.
2. **Koordinator Kurikulum / Kepala Sekolah:**
   - *Tujuan:* Memantau ringkasan mutu belajar per periode/semester, melihat rasio siswa berprestasi tinggi vs rendah, serta mencetak dokumen resmi bertanda tangan.
   - *Kebutuhan:* Laporan formal siap cetak (PDF), visualisasi ringkas, dan kepastian objektivitas pengelompokan.
3. **Akademisi / Penguji Skripsi:**
   - *Tujuan:* Menguji ketepatan algoritma, justifikasi pemilihan nilai $k$, dan pembuktian matematis formula Silhouette.
   - *Kebutuhan:* Edukasi rumus interaktif, visualisasi sebaran 2D terhadap centroid, serta fitur uji nilai $k$ optimal (Elbow Method & Silhouette vs $k$).

---

## 3. Alur Kerja Pengguna (*User Journey*)

```
[Mulai]
   │
   ▼
[Halaman Import Data (/)] ───► Unggah CSV / XLSX (atau Muat Data Contoh)
   │
   ├─► Pratinjau Baris Data Mentah & Agregasi Siswa Unik
   ├─► Pilih Mode Ruang Fitur: Matriks 3D [H, UTS, UAS] atau 1D [Nilai Akhir]
   ├─► Tentukan Periode Analisis (Cache Key)
   │
   ▼
[Eksekusi Server Action: runClusteringAction]
   │
   ├─► Upsert Master Siswa, Mapel, dan Nilai ke PostgreSQL Supabase
   ├─► Komputasi K-Means Multi-Restart (n_init = 5)
   ├─► Sorting Centroid Deterministik (Tinggi > Sedang > Rendah)
   ├─► Komputasi Silhouette Coefficient per Siswa dan Rata-rata
   └─► Simpan Snapshot ke Tabel hasil_clustering
   │
   ▼
[Redirect Otomatis ke Dashboard (/dashboard)]
   │
   ├─► Pemuatan Instan (< 1 Detik)
   ├─► Kartu Metrik Utama & Skor Silhouette
   ├─► 4 Grafik Interaktif: Bar, Radar, Donut, dan Scatter Plot 2D (+Centroid Marker)
   ├─► Tabel Ringkasan Centroid & Rekomendasi Tindak Lanjut Sekolah
   └─► Fitur Uji Nilai k Optimal (Elbow WCSS & Silhouette vs k)
   │
   ▼
[Halaman Detail Hasil & Laporan (/laporan)]
   │
   ├─► Pencarian Cepat (Nama, NIS, Kelas)
   ├─► Filter Berdasarkan Kategori Klaster
   ├─► Filter Khusus Siswa Ambigu / Rawan (s(i) < 0.2)
   ├─► Ekspor Berkas Excel (.xlsx) dengan Lebar Kolom Terformat
   └─► Ekspor PDF / Cetak Laporan Formal dengan Kop & Kolom Tanda Tangan
```

---

## 4. Kebutuhan Fungsional (*Functional Requirements*)

### FR-1: Impor Berkas Fleksibel & Parser Multi-Format
- Sistem harus menerima berkas berformat **CSV** (via `PapaParse`) dan **Excel `.xlsx` / `.xls`** (via `SheetJS/xlsx`).
- Sistem wajib memvalidasi ketersediaan header wajib: `nis`, `nama_lengkap`, `kelas`, `kode_mapel`, `nama_mapel`, `nilai_harian`, `nilai_uts`, `nilai_uas`, dan `semester`.
- Sistem wajib menolak dan memberikan pesan galat spesifik jika terdapat nilai di luar rentang $0 - 100$ atau baris NIS kosong.
- Menyediakan tombol instan **"Unduh Template CSV"** dan **"Muat 20 Data Dummy"**.

### FR-2: Kalkulasi Otomatis Nilai Akhir
- Nilai akhir siswa per mata pelajaran dihitung secara otomatis dengan pembobotan akademik standar:
  $$\text{Nilai Akhir} = (30\% \times \text{Nilai Harian}) + (30\% \times \text{Nilai UTS}) + (40\% \times \text{Nilai UAS})$$
- Jika satu siswa memiliki lebih dari satu mata pelajaran pada berkas, sistem melakukan agregasi rata-rata per siswa sebelum klasterisasi.

### FR-3: Mesin Komputasi K-Means Clustering Stabil
- Mendukung dua pilihan ruang fitur:
  - **Matriks 3D:** Fitur komputasi berupa vektor $[ \text{Nilai Harian}, \text{Nilai UTS}, \text{Nilai UAS} ]$.
  - **1 Dimensi:** Fitur komputasi berupa $[ \text{Nilai Akhir} ]$.
- Menggunakan inisialisasi **K-Means++** untuk sebaran titik awal yang representatif.
- Menjalankan **Multi-Restart ($n_{\text{init}} = 5$)** untuk memilih hasil iterasi dengan WCSS (*Within-Cluster Sum of Squares*) terkecil sehingga hasil selalu konsisten.
- Mengurutkan centroid pasca-konvergensi secara otomatis agar label `'Tinggi'`, `'Sedang'`, dan `'Rendah'` selalu berkorelasi lurus dengan rata-rata nilai akhir tertinggi ke terendah.

### FR-4: Pengujian Validitas Silhouette Coefficient
- Menghitung nilai jarak intra-klaster $a(i)$ dan jarak inter-klaster terdekat $b(i)$ untuk setiap siswa $i$:
  $$s(i) = \frac{b(i) - a(i)}{\max(a(i), b(i))}$$
- Menghitung rata-rata skor Silhouette seluruh populasi ($S_{\text{avg}}$) dan menetapkan interpretasi standar Kaufman & Rousseeuw:
  - $S_{\text{avg}} > 0.5$: *Sangat Baik (Struktur Klaster Kuat)*
  - $0.35 < S_{\text{avg}} \le 0.5$: *Baik (Pemisahan Wajar)*
  - $0.2 < S_{\text{avg}} \le 0.35$: *Cukup (Sedikit Tumpang Tindih)*
  - $S_{\text{avg}} \le 0.2$: *Buruk (Struktur Klaster Lemah)*

### FR-5: Uji Nilai $k$ Optimal (Elbow Method & Silhouette vs $k$)
- Menyediakan pengujian otomatis untuk $k = 2, 3, 4, 5$.
- Menghasilkan dua grafik garis: WCSS vs $k$ (Elbow) dan Skor Silhouette Rata-rata vs $k$.
- Memberikan rekomendasi nilai $k$ terbaik berdasarkan skor Silhouette maksimum.

### FR-6: Dashboard Visualisasi Interaktif
- **Top Metric Cards:** Total siswa, Skor Silhouette + badge kualitas, dan kuantitas siswa di tiap klaster.
- **Bar Chart:** Komparasi jumlah siswa di klaster Tinggi, Sedang, dan Rendah.
- **Radar Chart:** Perbandingan profil kompetensi (Rata Harian, UTS, UAS) antar klaster.
- **Donut Chart:** Proporsi persentase siswa per klaster.
- **2D Scatter Plot:** Sebaran koordinat siswa (Sumbu X: Nilai Akhir, Sumbu Y: Skor Silhouette) dilengkapi penanda bintang kuning ($\bigstar$) untuk titik pusat centroid.
- **Tabel Ringkasan Centroid:** Menampilkan nilai centroid per komponen dan rekomendasi tindak lanjut sekolah (Pengayaan, Pemantapan, atau Remedial).

### FR-7: Laporan Akademik, Filter & Ekspor
- Tabel data lengkap dengan penomoran, NIS, Nama, Kelas, Rincian Nilai, Label Klaster, Jarak Centroid, dan Skor $s(i)$.
- Pencarian multi-kolom (Nama, NIS, Kelas) dan paginasi (15 baris per halaman).
- Filter klaster (`ALL`, `Tinggi`, `Sedang`, `Rendah`).
- **Filter Khusus Siswa Ambigu:** Menampilkan hanya siswa dengan $s(i) < 0.2$ yang ditandai dengan latar belakang merah muda dan ikon peringatan.
- **Ekspor Excel (.xlsx):** Menghasilkan berkas Excel terformat rapi dengan lebar kolom presisi.
- **Ekspor PDF / Cetak:** Layout formal siap cetak dengan kop dokumen resmi, tanpa navigasi aplikasi, dan dilengkapi kolom tanda tangan Kepala Sekolah & Koordinator Akademik.

### FR-8: Edukasi Algoritma & Simulator Interaktif
- Halaman edukasi yang menyajikan landasan teori K-Means, jarak Euclidean, pembuktian konvergensi, dan rumus Silhouette.
- Simulator interaktif koefisien Silhouette dengan slider $a(i)$ dan $b(i)$ yang menghitung skor $s(i)$ secara *real-time*.

### FR-9: Mode Gelap & Terang (Dark / Light Mode)
- Switcher tema instan di sidebar desktop dan header mobile.
- Penyimpanan preferensi pengguna di `localStorage`.
- Script pencegah FOUC (*Flash of Unstyled Content*) di `<head>`.
- Override stylesheet cetak yang memastikan dokumen tetap dicetak di atas kertas putih murni dengan teks hitam.

---

## 5. Kebutuhan Non-Fungsional (*Non-Functional Requirements*)

| Kategori | Spesifikasi |
| :--- | :--- |
| **Performa** | Pemuatan dashboard dari cache database $\le 1.0$ detik. Komputasi K-Means 500 siswa $\le 500$ ms di server. |
| **Keandalan** | Dual-layer persistence: Berjalan penuh dengan cache memori jika kredensial Supabase belum diisi. Tidak ada crash fatal jika database offline. |
| **Keamanan** | Komputasi K-Means dan Silhouette dilindungi `server-only` agar logika tidak bocor atau dimanipulasi di sisi client. |
| **Aksesibilitas & UI** | Tata letak sepenuhnya responsif dari layar smartphone (360px), tablet, hingga layar desktop lebar (1920px). |
| **Kompatibilitas Browser** | Berjalan sempurna pada Google Chrome, Mozilla Firefox, Safari, dan Microsoft Edge versi modern. |
