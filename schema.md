# 🗄️ Database & Data Schema
## EduCluster AI - Struktur Data PostgreSQL (Supabase) & Tipe Aplikasi

---

## 1. Entity Relationship Diagram (ERD) Konseptual

```
┌─────────────────────────┐          ┌──────────────────────────────┐
│          siswa          │          │       mata_pelajaran         │
├─────────────────────────┤          ├──────────────────────────────┤
│ id           UUID PK    │          │ id            UUID PK        │
│ nis          VARCHAR(50)│ UNIQUE   │ kode_mapel    VARCHAR(50)    │ UNIQUE
│ nama_lengkap VARCHAR(255)│          │ nama_mapel    VARCHAR(255)   │
│ kelas        VARCHAR(50)│          └──────────────┬───────────────┘
└──────┬──────────┬───────┘                         │ 1
       │ 1        │ 1                               │
       │          │                                 │ N
       │ N        │ N                ┌──────────────┴───────────────┐
┌──────┴───────┐  └──────────────► │        nilai_akademik        │
│hasil_clustering│                 ├──────────────────────────────┤
├────────────────┤                 │ id            UUID PK        │
│ id               UUID PK        │ siswa_id      UUID FK ───────┼──► siswa.id
│ siswa_id         UUID FK ──────►│ mapel_id      UUID FK ───────┼──► mata_pelajaran.id
│ klaster          VARCHAR(50)    │ nilai_harian  FLOAT (0-100)  │
│ periode_analisis VARCHAR(100)    │ nilai_uts     FLOAT (0-100)  │
│ jarak_ke_centroid FLOAT         │ nilai_uas     FLOAT (0-100)  │
│ nilai_silhouette FLOAT          │ nilai_akhir   FLOAT (0-100)  │
│ created_at       TIMESTAMPTZ    │ semester      INT            │
└──────────────────┘               └──────────────────────────────┘
```

### Relasi
| Relasi | Kardinalitas | Aturan Hapus (*On Delete*) |
| :--- | :---: | :--- |
| `siswa` → `nilai_akademik` | 1 : N | `CASCADE` (nilai ikut terhapus) |
| `mata_pelajaran` → `nilai_akademik` | 1 : N | `CASCADE` |
| `siswa` → `hasil_clustering` | 1 : N | `CASCADE` (hasil ikut terhapus) |

---

## 2. Definisi DDL Lengkap (PostgreSQL / Supabase)

> DDL ini identik dengan yang disematkan pada `src/components/SupabaseBanner.tsx` dan file `supabase_schema.sql` di root proyek. Jalankan melalui **Supabase Dashboard → SQL Editor → New Query**.

```sql
-- Master Data Siswa
CREATE TABLE IF NOT EXISTS siswa (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nis VARCHAR(50) UNIQUE NOT NULL,
    nama_lengkap VARCHAR(255) NOT NULL,
    kelas VARCHAR(50) NOT NULL
);

-- Master Data Mata Pelajaran
CREATE TABLE IF NOT EXISTS mata_pelajaran (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kode_mapel VARCHAR(50) UNIQUE NOT NULL,
    nama_mapel VARCHAR(255) NOT NULL
);

-- Transaksi Nilai Akademik
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

-- Snapshot Hasil Klasterisasi (Cache Permanen)
CREATE TABLE IF NOT EXISTS hasil_clustering (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    siswa_id UUID NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
    klaster VARCHAR(50) NOT NULL,           -- 'Tinggi' | 'Sedang' | 'Rendah'
    periode_analisis VARCHAR(100) NOT NULL, -- Contoh: 'Semester 1 - 2026/2027'
    jarak_ke_centroid FLOAT,
    nilai_silhouette FLOAT,                 -- s(i) dalam rentang [-1, 1]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hasil_siswa_id ON hasil_clustering(siswa_id);
```

---

## 3. Kamus Data (*Data Dictionary*)

### 3.1 Tabel `siswa`
| Kolom | Tipe | Constraint | Keterangan |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, default `gen_random_uuid()` | Identifier internal unik |
| `nis` | VARCHAR(50) | UNIQUE, NOT NULL | Nomor Induk Siswa (kunci bisnis utama) |
| `nama_lengkap` | VARCHAR(255) | NOT NULL | Nama lengkap siswa |
| `kelas` | VARCHAR(50) | NOT NULL | Kelas aktif (contoh: `XII-MIPA-1`) |

### 3.2 Tabel `mata_pelajaran`
| Kolom | Tipe | Constraint | Keterangan |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Identifier internal |
| `kode_mapel` | VARCHAR(50) | UNIQUE, NOT NULL | Kode unik mapel (contoh: `MAT-01`) |
| `nama_mapel` | VARCHAR(255) | NOT NULL | Nama lengkap mapel |

