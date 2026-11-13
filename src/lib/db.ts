import { getSupabaseAdmin, isSupabaseConfigured } from './supabase';
import { RawNilaiRecord, ClusteringResult, StudentClustered, ClusterInfo, ClusterCategory } from '@/types';

// Fallback in-memory cache for standalone / demo execution if Supabase isn't connected yet
let memoryCacheResults: Record<string, ClusteringResult> = {};
let memorySiswa: Record<string, { id: string; nis: string; nama_lengkap: string; kelas: string }> = {};
// Mirror records terkelola (untuk fitur Kelola Data Siswa di mode tanpa Supabase)
let memoryRecords: RawNilaiRecord[] = [];

export interface ManagedSnapshot {
  result: ClusteringResult;
  records: RawNilaiRecord[];
  siswaIdMap: Array<[string, string]>; // [nis, siswa_id]
}

/**
 * Snapshot data terkelola terakhir (untuk fitur Admin: Kelola & Edit Data).
 * Mengembalikan null jika belum ada hasil / DB tidak terhubung.
 */
export async function getSupabaseOrMemorySnapshot(): Promise<ManagedSnapshot | null> {
  const result = memoryCacheResults['latest'] || null;
  if (!result) return null;

  // Mode tanpa Supabase: gunakan mirror records in-memory
  if (!isSupabaseConfigured) {
    return {
      result,
      records: memoryRecords,
      siswaIdMap: Object.values(memorySiswa).map((s) => [s.nis, s.id] as [string, string]),
    };
  }

  // Mode Supabase: baca ulang nilai_akademik (join mapel) untuk seluruh siswa
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data: nilaiRows, error } = await supabase
    .from('nilai_akademik')
    .select('siswa_id, semester, nilai_harian, nilai_uts, nilai_uas, siswa(nis, nama_lengkap, kelas), mata_pelajaran(kode_mapel, nama_mapel)');

  if (error || !nilaiRows) {
    throw new Error(`Gagal membaca data nilai terkelola: ${error?.message || 'tidak ada data'}`);
  }

  const records: RawNilaiRecord[] = (nilaiRows as any[]).map((row) => {
    const siswa = row.siswa as { nis: string; nama_lengkap: string; kelas: string };
    const mapel = row.mata_pelajaran as { kode_mapel: string; nama_mapel: string };
    const harian = row.nilai_harian as number;
    const uts = row.nilai_uts as number;
    const uas = row.nilai_uas as number;
    return {
      nis: siswa.nis,
      nama_lengkap: siswa.nama_lengkap,
      kelas: siswa.kelas,
      kode_mapel: mapel.kode_mapel,
      nama_mapel: mapel.nama_mapel,
      nilai_harian: harian,
      nilai_uts: uts,
      nilai_uas: uas,
      semester: row.semester as number,
      nilai_akhir: 0.3 * harian + 0.3 * uts + 0.4 * uas,
    };
  });

  // siswaIdMap dari hasil cache
  const siswaIdMap: Array<[string, string]> = result.students.map((s) => [s.nis, 'db-' + s.nis]);

  return { result, records, siswaIdMap };
}

/**
 * 1. Upsert Master Data Siswa, Mata Pelajaran, dan Nilai Akademik
 */
