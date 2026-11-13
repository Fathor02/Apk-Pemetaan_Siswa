# BAB III: METODE PENELITIAN
## DOKUMENTASI PERANCANGAN SISTEM DAN ALGORITMA (DUAL-MODE)

---

## 3.1 Diagram Tahapan Pengembangan Sistem (Waterfall Model)

```text
+-------------------------------------------------------------------------+
|                          1. ANALISIS SISTEM                             |
|  • Analisis Kebutuhan Fungsional (Dual-Mode: Admin & Pengguna)          |
|  • Analisis Kebutuhan Non-Fungsional (Performa < 1s, Usability, Security)|
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                           2. DESAIN SISTEM                              |
|  • Pemodelan UML (Use Case, Activity, Sequence, Class Diagram)          |
|  • Perancangan Flowchart Pemrosesan & Algoritma (Dual-Mode Routing)     |
|  • Perancangan Antarmuka (Dark Mode Glassmorphism Dashboard)            |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                     3. IMPLEMENTASI DAN PENGUJIAN                       |
|  • Pemrograman Next.js App Router, Server Actions, & Supabase PostgreSQL|
|  • Pengujian Black-Box & Evaluasi Akurasi Silhouette Coefficient         |
+-------------------------------------------------------------------------+
```

### Penjelasan Diagram Tahapan:
1. **Tahap Analisis Sistem:** Mengidentifikasi data akademik yang dibutuhkan ($N_H, N_{UTS}, N_{UAS}$) serta merumuskan arsitektur *Hybrid Processing* (*Dual-Mode*) yang memisahkan penyimpanan permanen sekolah mitra (**Admin**) dengan pemrosesan sementara (**Pengguna**).
2. **Tahap Desain Sistem:** Merancang struktur data relasional (termasuk entitas `Admin`), alur percabangan logika K-Means, serta interaksi antarmuka berbasis pemodelan UML.
3. **Tahap Implementasi dan Pengujian:** Mengimplementasikan kode program pada arsitektur *Server Actions* dan melakukan validasi komputasi klaster serta isolasi *database*.

---

## 3.2 Flowchart Sistem (Diagram Alir Pemrosesan Dual-Mode)

