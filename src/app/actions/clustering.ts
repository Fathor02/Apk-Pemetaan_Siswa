'use server';

import { RawNilaiRecord, ClusteringResult } from '@/types';
import { processClustering, testOptimalK, KTestEntry } from '@/lib/clusterEngine';
import { upsertDataAkademik, cacheClusteringResult, getCachedClustering, resetAllDatabaseData } from '@/lib/db';
import { generateSampleRecords } from '@/lib/sampleData';
import { isSupabaseConfigured } from '@/lib/supabase';
import { isAdminRequest } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function runClusteringAction(
  records: RawNilaiRecord[],
  mode: '3D' | '1D' = '3D',
  periode: string = 'Semester 1 - 2026/2027'
): Promise<{ success: boolean; data?: ClusteringResult; error?: string; stats?: any }> {
  try {
    if (!records || records.length === 0) {
      return { success: false, error: 'Tidak ada data nilai yang diproses.' };
    }

    // Dual-Mode Persistence:
    // - Admin (sesi valid)  → simpan master data + cache hasil ke Supabase.
    // - Pengguna (tanpa sesi) → pass-through penuh, tanpa penulisan database.
    const isAdmin = await isAdminRequest();

    // 1. Simpan/Upsert master data ke PostgreSQL (siswa, mapel, nilai) — hanya Admin
    let stats = { siswaCount: 0, mapelCount: 0, nilaiCount: 0 };
    let siswaMap = new Map<string, string>();

    if (isAdmin) {
      try {
        const upsertResult = await upsertDataAkademik(records);
        stats = {
          siswaCount: upsertResult.siswaCount,
          mapelCount: upsertResult.mapelCount,
          nilaiCount: upsertResult.nilaiCount,
        };
        siswaMap = upsertResult.siswaMap;
      } catch (dbErr: any) {
        console.warn('Peringatan saat upsert database:', dbErr.message);
      }
    }

    // 2. Jalankan algoritma K-Means & Silhouette (selalu server-side, kedua mode)
    const result = processClustering(records, { mode, periode });

    // 3. Simpan hasil clustering ke cache PostgreSQL (hasil_clustering) — hanya Admin
    if (isAdmin) {
      try {
        await cacheClusteringResult(result, siswaMap);
      } catch (cacheErr: any) {
        console.warn('Peringatan saat cache clustering:', cacheErr.message);
      }
    }

    // Revalidate paths agar dashboard & laporan selalu mutakhir
    revalidatePath('/dashboard');
    revalidatePath('/laporan');
    revalidatePath('/');

    return {
      success: true,
      data: result,
      stats: {
        ...stats,
        isDatabaseConnected: isSupabaseConfigured,
        isAdminMode: isAdmin,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Terjadi kesalahan sistem saat komputasi klasterisasi.',
    };
  }
}

export async function getLatestClusteringAction(
  periode: string = 'latest'
): Promise<{ success: boolean; data?: ClusteringResult | null; isDbConnected: boolean }> {
  try {
    // Baca hasil terakhir TERBUKA untuk semua mode (Admin & Pengguna):
    // datanya bukan master data pribadi, hanya hasil klasterisasi terakhir.
    // Gate admin tetap berlaku untuk operasi TULIS (upsert/cache/reset).
    const data = await getCachedClustering(periode);
    return {
      success: true,
      data,
      isDbConnected: isSupabaseConfigured,
    };
  } catch (err: any) {
    return {
      success: false,
      data: null,
      isDbConnected: isSupabaseConfigured,
    };
  }
}

export async function getSampleDataAction(): Promise<RawNilaiRecord[]> {
  return generateSampleRecords();
}

export async function testOptimalKAction(
  records: RawNilaiRecord[],
  mode: '3D' | '1D' = '3D',
  maxK: number = 5
): Promise<{ success: boolean; entries?: KTestEntry[]; recommendedK?: number; error?: string }> {
  try {
    if (!records || records.length === 0) {
      return { success: false, error: 'Tidak ada data untuk diuji. Unggah berkas atau muat data contoh.' };
    }
    const { entries, recommendedK } = testOptimalK(records, { mode, maxK });
    return { success: true, entries, recommendedK };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal menjalankan uji nilai k.' };
  }
}

export async function resetDataAction(): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    // Reset data (UC-08) adalah operasi berbahaya — khusus Admin.
    if (!(await isAdminRequest())) {
      return {
        success: false,
        message: 'Akses ditolak.',
        error: 'Reset data hanya dapat dilakukan oleh Admin. Silakan login sebagai Admin.',
      };
    }

    const res = await resetAllDatabaseData();
    revalidatePath('/dashboard');
    revalidatePath('/laporan');
    revalidatePath('/');
    return {
      success: true,
      message: res.message,
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Gagal mereset data.',
      error: err?.message || 'Terjadi kesalahan saat menghapus data.',
    };
  }
}
