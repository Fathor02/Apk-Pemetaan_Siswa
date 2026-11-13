# 📜 Rules & Coding Standards

Dokumen ini berisi standar rekayasa perangkat lunak, konvensi kode, dan batasan arsitektur teknis yang berlaku pada proyek **EduCluster AI** (Aplikasi Pemetaan Hasil Belajar Siswa Berbasis K-Means Clustering & Silhouette Coefficient).

---

## 1. Aturan Batasan Server vs Client (*Server/Client Boundary*)

### 1.1 Isolasi Komputasi Algoritma (`server-only`)
- Seluruh logika komputasi matematis berat (**K-Means Clustering**, **Silhouette Coefficient**, dan **Optimal $k$ Test**) **HARUS dieksekusi 100% di Server-Side**.
- Modul-modul berikut dilindungi oleh paket `server-only`:
  - `src/lib/kmeans.ts`
  - `src/lib/silhouette.ts`
  - `src/lib/clusterEngine.ts`
- **Larangan Keras:** Komponen dengan direktif `'use client'` **DILARANG KERAS** mengimpor fungsi atau variabel runtime dari ketiga file di atas. Impor hanya diperbolehkan untuk tipe data dengan sintaks `import type { ... }`.
- Interaksi antara client dan engine komputasi **wajib melalui Server Actions** yang terletak di `src/app/actions/clustering.ts`.

### 1.2 Directives `'use client'` & `'use server'`
- Tandai komponen UI yang menggunakan hook React (`useState`, `useEffect`, `useMemo`, `useRouter`, event handler, dsb.) dengan `'use client'` pada baris pertama berkas.
- Seluruh Server Action di `src/app/actions/` wajib diawali dengan `'use server'`.

---

## 2. Standar TypeScript & Pengetikan Data

1. **Sentralisasi Tipe:** Semua definisi antarmuka (*interface*) domain data wajib dideklarasikan di `src/types/index.ts`.
2. **Larangan `any` Tak Terkontrol:** Hindari penggunaan `any` kecuali pada integrasi library eksternal yang tipenya belum lengkap (misal format kustom SVG shape Recharts). Gunakan generic, tipe diskriminatif (*union types*), atau `unknown` dengan type-guard.
3. **Immutability:** Fungsi murni pada library tidak boleh memodifikasi (*mutate*) argumen masukan array/objek secara langsung. Gunakan `.map()`, `.filter()`, `slice()`, atau spread operator.

---

## 3. Aturan Matematis & Deterministik Klasterisasi

### 3.1 Garansi Urutan Label Klaster (*Centroid Ordering Guarantee*)
Secara default, algoritma K-Means konvensional menghasilkan indeks label klaster secara acak tergantung inisialisasi centroid. Dalam aplikasi ini:
- **Centroid wajib diurutkan pasca-konvergensi** menggunakan fungsi `rankClustersByNilaiAkhir`.
- Bobot formula perhitungan Nilai Akhir Centroid:
  $$\text{Nilai Akhir} = (0.3 \times \text{Harian}) + (0.3 \times \text{UTS}) + (0.4 \times \text{UAS})$$
- **Pemetaan Label:**
  - Centroid dengan Nilai Akhir **TERTINGGI** $\rightarrow$ SELALU berlabel `'Tinggi'`.
  - Centroid dengan Nilai Akhir **MENENGAH** $\rightarrow$ SELALU berlabel `'Sedang'`.
  - Centroid dengan Nilai Akhir **TERENDAH** $\rightarrow$ SELALU berlabel `'Rendah'`.
- Terdapat *assertion check* di `clusterEngine.ts`. Jika hierarki $\text{Tinggi} \ge \text{Sedang} \ge \text{Rendah}$ terlanggar, sistem wajib melempar exception (*throw Error*).

### 3.2 Stabilitas Algoritma (*Multi-Restart Minimization*)
- Eksekusi K-Means wajib memanfaatkan fungsi `runKMeansStable` dengan parameter $n_{\text{init}} \ge 5$ untuk meminimalkan Within-Cluster Sum of Squares (WCSS/Inertia).
- Hal ini menjamin pengguna tidak menemui hasil klaster yang berubah-ubah saat menekan tombol eksekusi ulang pada data yang sama.

---

## 4. UI/UX, Tema, dan Styling (Tailwind CSS)

1. **Dark/Light Mode Standard:**
   - Dukungan mode gelap diatur melalui kelas `dark` pada elemen root `<html>` (`darkMode: "class"`).
   - Pengaturan tema tersimpan di `localStorage` dengan key `'educluster-theme'`.
   - Hindari *flash of unstyled content* (FOUC) dengan menyertakan script inisialisasi sinkron di `<head>` pada `src/app/layout.tsx`.
2. **Aturan Cetak Formal (*Print Styling*):**
   - Elemen non-dokumen (navigasi, tombol, switcher, toast) wajib memiliki kelas `no-print`.
   - Elemen kop resmi laporan dan kolom tanda tangan wajib memakai kelas `print-only` (`display: none`, muncul via `@media print`).
   - Saat dicetak, paksa background dokumen berwarna putih bersih (`background: #ffffff !important`) dan teks hitam tajam (`color: #000000 !important`), bahkan saat dark mode sedang aktif di browser.
3. **Warna Semantik Klaster:**
   - **Tinggi:** Emerald (`#10b981` / `emerald-500` / `emerald-600`)
   - **Sedang:** Amber (`#f59e0b` / `amber-500` / `amber-600`)
   - **Rendah:** Rose (`#ef4444` / `rose-500` / `rose-600`)

---

## 5. Struktur Berkas & Penamaan

- Komponen React: `PascalCase.tsx` (contoh: `ThemeToggle.tsx`, `FileUpload.tsx`).
- File utilitas logika / library: `camelCase.ts` (contoh: `kmeans.ts`, `clusterEngine.ts`).
- Server Actions: `clustering.ts` di dalam `src/app/actions/`.
- Halaman Next.js App Router: `page.tsx` di folder bersangkutan (`dashboard/page.tsx`, `laporan/page.tsx`, `edukasi/page.tsx`).

---

## 6. Penanganan Galat & Notifikasi (Toast)

- Semua penanganan error pada interaksi antarmuka wajib memberikan umpan balik human-readable kepada pengguna melalui library `sonner` (`toast.error()`, `toast.success()`, `toast.info()`).
- Error pada Server Action wajib mengembalikan objek `{ success: false, error: string }` tanpa membiarkan server crash.