```text
       ┌────────────────────────┐
       │         START          │
       └───────────┬────────────┘
                   │
                   ▼
       ┌────────────────────────┐
       │ Admin / Pengguna       │
       │ Unggah Berkas CSV/XLSX │
       └───────────┬────────────┘
                   │
                   ▼
       ┌────────────────────────┐
       │ Parsing Berkas & Cek   │
       │ Format Kolom/Tipe Data │
       └───────────┬────────────┘
                   │
                   ▼
         /───────────────────\
        /  Apakah Data Valid  \  TIDAK  ┌────────────────────────┐
       <   & Nilai 0 - 100?    >───────►│ Tampilkan Toast Error  │
        \                     /         │   "Format Invalid"     │
         \───────────────────/          └───────────┬────────────┘
                   │ YA                             │
                   ▼                                │
       ┌────────────────────────┐                   │
       │ Hitung Nilai Akhir:    │                   │
       │ NA=0.3NH+0.3UTS+0.4UAS │                   │
       └───────────┬────────────┘                   │
                   │                                │
                   ▼                                │
       ┌────────────────────────┐                   │
       │ Inisialisasi Centroid  │                   │
       │ K-Means++ Multi-Restart│                   │
       │ (k=3, n_init=5)        │                   │
       └───────────┬────────────┘                   │
                   │                                │
                   ▼                                │
       ┌────────────────────────┐                   │
       │ Hitung Jarak Euclidean │                   │
       │ & Alokasi Klaster      │                   │
       └───────────┬────────────┘                   │
                   │                                │
                   ▼                                │
       ┌────────────────────────┐                   │
       │ Update Posisi Centroid │                   │
       │ (Rerata Anggota)       │                   │
       └───────────┬────────────┘                   │
                   │                                │
                   ▼                                │
         /───────────────────\                      │
        /   Apakah ΔCentroid   \  TIDAK              │
       <   < 1e-4 atau iterasi  >─────────┐          │
        \   mencapai max?     /           │          │
         \───────────────────/            │          │
                   │ YA                   │          │
                   ▼                      │          │
       ┌────────────────────────┐        │          │
       │ Pilih Run Terbaik      │◄───────┘          │
       │ (WCSS Terkecil)        │                   │
       └───────────┬────────────┘                   │
                   │                                │
                   ▼                                │
       ┌────────────────────────┐                   │
       │ Urutkan Label Centroid │                   │
       │ (Tinggi, Sedang,       │                   │
       │  Rendah) via NA Berbobot│                  │
       └───────────┬────────────┘                   │
                   │                                │
                   ▼                                │
       ┌────────────────────────┐                   │
       │ Hitung Skor Validitas  │                   │
       │ Silhouette Coefficient │                   │
       └───────────┬────────────┘                   │
                   │                                │
                   ▼                                │
         /───────────────────\                      │
        /   Apakah Sesi Berada \  TIDAK (Pass-Through)
       <   dalam Mode Admin?    >────────┐          │
        \                     /          │          │
         \───────────────────/           │          │
                   │ YA                  │          │
                   ▼                     │          │
       ┌────────────────────────┐        │          │
       │ Simpan Master Data &   │        │          │
       │ Cache hasil_clustering │        │          │
       └───────────┬────────────┘        │          │
                   │                     │          │
                   ▼                     │          │
       ┌────────────────────────┐        │          │
       │ Render Dashboard &     │◄───────┘          │
       │ Grafik Scatter Plot    │                   │
       └───────────┬────────────┘                   │
                   │                                │
                   ▼                                │
       ┌────────────────────────┐                   │
       │          END           │◄──────────────────┘
       └────────────────────────┘
```

### Penjelasan Flowchart Sistem:
1. **Tahap Pra-pemrosesan & Komputasi:** Baik **Admin** maupun **Pengguna** dapat mengunggah berkas CSV/XLSX. Sistem memvalidasi rentang nilai ($0 \le N \le 100$), menghitung *Nilai Akhir* ($NA$), menjalankan iterasi *K-Means Clustering* ($k=3$) dengan inisialisasi **K-Means++ Multi-Restart** ($n_{init}=5$, dipilih run dengan WCSS terkecil) hingga konvergen ($\Delta\mu < 10^{-4}$), mengurutkan label klaster berdasarkan Nilai Akhir berbobot, dan menghitung skor *Silhouette Coefficient*.
2. **Percabangan Dual-Mode (*Routing* Penyimpanan):**
   * **Mode Admin (YA):** Sesi terautentikasi (cookie sesi HMAC). Sistem menyimpan data siswa, nilai akademik, dan *cache* hasil klasterisasi secara permanen ke dalam *database* PostgreSQL Supabase.
   * **Mode Pengguna / Pass-Through (TIDAK):** Tanpa sesi Admin, sistem melewatkan seluruh langkah penulisan *database* dan langsung mengirim hasil komputasi dari memori (*in-memory*) ke layar *dashboard* pengguna — tidak ada jejak data yang tersimpan.

---

## 3.3 Use Case Diagram & Spesifikasi Use Case

