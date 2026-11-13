import 'server-only';

import { euclideanDistance } from './kmeans';

export interface SilhouetteSample {
  a: number; // Jarak rata-rata intra-klaster
  b: number; // Jarak rata-rata terdekat inter-klaster
  s: number; // Silhouette coefficient sample [-1, 1]
}

export interface SilhouetteOutput {
  samples: SilhouetteSample[];
  average: number;
  interpretation: {
    status: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Buruk';
    description: string;
    color: string;
  };
}

export function computeSilhouette(points: number[][], labels: number[]): SilhouetteOutput {
  const n = points.length;
  if (n < 2) {
    return {
      samples: points.map(() => ({ a: 0, b: 0, s: 0 })),
      average: 0,
      interpretation: {
        status: 'Buruk',
        description: 'Data kurang dari 2 titik, koefisien tidak dapat dievaluasi.',
        color: '#ef4444',
      },
    };
  }

  // Kelompokkan indeks per klaster
  const clusterMembers: Record<number, number[]> = {};
  for (let i = 0; i < n; i++) {
    const l = labels[i];
    if (!clusterMembers[l]) clusterMembers[l] = [];
    clusterMembers[l].push(i);
  }

  const clusterKeys = Object.keys(clusterMembers).map(Number);
  const samples: SilhouetteSample[] = [];

  for (let i = 0; i < n; i++) {
    const myCluster = labels[i];
    const sameClusterMembers = clusterMembers[myCluster];

    // 1. Hitung a(i): rata-rata jarak ke anggota klaster yang sama
    let a = 0;
    if (sameClusterMembers.length > 1) {
      let sumSame = 0;
      for (const otherIdx of sameClusterMembers) {
        if (otherIdx !== i) {
          sumSame += euclideanDistance(points[i], points[otherIdx]);
        }
      }
      a = sumSame / (sameClusterMembers.length - 1);
    } else {
      a = 0;
    }

    // 2. Hitung b(i): rata-rata jarak ke klaster tetangga terdekat
    let b = Infinity;
    for (const otherCls of clusterKeys) {
      if (otherCls === myCluster) continue;
      const otherMembers = clusterMembers[otherCls];
      if (!otherMembers || otherMembers.length === 0) continue;

      let sumOther = 0;
      for (const otherIdx of otherMembers) {
        sumOther += euclideanDistance(points[i], points[otherIdx]);
      }
      const avgDist = sumOther / otherMembers.length;
      if (avgDist < b) {
        b = avgDist;
      }
    }

    if (b === Infinity) {
      b = 0;
    }

    // 3. Hitung s(i)
    let s = 0;
    const maxAB = Math.max(a, b);
    if (maxAB > 0) {
      s = (b - a) / maxAB;
    }

    samples.push({ a, b, s });
  }

  const totalS = samples.reduce((acc, curr) => acc + curr.s, 0);
  const average = totalS / n;

  // Interpretasi Standar (Kaufman & Rousseeuw)
  let status: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Buruk' = 'Baik';
  let description = '';
  let color = '#10b981';

  if (average > 0.5) {
    status = 'Sangat Baik';
    description = 'Struktur klaster sangat kuat dan pemisahan kelompok sangat jelas antar kelompok nilai.';
    color = '#10b981'; // green
  } else if (average > 0.35) {
    status = 'Baik';
    description = 'Struktur klaster terbentuk baik dan memiliki pemisahan yang wajar antar kategori.';
    color = '#3b82f6'; // blue
  } else if (average > 0.2) {
    status = 'Cukup';
    description = 'Struktur klaster cukup, terdapat sedikit tumpang tindih pada perbatasan nilai.';
    color = '#f59e0b'; // amber
  } else {
    status = 'Buruk';
    description = 'Struktur klaster lemah / tumpang tindih tinggi. Pemisahan kelompok kurang optimal.';
    color = '#ef4444'; // red
  }

  return {
    samples,
    average,
    interpretation: { status, description, color },
  };
}
