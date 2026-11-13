import 'server-only';

import { RawNilaiRecord, ClusteringResult, ClusterInfo, StudentClustered, ClusterCategory } from '@/types';
import { aggregateBySiswa } from './parser';
import { runKMeansStable, rankClustersByNilaiAkhir, euclideanDistance } from './kmeans';
import { computeSilhouette } from './silhouette';

export interface ProcessClusteringOptions {
  mode?: '3D' | '1D';
  periode?: string;
  maxIterations?: number;
  nInit?: number;
}

export interface KTestEntry {
  k: number;
  silhouetteAvg: number;
  wcss: number;
  iterations: number;
  converged: boolean;
}

/**
 * Menguji beberapa nilai k (2..maxK) lalu mengembalikan metrik Elbow (WCSS) & Silhouette per k,
 * beserta rekomendasi k dengan silhouette rata-rata tertinggi.
 */
export function testOptimalK(
  records: RawNilaiRecord[],
  options: { mode?: '3D' | '1D'; maxK?: number; maxIterations?: number; nInit?: number } = {}
): { entries: KTestEntry[]; recommendedK: number } {
  const mode = options.mode || '3D';
  const maxK = Math.min(options.maxK || 5, 8);
  const maxIterations = options.maxIterations || 100;
  const nInit = options.nInit || 3;

  const aggregatedSiswa = aggregateBySiswa(records);
  if (aggregatedSiswa.length < 3) {
    throw new Error(`Jumlah siswa unik (${aggregatedSiswa.length}) kurang dari k=2. Minimal butuh 3 siswa.`);
  }

  const points: number[][] = aggregatedSiswa.map(s => {
    if (mode === '1D') {
      return [s.nilai_akhir_avg];
    }
    return [s.nilai_harian_avg, s.nilai_uts_avg, s.nilai_uas_avg];
  });

  const maxFeasibleK = Math.min(maxK, aggregatedSiswa.length - 1);
  const entries: KTestEntry[] = [];

  for (let k = 2; k <= maxFeasibleK; k++) {
    const km = runKMeansStable(points, k, maxIterations, nInit);
    const sil = computeSilhouette(points, km.labels);
    entries.push({
      k,
      silhouetteAvg: Math.round(sil.average * 1000) / 1000,
      wcss: Math.round(km.wcss * 100) / 100,
      iterations: km.iterations,
      converged: km.converged,
    });
  }

  const best = entries.reduce((a, b) => (b.silhouetteAvg > a.silhouetteAvg ? b : a), entries[0]);
  return { entries, recommendedK: best.k };
}