```text
                    +-------------------------------------------------------+
                    |         SISTEM PEMETAAN HASIL BELAJAR SISWA           |
                    |                                                       |
   +---------------+│   (( UC-01: Login Admin ))                            |
   |               |│                                                       |
   |     ADMIN     |│   (( UC-02: Unggah Berkas CSV/XLSX )) ────────┐       |
   |               |│          │                  │                 │       |
   +---------------+│   (include)          (include)                │       |
      │    │    │   |│          v                  v                 │       |
      │    │    │   |│   (( UC-03: Hitung   (( UC-04: Eksekusi      │       |
      │    │    │   |│     NA Otomatis ))     K-Means & Silhouette))│       |
      │    │    │   |│                                              │       |
      │    │    ├───┼─► (( UC-05: Tampilkan Dashboard & Plot )) ◄───┼───┐   |
      │    │    │   |│                                              │   │   |
      │    │    └───┼─► (( UC-06: Ekspor Laporan Excel/PDF )) ◄─────┼───┤   |
      │    │        |│                                              │   │   |
      │    └────────┼─► (( UC-07: Kelola & Edit Data Siswa ))       │   │   |
      │             |│                                              │   │   |
      └─────────────┼─► (( UC-08: Reset Data Sekolah ))             │   │   |
                    |│                                              │   │   |
                    +-----------------------------------------------┼───┼---+
                                                                    │   │
                                                           +--------+---+--------+
                                                           |      PENGGUNA       |
                                                           |   (Sekolah Lain)    |
                                                           +---------------------+
```

### Tabel 3.1 Spesifikasi Use Case Utama

| ID Use Case | Nama Use Case | Aktor | Deskripsi Fungsional |
| :--- | :--- | :--- | :--- |
| **UC-01** | Login Admin | Admin | Melakukan autentikasi (password tunggal + cookie sesi HMAC) untuk masuk ke mode pengelolaan sekolah utama. |
| **UC-02** | Unggah Berkas CSV/XLSX | Admin, Pengguna | Mengunggah dataset nilai. Menyimpan ke DB jika Admin, atau memproses *pass-through* tanpa penyimpanan jika Pengguna. |
| **UC-03** | Hitung NA Otomatis | Sistem (Server) | Menghitung otomatis $NA = 0.30 N_H + 0.30 N_{UTS} + 0.40 N_{UAS}$ (*include* dari UC-02). |
| **UC-04** | Eksekusi K-Means & Silhouette | Sistem (Server) | Mengelompokkan data ($k=3$, K-Means++ multi-restart) dan menghitung validitas klaster (*include* dari UC-02). |
| **UC-05** | Tampilkan Dashboard & Plot | Admin, Pengguna | Menampilkan visualisasi *scatter plot*, statistik distribusi klaster, dan tabel rincian siswa. |
| **UC-06** | Ekspor Laporan Excel & Cetak PDF | Admin, Pengguna | Mengunduh hasil pemetaan ke berkas Excel, atau mencetak laporan resmi (kop, tanda tangan) menjadi PDF via *print browser*. |
| **UC-07** | Kelola & Edit Data Siswa | Admin | Melihat daftar siswa terkelola, mengubah nilai per mapel (harian/UTS/UAS), dan menghapus siswa. Setiap perubahan otomatis memicu perhitungan ulang klaster dan pembaruan *cache* hasil. |
| **UC-08** | Reset Data Sekolah | Admin | Menghapus seluruh data dan *cache* hasil klasterisasi sekolah utama pada *database* (ditolak untuk Pengguna). |
| **UC-09** | Uji Nilai $k$ Optimal | Admin, Pengguna | Menguji $k = 2..5$ dan merekomendasikan $k$ dengan Silhouette tertinggi (kurva Elbow WCSS + Silhouette per $k$). |

---

## 3.4 Activity Diagram (Swimlane Processing Dual-Mode)

```text
[  AKTOR: ADMIN / PENGGUNA  ]        [ SERVER ACTION (NEXT.JS) ]        [ DATABASE SUPABASE ]
              │                                   │                               │
 (1) Pilih & Unggah CSV/XLSX                      │                               │
              │                                   │                               │
 (2) Kirim File ke Server ───────────────────────>│                               │
                                                  │                               │
                                         (3) Validasi Nilai 0-100                 │
                                             & Hitung Nilai Akhir (NA)            │
                                                  │                               │
                                         (4) Eksekusi K-Means (k=3)               │
                                             & Silhouette Coefficient             │
                                                  │                               │
                                            /───────────\                         │
                                           / Mode Admin? \ ─── Ya (Simpan) ──────>│
                                           \             /                        │
                                            \───────────/                (5) Simpan Master Data
                                                  │                          & Cache Klaster
                                         Tidak (Pass-Through)                     │
                                                  │                               │
                                                  ▼                               │
 (6) Render Dashboard & Grafik <──────────────────┴───────────────────────────────┘
              │
              ▼
            (END)
```

