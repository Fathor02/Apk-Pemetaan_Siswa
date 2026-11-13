# 🏗️ System Architecture
## EduCluster AI - Topologi Sistem, Pipeline Data, dan Pipeline Komputasi

---

## 1. Ringkasan Arsitektur

EduCluster AI dibangun di atas **Next.js 15 App Router** dengan pola **Server-First Architecture**: seluruh komputasi algoritma berat (K-Means, Silhouette) dieksekusi di server melalui **Server Actions**, sementara client hanya bertugas menampilkan hasil dan mengirim berkas mentah.

```
┌────────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                            │
│  React 19 + Tailwind + Recharts + Sonner                           │
│  Halaman: / (Upload) · /dashboard · /laporan · /edukasi            │
│  DILARANG mengimpor: kmeans.ts / silhouette.ts / clusterEngine.ts  │
└───────────────┬────────────────────────────────────────────────────┘
                │ RawNilaiRecord[] via Server Actions
                ▼
┌────────────────────────────────────────────────────────────────────┐
│              SERVER (Next.js Server / Node.js Runtime)             │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ Server Actions Layer — src/app/actions/clustering.ts         │ │
│  │  'use server'                                                │ │
│  │  · runClusteringAction   · testOptimalKAction                │ │
│  │  · getLatestClusteringAction · getSampleDataAction           │ │
│  │  · resetDataAction                                           │ │
│  └──────────────┬───────────────────────────┬───────────────────┘ │
│                 ▼                           ▼                     │
│  ┌──────────────────────────┐  ┌─────────────────────────────────┐│
│  │ PERSISTENCE LAYER        │  │ COMPUTATION ENGINE (server-only)││
│  │ src/lib/db.ts            │  │                                 ││
│  │  · upsertDataAkademik    │  │ src/lib/clusterEngine.ts        ││
│  │  · cacheClusteringResult │  │  · processClustering            ││
│  │  · getCachedClustering   │  │  · testOptimalK                 ││
│  │  · resetAllDatabaseData  │  │        │                        ││
│  │        │                 │  │        ▼                        ││
│  │        ▼                 │  │ src/lib/kmeans.ts               ││
│  │ ┌──────────────────────┐ │  │  · runKMeansStable (n_init=5)   ││
│  │ │  Supabase Client     │ │  │  · rankClustersByNilaiAkhir     ││
│  │ │  (PostgreSQL)        │ │  │  · euclideanDistance            ││
│  │ │  siswa               │ │  │        │                        ││
│  │ │  mata_pelajaran      │ │  │        ▼                        ││
│  │ │  nilai_akademik      │ │  │ src/lib/silhouette.ts           ││
│  │ │  hasil_clustering    │ │  │  · computeSilhouette (a, b, s)  ││
│  │ └──────────────────────┘ │  │        │                        ││
│  │  + In-Memory Fallback    │  │        ▼                        ││
│  │    (jika belum config)   │  │ ClusteringResult (JSON-able)    ││
│  └──────────────────────────┘  └─────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

**Prinsip pengaman:** ketiga modul engine memuat `import 'server-only'`, sehingga jika ada komponen client mencoba mengimpornya, **proses build gagal** secara otomatis. Komunikasi client ↔ engine hanya melalui Server Actions.

---

## 2. Struktur Direktori

```
src/
├── app/
│   ├── layout.tsx              # Root layout: ThemeProvider, Navigation, Toaster, anti-FOUC script
│   ├── page.tsx                # Halaman Upload & Eksekusi ('use client')
│   ├── globals.css             # Tailwind + dark mode overrides + print stylesheet
│   ├── actions/
│   │   └── clustering.ts       # SEMUA Server Actions ('use server')
│   ├── api/clustering/sample/
│   │   └── route.ts            # GET: unduh template CSV
│   ├── dashboard/page.tsx      # Visualisasi & metrik ('use client')
│   ├── laporan/page.tsx        # Tabel, filter, ekspor Excel & cetak ('use client')
│   └── edukasi/page.tsx        # Teori & simulator Silhouette ('use client')
├── components/
│   ├── Navigation.tsx          # Sidebar + drawer mobile + ThemeToggle
│   ├── ThemeToggle.tsx         # ThemeProvider + tombol tema (localStorage)
│   ├── FileUpload.tsx          # Drag-drop, parse CSV/XLSX, template, dummy
│   ├── RawDataPreview.tsx      # Pratinjau baris mentah
│   └── SupabaseBanner.tsx      # Status DB + panduan SQL setup
├── lib/
│   ├── parser.ts               # PapaParse + SheetJS + validator + aggregator
│   ├── kmeans.ts        [server-only]  # K-Means++, multi-restart, WCSS, ranking centroid
│   ├── silhouette.ts    [server-only]  # Koefisien Silhouette (a, b, s)
│   ├── clusterEngine.ts [server-only]  # Orkestrasi: agregasi → KMeans → ranking → silhouette
│   ├── db.ts                   # Supabase persistence + in-memory fallback
│   ├── supabase.ts             # Client publik + admin (service role)
│   └── sampleData.ts           # Generator 20 data dummy deterministik
└── types/
    └── index.ts                # Seluruh interface domain
