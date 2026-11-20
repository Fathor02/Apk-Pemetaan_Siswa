# Prompt AI, Hasil, dan Verifikasi Mandiri

Dokumen ini mencatat penggunaan asisten AI selama pengembangan fitur integrasi API, beserta hasil yang diberikan dan pemeriksaan mandiri yang dilakukan terhadap hasil tersebut.

> Catatan: Prompt di bawah adalah ringkasan dari arahan yang digunakan selama sesi kerja. Sesuaikan dengan prompt asli Anda bila diperlukan untuk pelaporan.

## 1. Daftar prompt dan hasil

### Prompt 1 — Perancangan integrasi

**Prompt**
> "Proyek Next.js 15 App Router untuk pemetaan siswa dengan K-Means dan Silhouette. Rancang satu fitur integrasi API yang sesuai studi kasus, lengkap dengan endpoint, method, parameter, contoh JSON, dan rencana pengujian minimal 3 skenario termasuk kondisi gagal."

**Ringkasan hasil AI**
- Mengusulkan REST API internal `/api/clustering` (POST) yang memanggil engine server-side yang sudah ada.
- Endpoint pendukung: `GET /api/clustering` (metadata) dan `GET /api/clustering/sample` (template CSV).
- Kontrak request: `records[]`, `mode`, `periode`.
- Empat skenario uji: sukses, nilai di luar rentang, siswa < 3, Content-Type salah.

**Verifikasi mandiri**
- ✅ Endpoint tidak menduplikasi algoritma; ia hanya memanggil `processClustering()` yang sudah ada.
- ✅ `records` minimal 3 siswa sesuai batas `k=3` di `clusterEngine.ts` (baris 78–80).
- ✅ Format request sesuai tipe `RawNilaiRecord` di `src/types/index.ts` (kecuali `nilai_akhir` yang memang sengaja dihitung ulang).

---

### Prompt 2 — Implementasi Route Handler

**Prompt**
> "Buatkan Route Handler Next.js 15 untuk POST /api/clustering. Gunakan validateAndMapRow dari parser.ts agar validasi dan Nilai Akhir tetap dihitung di server. Kembalikan response JSON {success, meta, data} dan error terstruktur {success:false, error:{code,message,details}}. Jangan kirim stack trace ke klien."

**Ringkasan hasil AI**
- File `src/app/api/clustering/route.ts` dengan `GET` + `POST` dan `export const runtime = 'nodejs'`.
- Pemeriksaan `Content-Type`, batas 2 MB / 5000 baris, validasi per baris, dan 7 kode error.
- Header `Cache-Control: no-store` dan `X-Content-Type-Options: nosniff`.

**Verifikasi mandiri**
- ✅ `npx tsc --noEmit` → exit `0`.
- ✅ `npm run build` → sukses; jumlah rute bertambah dari 10 menjadi 11.
- ✅ Kode error dipetakan satu per satu ke tabel di `docs/keamanan-dan-error.md`.
- ✅ Tidak ada `console.log` yang mencetak data siswa ke klien; `console.error` hanya di sisi server.

---

### Prompt 3 — Verifikasi kebenaran algoritma

**Prompt**
> "Bagaimana cara membuktikan implementasi K-Means dan Silhouette yang ditulis sendiri sudah benar tanpa menggantinya dengan library di produksi?"

**Ringkasan hasil AI**
- Menambahkan `ml-kmeans` dan `tsx` sebagai **devDependency** saja.
- Membuat `scripts/verify-kmeans.mjs` yang membandingkan partisi, centroid, WCSS, dan Silhouette pada dataset tetap.
- Menjalankan dengan `node --import tsx --conditions=react-server` karena modul engine memakai `import 'server-only'`.

**Verifikasi mandiri (bukti paling kuat)**
- ✅ `npm run verify:kmeans` → **LULUS**.
- ✅ Partisi **24/24** identik dengan library pembanding.
- ✅ Nilai centroid, WCSS, dan Silhouette identik.
- ✅ Library tidak dipakai di kode produksi — sesuai aturan `rules.md`.

---

### Prompt 4 — Audit keamanan sebelum push

**Prompt**
> "Audit file yang akan di-commit ke repository public. Pastikan .env.local tidak ikut, dan tidak ada password admin atau service role key Supabase yang bocor."

**Ringkasan hasil AI**
- Membuat `.gitignore` sebelum `git init`.
- `git ls-files` → hanya `.env.local.example` yang ter-track.
- Grep seluruh file ter-track → hanya placeholder `your-service-role-key` dan default demo.

**Verifikasi mandiri**
- ✅ `git status` bersih; 47 file / 442 KB ter-commit.
- ✅ `raw.githubusercontent.com/.../.env.local` → **404** (file tidak ada di GitHub).
- ✅ `.env.local.example` tersedia sebagai panduan.

---

## 2. Pemeriksaan manual terhadap hasil AI

Selain verifikasi otomatis, dilakukan pengecekan manual berikut:

| Hal | Hasil AI | Pemeriksaan mandiri | Kesimpulan |
| :--- | :--- | :--- | :--- |
| Nilai Akhir Andi | `0.3(90)+0.3(88)+0.4(92)` | Dihitung manual = **90.2** | ✅ Sesuai |
| Urutan label | Tinggi → Sedang → Rendah | Centroid NA tertinggi = Andi (90.2) → `Tinggi` | ✅ Sesuai |
| Batas minimum data | 3 siswa | `processClustering()` melempar error pada 2 siswa | ✅ Sesuai |
| Determinisme | multi-restart `nInit=5` | Dua request identik menghasilkan klaster sama | ✅ Sesuai |
| Lokasi komputasi | server-side | `import 'server-only'` di tiga modul engine | ✅ Sesuai |

## 3. Kesimpulan

Seluruh hasil AI **tidak diterima mentah-mentah**. Setiap keluaran diverifikasi dengan tiga cara:

1. **Kompilasi & build** — `tsc` dan `next build`.
2. **Verifikasi silang** — `npm run verify:kmeans` terhadap implementasi independen.
3. **Perhitungan manual & inspeksi kode** — terutama untuk bobot Nilai Akhir dan urutan label.

Dengan demikian, integrasi API yang dihasilkan dapat dipertanggungjawabkan secara teknis maupun akademik.
