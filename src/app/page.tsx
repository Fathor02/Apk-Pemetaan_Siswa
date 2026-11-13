'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUpload } from '@/components/FileUpload';
import { RawDataPreview } from '@/components/RawDataPreview';
import { RawNilaiRecord } from '@/types';
import { runClusteringAction, resetDataAction } from './actions/clustering';
import { checkAdminAction } from './actions/auth';
import { saveSessionResult, clearSessionResult } from '@/lib/sessionResult';
import { aggregateBySiswa } from '@/lib/parser';import {
  Play,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  Layers,
  Calendar,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

/** Banner kecil untuk Mode Admin aktif — tidak tampil untuk Pengguna (UI bersih). */
function ModeStatusBanner() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-semibold bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
      <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-500 animate-pulse" />
      <span>
        <b>Mode Admin</b> — hasil analisis akan tersimpan permanen ke database Supabase.
      </span>
    </div>
  );
}

export default function UploadPage() {
  const router = useRouter();
  const [rawRecords, setRawRecords] = useState<RawNilaiRecord[]>([]);
  const [mode, setMode] = useState<'3D' | '1D'>('3D');
  const [periode, setPeriode] = useState<string>('Semester 1 - 2026/2027');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  React.useEffect(() => {
    checkAdminAction()
      .then((res) => setIsAdmin(res.isAdmin))
      .catch(() => setIsAdmin(false));
  }, []);

  const handleDataLoaded = (records: RawNilaiRecord[], fileName: string) => {
    setRawRecords(records);
    // Dataset baru diunggah — hasil sesi lama tidak lagi relevan.
    clearSessionResult();
    toast.success(`Berhasil membaca ${records.length} baris dari "${fileName}"`, {
      description: `${aggregateBySiswa(records).length} siswa unik siap diproses K-Means.`,
    });
  };

  const handleClear = () => {
    setRawRecords([]);
    clearSessionResult();
    toast.info('Data berkas dikosongkan. Unggah berkas baru untuk memulai.');
  };

  const handleRunClusteringAndRedirect = async () => {
    if (rawRecords.length === 0) {
      toast.error('Tidak ada data untuk diproses!', {
        description: 'Unggah berkas CSV/XLSX atau muat data contoh terlebih dahulu.',
      });
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading('Sedang mengolah nilai & menjalankan K-Means + Silhouette Coefficient...');

    try {
      const res = await runClusteringAction(rawRecords, mode, periode);

      if (res.success && res.data) {
        // Handoff hasil ke dashboard/laporan via sessionStorage (instan, tanpa DB
        // untuk mode Pengguna; mode Admin juga menyimpan permanen di sisi server).
        saveSessionResult(res.data);

        const isAdminMode = res.stats?.isAdminMode === true;
        toast.success('Klasterisasi Berhasil!', {
          id: toastId,
          description: isAdminMode
            ? `Mode Admin: hasil tersimpan ke database. Silhouette avg: ${res.data.silhouetteAvg.toFixed(3)} (${res.data.silhouetteInterpretation.status}).`
            : `Silhouette avg: ${res.data.silhouetteAvg.toFixed(3)} (${res.data.silhouetteInterpretation.status}).`,
          duration: 3000,
        });

        setTimeout(() => {
          router.push('/dashboard');
        }, 900);
      } else {
        toast.error('Klasterisasi Gagal', {
          id: toastId,
          description: res.error || 'Terjadi kesalahan saat pemrosesan.',
        });
        setIsProcessing(false);
      }
    } catch (err: any) {
      toast.error('Kesalahan Sistem', {
        id: toastId,
        description: err?.message || 'Terjadi kesalahan tidak terduga.',
      });
      setIsProcessing(false);
    }
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    const toastId = toast.loading('Sedang membersihkan seluruh data di database...');

    try {
      const res = await resetDataAction();
      if (res.success) {
        setRawRecords([]);
        clearSessionResult();
        setShowResetModal(false);
        toast.success('Berhasil Direset!', {
          id: toastId,
          description: res.message,
        });
      } else {
        // Non-admin: cukup bersihkan hasil sesi lokal (tidak ada data di DB).
        clearSessionResult();
        setRawRecords([]);
        setShowResetModal(false);
        toast.info('Hasil sesi dibersihkan.', {
          id: toastId,
          description: res.error || 'Reset database hanya untuk Admin.',
        });
      }
    } catch (err: any) {
      toast.error('Kesalahan Reset', {
        id: toastId,
        description: err?.message || 'Terjadi kesalahan saat menghapus data.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const aggregatedCount = aggregateBySiswa(rawRecords).length;

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Top Header */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-white/60 dark:border-white/10 px-6 py-5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Langkah 1
              </span>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Kelola &amp; Import Data Nilai Siswa
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Unggah CSV/XLSX, konfigurasi parameter, lalu jalankan klasterisasi.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Data Analisis</span>
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors shadow-xs"
            >
              <span>Buka Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Status Mode — hanya tampil saat Admin aktif (tampilan pengguna tetap bersih) */}
        {isAdmin && <ModeStatusBanner />}

        {/* Komponen Unggah Berkas */}
        <FileUpload
          onDataLoaded={handleDataLoaded}
          onClear={handleClear}
          hasData={rawRecords.length > 0}
          totalRecords={rawRecords.length}
          totalStudents={aggregatedCount}
        />

        {/* Pratinjau Data Mentah (Accordion) */}
        {rawRecords.length > 0 && <RawDataPreview records={rawRecords} />}

        {/* Parameter Analisis & Eksekusi */}
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-6 shadow-xl shadow-slate-900/5">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
            <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
              2
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Konfigurasi Parameter &amp; Eksekusi Klasterisasi
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih dimensi ruang fitur dan periode analisis sebelum menjalankan K-Means.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
            {/* Dimensi Ruang Fitur */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                Ruang Fitur K-Means
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMode('3D')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    mode === '3D'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Matriks 3D [H, UTS, UAS]
                </button>
                <button
                  type="button"
                  onClick={() => setMode('1D')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    mode === '1D'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  1D [Nilai Akhir]
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                <Info className="w-3 h-3 text-slate-400 shrink-0" />
                {mode === '3D'
                  ? 'Jarak Euclidean pada ruang 3 dimensi nilai Harian, UTS, dan UAS.'
                  : 'Klasterisasi linear berdasarkan satu nilai Nilai Akhir agregasi.'}
              </p>
            </div>

            {/* Periode Analisis */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                Periode Analisis (Cache Key)
              </label>
              <input
                type="text"
                value={periode}
                onChange={(e) => setPeriode(e.target.value)}
                placeholder="cth: Semester 1 - 2026/2027"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Digunakan sebagai kunci penyimpanan di tabel <code className="text-slate-700 font-semibold">hasil_clustering</code>.
              </p>
            </div>

            {/* Tombol Impor & Jalankan */}
            <div>
              <button
                type="button"
                onClick={handleRunClusteringAndRedirect}
                disabled={rawRecords.length === 0 || isProcessing}
                className={`w-full py-3 px-5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
                  rawRecords.length === 0 || isProcessing
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-indigo-200 active:scale-[0.99]'
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Menghitung K-Means &amp; Silhouette...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Impor &amp; Jalankan Klasterisasi &rarr; Dashboard</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-slate-500 text-center mt-1.5">
                Selesai diproses, Anda akan diarahkan otomatis ke Dashboard.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-5 border-t border-slate-200 bg-white text-center text-xs text-slate-400">
        <p>EduCluster AI &bull; K-Means Clustering &amp; Silhouette Coefficient &bull; Next.js 15 App Router</p>
      </footer>

      {/* Modal Konfirmasi Reset */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Reset Seluruh Data Analisis?
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Tindakan ini akan menghapus <strong>seluruh data</strong> — siswa, nilai akademik, mata pelajaran, dan riwayat klasterisasi — secara permanen dari database (cascade delete). Berkas CSV/XLSX Anda tidak terpengaruh.
              </p>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Data yang sudah dihapus tidak dapat dipulihkan. Pastikan Anda memiliki cadangan berkas CSV/Excel.</span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={isResetting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors flex items-center gap-1.5 shadow-sm shadow-rose-200"
              >
                {isResetting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Mereset...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Semua Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