```

---

## 3. Pipeline Data End-to-End

```
[Berkas CSV / XLSX]
        │  (Client: FileUpload.tsx)
        ▼
[Parsing & Validasi]  parser.ts
   · CSV  → PapaParse (header: true, skipEmptyLines)
   · XLSX → SheetJS sheet_to_json (defval: '')
   · validateAndMapRow: wajib nis, nama, kelas, mapel;
     nilai 0–100; hitung nilai_akhir = 0.3H + 0.3UTS + 0.4UAS
        │
        ▼  RawNilaiRecord[]
[Server Action: runClusteringAction(records, mode, periode)]
        │
        ├──(1)──► upsertDataAkademik()  → Supabase / memorySiswa
        │            · upsert siswa (onConflict: nis)
        │            · upsert mata_pelajaran (onConflict: kode_mapel)
        │            · delete nilai lama siswa tsb → insert nilai baru
        │
        ├──(2)──► processClustering()   → lihat §4 (Pipeline Komputasi)
        │
        ├──(3)──► cacheClusteringResult()
        │            · memoryCacheResults[periode] & ['latest']
        │            · Supabase: delete hasil per periode → insert batch
        │
        └──(4)──► revalidatePath('/dashboard', '/laporan', '/')
        │
        ▼
[Redirect → /dashboard]
        │
        ▼
[Server Action: getLatestClusteringAction('latest')]
   · memory hit  → instan (< 1 ms)
   · DB fallback → join hasil_clustering ⨝ siswa,
     rekonstruksi ClusteringResult + interpretasi Silhouette
        │
        ▼
[Render Dashboard / Laporan]
```

---

## 4. Pipeline Komputasi K-Means & Silhouette (Server-Only)

```
processClustering(records, { mode, periode })
        │
        ▼
[1. AGREGASI]  aggregateBySiswa()
   · Kelompokkan baris mentah per NIS
   · Rata-rata harian / UTS / UAS / nilai akhir per siswa
   · Validasi: minimal 3 siswa unik (k = 3)
        │
        ▼
[2. EKSTRAKSI FITUR]
   · Mode '3D': [harian_avg, uts_avg, uas_avg]
   · Mode '1D': [nilai_akhir_avg]
        │
        ▼
[3. K-MEANS STABIL]  runKMeansStable(points, k=3, maxIter=100, n_init=5)
   · Inisialisasi: K-Means++ (probabilitas ∝ D(x)²)
   · Loop: assign → update centroid → cek konvergensi (< 1e-4)
   · Ulangi 5x dengan seed acak berbeda → pilih WCSS terkecil
        │
        ▼
[4. LABELING DETERMINISTIK]  rankClustersByNilaiAkhir()
   · Skor centroid = 0.3·c₀ + 0.3·c₁ + 0.4·c₂  (1D: rerata vektor)
   · Urutkan menurun → Tinggi, Sedang, Rendah
   · ASSERTION: Tinggi ≥ Sedang ≥ Rendah, else THROW
        │
        ▼
[5. SILHOUETTE]  computeSilhouette(points, labels)
   · a(i) = rerata jarak ke sesama anggota klaster
   · b(i) = min rerata jarak ke klaster lain
   · s(i) = (b − a) / max(a, b)
   · S_avg + interpretasi Kaufman & Rousseeuw
        │
        ▼
[6. PACKAGING]  ClusteringResult
   · clusters[]: label, warna, centroid (2 desimal), count, %
   · students[]: nilai, jarak centroid, a, b, s per siswa
   · metadata: iterations, converged, silhouetteAvg, periode, timestamp
