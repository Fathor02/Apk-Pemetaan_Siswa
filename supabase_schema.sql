-- ========================================================
-- SKEMA DATABASE APLIKASI PEMETAAN HASIL BELAJAR SISWA
-- ALGORITMA: K-MEANS CLUSTERING & SILHOUETTE COEFFICIENT
-- ========================================================

-- 1. Tabel Siswa
CREATE TABLE IF NOT EXISTS siswa (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nis VARCHAR(50) UNIQUE NOT NULL,
    nama_lengkap VARCHAR(255) NOT NULL,
    kelas VARCHAR(50) NOT NULL
);

-- 2. Tabel Mata Pelajaran
CREATE TABLE IF NOT EXISTS mata_pelajaran (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kode_mapel VARCHAR(50) UNIQUE NOT NULL,
    nama_mapel VARCHAR(255) NOT NULL
);

-- 3. Tabel Nilai Akademik
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

-- 4. Tabel Caching Hasil Clustering & Silhouette
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
CREATE INDEX IF NOT EXISTS idx_hasil_periode ON hasil_clustering(periode_analisis);
