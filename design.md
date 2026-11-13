# 🎨 UI/UX Design System
## EduCluster AI - Spesifikasi Visual, Tema, dan Komponen Antar Muka

---

## 1. Filosofi Desain

1. **Formal namun Modern:** Nuansa akademik yang bersih (putih-slate) dengan sentuhan aksen indigo-violet yang profesional, cocok dipresentasikan di depan penguji maupun di rapat dewan guru.
2. **Data-First:** Grafik dan angka kunci didahulukan; navigasi diletakkan pada sidebar tetap agar area konten maksimal.
3. **Zero-Friction:** Tanpa login, tanpa konfigurasi awal — pengguna dapat mengunggah dan melihat hasil dalam kurang dari 30 detik.

---

## 2. Struktur Layout Global

```
┌──────────────┬──────────────────────────────────────────────┐
│              │  [Mobile: Top Bar + Drawer]                  │
│   Sidebar    ├──────────────────────────────────────────────┤
│   (w-64)     │                                              │
│   Fixed      │   Page Header (Badge + Judul + Aksi Cepat)   │
│   Desktop    ├──────────────────────────────────────────────┤
│              │                                              │
│  - Logo      │   Main Content (max-w-6xl / max-w-7xl)       │
│  - Navigasi  │   - Metric Cards                             │
│  - Footer    │   - Grid Visualisasi (Recharts)              │
│    Status    │   - Tabel Data / Ringkasan                   │
│              │                                              │
├──────────────┴──────────────────────────────────────────────┤
│  Footer: Kredit Aplikasi (border-t, teks kecil, tengah)     │
└─────────────────────────────────────────────────────────────┘
```

- **Sidebar desktop:** `fixed inset-y-0 left-0 w-64`, tersembunyi di layar kecil.
- **Mobile:** Top bar sticky (`lg:hidden`) + drawer geser dari kiri (`w-72`) dengan backdrop blur.
- **Konten utama:** `flex-1 lg:pl-64` untuk mengimbangi lebar sidebar.

---

## 3. Sistem Warna (*Color Palette*)

### 3.1 Tema Terang (Default)
| Token | Nilai | Penggunaan |
| :--- | :--- | :--- |
| Background | `#f8fafc` (slate-50) | Latar aplikasi |
| Surface | `#ffffff` (white) | Kartu, tabel, panel |
| Border | `#e2e8f0` (slate-200) | Pembatas kartu & section |
| Text Utama | `#0f172a` (slate-900) | Judul, angka kunci |
| Text Sekunder | `#64748b` (slate-500) | Deskripsi, label bantu |
| Aksen Primær | `#4f46e5` (indigo-600) | Tombol utama, badge, ikon aktif |
| Aksen Sekunder | `#7c3aed` (violet-600) | Gradasi logo |

### 3.2 Tema Gelap (*Dark Mode*)
Diaktifkan via kelas `dark` pada `<html>` (`darkMode: "class"` di Tailwind).

| Token | Nilai | Penggunaan |
| :--- | :--- | :--- |
| Background | `#020617` (slate-950) | Latar aplikasi |
| Surface | `#0f172a` (slate-900) | Kartu, tabel, panel |
| Border | `#334155` (slate-700) | Pembatas kartu & section |
| Text Utama | `#f1f5f9` (slate-100) | Judul, angka kunci |
| Text Sekunder | `#94a3b8` (slate-400) | Deskripsi, label bantu |

### 3.3 Warna Semantik Klaster (Konsisten di Semua Visual)
| Klaster | Hex | Kelas Tailwind | Makna Akademik |
| :--- | :--- | :--- | :--- |
| **Tinggi** | `#10b981` | `emerald-500/600` | Siap pengayaan / pembinaan olimpiade |
| **Sedang** | `#f59e0b` | `amber-500/600` | Pemantapan dan penguatan materi |
| **Rendah** | `#ef4444` | `rose-500/600` | Prioritas remedial & bimbingan khusus |
| **Centroid Marker** | `#facc15` | `yellow-400` | Bintang (★) pada scatter plot |

### 3.4 Status Interpretasi Silhouette
| Status | Rentang Skor | Warna |
| :--- | :--- | :--- |
| Sangat Baik | $> 0.5$ | Emerald `#10b981` |
| Baik | $0.35 - 0.5$ | Blue `#3b82f6` |
| Cukup | $0.2 - 0.35$ | Amber `#f59e0b` |
| Buruk | $\le 0.2$ | Rose `#ef4444` |

---

## 4. Tipografi

