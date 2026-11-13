'use server';

import { RawNilaiRecord, ClusteringResult } from '@/types';
import { isAdminRequest } from '@/lib/auth';
import { processClustering } from '@/lib/clusterEngine';
import {
  upsertDataAkademik,
  cacheClusteringResult,
  getSupabaseOrMemorySnapshot,
} from '@/lib/db';

/**
 * Server Actions Kelola Data Siswa (UC-07) — khusus Admin.
 * Memungkinkan: melihat daftar siswa terkelola, mengubah nilai per mapel,
 * dan menghapus siswa. Setiap perubahan otomatis memicu re-klasterisasi
 * agar cache hasil_clustering tetap sinkron.
 */

export interface ManagedStudentRow {
  nis: string;
  nama_lengkap: string;
  kelas: string;
  periode: string;
  klaster: string;
  nilaiAkhir: number;
  silhouette: number;
  mapel: { kode_mapel: string; nama_mapel: string; nilai_harian: number; nilai_uts: number; nilai_uas: number }[];
}

export async function getManagedStudentsAction(): Promise<{
  success: boolean;
  students?: ManagedStudentRow[];
  isDbConnected?: boolean;
  error?: string;
}> {
  try {
    if (!(await isAdminRequest())) {
      return { success: false, error: 'Akses ditolak. Halaman ini khusus Admin.' };
    }

    const snapshot = await getSupabaseOrMemorySnapshot();
    if (!snapshot) {
      return { success: true, students: [], isDbConnected: false };
    }

    const rows: ManagedStudentRow[] = [];
    const result: ClusteringResult = snapshot.result;
    const detailByNis = new Map<string, RawNilaiRecord[]>();
    for (const rec of snapshot.records) {
      const arr = detailByNis.get(rec.nis) || [];
      arr.push(rec);
      detailByNis.set(rec.nis, arr);
    }

    for (const s of result.students) {
      rows.push({
        nis: s.nis,
        nama_lengkap: s.nama_lengkap,
        kelas: s.kelas,
        periode: result.periodeAnalisis,
        klaster: s.clusterLabel,
        nilaiAkhir: s.nilai_akhir,
        silhouette: s.s,
        mapel: (detailByNis.get(s.nis) || []).map((r) => ({
          kode_mapel: r.kode_mapel,
          nama_mapel: r.nama_mapel,
          nilai_harian: r.nilai_harian,
          nilai_uts: r.nilai_uts,
          nilai_uas: r.nilai_uas,
        })),
      });
    }

    return { success: true, students: rows, isDbConnected: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal memuat data siswa terkelola.' };
  }
}

export interface NilaiUpdateRow {
  kode_mapel: string;
  nama_mapel: string;
  nilai_harian: number;
  nilai_uts: number;
  nilai_uas: number;
  semester: number;
}

/**
 * Update nilai satu siswa lalu re-klasterisasi otomatis.
 * Strategi: ambil seluruh records terkelola, ganti baris siswa target,
 * jalankan ulang upsert + clustering + cache (idempoten per periode).
 */
export async function updateStudentNilaiAction(
  nis: string,
  rows: NilaiUpdateRow[],
  mode: '3D' | '1D' = '3D'
): Promise<{ success: boolean; data?: ClusteringResult; error?: string }> {
  try {
    if (!(await isAdminRequest())) {
      return { success: false, error: 'Akses ditolak. Operasi ini khusus Admin.' };
    }

    const snapshot = await getSupabaseOrMemorySnapshot();
    if (!snapshot) {
      return { success: false, error: 'Database belum terhubung. Tidak ada data untuk diperbarui.' };
    }

    if (!rows || rows.length === 0) {
      return { success: false, error: 'Tidak ada baris nilai untuk diperbarui.' };
    }

    // Validasi rentang nilai 0-100
    for (const r of rows) {
      for (const v of [r.nilai_harian, r.nilai_uts, r.nilai_uas]) {
        if (!Number.isFinite(v) || v < 0 || v > 100) {
          return { success: false, error: `Nilai harus dalam rentang 0-100 (mapel ${r.kode_mapel}).` };
        }
      }
    }

    // Rekonstruksi records: siswa target diganti, siswa lain dipertahankan
    const target = snapshot.records.find((r) => r.nis === nis);
    if (!target) {
      return { success: false, error: `Siswa dengan NIS ${nis} tidak ditemukan pada data terkelola.` };
    }

    const nama = target.nama_lengkap;
    const kelas = target.kelas;
    const others = snapshot.records.filter((r) => r.nis !== nis);
    const replaced: RawNilaiRecord[] = rows.map((r) => ({
      nis,
      nama_lengkap: nama,
      kelas,
      kode_mapel: r.kode_mapel,
      nama_mapel: r.nama_mapel,
      nilai_harian: r.nilai_harian,
      nilai_uts: r.nilai_uts,
      nilai_uas: r.nilai_uas,
      semester: r.semester || target.semester,
      nilai_akhir: 0.3 * r.nilai_harian + 0.3 * r.nilai_uts + 0.4 * r.nilai_uas,
    }));

    const newRecords = [...others, ...replaced];

    // Simpan ulang (upsert idempoten) lalu re-klasterisasi
    await upsertDataAkademik(newRecords);
    const result = processClustering(newRecords, { mode, periode: snapshot.result.periodeAnalisis });
    const siswaMap = new Map<string, string>(snapshot.siswaIdMap);
    await cacheClusteringResult(result, siswaMap);

    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal memperbarui nilai siswa.' };
  }
}

export async function deleteStudentAction(
  nis: string
): Promise<{ success: boolean; data?: ClusteringResult; error?: string }> {
  try {
    if (!(await isAdminRequest())) {
      return { success: false, error: 'Akses ditolak. Operasi ini khusus Admin.' };
    }

    const snapshot = await getSupabaseOrMemorySnapshot();
    if (!snapshot) {
      return { success: false, error: 'Database belum terhubung. Tidak ada data untuk dihapus.' };
    }

    const target = snapshot.records.find((r) => r.nis === nis);
    if (!target) {
      return { success: false, error: `Siswa dengan NIS ${nis} tidak ditemukan.` };
    }

    const remaining = snapshot.records.filter((r) => r.nis !== nis);
    if (remaining.length === 0) {
      return { success: false, error: 'Tidak bisa menghapus siswa terakhir — data menjadi kosong.' };
    }

    await upsertDataAkademik(remaining);
    const result = processClustering(remaining, { mode: '3D', periode: snapshot.result.periodeAnalisis });
    const siswaMap = new Map<string, string>(snapshot.siswaIdMap);
    await cacheClusteringResult(result, siswaMap);

    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal menghapus siswa.' };
  }
}
