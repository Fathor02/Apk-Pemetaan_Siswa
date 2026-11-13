/**
 * Verifikasi Silang (Opsi A)
 * --------------------------
 * Membandingkan implementasi K-Means & Silhouette milik proyek dengan
 * library `ml-kmeans` pada dataset uji yang sama.
 *
 * Engine produksi TIDAK memakai ml-kmeans. Library ini hanya alat pembanding
 * untuk membuktikan bahwa implementasi manual menghasilkan partisi, centroid,
 * WCSS, dan skor Silhouette yang sama.
 *
 * Jalankan:
 *   npm run verify:kmeans
 */

import { kmeans } from 'ml-kmeans';
import {
  runKMeansStable,
  euclideanDistance,
  computeWCSS,
  rankClustersByNilaiAkhir,
} from '../src/lib/kmeans.ts';
import { computeSilhouette } from '../src/lib/silhouette.ts';

/* ------------------------------------------------------------------ */
/* 1. Dataset uji deterministik (24 siswa, fitur 3D: Harian, UTS, UAS) */
/* ------------------------------------------------------------------ */

const RAW = [
  // Kelompok atas
  [92, 88, 94], [88, 90, 91], [95, 93, 96], [86, 84, 88],
  [90, 86, 92], [84, 88, 86], [93, 91, 95], [87, 89, 90],
  // Kelompok tengah
  [76, 72, 78], [80, 78, 82], [70, 74, 74], [78, 76, 80],
  [74, 70, 76], [82, 80, 84], [72, 78, 72], [79, 75, 81],
  // Kelompok bawah
  [60, 58, 62], [65, 62, 68], [55, 60, 58], [68, 66, 70],
  [58, 55, 60], [62, 64, 66], [70, 68, 72], [56, 58, 56],
];

const POINTS = RAW.map(([harian, uts, uas]) => [harian, uts, uas]);
const K = 3;
const N_INIT_OURS = 25;
const N_INIT_LIB = 50;
const DATASET_LABEL = '24 siswa · fitur 3D (Harian, UTS, UAS)';

/* ------------------------------------------------------------------ */
/* 2. Utilitas                                                         */
/* ------------------------------------------------------------------ */

function permutations(n) {
  const result = [];
  const permute = (current, rest) => {
    if (rest.length === 0) {
      result.push(current);
      return;
    }
    for (let i = 0; i < rest.length; i++) {
      permute([...current, rest[i]], rest.filter((_, j) => j !== i));
    }
  };
  permute([], Array.from({ length: n }, (_, i) => i));
  return result;
}

/**
 * Indeks klaster bersifat arbitrer, jadi cari pemetaan label klaster kita
 * ke label klaster library yang paling banyak cocok.
 */
function bestMapping(ourLabels, theirLabels, k) {
  let best = { perm: null, matches: -1 };
  for (const perm of permutations(k)) {
    let matches = 0;
    for (let i = 0; i < ourLabels.length; i++) {
      if (perm[ourLabels[i]] === theirLabels[i]) matches++;
    }
    if (matches > best.matches) best = { perm, matches };
  }
  return best;
}

/** Implementasi Silhouette independen (tanpa memakai src/lib/silhouette.ts). */
function referenceSilhouette(points, labels) {
  const n = points.length;
  const clusters = new Map();
  for (let i = 0; i < n; i++) {
    if (!clusters.has(labels[i])) clusters.set(labels[i], []);
    clusters.get(labels[i]).push(i);
  }
  const keys = [...clusters.keys()];
  const samples = [];

  for (let i = 0; i < n; i++) {
    const own = clusters.get(labels[i]);
    let a = 0;
    if (own.length > 1) {
      let sum = 0;
      for (const j of own) if (j !== i) sum += euclideanDistance(points[i], points[j]);
      a = sum / (own.length - 1);
    }
    let b = Infinity;
    for (const key of keys) {
      if (key === labels[i]) continue;
      const members = clusters.get(key);
      let sum = 0;
      for (const j of members) sum += euclideanDistance(points[i], points[j]);
      b = Math.min(b, sum / members.length);
    }
    if (b === Infinity) b = 0;
    const maxAB = Math.max(a, b);
    samples.push({ a, b, s: maxAB > 0 ? (b - a) / maxAB : 0 });
  }

  const average = samples.reduce((acc, s) => acc + s.s, 0) / n;
  return { samples, average };
}

function fmt(value, digits = 6) {
  return Number(value).toFixed(digits);
}

/* ------------------------------------------------------------------ */
/* 3. Jalankan kedua implementasi                                      */
/* ------------------------------------------------------------------ */

// (a) Engine proyek
const ours = runKMeansStable(POINTS, K, 100, N_INIT_OURS);
// `ours.wcss` sudah dibulatkan 3 desimal oleh engine; hitung ulang versi eksak
// agar perbandingan dengan library benar-benar apple-to-apple.
const ourExactWCSS = computeWCSS(POINTS, ours.labels, ours.centroids);

// (b) ml-kmeans — diulang beberapa kali, ambil WCSS terkecil
let libBest = null;
for (let run = 0; run < N_INIT_LIB; run++) {
  const result = kmeans(POINTS, K, {
    initialization: 'kmeans++',
    maxIterations: 100,
    tolerance: 1e-6,
  });
  const wcss = computeWCSS(POINTS, result.clusters, result.centroids);
  if (!libBest || wcss < libBest.wcss) {
    libBest = { ...result, labels: result.clusters, wcss };
  }
}

/* ------------------------------------------------------------------ */
/* 4. Bandingkan hasil                                                 */
/* ------------------------------------------------------------------ */