```

### 4.1 Perhitungan WCSS (*Within-Cluster Sum of Squares*)
$$WCSS = \sum_{i=1}^{n} \lVert x_i - c_{label(i)} \rVert^2$$
Digunakan untuk (a) pemilihan run terbaik pada multi-restart, dan (b) kurva Elbow pada uji $k$ optimal.

### 4.2 Uji Nilai $k$ Optimal — `testOptimalK()`
- Loop $k = 2 \ldots \min(maxK, n-1)$; untuk tiap $k$ jalankan `runKMeansStable` + `computeSilhouette`.
- Output: tabel `{k, silhouetteAvg, wcss, iterations, converged}` + `recommendedK` = $k$ dengan Silhouette maksimum.

---

## 5. Keputusan Arsitektur (*Architecture Decision Records*)

| # | Keputusan | Alasan |
| :--- | :--- | :--- |
| 1 | **Server Actions** alih-alih REST API | Menghilangkan boilerplate endpoint; type-safety penuh TypeScript dari client ke server. |
| 2 | **Paket `server-only`** pada engine | Perlindungan mekanis: kode algoritma mustahil terekspos ke bundle browser. |
| 3 | **K-Means Multi-Restart ($n_{init}=5$)** | Inisialisasi acak K-Means++ bisa menghasilkan local optima; multi-restart + seleksi WCSS menjamin konsistensi hasil antar eksekusi. |
| 4 | **Ranking centroid via Nilai Akhir berbobot (30:30:40)**, bukan rerata vektor polos | Label klaster harus selaras dengan metrik resmi sekolah; rerata polos dapat salah urut karena UAS berbobot lebih besar. |
| 5 | **Dual-layer persistence (Supabase + memory)** | Aplikasi tetap demo-able tanpa kredensial; transisi ke produksi hanya dengan mengisi `.env.local`. |
| 6 | **Snapshot per periode + delete-insert** | Menjamin idempotensi: eksekusi ulang periode sama tidak menimbulkan duplikat baris. |
| 7 | **Dark mode berbasis `class` + localStorage** | Kompatibel dengan SSR Next.js; script inline mencegah FOUC. |
| 8 | **Cetak via CSS `@media print`**, bukan library PDF | Tanpa dependensi tambahan; hasil cetak identik dokumen resmi sekolah. |

---

## 6. Skalabilitas & Batasan

- **Kompleksitas komputasi:** K-Means $O(n \cdot k \cdot d \cdot iter)$; Silhouette naif $O(n^2)$ → optimal untuk $n \le \sim 2.000$ siswa per periode. Untuk data lebih besar, pertimbangkan sampling atau versi accelerated (mis. silhousette berbasis triangulasi).
- **Rencana pengembangan lanjutan (sesuai PRD):** pemilih periode historis (data per periode sudah tersimpan di DB), komparasi tren antar periode, dan highlight siswa naik/turun klaster.

---

## 7. Validasi Silang Engine (Opsional)

Engine produksi tetap **100% implementasi sendiri** (tidak memakai library ML). Untuk pembuktian akademik, tersedia script yang membandingkan hasil engine dengan library `ml-kmeans` pada dataset uji yang sama:

```bash
npm run verify:kmeans
```

- **Lokasi script:** `scripts/verify-kmeans.mjs`
- **Dependensi:** `ml-kmeans` + `tsx` hanya **devDependencies** → tidak ikut ke bundle produksi.
- **Cara kerja:** script mengimpor langsung `src/lib/kmeans.ts` dan `src/lib/silhouette.ts` (dijalankan dengan flag `--conditions=react-server` agar `server-only` tidak melempar error di luar Next.js).

Yang diperiksa:

| # | Pemeriksaan | Toleransi |
| :--- | :--- | :--- |
| 1 | Kesesuaian partisi klaster (setelah pemetaan indeks) | 0 siswa berbeda |
| 2 | Selisih maksimum centroid | ≤ 1e-6 |
| 3 | Selisih WCSS eksak | ≤ 1e-6 |
| 4 | Selisih Silhouette rata-rata & per siswa vs implementasi independen di script | ≤ 1e-9 |
| 5 | Urutan label Tinggi ≥ Sedang ≥ Rendah | Wajib benar |

Script keluar dengan kode `1` bila ada pemeriksaan gagal, sehingga bisa dipakai di CI. Contoh keluaran: **`LULUS — implementasi identik dengan ml-kmeans`** (24/24 siswa, selisih centroid 0).

> Catatan: jumlah iterasi bisa berbeda karena `ml-kmeans` menghitung tolerance pada jarak kuadrat, sedangkan engine memakai jarak Euclidean. Partisi akhir dan centroid tetap dibandingkan secara eksak.
