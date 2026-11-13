'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  Pencil,
  Trash2,
  Search,
  ArrowLeft,
  RefreshCw,
  Database,
  X,
  Save,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getManagedStudentsAction,
  updateStudentNilaiAction,
  deleteStudentAction,
  ManagedStudentRow,
  NilaiUpdateRow,
} from '../../actions/adminData';
import { checkAdminAction } from '../../actions/auth';
import { saveSessionResult } from '@/lib/sessionResult';

interface EditState {
  nis: string;
  nama_lengkap: string;
  rows: NilaiUpdateRow[];
}

export default function AdminDataPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [students, setStudents] = useState<ManagedStudentRow[]>([]);
  const [isDbConnected, setIsDbConnected] = useState(true);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCluster, setFilterCluster] = useState<string>('ALL');
  const [editState, setEditState] = useState<EditState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedStudentRow | null>(null);
  const [busy, setBusy] = useState(false);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getManagedStudentsAction();
      if (res.success) {
        setStudents(res.students || []);
        setIsDbConnected(res.isDbConnected !== false);
      } else {
        toast.error(res.error || 'Gagal memuat data siswa.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal memuat data siswa.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAdminAction()
      .then((res) => {
        if (!res.isAdmin) {
          router.replace('/admin/login');
          return;
        }
        setAuthorized(true);
        loadStudents();
      })
      .catch(() => router.replace('/admin/login'));
  }, [router, loadStudents]);

  // Satu baris per siswa (mapel digabung di kolom)
  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.nama_lengkap.toLowerCase().includes(search.toLowerCase()) ||
        s.nis.toLowerCase().includes(search.toLowerCase()) ||
        s.kelas.toLowerCase().includes(search.toLowerCase());
      const matchCluster = filterCluster === 'ALL' || s.klaster === filterCluster;
      return matchSearch && matchCluster;
    });
  }, [students, search, filterCluster]);

  const openEdit = (s: ManagedStudentRow) => {
    setEditState({
      nis: s.nis,
      nama_lengkap: s.nama_lengkap,
      rows: s.mapel.map((m) => ({
        kode_mapel: m.kode_mapel,
        nama_mapel: m.nama_mapel,
        nilai_harian: m.nilai_harian,
        nilai_uts: m.nilai_uts,
        nilai_uas: m.nilai_uas,
        semester: 1,
      })),
    });
  };

  const handleSaveEdit = async () => {
    if (!editState) return;
    setBusy(true);
    const toastId = toast.loading('Menyimpan nilai & menghitung ulang klaster...');
    try {
      const res = await updateStudentNilaiAction(editState.nis, editState.rows);
      if (res.success && res.data) {
        saveSessionResult(res.data);
        toast.success(`Nilai ${editState.nama_lengkap} diperbarui. Klaster dihitung ulang.`, { id: toastId });
        setEditState(null);
        await loadStudents();
      } else {
        toast.error(res.error || 'Gagal memperbarui nilai.', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal memperbarui nilai.', { id: toastId });
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    const toastId = toast.loading('Menghapus siswa & menghitung ulang klaster...');
    try {
      const res = await deleteStudentAction(deleteTarget.nis);
      if (res.success && res.data) {
        saveSessionResult(res.data);
        toast.success(`Siswa ${deleteTarget.nama_lengkap} dihapus. Klaster dihitung ulang.`, { id: toastId });
        setDeleteTarget(null);
        await loadStudents();
      } else {
        toast.error(res.error || 'Gagal menghapus siswa.', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus siswa.', { id: toastId });
    } finally {
      setBusy(false);
    }
  };

  if (authorized === null || loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-white/60 dark:border-white/10 px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Admin
              </span>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Kelola Data Siswa Terkelola
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Ubah nilai per mapel atau hapus siswa — hasil klasterisasi otomatis dihitung ulang.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadStudents}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Muat Ulang</span>
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Beranda</span>
            </Link>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Peringatan DB belum terhubung */}
        {!isDbConnected && students.length === 0 && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-bold">Database belum terhubung.</p>
              <p>
                Fitur kelola data membutuhkan Supabase. Isi kredensial di{' '}
                <code className="px-1 rounded bg-amber-100 dark:bg-amber-900/50 font-mono">.env.local</code>{' '}
                lalu unggah data sebagai Admin. Sementara ini mode analisis tetap berjalan tanpa penyimpanan.
              </p>
            </div>
          </div>
        )}

        {/* Filter bar */}
        {students.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari NIS / nama / kelas..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {['ALL', 'Tinggi', 'Sedang', 'Rendah'].map((c) => (
              <button
                key={c}
                onClick={() => setFilterCluster(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filterCluster === c
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {c === 'ALL' ? 'Semua' : c}
              </button>
            ))}
            <span className="text-xs text-slate-400 ml-auto">
              {filtered.length} dari {students.length} siswa
            </span>
          </div>
        )}

        {/* Tabel siswa */}
        {students.length === 0 && isDbConnected ? (
          <div className="text-center py-16 space-y-3">
            <Database className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Belum ada data siswa terkelola.
            </p>
            <p className="text-xs text-slate-400">
              Unggah berkas nilai sebagai Admin di halaman beranda — data akan tersimpan di database.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Unggah Data Sekarang
            </Link>
          </div>
        ) : filtered.length === 0 && students.length > 0 ? (
          <div className="text-center py-16">
            <Search className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
              Tidak ada siswa yang cocok dengan filter.
            </p>
          </div>
        ) : (
          filtered.length > 0 && (
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl shadow-xl shadow-slate-900/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-4 text-left">Siswa</th>
                      <th className="py-3 px-4 text-center">Klaster</th>
                      <th className="py-3 px-4 text-center">Nilai Akhir</th>
                      <th className="py-3 px-4 text-center">s(i)</th>
                      <th className="py-3 px-4 text-center">Mapel</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filtered.map((s) => (
                      <tr key={s.nis} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{s.nama_lengkap}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {s.nis} · {s.kelas} · {s.periode}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              s.klaster === 'Tinggi'
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : s.klaster === 'Sedang'
                                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                            }`}
                          >
                            {s.klaster}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                          {s.nilaiAkhir.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-600 dark:text-slate-300">
                          {s.silhouette >= 0 ? '+' : ''}
                          {s.silhouette.toFixed(3)}
                        </td>
                        <td className="py-3 px-4 text-center text-[11px] text-slate-500 dark:text-slate-400">
                          {s.mapel.length} mapel
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEdit(s)}
                              title="Edit nilai per mapel"
                              className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(s)}
                              title="Hapus siswa"
                              className="p-1.5 rounded-lg text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </main>

      {/* Modal Edit Nilai */}
      {editState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Edit Nilai — {editState.nama_lengkap}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">NIS {editState.nis}</p>
              </div>
              <button
                onClick={() => setEditState(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {editState.rows.map((row, i) => (
                <div key={row.kode_mapel} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                    {row.nama_mapel} <span className="text-slate-400 font-mono font-normal">({row.kode_mapel})</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ['nilai_harian', 'Harian'],
                        ['nilai_uts', 'UTS'],
                        ['nilai_uas', 'UAS'],
                      ] as const
                    ).map(([field, label]) => (
                      <div key={field}>
                        <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          {label}
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={row[field]}
                          onChange={(e) => {
                            const rows = [...editState.rows];
                            rows[i] = { ...row, [field]: parseFloat(e.target.value) || 0 };
                            setEditState({ ...editState, rows });
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 font-mono">
                    Nilai Akhir = 0.3×{row.nilai_harian.toFixed(1)} + 0.3×{row.nilai_uts.toFixed(1)} + 0.4×
                    {row.nilai_uas.toFixed(1)} ={' '}
                    <b className="text-indigo-600 dark:text-indigo-300">
                      {(0.3 * row.nilai_harian + 0.3 * row.nilai_uts + 0.4 * row.nilai_uas).toFixed(2)}
                    </b>
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditState(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={busy}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center gap-1.5"
              >
                {busy ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Simpan & Hitung Ulang Klaster
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Hapus Siswa?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <b>{deleteTarget.nama_lengkap}</b> ({deleteTarget.nis}) akan dihapus permanen dari database,
                  termasuk seluruh nilai dan hasil klasternya. Klaster akan dihitung ulang otomatis.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={busy}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 transition-colors flex items-center gap-1.5"
              >
                {busy ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ya, Hapus Siswa
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