const { perm, matches } = bestMapping(ours.labels, libBest.labels, K);
const total = POINTS.length;
const mismatch = total - matches;

let maxCentroidDiff = 0;
for (let c = 0; c < K; c++) {
  for (let d = 0; d < POINTS[0].length; d++) {
    maxCentroidDiff = Math.max(
      maxCentroidDiff,
      Math.abs(ours.centroids[c][d] - libBest.centroids[perm[c]][d])
    );
  }
}

const wcssDiff = Math.abs(ourExactWCSS - libBest.wcss);
const silhouetteOurs = computeSilhouette(POINTS, ours.labels);
const silhouetteRef = referenceSilhouette(POINTS, ours.labels);
const silhouetteDiff = Math.abs(silhouetteOurs.average - silhouetteRef.average);

let maxPointSilhouetteDiff = 0;
for (let i = 0; i < total; i++) {
  maxPointSilhouetteDiff = Math.max(
    maxPointSilhouetteDiff,
    Math.abs(silhouetteOurs.samples[i].s - silhouetteRef.samples[i].s)
  );
}

// Verifikasi urutan label deterministik
const { rankOrder, clusterToCategory, clusterScores } = rankClustersByNilaiAkhir(ours.centroids);
const scoreTinggi = clusterScores[rankOrder[0]];
const scoreSedang = clusterScores[rankOrder[1]];
const scoreRendah = clusterScores[rankOrder[2]];
const orderingOk =
  clusterToCategory[rankOrder[0]] === 'Tinggi' &&
  clusterToCategory[rankOrder[1]] === 'Sedang' &&
  clusterToCategory[rankOrder[2]] === 'Rendah' &&
  scoreTinggi >= scoreSedang &&
  scoreSedang >= scoreRendah;

/* ------------------------------------------------------------------ */
/* 5. Laporan                                                          */
/* ------------------------------------------------------------------ */

const LABEL_TOLERANCE = 1e-6;
const CENTROID_TOLERANCE = 1e-6;
const WCSS_TOLERANCE = 1e-6;
const SILHOUETTE_TOLERANCE = 1e-9;

const checks = [
  {
    name: 'Kesesuaian partisi klaster',
    pass: mismatch === 0,
    detail: `${matches}/${total} siswa (${((matches / total) * 100).toFixed(1)}%)`,
  },
  {
    name: 'Selisih maksimum centroid',
    pass: maxCentroidDiff <= CENTROID_TOLERANCE,
    detail: fmt(maxCentroidDiff, 9),
  },
  {
    name: 'Selisih WCSS',
    pass: wcssDiff <= WCSS_TOLERANCE,
    detail: fmt(wcssDiff, 9),
  },
  {
    name: 'Selisih Silhouette rata-rata',
    pass: silhouetteDiff <= SILHOUETTE_TOLERANCE,
    detail: fmt(silhouetteDiff, 12),
  },
  {
    name: 'Selisih Silhouette per siswa',
    pass: maxPointSilhouetteDiff <= SILHOUETTE_TOLERANCE,
    detail: fmt(maxPointSilhouetteDiff, 12),
  },
  {
    name: 'Urutan label Tinggi ≥ Sedang ≥ Rendah',
    pass: orderingOk,
    detail: `${fmt(scoreTinggi, 2)} ≥ ${fmt(scoreSedang, 2)} ≥ ${fmt(scoreRendah, 2)}`,
  },
];

const allPass = checks.every((c) => c.pass);
const line = '='.repeat(64);

console.log(`\n${line}`);
console.log(' VERIFIKASI SILANG K-MEANS & SILHOUETTE (Opsi A)');
console.log(line);
console.log(` Dataset            : ${DATASET_LABEL}`);
console.log(` Nilai k            : ${K}`);
console.log(` Multi-restart      : engine=${N_INIT_OURS}x · ml-kmeans=${N_INIT_LIB}x`);
console.log('');
console.log(' Implementasi sendiri (src/lib/kmeans.ts)');
console.log(`   WCSS (eksak)     : ${fmt(ourExactWCSS, 3)}`);
console.log(`   Iterasi          : ${ours.iterations}`);
console.log(`   Konvergen        : ${ours.converged}`);
console.log('');
console.log(' Library ml-kmeans (hasil terbaik)');
console.log(`   WCSS             : ${fmt(libBest.wcss, 3)}`);
console.log(`   Iterasi          : ${libBest.iterations}`);
console.log(`   Konvergen        : ${libBest.converged}`);
console.log('');
console.log(' Silhouette rata-rata');
console.log(`   src/lib/silhouette.ts : ${fmt(silhouetteOurs.average)} (${silhouetteOurs.interpretation.status})`);
console.log(`   Implementasi skrip    : ${fmt(silhouetteRef.average)}`);
console.log('');
console.log(' Pemetaan klaster (indeks library → indeks engine):');
console.log(`   library ${perm.map((p, i) => `${p}→${i}`).join(', ')}`);
console.log('');
console.log(' Catatan: jumlah iterasi dapat berbeda karena ml-kmeans menghitung');
console.log(' tolerance pada jarak kuadrat, sedangkan engine memakai jarak Euclidean.');
console.log(' Partisi akhir dan centroid tetap dibandingkan secara eksak.');
console.log('');
console.log(' Hasil pemeriksaan:');
for (const check of checks) {
  console.log(`   ${check.pass ? '✓' : '✗'} ${check.name.padEnd(38)} ${check.detail}`);
}
console.log('');
console.log(` ${allPass ? 'LULUS — implementasi identik dengan ml-kmeans.' : 'GAGAL — ada perbedaan yang perlu diperiksa.'}`);
console.log(`${line}\n`);

if (!allPass) {
  process.exitCode = 1;
}
