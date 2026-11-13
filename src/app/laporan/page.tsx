'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getLatestClusteringAction } from '../actions/clustering';
import { loadSessionResult } from '@/lib/sessionResult';
import { ClusteringResult, StudentClustered, ClusterCategory } from '@/types';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FolderUp,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function LaporanPage() {
  const router = useRouter();
  const [data, setData] = useState<ClusteringResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCluster, setSelectedCluster] = useState<string>('ALL');
  const [onlyAmbiguous, setOnlyAmbiguous] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    async function loadData() {
      try {
        // 1. Hasil sesi aktif (mode Pengguna pass-through)
        const sessionData = loadSessionResult();
        if (sessionData) {
          setData(sessionData);
          setLoading(false);
          return;
        }
        // 2. Fallback: hasil tersimpan di DB (mode Admin)
        const res = await getLatestClusteringAction('latest');
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setData(null);
        }
      } catch (err) {
        console.error(err);
        toast.error('Gagal mengambil data laporan.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const students = useMemo(() => data?.students || [], [data]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.nama_lengkap.toLowerCase().includes(search.toLowerCase()) ||
        s.nis.toLowerCase().includes(search.toLowerCase()) ||
        s.kelas.toLowerCase().includes(search.toLowerCase());

      const matchCluster =
        selectedCluster === 'ALL' || s.clusterLabel === selectedCluster;

      const matchAmbiguous = !onlyAmbiguous || s.s < 0.2;

      return matchSearch && matchCluster && matchAmbiguous;
    });
  }, [students, search, selectedCluster, onlyAmbiguous]);

  const ambiguousCount = useMemo(() => students.filter((s) => s.s < 0.2).length, [students]);

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (filteredStudents.length === 0) {
      toast.error('Tidak ada data untuk diekspor!');
      return;
    }

    try {
      const exportRows = filteredStudents.map((s, index) => ({
        No: index + 1,
        'Nomor Induk Siswa (NIS)': s.nis,
        'Nama Lengkap Siswa': s.nama_lengkap,
        'Kelas': s.kelas,
        'Nilai Harian (Rata-rata)': s.nilai_harian,
        'Nilai UTS (Rata-rata)': s.nilai_uts,
        'Nilai UAS (Rata-rata)': s.nilai_uas,
        'Nilai Akhir (30:30:40)': s.nilai_akhir,
        'Kategori Klaster': s.clusterLabel,
        'Jarak ke Centroid': s.jarak_ke_centroid,
        'Silhouette s(i)': s.s,
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportRows);

      // Set column widths
      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 18 },
        { wch: 28 },
        { wch: 14 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 16 },
        { wch: 16 },
        { wch: 18 },
        { wch: 15 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Klaster Siswa');

      const fileName = `Laporan_Klasterisasi_Siswa_${data?.periodeAnalisis.replace(/[\s\/\\]+/g, '_') || 'Terbaru'}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success('Berkas Excel (.xlsx) berhasil diunduh!');
    } catch (err: any) {
      toast.error('Gagal mengekspor berkas Excel: ' + err.message);
    }
  };

  // Export PDF / Print Laporan
  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-600">
          Memuat data laporan hasil klasterisasi...
        </p>
      </div>
    );
  }

  if (!data || students.length === 0) {
    return (
      <div className="flex-1 max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
          <FileSpreadsheet className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Belum Ada Data Hasil Klasterisasi untuk Dilaporkan
          </h2>
          <p className="text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
            Silakan unggah berkas nilai siswa dan jalankan proses klasterisasi terlebih dahulu untuk melihat daftar nilai dan mengunduh laporan akademik.
          </p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center gap-2 shadow-md shadow-indigo-200 transition-all"
        >
          <FolderUp className="w-4 h-4" />
          <span>Ke Halaman Import Data</span>
        </button>
      </div>
    );
  }

  const badgeStyles: Record<ClusterCategory, string> = {
    Tinggi: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    Sedang: 'bg-amber-50 text-amber-800 border-amber-200',
    Rendah: 'bg-rose-50 text-rose-800 border-rose-200',
  };

  const dotStyles: Record<ClusterCategory, string> = {
    Tinggi: 'bg-emerald-500',
    Sedang: 'bg-amber-500',
    Rendah: 'bg-rose-500',
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* ======================================================== */}
      {/* FORMAL PRINT-ONLY REPORT HEADER (Muncul saat Cetak / PDF) */}
      {/* ======================================================== */}
      <div className="hidden print-only p-6 border-b-2 border-black text-center mb-6 space-y-1">
        <h1 className="text-lg font-bold uppercase tracking-wide">
          LAPORAN HASIL EVALUASI & PEMETAAN PRESTASI BELAJAR SISWA
        </h1>
        <h2 className="text-sm font-semibold text-slate-800">
          METODE K-MEANS CLUSTERING & SILHOUETTE COEFFICIENT VALIDATION
        </h2>
        <div className="text-xs text-slate-600 pt-1 flex justify-between px-4">
          <span>Periode Analisis: <b>{data.periodeAnalisis}</b></span>
          <span>Total Siswa: <b>{data.totalStudents} Siswa</b></span>
          <span>Rata-rata Silhouette: <b>{data.silhouetteAvg.toFixed(3)} ({data.silhouetteInterpretation.status})</b></span>
          <span>Tanggal Cetak: <b>{new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</b></span>
        </div>
      </div>

      {/* Top Header Controls (Hidden during print) */}
      <div className="no-print bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-white/60 dark:border-white/10 px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Detail Laporan
              </span>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Laporan Hasil Pemetaan Akademik Siswa
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Data lengkap nilai individual, jarak Euclidean centroid, evaluasi koefisien validitas Silhouette, serta fitur ekspor resmi.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export to Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 transition-colors shadow-2xs"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Export PDF / Cetak Laporan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Table Container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Search & Filter Bar (Hidden on print) */}
          <div className="no-print p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari berdasarkan Nama Siswa, NIS, atau Kelas..."
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
            </div>

            {/* Filter Klaster Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" /> Klaster:
              </span>
              {(['ALL', 'Tinggi', 'Sedang', 'Rendah'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCluster(cat);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedCluster === cat
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat === 'ALL' ? 'Semua Klaster' : `Klaster ${cat}`}
                </button>
              ))}

              {/* Filter Siswa Ambigu / Rawan (s(i) < 0.2) */}
              <button
                type="button"
                onClick={() => {
                  setOnlyAmbiguous(!onlyAmbiguous);
                  setCurrentPage(1);
                }}
                title="Siswa dengan skor Silhouette rendah (s(i) < 0.2) — posisi rawan di perbatasan klaster"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  onlyAmbiguous
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-white text-rose-700 hover:bg-rose-50 border-rose-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Siswa Ambigu ({ambiguousCount})</span>
              </button>
            </div>
          </div>

          {/* Table Data */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">NIS</th>
                  <th className="py-3 px-4">Nama Lengkap Siswa</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-3 text-right">Rata Harian</th>
                  <th className="py-3 px-3 text-right">Rata UTS</th>
                  <th className="py-3 px-3 text-right">Rata UAS</th>
                  <th className="py-3 px-4 text-right font-bold text-slate-900 bg-slate-100/50">Nilai Akhir</th>
                  <th className="py-3 px-4 text-center">Klaster Prestasi</th>
                  <th className="py-3 px-3 text-right font-mono" title="Jarak Euclidean ke Centroid">Jarak Centroid</th>
                  <th className="py-3 px-4 text-right font-mono font-bold" title="Koefisien Silhouette individual">Skor s(i)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-12 text-slate-400">
                      Tidak ditemukan data siswa yang cocok dengan filter atau kata kunci pencarian.
                    </td>
                  </tr>
                ) : (
                  // Jika dicetak (print), tampilkan SEMUA data tanpa terpotong pagination
                  (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('print').matches
                    ? filteredStudents
                    : paginatedData
                  ).map((s: StudentClustered, idx: number) => {
                    const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                    const silColor =
                      s.s >= 0.5 ? 'text-emerald-600' : s.s >= 0.25 ? 'text-amber-600' : 'text-rose-600';
                    const isAmbiguous = s.s < 0.2;

                    return (
                      <tr key={s.nis} className={`transition-colors ${isAmbiguous ? 'bg-rose-50/60' : 'hover:bg-slate-50/80'}`}>
                        <td className="py-3 px-4 text-center text-slate-400 font-mono">
                          {isAmbiguous ? (
                            <span title="Siswa ambigu: skor Silhouette rendah (s(i) < 0.2)" className="inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-500" />
                              {globalIdx}
                            </span>
                          ) : (
                            globalIdx
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-600">
                          {s.nis}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {s.nama_lengkap}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {s.kelas}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600">
                          {s.nilai_harian.toFixed(1)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600">
                          {s.nilai_uts.toFixed(1)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600">
                          {s.nilai_uas.toFixed(1)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900 bg-slate-50/50">
                          {s.nilai_akhir.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeStyles[s.clusterLabel]}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[s.clusterLabel]}`} />
                            {s.clusterLabel}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-500">
                          {s.jarak_ke_centroid.toFixed(2)}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono font-black ${silColor}`}>
                          {s.s >= 0 ? `+${s.s.toFixed(3)}` : s.s.toFixed(3)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer (Hidden on print) */}
          <div className="no-print p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Menampilkan <span className="font-bold text-slate-900">{paginatedData.length}</span> dari total{' '}
              <span className="font-bold text-slate-900">{filteredStudents.length}</span> data siswa
              {filteredStudents.length !== students.length && ` (disaring dari total ${students.length} siswa)`}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-semibold text-slate-800">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* PRINT SIGNATURE FOOTER (Muncul saat Export PDF / Print) */}
        {/* ======================================================== */}
        <div className="hidden print-only pt-12 text-xs">
          <div className="grid grid-cols-2 text-center gap-12">
            <div className="space-y-16">
              <p>Mengetahui,<br /><b>Kepala Sekolah</b></p>
              <p className="underline font-bold">(........................................................)</p>
            </div>
            <div className="space-y-16">
              <p>Guru Pembimbing / Wali Kelas,<br /><b>Koordinator Akademik</b></p>
              <p className="underline font-bold">(........................................................)</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="no-print py-5 border-t border-slate-200 bg-white text-center text-xs text-slate-400">
        <p>EduCluster AI &bull; Detail Hasil Pemetaan Akademik &bull; K-Means Clustering &amp; Silhouette Coefficient</p>
      </footer>
    </div>
  );
}