export async function upsertDataAkademik(records: RawNilaiRecord[]): Promise<{
  siswaCount: number;
  mapelCount: number;
  nilaiCount: number;
  siswaMap: Map<string, string>; // nis -> siswa_id
}> {
  const supabase = getSupabaseAdmin();
  const siswaMap = new Map<string, string>();

  // Mirror records untuk fitur Kelola Data (mode tanpa Supabase)
  memoryRecords = records.slice();

  if (!supabase || !isSupabaseConfigured) {
    // In-memory fallback
    const mapels = new Set<string>();
    records.forEach(r => {
      if (!memorySiswa[r.nis]) {
        memorySiswa[r.nis] = {
          id: 'sim-' + r.nis,
          nis: r.nis,
          nama_lengkap: r.nama_lengkap,
          kelas: r.kelas,
        };
      } else {
        // Update existing student info
        memorySiswa[r.nis].nama_lengkap = r.nama_lengkap;
        memorySiswa[r.nis].kelas = r.kelas;
      }
      mapels.add(r.kode_mapel);
      siswaMap.set(r.nis, memorySiswa[r.nis].id);
    });

    return {
      siswaCount: Object.keys(memorySiswa).length,
      mapelCount: mapels.size,
      nilaiCount: records.length,
      siswaMap,
    };
  }

  // --- SUPABASE POSTGRESQL IMPLEMENTATION ---
  
  // A. Upsert Siswa
  const uniqueSiswa = Array.from(
    records.reduce((map, r) => {
      map.set(r.nis, { nis: r.nis, nama_lengkap: r.nama_lengkap, kelas: r.kelas });
      return map;
    }, new Map<string, { nis: string; nama_lengkap: string; kelas: string }>()).values()
  );

  const { data: siswaData, error: errSiswa } = await supabase
    .from('siswa')
    .upsert(uniqueSiswa, { onConflict: 'nis' })
    .select('id, nis');

  if (errSiswa) {
    throw new Error(`Gagal menyimpan data siswa ke PostgreSQL: ${errSiswa.message}`);
  }

  siswaData?.forEach(s => siswaMap.set(s.nis, s.id));

  // B. Upsert Mata Pelajaran
  const uniqueMapel = Array.from(
    records.reduce((map, r) => {
      map.set(r.kode_mapel, { kode_mapel: r.kode_mapel, nama_mapel: r.nama_mapel });
      return map;
    }, new Map<string, { kode_mapel: string; nama_mapel: string }>()).values()
  );

  const { data: mapelData, error: errMapel } = await supabase
    .from('mata_pelajaran')
    .upsert(uniqueMapel, { onConflict: 'kode_mapel' })
    .select('id, kode_mapel');

  if (errMapel) {
    throw new Error(`Gagal menyimpan data mata pelajaran: ${errMapel.message}`);
  }

  const mapelMap = new Map<string, string>();
  mapelData?.forEach(m => mapelMap.set(m.kode_mapel, m.id));

  // C. Insert Nilai Akademik
  const nilaiRows = records.map(r => ({
    siswa_id: siswaMap.get(r.nis)!,
    mapel_id: mapelMap.get(r.kode_mapel)!,
    nilai_harian: r.nilai_harian,
    nilai_uts: r.nilai_uts,
    nilai_uas: r.nilai_uas,
    nilai_akhir: r.nilai_akhir,
    semester: r.semester,
  }));

  // Hapus nilai lama pada semester yang sama untuk siswa-siswa ini agar tidak duplikat
  const siswaIds = Array.from(new Set(Array.from(siswaMap.values())));
  if (siswaIds.length > 0) {
    await supabase.from('nilai_akademik').delete().in('siswa_id', siswaIds);
  }

  const { error: errNilai } = await supabase.from('nilai_akademik').insert(nilaiRows);
  if (errNilai) {
    throw new Error(`Gagal menyimpan nilai akademik: ${errNilai.message}`);
  }

  return {
    siswaCount: uniqueSiswa.length,
    mapelCount: uniqueMapel.length,
    nilaiCount: nilaiRows.length,
    siswaMap,
  };
}

/**
 * 2. Caching & Invariansi: Simpan hasil komputasi K-Means dan Silhouette ke `hasil_clustering`
 */
export async function cacheClusteringResult(
  result: ClusteringResult,
  siswaMap: Map<string, string>
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const periode = result.periodeAnalisis;

  // Simpan ke in-memory cache juga untuk fast fallback
  memoryCacheResults[periode] = result;
  memoryCacheResults['latest'] = result;

  if (!supabase || !isSupabaseConfigured) {
    return;
  }

  try {
    // 1. Hapus hasil clustering lama untuk periode yang sama agar terbarukan
    await supabase.from('hasil_clustering').delete().eq('periode_analisis', periode);

    // 2. Insert batch ke `hasil_clustering`
    const insertPayload = result.students.map(s => {
      const siswaId = siswaMap.get(s.nis) || s.id;
      return {
        siswa_id: siswaId,
        klaster: s.clusterLabel,
        periode_analisis: periode,
        jarak_ke_centroid: Math.round(s.jarak_ke_centroid * 1000) / 1000,
        nilai_silhouette: Math.round(s.s * 1000) / 1000,
      };
    });

    if (insertPayload.length > 0 && insertPayload[0].siswa_id) {
      const { error } = await supabase.from('hasil_clustering').insert(insertPayload);
      if (error) {
        console.error('Peringatan saat insert ke hasil_clustering:', error.message);
      }
    }
  } catch (err: any) {
    console.error('Error saat menyimpan ke hasil_clustering:', err?.message || err);
  }
}

