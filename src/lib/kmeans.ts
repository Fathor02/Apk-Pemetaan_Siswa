import 'server-only';

export interface KMeansOutput {
  centroids: number[][];
  labels: number[];
  iterations: number;
  converged: boolean;
  distancesToCentroid: number[];
}

export function euclideanDistance(p: number[], q: number[]): number {
  let sum = 0;
  for (let d = 0; d < p.length; d++) {
    const diff = p[d] - q[d];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function vectorKey(vec: number[]): string {
  return vec.map(v => v.toFixed(3)).join('|');
}

/**
 * Memilih k centroid awal yang berbeda dari data (k-means++ / distinct init)
 */
function pickDistinctCentroids(points: number[][], k: number): number[][] {
  const uniquePool: number[][] = [];
  const seen = new Set<string>();

  for (const pt of points) {
    const key = vectorKey(pt);
    if (!seen.has(key)) {
      seen.add(key);
      uniquePool.push(pt.slice());
    }
  }

  // Jika titik unik kurang dari k, kita clone dengan sedikit jitter
  if (uniquePool.length < k) {
    const fallback: number[][] = [];
    for (let i = 0; i < k; i++) {
      const base = points[i % points.length].slice();
      fallback.push(base.map(v => v + (i * 0.01)));
    }
    return fallback;
  }

  // K-Means++ Initialization
  const centroids: number[][] = [];
  // 1. Pilih centroid pertama secara acak
  const firstIdx = Math.floor(Math.random() * uniquePool.length);
  centroids.push(uniquePool[firstIdx].slice());
  uniquePool.splice(firstIdx, 1);

  // 2. Pilih centroid berikutnya dengan probabilitas proporsional jarak kuadrat D(x)^2
  while (centroids.length < k && uniquePool.length > 0) {
    const distSqList: number[] = [];
    let sumDistSq = 0;

    for (const pt of uniquePool) {
      let minDist = Infinity;
      for (const c of centroids) {
        const d = euclideanDistance(pt, c);
        if (d < minDist) minDist = d;
      }
      const dSq = minDist * minDist;
      distSqList.push(dSq);
      sumDistSq += dSq;
    }

    if (sumDistSq === 0) {
      // Semua titik tersisa berjarak 0 dari centroid
      centroids.push(uniquePool.shift()!.slice());
      continue;
    }

    let r = Math.random() * sumDistSq;
    let selectedIdx = 0;
    for (let i = 0; i < uniquePool.length; i++) {
      r -= distSqList[i];
      if (r <= 0) {
        selectedIdx = i;
        break;
      }
    }

    centroids.push(uniquePool[selectedIdx].slice());
    uniquePool.splice(selectedIdx, 1);
  }

  return centroids;
}

function assignClusters(points: number[][], centroids: number[][]): { labels: number[]; distances: number[] } {
  const labels: number[] = [];
  const distances: number[] = [];

  for (let i = 0; i < points.length; i++) {
    let bestCluster = 0;
    let minD = euclideanDistance(points[i], centroids[0]);

    for (let c = 1; c < centroids.length; c++) {
      const d = euclideanDistance(points[i], centroids[c]);
      if (d < minD) {
        minD = d;
        bestCluster = c;
      }
    }

    labels.push(bestCluster);
    distances.push(minD);
  }

  return { labels, distances };
}

function updateCentroids(points: number[][], labels: number[], oldCentroids: number[][]): number[][] {
  const k = oldCentroids.length;
  const dim = points[0].length;
  const nextCentroids: number[][] = [];

  for (let c = 0; c < k; c++) {
    const sum = new Array(dim).fill(0);
    let count = 0;

    for (let i = 0; i < points.length; i++) {
      if (labels[i] === c) {
        count++;
        for (let d = 0; d < dim; d++) {
          sum[d] += points[i][d];
        }
      }
    }

    if (count > 0) {
      nextCentroids.push(sum.map(v => v / count));
    } else {
      // Jika cluster kosong, pindahkan centroid ke titik yang paling jauh dari centroidnya saat ini
      let furthestIdx = 0;
      let maxDist = -1;
      for (let i = 0; i < points.length; i++) {
        const d = euclideanDistance(points[i], oldCentroids[labels[i]]);
        if (d > maxDist) {
          maxDist = d;
          furthestIdx = i;
        }
      }
      nextCentroids.push(points[furthestIdx].slice());
    }
  }

  return nextCentroids;
}

function hasConverged(c1: number[][], c2: number[][], threshold = 1e-4): boolean {
  for (let i = 0; i < c1.length; i++) {
    if (euclideanDistance(c1[i], c2[i]) > threshold) return false;
  }
  return true;
}

/**
 * Menjalankan algoritma K-Means Clustering
 */
export function runKMeans(points: number[][], k: number = 3, maxIterations: number = 100): KMeansOutput {
  if (points.length < k) {
    throw new Error(`Data tidak mencukupi untuk k=${k}. Ditemukan hanya ${points.length} data.`);
  }

  let centroids = pickDistinctCentroids(points, k);
  let { labels, distances } = assignClusters(points, centroids);
  let iterations = 0;
  let converged = false;

  for (iterations = 1; iterations <= maxIterations; iterations++) {
    const nextCentroids = updateCentroids(points, labels, centroids);
    const nextAssignment = assignClusters(points, nextCentroids);

    if (hasConverged(centroids, nextCentroids)) {
      converged = true;
      centroids = nextCentroids;
      labels = nextAssignment.labels;
      distances = nextAssignment.distances;
      break;
    }

    centroids = nextCentroids;
    labels = nextAssignment.labels;
    distances = nextAssignment.distances;
  }

  return {
    centroids,
    labels,
    iterations,
    converged,
    distancesToCentroid: distances,
  };
}

/**
 * Menghitung Within-Cluster Sum of Squares (WCSS / Inertia)
 */
export function computeWCSS(points: number[][], labels: number[], centroids: number[][]): number {
  let wcss = 0;
  for (let i = 0; i < points.length; i++) {
    const d = euclideanDistance(points[i], centroids[labels[i]]);
    wcss += d * d;
  }
  return wcss;
}

/**
 * K-Means dengan multi-restart: dijalankan beberapa kali dengan inisialisasi acak berbeda,
 * lalu dipilih hasil dengan WCSS (inertia) terendah agar hasil stabil & konsisten.
 */
export function runKMeansStable(
  points: number[][],
  k: number = 3,
  maxIterations: number = 100,
  nInit: number = 5
): KMeansOutput & { wcss: number; nInit: number } {
  if (points.length < k) {
    throw new Error(`Data tidak mencukupi untuk k=${k}. Ditemukan hanya ${points.length} data.`);
  }

  let best = runKMeans(points, k, maxIterations);
  let bestWCSS = computeWCSS(points, best.labels, best.centroids);

  for (let run = 1; run < nInit; run++) {
    const candidate = runKMeans(points, k, maxIterations);
    const wcss = computeWCSS(points, candidate.labels, candidate.centroids);
    if (wcss < bestWCSS) {
      best = candidate;
      bestWCSS = wcss;
    }
  }

  return {
    ...best,
    wcss: Math.round(bestWCSS * 1000) / 1000,
    nInit,
  };
}

/**
 * Menghitung estimasi Nilai Akhir suatu centroid.
 * Mode 3D [Harian, UTS, UAS] -> bobot resmi 30% : 30% : 40%.
 * Mode 1D / dimensi lain   -> rerata sederhana vektor.
 */
export function computeNilaiAkhirCentroid(centroid: number[]): number {
  if (centroid.length >= 3) {
    return 0.3 * centroid[0] + 0.3 * centroid[1] + 0.4 * centroid[2];
  }
  const sum = centroid.reduce((acc, v) => acc + v, 0);
  return centroid.length > 0 ? sum / centroid.length : 0;
}

/**
 * Mengurutkan indeks klaster berdasarkan Rerata Nilai Akhir centroid (tertinggi -> terendah),
 * lalu memetakan ke label kategori secara deterministik:
 *   Centroid dgn Nilai Akhir TERTINGGI -> 'Tinggi'
 *   Centroid dgn Nilai Akhir MENENGAH  -> 'Sedang'
 *   Centroid dgn Nilai Akhir TERENDAH  -> 'Rendah'
 */
export function rankClustersByNilaiAkhir(centroids: number[][]): {
  rankOrder: number[]; // index of original centroid sorted highest to lowest
  clusterToCategory: Record<number, 'Tinggi' | 'Sedang' | 'Rendah'>;
  clusterScores: Record<number, number>; // nilai akhir per centroid asli
} {
  const scores = centroids.map((c, idx) => ({
    idx,
    nilaiAkhir: computeNilaiAkhirCentroid(c),
    avg: c.reduce((acc, v) => acc + v, 0) / (c.length || 1),
  }));

  // Urutkan menurun berdasarkan Nilai Akhir; tie-break dengan rerata vektor agar deterministik
  scores.sort((a, b) => (b.nilaiAkhir - a.nilaiAkhir) || (b.avg - a.avg));

  const categories: Array<'Tinggi' | 'Sedang' | 'Rendah'> = ['Tinggi', 'Sedang', 'Rendah'];
  const clusterToCategory: Record<number, 'Tinggi' | 'Sedang' | 'Rendah'> = {};
  const clusterScores: Record<number, number> = {};
  const rankOrder: number[] = [];

  scores.forEach((item, rank) => {
    rankOrder.push(item.idx);
    clusterToCategory[item.idx] = categories[rank] || 'Sedang';
    clusterScores[item.idx] = item.nilaiAkhir;
  });

  return { rankOrder, clusterToCategory, clusterScores };
}