### 3.3 Tabel `nilai_akademik`
| Kolom | Tipe | Constraint | Keterangan |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Identifier baris nilai |
| `siswa_id` | UUID | FK → `siswa.id`, NOT NULL | Pemilik nilai |
| `mapel_id` | UUID | FK → `mata_pelajaran.id`, NOT NULL | Mapel terkait |
| `nilai_harian` | FLOAT | CHECK `0..100` | Nilai tugas / harian |
| `nilai_uts` | FLOAT | CHECK `0..100` | Nilai Ujian Tengah Semester |
| `nilai_uas` | FLOAT | CHECK `0..100` | Nilai Ujian Akhir Semester |
| `nilai_akhir` | FLOAT | CHECK `0..100` | Hasil bobot: $0.3H + 0.3UTS + 0.4UAS$ |
| `semester` | INT | NOT NULL | Nomor semester (1 / 2) |

### 3.4 Tabel `hasil_clustering`
| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| `id` | UUID | PK hasil snapshot |
| `siswa_id` | UUID | FK → `siswa.id` |
| `klaster` | VARCHAR(50) | Label kategori: `Tinggi` / `Sedang` / `Rendah` (dijamin terurut berdasarkan rerata Nilai Akhir centroid) |
| `periode_analisis` | VARCHAR(100) | Kunci cache per periode (contoh: `Semester 1 - 2026/2027`) |
| `jarak_ke_centroid` | FLOAT | Jarak Euclidean titik siswa ke centroid klaster |
| `nilai_silhouette` | FLOAT | Koefisien Silhouette individual $s(i)$ |
| `created_at` | TIMESTAMPTZ | Waktu penyimpanan snapshot (UTC) |

---

## 4. Tipe Data Aplikasi (TypeScript)

Sumber kebenaran (*source of truth*): `src/types/index.ts`

### 4.1 `RawNilaiRecord` — Satu Baris Mentah Hasil Parsing
```typescript
export interface RawNilaiRecord {
  nis: string;
  nama_lengkap: string;
  kelas: string;
  kode_mapel: string;
  nama_mapel: string;
  nilai_harian: number;
  nilai_uts: number;
  nilai_uas: number;
  semester: number;
  nilai_akhir: number; // hasil calculateNilaiAkhir()
}
```

### 4.2 `SiswaAggregated` — Satu Siswa Setelah Agregasi Multi-Mapel
```typescript
export interface SiswaAggregated {
  nis: string;
  nama_lengkap: string;
  kelas: string;
  nilai_harian_avg: number;
  nilai_uts_avg: number;
  nilai_uas_avg: number;
  nilai_akhir_avg: number;
  mapel_count: number;
  records: RawNilaiRecord[];
}
```

### 4.3 `ClusteringResult` — Hasil Akhir Komputasi Server
```typescript
export interface ClusteringResult {
  mode: '3D' | '1D';
  k: number;
  iterations: number;
  converged: boolean;
  silhouetteAvg: number;
  silhouetteInterpretation: {
    status: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Buruk';
    description: string;
    color: string;
  };
  clusters: ClusterInfo[];
  students: StudentClustered[];
  totalStudents: number;
  calculatedAt: string;
  periodeAnalisis: string;
}
```

### 4.4 `StudentClustered` — Siswa + Hasil Klaster & Silhouette
```typescript
export interface StudentClustered {
  id?: string;
  nis: string;
  nama_lengkap: string;
  kelas: string;
  features: number[];           // vektor fitur sesuai mode
  nilai_harian: number;
  nilai_uts: number;
  nilai_uas: number;
  nilai_akhir: number;
  clusterIndex: number;         // index centroid asli
  clusterLabel: ClusterCategory; // 'Tinggi' | 'Sedang' | 'Rendah'
  jarak_ke_centroid: number;
  a: number; // jarak intra-klaster
  b: number; // jarak inter-klaster terdekat
  s: number; // skor silhouette [-1, 1]
}
```

---

## 5. Strategi Persistensi Dual-Layer

### 5.1 Layer 1 — PostgreSQL Supabase (Primær)
- Aktif ketika `isSupabaseConfigured === true` (kredensial `.env.local` terisi valid).
- Operasi tulis: **Upsert** master data, lalu **delete + insert batch** `hasil_clustering` per `periode_analisis` agar snapshot selalu mutakhir tanpa duplikat.
- Operasi baca: Query join `hasil_clustering ⨝ siswa` dengan `ORDER BY created_at DESC`.

### 5.2 Layer 2 — In-Memory Cache (Fallback)
- Aktif otomatis jika Supabase belum dikonfigurasi, memastikan aplikasi **tetap berjalan penuh** dalam mode demo/lokal.
- Struktur:
```typescript
let memoryCacheResults: Record<string, ClusteringResult> = {}; // key: periode | 'latest'
let memorySiswa: Record<string, { id: string; nis: string; nama_lengkap: string; kelas: string }> = {};
```
- Data hilang saat server restart — sifat ini disengaja untuk skenario demonstrasi.

### 5.3 Alur Sinkronisasi Cache
```
runClusteringAction
   │
   ├─► upsertDataAkademik(records)      [Supabase / memorySiswa]
   ├─► processClustering(records, opts) [Server-only engine]
   └─► cacheClusteringResult(result, siswaMap)
            ├─► memoryCacheResults[periode] = result
            ├─► memoryCacheResults['latest'] = result
            └─► Supabase: delete by periode → insert batch
```