/**
 * 3. Ambil hasil clustering tersimpan untuk instant load (< 1 detik)
 */
export async function getCachedClustering(periode: string = 'latest'): Promise<ClusteringResult | null> {
  if (memoryCacheResults[periode]) {
    return memoryCacheResults[periode];
  }
  if (periode === 'latest' && Object.keys(memoryCacheResults).length > 0) {
    const keys = Object.keys(memoryCacheResults);
    return memoryCacheResults[keys[keys.length - 1]];
  }

  const supabase = getSupabaseAdmin();
  if (!supabase || !isSupabaseConfigured) {
    return null;
  }

  try {
    let query = supabase
      .from('hasil_clustering')
      .select(`
        id,
        siswa_id,
        klaster,
        periode_analisis,
        jarak_ke_centroid,
        nilai_silhouette,
        created_at,
        siswa:siswa_id (
          id,
          nis,
          nama_lengkap,
          kelas
        )
      `)
      .order('created_at', { ascending: false });

    if (periode !== 'latest') {
      query = query.eq('periode_analisis', periode);
    } else {
      const { data: latestRow } = await supabase
        .from('hasil_clustering')
        .select('periode_analisis')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestRow?.periode_analisis) {
        query = query.eq('periode_analisis', latestRow.periode_analisis);
      } else {
        return null;
      }
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return null;
    }

    // Ambil rata-rata nilai akademik dari tabel nilai_akademik
    const siswaIds = data.map((d: any) => d.siswa_id).filter(Boolean);
    const { data: nilaiData } = await supabase
      .from('nilai_akademik')
      .select('siswa_id, nilai_harian, nilai_uts, nilai_uas, nilai_akhir')
      .in('siswa_id', siswaIds);

    const nilaiAverages: Record<string, { harian: number; uts: number; uas: number; akhir: number }> = {};
    if (nilaiData && nilaiData.length > 0) {
      const grouped: Record<string, typeof nilaiData> = {};
      nilaiData.forEach((n: any) => {
        if (!grouped[n.siswa_id]) grouped[n.siswa_id] = [];
        grouped[n.siswa_id].push(n);
      });

      Object.entries(grouped).forEach(([sid, rows]) => {
        const len = rows.length;
        nilaiAverages[sid] = {
          harian: Math.round((rows.reduce((sum, r) => sum + r.nilai_harian, 0) / len) * 100) / 100,
          uts: Math.round((rows.reduce((sum, r) => sum + r.nilai_uts, 0) / len) * 100) / 100,
          uas: Math.round((rows.reduce((sum, r) => sum + r.nilai_uas, 0) / len) * 100) / 100,
          akhir: Math.round((rows.reduce((sum, r) => sum + r.nilai_akhir, 0) / len) * 100) / 100,
        };
      });
    }

    // Rekonstruksi struktur ClusteringResult
    const clusterCounts: Record<string, number> = { Tinggi: 0, Sedang: 0, Rendah: 0 };
    const clusterSums: Record<string, { harian: number; uts: number; uas: number; akhir: number; count: number }> = {
      Tinggi: { harian: 0, uts: 0, uas: 0, akhir: 0, count: 0 },
      Sedang: { harian: 0, uts: 0, uas: 0, akhir: 0, count: 0 },
      Rendah: { harian: 0, uts: 0, uas: 0, akhir: 0, count: 0 },
    };

    let sumSilhouette = 0;

    const students: StudentClustered[] = data.map((row: any) => {
      const klaster = (row.klaster as ClusterCategory) || 'Sedang';
      clusterCounts[klaster] = (clusterCounts[klaster] || 0) + 1;
      sumSilhouette += Number(row.nilai_silhouette || 0);

      const sData = Array.isArray(row.siswa) ? row.siswa[0] : row.siswa;
      const sId = row.siswa_id;
      const avg = nilaiAverages[sId] || { harian: 0, uts: 0, uas: 0, akhir: 0 };

      if (clusterSums[klaster]) {
        clusterSums[klaster].harian += avg.harian;
        clusterSums[klaster].uts += avg.uts;
        clusterSums[klaster].uas += avg.uas;
        clusterSums[klaster].akhir += avg.akhir;
        clusterSums[klaster].count++;
      }

      return {
        id: row.id,
        nis: sData?.nis || 'N/A',
        nama_lengkap: sData?.nama_lengkap || 'Tanpa Nama',
        kelas: sData?.kelas || 'N/A',
        features: [avg.harian, avg.uts, avg.uas],
        nilai_harian: avg.harian,
        nilai_uts: avg.uts,
        nilai_uas: avg.uas,
        nilai_akhir: avg.akhir,
        clusterIndex: klaster === 'Tinggi' ? 0 : klaster === 'Sedang' ? 1 : 2,
        clusterLabel: klaster,
        jarak_ke_centroid: row.jarak_ke_centroid || 0,
        a: 0,
        b: 0,
        s: row.nilai_silhouette || 0,
      };
    });

    const totalStudents = students.length;
    const silhouetteAvg = totalStudents > 0 ? sumSilhouette / totalStudents : 0;

    const getCentroidForCluster = (cat: ClusterCategory) => {
      const c = clusterSums[cat];
      if (!c || c.count === 0) return [0, 0, 0];
      return [
        Math.round((c.harian / c.count) * 100) / 100,
        Math.round((c.uts / c.count) * 100) / 100,
        Math.round((c.uas / c.count) * 100) / 100,
      ];
    };

    const clusters: ClusterInfo[] = [
      {
        index: 0,
        label: 'Tinggi',
        color: '#10b981',
        centroid: getCentroidForCluster('Tinggi'),
        count: clusterCounts['Tinggi'] || 0,
        percentage: totalStudents > 0 ? Math.round(((clusterCounts['Tinggi'] || 0) / totalStudents) * 100) : 0,
      },
      {
        index: 1,
        label: 'Sedang',
        color: '#f59e0b',
        centroid: getCentroidForCluster('Sedang'),
        count: clusterCounts['Sedang'] || 0,
        percentage: totalStudents > 0 ? Math.round(((clusterCounts['Sedang'] || 0) / totalStudents) * 100) : 0,
      },
      {
        index: 2,
        label: 'Rendah',
        color: '#ef4444',
        centroid: getCentroidForCluster('Rendah'),
        count: clusterCounts['Rendah'] || 0,
        percentage: totalStudents > 0 ? Math.round(((clusterCounts['Rendah'] || 0) / totalStudents) * 100) : 0,
      },
    ];

    const result: ClusteringResult = {
      mode: '3D',
      k: 3,
      iterations: 0,
      converged: true,
      silhouetteAvg: Math.round(silhouetteAvg * 1000) / 1000,
      silhouetteInterpretation: {
        status: silhouetteAvg > 0.5 ? 'Sangat Baik' : silhouetteAvg > 0.25 ? 'Baik' : 'Buruk',
        description: 'Data dimuat dari cache database hasil_clustering.',
        color: silhouetteAvg > 0.5 ? '#10b981' : silhouetteAvg > 0.25 ? '#f59e0b' : '#ef4444',
      },
      clusters,
      students,
      totalStudents,
      calculatedAt: data[0]?.created_at || new Date().toISOString(),
      periodeAnalisis: data[0]?.periode_analisis || periode,
    };

    memoryCacheResults[periode] = result;
    return result;
  } catch (err) {
    console.error('Error fetching cached clustering:', err);
    return null;
  }
}