- **Font Utama:** System UI stack (`system-ui, -apple-system, Segoe UI, Roboto, sans-serif`) untuk performa & konsistensi native.
- **Angka & Data:** `font-mono` untuk NIS, nilai numerik, skor silhouette, dan iterasi.
- **Hierarki:**
  - Judul halaman: `text-xl font-black tracking-tight`
  - Judul section/kartu: `text-sm font-bold`
  - Deskripsi: `text-xs text-slate-500`
  - Angka metrik: `text-3xl font-black font-mono`
  - Badge/label kecil: `text-[10px]` / `text-[11px] font-bold uppercase`

---

## 5. Komponen Inti (*Component Inventory*)

### 5.1 Kartu Metrik (*Metric Card*)
- Container: `bg-white rounded-2xl border border-slate-200 p-5 shadow-xs`
- Header: label uppercase + ikon kanan; Isi: angka besar + keterangan kecil.
- Varian berwarna: border + tint latar sesuai klaster (emerald / amber / rose 20% opacity).

### 5.2 Tombol (*Buttons*)
| Varian | Gaya |
| :--- | :--- |
| Primær | `bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm` |
| Sekunder | `bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold` |
| Sukses (Ekspor) | `bg-emerald-600 hover:bg-emerald-700 text-white` |
| Danger (Reset) | `bg-rose-600 hover:bg-rose-700 text-white` |
| Filter Aktif | `bg-indigo-600 text-white shadow-xs` |
| Filter Siswa Ambigu | `bg-rose-600 text-white` (aktif) / `bg-white text-rose-700 border-rose-200` (nonaktif) |
| Toggle Tema | `p-2 rounded-xl border bg-white dark:bg-slate-900` + ikon Sun/Moon |

### 5.3 Tabel Data
- Header: `bg-slate-50 uppercase tracking-wider text-slate-500 text-xs font-bold`
- Baris: `divide-y divide-slate-100`, hover `hover:bg-slate-50/80`
- Baris siswa ambigu ($s(i) < 0.2$): `bg-rose-50/60` + ikon `AlertTriangle` rose di kolom nomor.

### 5.4 Grafik (Recharts)
- Wrapper: `ResponsiveContainer` dengan tinggi tetap (`h-64` / `h-72`).
- Tooltip gelap: `backgroundColor: '#0f172a', color: '#fff', borderRadius: '10px', fontSize: '12px'`.
- Legend: `fontSize: '11px'`.
- Scatter plot siswa: titik warna per klaster; centroid: custom `shape` karakter `★` (fontSize 18, fill `#facc15`, stroke `#a16207`).

### 5.5 Notifikasi (Sonner Toast)
- Posisi: `top-right`, `richColors`, dengan tombol tutup.
- Toast loading untuk proses panjang (upload, klasterisasi) — ID toast dipertahankan lalu di-upgrade menjadi `success`/`error`.

---

## 6. Spesifikasi Mode Cetak (*Print Stylesheet*)

Aturan pada `@media print` (globals.css):

1. **Disembunyikan:** `aside`, `header`, `nav`, `button`, dan semua elemen `.no-print`.
2. **Ditampilkan:** elemen `.print-only` — kop resmi laporan, identitas sekolah, tanggal cetak, dan blok tanda tangan dua kolom (Kepala Sekolah & Koordinator Akademik) dengan garis titik-titik.
3. **Paksa Tema Terang:** Background putih `#ffffff !important`, teks hitam `#000000 !important` — berlaku meskipun dark mode sedang aktif.
4. **Padding Konten:** `lg:pl-64` dinolkan (`padding-left: 0 !important`).
5. **Tabel:** border penuh `1px solid #cbd5e1`, font 9pt, `page-break-inside: avoid` per baris, tanpa bayangan.

---

## 7. Prinsip Responsif

| Breakpoint | Perilaku |
| :--- | :--- |
| `< lg` (mobile) | Sidebar → top bar + drawer; grid kartu 1 kolom; chart menumpuk vertikal. |
| `lg` (desktop) | Sidebar tetap; grid metrik 5 kolom; grid chart 3 kolom (Bar, Radar, Donut); scatter span penuh. |
| `sm/md` (tabel) | Filter bar membungkus (`flex-wrap`); tabel dengan `overflow-x-auto`. |

---

## 8. Aset & Ikonografi

- **Ikon:** `lucide-react` — konsisten stroke 2px, ukuran default `w-4 h-4` (konten) dan `w-5 h-5` (header).
- **Logo:** Ikon `GraduationCap` dalam kotak rounded gradient `from-indigo-600 via-indigo-700 to-violet-600`.
- **Ilustrasi keadaan kosong:** Ikon besar dalam kotak `w-20 h-20 rounded-3xl bg-indigo-50 text-indigo-600` + ajakan bertindak dua tombol (unggah berkas / data dummy).