export function processClustering(
  records: RawNilaiRecord[],
  options: ProcessClusteringOptions = {}
): ClusteringResult {
  const mode = options.mode || '3D';
  const periode = options.periode || `Semester ${records[0]?.semester || 1} - ${new Date().getFullYear()}`;
  const maxIterations = options.maxIterations || 100;

  // 1. Agregasi data per siswa
  const aggregatedSiswa = aggregateBySiswa(records);

  if (aggregatedSiswa.length < 3) {
    throw new Error(`Jumlah siswa unik (${aggregatedSiswa.length}) kurang dari k=3. Minimal butuh 3 siswa.`);
  }

  // 2. Ekstraksi vektor fitur sesuai mode
  // 3D: [Harian, UTS, UAS]
  // 1D: [Nilai Akhir]
  const points: number[][] = aggregatedSiswa.map(s => {
    if (mode === '1D') {
      return [s.nilai_akhir_avg];
    }
    return [s.nilai_harian_avg, s.nilai_uts_avg, s.nilai_uas_avg];
  });

  // 3. Jalankan K-Means Clustering (k=3) dengan multi-restart agar hasil stabil
  const nInit = options.nInit || 5;
  const km = runKMeansStable(points, 3, maxIterations, nInit);

  // 4. Labeling otomatis pasca-konvergensi (GARANSI URUTAN):
  //    Centroid dgn rerata Nilai Akhir tertinggi -> 'Tinggi', menengah -> 'Sedang', terendah -> 'Rendah'
  const { clusterToCategory, rankOrder, clusterScores } = rankClustersByNilaiAkhir(km.centroids);

  // 4b. Verifikasi hard-guarantee urutan label. Jika terlanggar (tidak seharusnya), gagalkan proses
  //     daripada menghasilkan label yang salah.
  const naTinggi = clusterScores[rankOrder[0]];
  const naSedang = clusterScores[rankOrder[1]];
  const naRendah = clusterScores[rankOrder[2]];
  if (!(naTinggi >= naSedang && naSedang >= naRendah)) {
    throw new Error(
      `Verifikasi urutan klaster gagal (Tinggi=${naTinggi}, Sedang=${naSedang}, Rendah=${naRendah}).`
    );
  }

  // 5. Evaluasi Silhouette Coefficient (SERVER-ONLY: modul ini dilindungi paket 'server-only',
  //    sehingga tidak mungkin tereksekusi di browser)
  const silOutput = computeSilhouette(points, km.labels);

  // 6. Hitung jumlah & persentase per klaster
  const clusterCounts: Record<ClusterCategory, number> = {
    Tinggi: 0,
    Sedang: 0,
    Rendah: 0,
  };

  const students: StudentClustered[] = aggregatedSiswa.map((siswa, idx) => {
    const rawClusterIdx = km.labels[idx];
    const category = clusterToCategory[rawClusterIdx];
    clusterCounts[category]++;

    const centroid = km.centroids[rawClusterIdx];
    const distToCentroid = euclideanDistance(points[idx], centroid);
    const silSample = silOutput.samples[idx];

    return {
      nis: siswa.nis,
      nama_lengkap: siswa.nama_lengkap,
      kelas: siswa.kelas,
      features: points[idx],
      nilai_harian: siswa.nilai_harian_avg,
      nilai_uts: siswa.nilai_uts_avg,
      nilai_uas: siswa.nilai_uas_avg,
      nilai_akhir: siswa.nilai_akhir_avg,
      clusterIndex: rawClusterIdx,
      clusterLabel: category,
      jarak_ke_centroid: Math.round(distToCentroid * 1000) / 1000,
      a: Math.round(silSample.a * 1000) / 1000,
      b: Math.round(silSample.b * 1000) / 1000,
      s: Math.round(silSample.s * 1000) / 1000,
    };
  });

  // Urutkan siswa dalam tabel: Tinggi dulu (nilai tertinggi ke terendah), lalu Sedang, lalu Rendah
  const categoryOrderScore: Record<ClusterCategory, number> = {
    Tinggi: 3,
    Sedang: 2,
    Rendah: 1,
  };

  students.sort((a, b) => {
    const diffCat = categoryOrderScore[b.clusterLabel] - categoryOrderScore[a.clusterLabel];
    if (diffCat !== 0) return diffCat;
    return b.nilai_akhir - a.nilai_akhir;
  });

  const total = students.length;

  // Metadata klaster (disusun urut: Tinggi, Sedang, Rendah)
  const categoryColors: Record<ClusterCategory, string> = {
    Tinggi: '#10b981',
    Sedang: '#f59e0b',
    Rendah: '#ef4444',
  };

  const clusters: ClusterInfo[] = (['Tinggi', 'Sedang', 'Rendah'] as ClusterCategory[]).map((cat, displayIdx) => {
    // Temukan centroid asli yang berlabel kategori ini
    const origIdx = Object.entries(clusterToCategory).find(([_, c]) => c === cat)?.[0];
    const centroid = origIdx !== undefined ? km.centroids[Number(origIdx)] : [];
    const count = clusterCounts[cat];

    return {
      index: displayIdx,
      label: cat,
      color: categoryColors[cat],
      centroid: centroid.map(v => Math.round(v * 100) / 100),
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });

  return {
    mode,
    k: 3,
    iterations: km.iterations,
    converged: km.converged,
    silhouetteAvg: Math.round(silOutput.average * 1000) / 1000,
    silhouetteInterpretation: silOutput.interpretation,
    clusters,
    students,
    totalStudents: total,
    calculatedAt: new Date().toISOString(),
    periodeAnalisis: periode,
  };
}