/**
 * 4. Reset Seluruh Data Analisis (Cascade Delete)
 */
export async function resetAllDatabaseData(): Promise<{ success: boolean; message: string }> {
  // Kosongkan memori cache
  memoryCacheResults = {};
  memorySiswa = {};
  memoryRecords = [];

  const supabase = getSupabaseAdmin();
  if (!supabase || !isSupabaseConfigured) {
    return {
      success: true,
      message: 'Seluruh data analisis dan cache memori berhasil dikosongkan.',
    };
  }

  try {
    // Siswa cascade ke nilai_akademik & hasil_clustering
    const { error: errClustering } = await supabase
      .from('hasil_clustering')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    const { error: errNilai } = await supabase
      .from('nilai_akademik')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    const { error: errMapel } = await supabase
      .from('mata_pelajaran')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    const { error: errSiswa } = await supabase
      .from('siswa')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (errSiswa || errNilai || errClustering || errMapel) {
      console.warn('Peringatan saat reset table:', errSiswa || errNilai || errClustering || errMapel);
    }

    return {
      success: true,
      message: 'Seluruh data master siswa, nilai akademik, dan hasil klasterisasi berhasil dibersihkan dari database.',
    };
  } catch (err: any) {
    throw new Error(`Gagal mereset data: ${err?.message || err}`);
  }
}