### Penjelasan Activity Diagram:
* **Admin / Pengguna:** Memulai aktivitas dengan mengunggah berkas CSV/XLSX melalui antarmuka klien.
* **Server Action (Next.js):** Mengeksekusi seluruh tahapan validasi data, pembobotan nilai akhir, serta algoritma *K-Means* dan *Silhouette Coefficient* secara terisolasi di sisi server.
* **Percabangan Mode (*Decision Node*):** Jika sesi terautentikasi sebagai **Admin**, *Server Action* menuliskan data dan *cache* klaster ke **Database Supabase**. Sebaliknya, jika diakses oleh **Pengguna** umum, data langsung dikembalikan ke antarmuka untuk dirender tanpa menyentuh *database*.

---

## 3.5 Sequence Diagram (Interaksi Berbasis Waktu Dual-Mode)

```text
[Admin]      [Pengguna]     [Client UI]     [Server Action]     [K-Means Engine]     [Supabase DB]
   │             │               │                 │                    │                  │
   │=== SKENARIO 1: MODE ADMIN (PENYIMPANAN & PENGELOLAAN DATABASE) =======================│
   │ 1. Login & Unggah CSV/XLSX  │                 │                    │                  │
   ├─────────────┼──────────────►│                 │                    │                  │
   │             │               │ 2. runClusteringAction()             │                  │
   │             │               ├────────────────►│                    │                  │
   │             │               │                 │ 3. processClustering()               │
   │             │               │                 ├───────────────────►│                  │
   │             │               │                 │ 4. Return Results  │                  │
   │             │               │                 │◄───────────────────┤                  │
   │             │               │                 │ 5. Simpan Data & Cache                │
   │             │               │                 ├────────────────────┼─────────────────►│
   │             │               │                 │ 6. Status OK       │                  │
   │             │               │                 │◄───────────────────┼──────────────────┤
   │             │               │ 7. Render Dashboard                  │                  │
   │◄────────────┴───────────────┤◄────────────────┤                    │                  │
   │ 8. Lihat & Edit Data Siswa  │                 │                    │                  │
   ├─────────────────────────────┼─────────────────┼────────────────────┼─────────────────►│
   │             │               │                 │                    │                  │
   │=== SKENARIO 2: MODE PENGGUNA (PASS-THROUGH / TANPA PENYIMPANAN DB) ===================│
   │             │ 9. Unggah CSV/XLSX              │                    │                  │
   │             ├──────────────►│                 │                    │                  │
   │             │               │ 10. runClusteringAction()            │                  │
   │             │               ├────────────────►│                    │                  │
   │             │               │                 │ 11. processClustering()              │
   │             │               │                 ├───────────────────►│                  │
   │             │               │                 │ 12. Return Memory  │                  │
   │             │               │                 │◄───────────────────┤                  │
   │             │               │ 13. Render Dashboard (Tanpa DB)      │                  │
   │             │◄──────────────┤◄────────────────┤                    │                  │
```

### Penjelasan Sequence Diagram:
1. **Skenario 1 (Mode Admin - Langkah 1–8):** Setelah login (cookie sesi HMAC ±8 jam) dan mengunggah berkas, Server Action `runClusteringAction` mendeteksi sesi Admin, menjalankan pemetaan melalui *K-Means Engine* (`processClustering`), menyimpan hasilnya ke *Supabase DB* (`upsertDataAkademik` + `cacheClusteringResult`), dan memberikan akses penuh kepada Admin untuk memuat ulang data serta *reset*.
2. **Skenario 2 (Mode Pengguna - Langkah 9–13):** Pengguna dari sekolah lain dapat langsung mengunggah berkas tanpa login. Server Action `runClusteringAction` mendeteksi ketiadaan sesi, memproses dataset melalui *K-Means Engine* tanpa menyentuh *Supabase DB* (pass-through), dan mengembalikan hasil langsung ke *Client UI* (disimpan sementara di *sessionStorage* browser agar tetap tampil saat berpindah halaman dashboard/laporan) tanpa menulis data ke *database*.

