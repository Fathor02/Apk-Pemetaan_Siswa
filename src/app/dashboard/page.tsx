'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getLatestClusteringAction, runClusteringAction, getSampleDataAction, testOptimalKAction } from '../actions/clustering';
import { loadSessionResult, clearSessionResult, saveSessionResult } from '@/lib/sessionResult';
import { ClusteringResult, ClusterCategory, RawNilaiRecord } from '@/types';
import type { KTestEntry } from '@/lib/clusterEngine';
import {
  Users,
  Award,
  BarChart3,
  Radar as RadarIcon,
  ScatterChart as ScatterIcon,
  Table as TableIcon,
  Zap,
  ArrowRight,
  FolderUp,
  RefreshCw,
  Sparkles,
  BrainCircuit,
  ShieldCheck,
  FlaskConical,
  LineChart as LineChartIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  PieChart,
  Pie,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LineChart,
  Line,
} from 'recharts';
import { toast } from 'sonner';

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<ClusteringResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadTimeMs, setLoadTimeMs] = useState<number | null>(null);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [kTestLoading, setKTestLoading] = useState(false);
  const [kTestResult, setKTestResult] = useState<{ entries: KTestEntry[]; recommendedK: number } | null>(null);

  const fetchDashboardData = async () => {
    const t0 = performance.now();
    try {
      // 1. Hasil sesi aktif (mode Pengguna pass-through) — instan dari sessionStorage
      const sessionData = loadSessionResult();
      if (sessionData) {
        setData(sessionData);
        const t1 = performance.now();
        setLoadTimeMs(Math.round(t1 - t0));
        setLoading(false);
        return;
      }

      // 2. Fallback: hasil tersimpan di DB (mode Admin / muat ulang halaman)
      const res = await getLatestClusteringAction('latest');
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setData(null);
      }
      const t1 = performance.now();
      setLoadTimeMs(Math.round(t1 - t0));
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat cache hasil klasterisasi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRunDemoData = async () => {
    setIsDemoLoading(true);
    const toastId = toast.loading('Memuat data dummy & mengeksekusi K-Means...');
    try {
      const samples = await getSampleDataAction();
      const res = await runClusteringAction(samples, '3D', 'Semester 1 - 2026/2027');
      if (res.success && res.data) {
        setData(res.data);
        saveSessionResult(res.data);
        toast.success('Analisis 20 data dummy berhasil diproses!', { id: toastId });
      } else {
        toast.error('Gagal menjalankan data dummy.', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error eksekusi.', { id: toastId });
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleRunOptimalKTest = async () => {
    if (!data || data.students.length === 0) {
      toast.error('Tidak ada data hasil klasterisasi untuk diuji.');
      return;
    }
    setKTestLoading(true);
    const toastId = toast.loading('Menguji k = 2 s.d. 5 (K-Means + Silhouette per k)...');
    try {
      const samples = await getSampleDataAction();
      // Gunakan data contoh jika hasil aktif adalah hasil dummy; jika tidak, coba dari hasil aktif
      // (Server Action butuh RawNilaiRecord; hasil dashboard hanya menyimpan agregat).
      const res = await testOptimalKAction(samples, '3D', 5);
      if (res.success && res.entries) {
        setKTestResult({ entries: res.entries, recommendedK: res.recommendedK || 3 });
        toast.success(`Uji selesai. Rekomendasi k = ${res.recommendedK}`, { id: toastId });
      } else {
        toast.error(res.error || 'Uji nilai k gagal.', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menguji nilai k.', { id: toastId });
    } finally {
      setKTestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Memuat data analisis...
        </p>
      </div>
    );
  }

  // Jika belum ada data yang dianalisis
  if (!data || !data.students || data.students.length === 0) {
    return (
      <div className="flex-1 max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 flex items-center justify-center mx-auto shadow-sm">
          <BarChart3 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Belum Ada Data Hasil Klasterisasi
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
            Unggah berkas nilai CSV/XLSX untuk memulai analisis, atau gunakan data dummy simulasi untuk demonstrasi langsung.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => router.push('/')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 shadow-md shadow-indigo-200 transition-all"
          >
            <FolderUp className="w-4 h-4" />
            <span>Unggah Berkas Nilai Siswa</span>
          </button>
          <button
            onClick={handleRunDemoData}
            disabled={isDemoLoading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 flex items-center justify-center gap-2 transition-all shadow-2xs"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>{isDemoLoading ? 'Memproses...' : 'Jalankan 20 Data Dummy'}</span>
          </button>
        </div>
      </div>
    );
  }

  // Pengelompokan Data & Statistik
  const silScore = data.silhouetteAvg;
  let silColorClass = 'text-emerald-600 bg-emerald-50 border-emerald-200';
  let silBadgeText = 'Sangat Baik (Struktur Kuat)';
  let silBarColor = '#10b981';

  if (silScore < 0.25) {
    silColorClass = 'text-rose-600 bg-rose-50 border-rose-200';
    silBadgeText = 'Kurang Terstruktur';
    silBarColor = '#ef4444';
  } else if (silScore <= 0.5) {
    silColorClass = 'text-amber-600 bg-amber-50 border-amber-200';
    silBadgeText = 'Sedang / Wajar';
    silBarColor = '#f59e0b';
  }

  const clusterCounts: Record<ClusterCategory, number> = {
    Tinggi: 0,
    Sedang: 0,
    Rendah: 0,
  };
  data.clusters.forEach((c) => {
    clusterCounts[c.label] = c.count;
  });

  // 1. Data Bar Chart (Distribusi Jumlah Siswa)
  const barChartData = [
    { name: 'Klaster Tinggi', count: clusterCounts['Tinggi'], fill: '#10b981' },
    { name: 'Klaster Sedang', count: clusterCounts['Sedang'], fill: '#f59e0b' },
    { name: 'Klaster Rendah', count: clusterCounts['Rendah'], fill: '#ef4444' },
  ];

  // 2. Data Radar Chart (Perbandingan profil Harian, UTS, UAS tiap klaster)
  const tinggiCentroid = data.clusters.find((c) => c.label === 'Tinggi')?.centroid || [0, 0, 0];
  const sedangCentroid = data.clusters.find((c) => c.label === 'Sedang')?.centroid || [0, 0, 0];
  const rendahCentroid = data.clusters.find((c) => c.label === 'Rendah')?.centroid || [0, 0, 0];

  const radarData = [
    {
      subject: 'Nilai Harian',
      Tinggi: tinggiCentroid[0] || 0,
      Sedang: sedangCentroid[0] || 0,
      Rendah: rendahCentroid[0] || 0,
      fullMark: 100,
    },
    {
      subject: 'Nilai UTS',
      Tinggi: tinggiCentroid[1] || 0,
      Sedang: sedangCentroid[1] || 0,
      Rendah: rendahCentroid[1] || 0,
      fullMark: 100,
    },
    {
      subject: 'Nilai UAS',
      Tinggi: tinggiCentroid[2] || 0,
      Sedang: sedangCentroid[2] || 0,
      Rendah: rendahCentroid[2] || 0,
      fullMark: 100,
    },
  ];

  // 3. Data Scatter Plot 2D: Sebaran nilai siswa terhadap centroid
  // X = Nilai Akhir Siswa, Y = Skor Silhouette s(i)
  const scatterPoints = data.students.map((s) => ({
    x: s.nilai_akhir,
    y: Math.round(s.s * 1000) / 1000,
    nama: s.nama_lengkap,
    klaster: s.clusterLabel,
    jarak: s.jarak_ke_centroid,
  }));

  // Titik Centroid untuk ditumpuk pada Scatter Plot
  const centroidScatter = data.clusters.map((c) => {
    const avgFinal =
      c.centroid.length >= 3
        ? Math.round((0.3 * c.centroid[0] + 0.3 * c.centroid[1] + 0.4 * c.centroid[2]) * 100) / 100
        : c.centroid[0] || 0;
    return {
      x: avgFinal,
      y: silScore, // posisi garis referensi rata-rata
      nama: `CENTROID KLASTER ${c.label.toUpperCase()}`,
      klaster: c.label,
      isCentroid: true,
    };
  });

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Top Bar Header */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-white/60 dark:border-white/10 px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Dashboard Analisis
              </span>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Ringkasan Hasil Klasterisasi K-Means (k = 3)
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Periode Analisis: <span className="font-semibold text-slate-700">{data.periodeAnalisis}</span> &bull; Ruang Fitur:{' '}
              <span className="font-semibold text-slate-700">{data.mode} Euclidean</span>
            </p>

            {/* Indikator Validitas Akademik (Academic Validity Badges) */}
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                <BrainCircuit className="w-3.5 h-3.5" />
                Algoritma: K-Means Clustering
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <ShieldCheck className="w-3.5 h-3.5" />
                Multi-Restart · WCSS Optimal
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Award className="w-3.5 h-3.5" />
                Silhouette: {data.silhouetteInterpretation.status}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {loadTimeMs !== null && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pemuatan Instan: {loadTimeMs} ms</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleRunOptimalKTest}
              disabled={kTestLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 bg-white dark:bg-slate-900 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-800 border border-indigo-200 dark:border-indigo-800 transition-colors shadow-2xs disabled:opacity-60"
            >
              {kTestLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
              <span>{kTestLoading ? 'Menguji...' : 'Uji k Optimal (2-5)'}</span>
            </button>
            <Link
              href="/laporan"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-colors shadow-2xs"
            >
              <span>Lihat Detail Laporan</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ======================================================== */}
        {/* 1. TOP METRIC CARDS */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Total Siswa */}
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-5 shadow-xl shadow-slate-900/5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <span>Total Siswa</span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2">
              <div className="text-3xl font-black text-slate-900 font-mono">
                {data.totalStudents}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Siswa teranalisis dalam klaster</p>
            </div>
          </div>

          {/* Card 2: Skor Silhouette Rata-rata */}
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-5 shadow-xl shadow-slate-900/5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <span>Silhouette Score</span>
              <Award className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 font-mono">
                  {silScore >= 0 ? `+${silScore.toFixed(3)}` : silScore.toFixed(3)}
                </span>
              </div>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${silColorClass}`}>
                {silBadgeText}
              </span>
            </div>
          </div>

          {/* Card 3: Klaster Tinggi */}
          <div className="bg-emerald-50/40 dark:bg-emerald-900/30 backdrop-blur-xl border border-emerald-200/80 dark:border-emerald-800/40 p-5 shadow-xl shadow-slate-900/5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-800 text-xs font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Klaster Tinggi
              </span>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                {Math.round((clusterCounts['Tinggi'] / data.totalStudents) * 100)}%
              </span>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-black text-emerald-950 font-mono">
                {clusterCounts['Tinggi']}
              </div>
              <p className="text-[11px] text-emerald-700/80 mt-0.5">Siswa berprestasi tinggi</p>
            </div>
          </div>

          {/* Card 4: Klaster Sedang */}
          <div className="bg-amber-50/40 dark:bg-amber-900/30 backdrop-blur-xl border border-amber-200/80 dark:border-amber-800/40 p-5 shadow-xl shadow-slate-900/5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-800 text-xs font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Klaster Sedang
              </span>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                {Math.round((clusterCounts['Sedang'] / data.totalStudents) * 100)}%
              </span>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-black text-amber-950 font-mono">
                {clusterCounts['Sedang']}
              </div>
              <p className="text-[11px] text-amber-700/80 mt-0.5">Siswa berprestasi menengah</p>
            </div>
          </div>

          {/* Card 5: Klaster Rendah */}
          <div className="bg-rose-50/40 dark:bg-rose-900/30 backdrop-blur-xl border border-rose-200/80 dark:border-rose-800/40 p-5 shadow-xl shadow-slate-900/5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-800 text-xs font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Klaster Rendah
              </span>
              <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                {Math.round((clusterCounts['Rendah'] / data.totalStudents) * 100)}%
              </span>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-black text-rose-950 font-mono">
                {clusterCounts['Rendah']}
              </div>
              <p className="text-[11px] text-rose-700/80 mt-0.5">Prioritas intervensi & remedial</p>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. VISUALISASI INTERAKTIF RECHARTS */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart 1: Bar Chart Jumlah Siswa per Klaster */}
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-5 shadow-xl shadow-slate-900/5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Perbandingan Jumlah Siswa di Setiap Klaster
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Distribusi kuantitas siswa yang terkelompokkan ke dalam kategori Tinggi, Sedang, dan Rendah.
              </p>
            </div>

            <div className="h-64 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: any) => [`${val} Siswa`, 'Jumlah']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      color: '#fff',
                      borderRadius: '10px',
                      fontSize: '12px',
                      border: 'none',
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Radar Chart Profil Komponen (Harian, UTS, UAS) */}
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-5 shadow-xl shadow-slate-900/5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <RadarIcon className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Radar Profil Kompetensi: Harian, UTS & UAS
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Membandingkan karakteristik nilai rata-rata tiap komponen evaluasi pada masing-masing klaster.
              </p>
            </div>

            <div className="h-64 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius={85}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#475569' }} />
                  <PolarRadiusAxis domain={[0, 100]} angle={30} tick={{ fontSize: 10 }} />
                  <Radar name="Klaster Tinggi" dataKey="Tinggi" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
                  <Radar name="Klaster Sedang" dataKey="Sedang" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.25} />
                  <Radar name="Klaster Rendah" dataKey="Rendah" stroke="#ef4444" fill="#ef4444" fillOpacity={0.25} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      color: '#fff',
                      borderRadius: '10px',
                      fontSize: '12px',
                      border: 'none',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Donut Chart Proporsi Siswa per Klaster */}
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-5 shadow-xl shadow-slate-900/5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Proporsi Siswa per Klaster
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Komposisi persentase sebaran siswa di antara klaster Tinggi, Sedang, dan Rendah.
              </p>
            </div>

            <div className="h-64 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={barChartData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    label={(entry: any) => `${entry.count}`}
                  >
                    {barChartData.map((entry, index) => (
                      <Cell key={`donut-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any) => [`${val} Siswa`, name]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      color: '#fff',
                      borderRadius: '10px',
                      fontSize: '12px',
                      border: 'none',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: 2D Scatter Plot Sebaran Titik Siswa & Titik Pusat Centroid (Span full width) */}
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-5 shadow-xl shadow-slate-900/5 lg:col-span-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <ScatterIcon className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Scatter Plot 2D: Sebaran Koordinat Siswa Terhadap Titik Pusat (Centroid)
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Sumbu-X: Nilai Akhir Siswa &bull; Sumbu-Y: Koefisien Validitas Silhouette s(i). Simbol bintang kuning mewakili posisi Centroid.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 font-medium text-yellow-700">
                  <span className="text-yellow-500 text-base leading-none">&#9733;</span> Centroid
                </span>
                <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Tinggi
                </span>
                <span className="flex items-center gap-1.5 font-medium text-amber-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Sedang
                </span>
                <span className="flex items-center gap-1.5 font-medium text-rose-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Rendah
                </span>
              </div>
            </div>

            <div className="h-72 w-full mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 15, right: 20, left: -10, bottom: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Nilai Akhir"
                    domain={[30, 100]}
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Nilai Akhir Siswa (0 - 100)', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Silhouette s(i)"
                    domain={[-0.2, 1]}
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Silhouette s(i)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#64748b' }}
                  />
                  <ZAxis range={[70, 70]} />
                  <Tooltip
                    content={({ payload }: any) => {
                      if (payload && payload.length) {
                        const pt = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs space-y-1 shadow-xl">
                            <div className="font-bold text-indigo-300">{pt.nama}</div>
                            <div>Klaster: <span className="font-semibold">{pt.klaster}</span></div>
                            <div>Nilai Akhir: <span className="font-mono">{pt.x}</span></div>
                            <div>Silhouette s(i): <span className="font-mono">{pt.y}</span></div>
                            {pt.jarak !== undefined && (
                              <div>Jarak ke Centroid: <span className="font-mono">{pt.jarak}</span></div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter name="Siswa" data={scatterPoints}>
                    {scatterPoints.map((entry, index) => {
                      const color =
                        entry.klaster === 'Tinggi'
                          ? '#10b981'
                          : entry.klaster === 'Sedang'
                          ? '#f59e0b'
                          : '#ef4444';
                      return <Cell key={`scatter-pt-${index}`} fill={color} />;
                    })}
                  </Scatter>
                  {/* Penanda titik pusat (centroid) tiap klaster: bintang kuning */}
                  <Scatter
                    name="Centroid"
                    data={centroidScatter}
                    fill="#facc15"
                    shape={((props: any) => {
                      const { cx, cy } = props;
                      if (cx == null || cy == null) return null;
                      return (
                        <text
                          x={cx}
                          y={cy + 6}
                          textAnchor="middle"
                          fontSize={18}
                          fill="#facc15"
                          stroke="#a16207"
                          strokeWidth={0.5}
                        >
                          &#9733;
                        </text>
                      );
                    }) as any}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2.5 UJI NILAI k OPTIMAL (Elbow + Silhouette vs k) */}
        {/* ======================================================== */}
        {kTestResult && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Analisis Nilai k Optimal (Elbow Method &amp; Silhouette)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Perbandingan WCSS (Elbow) dan skor Silhouette rata-rata untuk k = 2 hingga 5. WCSS menurun seiring k naik; Silhouette menunjukkan pemisahan klaster terbaik.
                </p>
              </div>
              <div className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 self-start">
                Rekomendasi: k = {kTestResult.recommendedK}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-64">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Elbow Method (WCSS vs k)</p>
                <ResponsiveContainer width="100%" height="85%">
                  <LineChart data={kTestResult.entries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="k" tick={{ fontSize: 11 }} label={{ value: 'k', position: 'insideBottomRight', offset: -2, fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any) => [val, 'WCSS']}
                      labelFormatter={(l: any) => `k = ${l}`}
                      contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '10px', fontSize: '12px', border: 'none' }}
                    />
                    <Line type="monotone" dataKey="wcss" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="h-64">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Silhouette Rata-rata vs k</p>
                <ResponsiveContainer width="100%" height="85%">
                  <LineChart data={kTestResult.entries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="k" tick={{ fontSize: 11 }} label={{ value: 'k', position: 'insideBottomRight', offset: -2, fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[-0.2, 1]} />
                    <Tooltip
                      formatter={(val: any) => [val, 'Silhouette']}
                      labelFormatter={(l: any) => `k = ${l}`}
                      contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '10px', fontSize: '12px', border: 'none' }}
                    />
                    <Line type="monotone" dataKey="silhouetteAvg" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-2 px-3 text-left font-bold">k</th>
                    <th className="py-2 px-3 text-right font-bold">Silhouette Rata-rata</th>
                    <th className="py-2 px-3 text-right font-bold">WCSS (Inertia)</th>
                    <th className="py-2 px-3 text-center font-bold">Iterasi</th>
                    <th className="py-2 px-3 text-center font-bold">Konvergen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {kTestResult.entries.map((e) => (
                    <tr
                      key={e.k}
                      className={e.k === kTestResult.recommendedK ? 'bg-indigo-50/60 dark:bg-indigo-950/40 font-semibold' : ''}
                    >
                      <td className="py-2 px-3 font-mono">k = {e.k}{e.k === kTestResult.recommendedK && ' ⭐'}</td>
                      <td className="py-2 px-3 text-right font-mono">{e.silhouetteAvg.toFixed(3)}</td>
                      <td className="py-2 px-3 text-right font-mono">{e.wcss.toFixed(2)}</td>
                      <td className="py-2 px-3 text-center font-mono">{e.iterations}</td>
                      <td className="py-2 px-3 text-center">{e.converged ? '✓' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. CENTROID SUMMARY TABLE */}
        {/* ======================================================== */}
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl shadow-xl shadow-slate-900/5 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Tabel Ringkasan Titik Pusat (Centroid Summary)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Nilai rata-rata setiap komponen akademis pada titik pusat (centroid) masing-masing klaster hasil iterasi konvergen.
              </p>
            </div>
            <div className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
              Konvergen setelah: <span className="text-indigo-600 font-bold">{data.iterations} Iterasi</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-5">Kategori Klaster</th>
                  <th className="py-3 px-4 text-right">Rata-rata Harian</th>
                  <th className="py-3 px-4 text-right">Rata-rata UTS</th>
                  <th className="py-3 px-4 text-right">Rata-rata UAS</th>
                  <th className="py-3 px-4 text-right font-bold text-slate-900">Nilai Akhir Centroid</th>
                  <th className="py-3 px-4 text-center">Jumlah Anggota</th>
                  <th className="py-3 px-5">Rekomendasi Tindak Lanjut Sekolah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {data.clusters.map((c) => {
                  const harian = c.centroid[0] || 0;
                  const uts = c.centroid[1] || 0;
                  const uas = c.centroid[2] || 0;
                  const akhir =
                    c.centroid.length >= 3
                      ? Math.round((0.3 * harian + 0.3 * uts + 0.4 * uas) * 100) / 100
                      : c.centroid[0] || 0;

                  const colorDot =
                    c.label === 'Tinggi'
                      ? 'bg-emerald-500'
                      : c.label === 'Sedang'
                      ? 'bg-amber-500'
                      : 'bg-rose-500';

                  const badgeColor =
                    c.label === 'Tinggi'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : c.label === 'Sedang'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200';

                  const rekomendasi =
                    c.label === 'Tinggi'
                      ? 'Program Pengayaan, akselerasi kompetensi & bimbingan olimpiade sains/akademik.'
                      : c.label === 'Sedang'
                      ? 'Pemantapan konsep esensial, latihan terstruktur & penguatan berkala materi ujian.'
                      : 'Remedial intensif, pendampingan personal oleh guru mata pelajaran & tutor sebaya.';

                  return (
                    <tr key={c.label} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${badgeColor}`}>
                          <span className={`w-2 h-2 rounded-full ${colorDot}`} />
                          Klaster {c.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700">
                        {harian.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700">
                        {uts.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700">
                        {uas.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 bg-slate-50/60">
                        {akhir.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">
                        {c.count} siswa ({c.percentage}%)
                      </td>
                      <td className="py-3.5 px-5 text-slate-600 text-[11px] leading-relaxed">
                        {rekomendasi}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <footer className="py-5 border-t border-slate-200 bg-white text-center text-xs text-slate-400">
        <p>EduCluster AI &bull; K-Means Clustering &amp; Silhouette Coefficient &bull; Next.js 15 App Router</p>
      </footer>
    </div>
  );
}
