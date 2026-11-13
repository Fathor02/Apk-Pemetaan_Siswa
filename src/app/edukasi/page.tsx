'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  BrainCircuit,
  Calculator,
  Compass,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Layers,
  ChevronRight,
} from 'lucide-react';

export default function EdukasiPage() {
  // Simulator Interaktif Silhouette s(i)
  const [intraA, setIntraA] = useState<number>(4.2);
  const [interB, setInterB] = useState<number>(12.8);

  const maxVal = Math.max(intraA, interB);
  const calculatedS = maxVal > 0 ? (interB - intraA) / maxVal : 0;

  let simInterpretation = 'Sangat Baik (Struktur Klaster Kuat)';
  let simBadgeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (calculatedS < 0.25) {
    simInterpretation = 'Buruk / Tumpang Tindih (Klaster Lemah)';
    simBadgeColor = 'text-rose-700 bg-rose-50 border-rose-200';
  } else if (calculatedS <= 0.5) {
    simInterpretation = 'Sedang / Wajar (Pemisahan Cukup)';
    simBadgeColor = 'text-amber-700 bg-amber-50 border-amber-200';
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Top Header */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-white/60 dark:border-white/10 px-6 py-5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Landasan Teori
              </span>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Edukasi Algoritma: K-Means &amp; Silhouette Coefficient
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Panduan matematis lengkap, metodologi konvergensi, pembuktian rumus, serta simulator interaktif untuk presentasi sidang skripsi.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-colors shadow-2xs self-start md:self-auto"
          >
            <span>Kembali ke Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Main Educational Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* ======================================================== */}
        {/* SECTION 1: K-MEANS CLUSTERING */}
        {/* ======================================================== */}
        <section className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-900/5 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                1. Algoritma K-Means Clustering
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Metode unsupervised learning berbasis partisi untuk mengelompokkan data siswa berdasarkan kemiripan nilai.
              </p>
            </div>
          </div>

          {/* Konsep & Langkah Kerja */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                1
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Inisialisasi Centroid
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Menentukan <i>k</i> = 3 kategori (Tinggi, Sedang, Rendah). Centroid awal dipilih dari titik-titik nilai unik menggunakan algoritma K-Means++ untuk menghindari local minima.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                2
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Perhitungan Jarak Euclidean
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Menghitung jarak geometris setiap siswa ke ketiga centroid. Siswa dialokasikan ke klaster yang memiliki jarak terpendek (kedekatan paling tinggi).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                3
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Pembaruan &amp; Konvergensi
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Menghitung kembali rata-rata anggota tiap klaster untuk mendapatkan posisi centroid baru. Proses diulang hingga posisi centroid stabil (&Delta;&mu; &lt; 10<sup>-4</sup>).
              </p>
            </div>
          </div>

          {/* Formula Matematika K-Means */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Formula Matematis K-Means
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Rumus Euclidean */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
                <span className="text-[10px] font-mono text-indigo-300 uppercase">
                  A. Jarak Euclidean (3 Dimensi)
                </span>
                <div className="font-mono text-xs sm:text-sm text-slate-100 py-1 bg-white/10 p-2.5 rounded-lg">
                  d(p, q) = &radic;[ (p_H - q_H)&sup2; + (p_UTS - q_UTS)&sup2; + (p_UAS - q_UAS)&sup2; ]
                </div>
                <p className="text-[11px] text-slate-400">
                  Mengukur jarak absolut antara vektor nilai siswa <i>p</i> dan titik pusat klaster <i>q</i>.
                </p>
              </div>

              {/* Rumus Rekalkulasi Centroid */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
                <span className="text-[10px] font-mono text-indigo-300 uppercase">
                  B. Rekalkulasi Titik Pusat (Centroid)
                </span>
                <div className="font-mono text-xs sm:text-sm text-slate-100 py-1 bg-white/10 p-2.5 rounded-lg">
                  &mu;_k = (1 / N_k) &times; &sum; x_i (untuk setiap siswa x_i dalam klaster k)
                </div>
                <p className="text-[11px] text-slate-400">
                  Rata-rata aritmatika dari seluruh vektor anggota yang tergabung dalam klaster ke-<i>k</i>.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SECTION 2: SILHOUETTE COEFFICIENT */}
        {/* ======================================================== */}
        <section className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-900/5 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-300 flex items-center justify-center font-bold">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                2. Metode Pengujian Silhouette Coefficient
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Metrik validasi internal untuk menguji seberapa baik suatu objek ditempatkan di dalam klasternya sendiri dibandingkan klaster tetangga.
              </p>
            </div>
          </div>

          {/* Penjelasan a(i) dan b(i) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
                  Nilai a(i): Jarak Intra-Klaster
                </span>
                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-full">
                  Kohesi (Cohesion)
                </span>
              </div>
              <div className="font-mono text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-indigo-200/60 dark:border-indigo-800">
                a(i) = [ 1 / (|C_I| - 1) ] &times; &sum; d(i, j)  (j &ne; i)
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Rata-rata jarak antara siswa <i>i</i> dengan seluruh siswa lain yang berada dalam <b>klaster yang sama</b>. Semakin kecil nilai <i>a(i)</i>, semakin padat (rapat) klaster tersebut.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-violet-50/50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-violet-900 dark:text-violet-200 uppercase tracking-wider">
                  Nilai b(i): Jarak Inter-Klaster Terdekat
                </span>
                <span className="text-[10px] bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 font-bold px-2 py-0.5 rounded-full">
                  Separasi (Separation)
                </span>
              </div>
              <div className="font-mono text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-violet-200/60 dark:border-violet-800">
                b(i) = min(J &ne; I) [ 1 / |C_J| &times; &sum; d(i, j) ]
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Rata-rata jarak terpendek antara siswa <i>i</i> dengan anggota pada <b>klaster tetangga terdekat</b>. Semakin besar nilai <i>b(i)</i>, semakin baik pemisahan antarklaster.
              </p>
            </div>
          </div>

          {/* Formula s(i) */}
          <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3">
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
              Formula Koefisien Silhouette s(i)
            </span>
            <div className="font-mono text-sm sm:text-base text-white bg-white/10 p-3 rounded-xl border border-white/10">
              s(i) = [ b(i) - a(i) ] / max( a(i), b(i) )
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Rentang nilai <i>s(i)</i> berada pada interval <b>-1 hingga +1</b>. Nilai mendekati +1 menunjukkan data sangat tepat berada di klasternya, nilai 0 menunjukkan data berada di perbatasan klaster, dan nilai negatif mengindikasikan kemungkinan salah klaster.
            </p>
          </div>

          {/* Tabel Interpretasi Kaufman & Rousseeuw (1990) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Tabel Standar Interpretasi (Kaufman &amp; Rousseeuw, 1990)
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800 text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">Rentang Skor Silhouette</th>
                    <th className="py-3 px-4">Kategori Struktur</th>
                    <th className="py-3 px-4">Makna Akademis &amp; Kualitas Pengelompokan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                  <tr className="bg-emerald-50/40 dark:bg-emerald-950/30">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">0.71 &ndash; 1.00</td>
                    <td className="py-3 px-4 font-bold text-emerald-800 dark:text-emerald-300">Struktur Sangat Kuat</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">Pemisahan antarkelompok prestasi siswa sangat kontras dan tegas tanpa tumpang tindih.</td>
                  </tr>
                  <tr className="bg-blue-50/40 dark:bg-blue-950/30">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700 dark:text-blue-400">0.51 &ndash; 0.70</td>
                    <td className="py-3 px-4 font-bold text-blue-800 dark:text-blue-300">Struktur Masuk Akal / Baik</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">Pola pengelompokan alami siswa terbentuk dengan baik dan reliabel untuk acuan evaluasi guru.</td>
                  </tr>
                  <tr className="bg-amber-50/40 dark:bg-amber-950/30">
                    <td className="py-3 px-4 font-mono font-bold text-amber-700 dark:text-amber-400">0.26 &ndash; 0.50</td>
                    <td className="py-3 px-4 font-bold text-amber-800 dark:text-amber-300">Struktur Lemah / Cukup</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">Struktur kelompok terdeteksi, namun terdapat sejumlah siswa pada perbatasan klaster.</td>
                  </tr>
                  <tr className="bg-rose-50/40 dark:bg-rose-950/30">
                    <td className="py-3 px-4 font-mono font-bold text-rose-700 dark:text-rose-400">&le; 0.25</td>
                    <td className="py-3 px-4 font-bold text-rose-800 dark:text-rose-300">Tidak Berstruktur / Buruk</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">Data nilai siswa tersebar merata / tumpang tindih tinggi, klaster buatan kurang representatif.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SECTION 3: SIMULATOR INTERAKTIF RUMUS SILHOUETTE */}
        {/* ======================================================== */}
        <section className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-3xl p-6 md:p-8 text-white shadow-xl space-y-6 border border-white/10">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="w-10 h-10 rounded-2xl bg-white/10 text-indigo-300 flex items-center justify-center font-bold">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                3. Simulator Interaktif Pengujian Silhouette
              </h2>
              <p className="text-xs text-slate-300">
                Uji langsung pengaruh jarak intra-klaster <i>a(i)</i> dan jarak inter-klaster <i>b(i)</i> terhadap nilai koefisien <i>s(i)</i>.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Input Slider a(i) */}
            <div className="space-y-2 bg-white/5 p-4 rounded-2xl border border-white/10">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-semibold">Jarak Intra a(i):</span>
                <span className="font-mono font-bold text-indigo-300">{intraA.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="25"
                step="0.1"
                value={intraA}
                onChange={(e) => setIntraA(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">Rata-rata jarak ke anggota klaster sendiri</p>
            </div>

            {/* Input Slider b(i) */}
            <div className="space-y-2 bg-white/5 p-4 rounded-2xl border border-white/10">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-semibold">Jarak Inter b(i):</span>
                <span className="font-mono font-bold text-violet-300">{interB.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="25"
                step="0.1"
                value={interB}
                onChange={(e) => setInterB(parseFloat(e.target.value))}
                className="w-full accent-violet-500 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">Rata-rata jarak ke klaster tetangga terdekat</p>
            </div>

            {/* Hasil Komputasi s(i) */}
            <div className="bg-white/10 p-5 rounded-2xl border border-white/20 text-center space-y-2 backdrop-blur-xs">
              <div className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">
                Skor Silhouette s(i) Terhitung
              </div>
              <div className="text-3xl font-black font-mono text-white">
                {calculatedS >= 0 ? `+${calculatedS.toFixed(3)}` : calculatedS.toFixed(3)}
              </div>
              <div className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-block border ${simBadgeColor}`}>
                {simInterpretation}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