---

## 3.6 Class Diagram / Struktur Data Relasional

```text
+-----------------------+             +------------------------+
|         Admin         |             |     MataPelajaran      |
+-----------------------+             +------------------------+
| PK  id: UUID          |             | PK  id: UUID           |
|     username: VARCHAR |             | kode_mapel: VARCHAR(50)|
| password_hash: VARCHAR|             | nama_mapel: VARCHAR    |
+-----------------------+             +------------------------+
| +login()              |                         │
| +editNilaiSiswa()     |                         │ 1
| +hapusSiswa()         |                         │
+-----------------------+                         │ 1..*
            │ 1                                   v
            │                         +------------------------+
            │ 0..*                    |     NilaiAkademik      |
            v                         +------------------------+
+-----------------------+        1..* | PK  id: UUID           |
|        Siswa          |-------------| FK  siswa_id: UUID     |
+-----------------------+             | FK  mapel_id: UUID     |
| PK  id: UUID          |             | nilai_harian: FLOAT    |
|     nis: VARCHAR(50)  |             | nilai_uts: FLOAT       |
|     nama_lengkap: STR |             | nilai_uas: FLOAT       |
|     kelas: VARCHAR(50)|             | nilai_akhir: FLOAT     |
+-----------------------+             | semester: INT          |
            │                         +------------------------+
            │ 1
            │
            │ 1..*
            v
+------------------------+
|    HasilClustering     |
+------------------------+
| PK  id: UUID           |
| FK  siswa_id: UUID     |
| klaster: VARCHAR(50)   |
| periode_analisis: VC   |
| jarak_ke_centroid: FLT |
| nilai_silhouette: FLOAT|
| created_at: TIMESTAMPTZ|
+------------------------+
```

### Tabel 3.2 Kamus Data Entitas Relasional

1. **Entitas `Admin`:** Menyimpan kredensial dan metode otoritas pengelola sekolah utama. Attributes: `id` (Primary Key), `username`, `password_hash`. Operations: `login()`, `editNilaiSiswa()`, `hapusSiswa()`.
   > *Catatan implementasi (versi ringan):* pada aplikasi, kredensial Admin disimpan sebagai environment variable server (`ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`) dengan sesi cookie bertanda tangan HMAC-SHA256 — model konseptual memakai entitas `Admin` agar rancangan standar, sedangkan implementasi memakai env var agar sisi Pengguna tetap murni *userless* tanpa tabel keanggotaan.
2. **Entitas `Siswa`:** Menyimpan profil utama siswa yang dikelola Admin. Attributes: `id` (Primary Key), `nis` (Unique Key), `nama_lengkap`, `kelas`.
3. **Entitas `MataPelajaran`:** Menyimpan data subjek akademik. Attributes: `id` (Primary Key), `kode_mapel` (Unique Key), `nama_mapel`.
4. **Entitas `NilaiAkademik`:** Menyimpan rincian komponen nilai. Attributes: `id` (Primary Key), `siswa_id` (Foreign Key), `mapel_id` (Foreign Key), `nilai_harian`, `nilai_uts`, `nilai_uas`, `nilai_akhir` (hasil pembobotan 0.3/0.3/0.4), `semester`.
5. **Entitas `HasilClustering`:** Menyimpan *cache* komputasi *Data Mining* untuk sekolah utama. Attributes: `id` (Primary Key), `siswa_id` (Foreign Key), `klaster` ("Tinggi", "Sedang", "Rendah"), `periode_analisis` (kunci idempotensi snapshot — eksekusi ulang periode sama memakai *delete-then-insert*), `jarak_ke_centroid` (jarak Euclidean titik siswa ke centroid klasternya), `nilai_silhouette` (skor $s(i)$ individual), `created_at`.