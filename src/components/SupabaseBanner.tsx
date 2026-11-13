'use client';

import React, { useState } from 'react';
import { Database, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Copy, Check, ExternalLink } from 'lucide-react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const isConfiguredClient = Boolean(
  SUPABASE_URL &&
  SUPABASE_URL !== 'https://your-project.supabase.co' &&
  SUPABASE_ANON_KEY &&
  SUPABASE_ANON_KEY.length > 10
);

const sqlSchema = `-- Jalankan DDL ini di Supabase SQL Editor -> New Query
CREATE TABLE IF NOT EXISTS siswa (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nis VARCHAR(50) UNIQUE NOT NULL,
    nama_lengkap VARCHAR(255) NOT NULL,
    kelas VARCHAR(50) NOT NULL
);
CREATE TABLE IF NOT EXISTS mata_pelajaran (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kode_mapel VARCHAR(50) UNIQUE NOT NULL,
    nama_mapel VARCHAR(255) NOT NULL
);
CREATE TABLE IF NOT EXISTS nilai_akademik (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    siswa_id UUID NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
    mapel_id UUID NOT NULL REFERENCES mata_pelajaran(id) ON DELETE CASCADE,
    nilai_harian FLOAT NOT NULL DEFAULT 0 CHECK (nilai_harian BETWEEN 0 AND 100),
    nilai_uts FLOAT NOT NULL DEFAULT 0 CHECK (nilai_uts BETWEEN 0 AND 100),
    nilai_uas FLOAT NOT NULL DEFAULT 0 CHECK (nilai_uas BETWEEN 0 AND 100),
    nilai_akhir FLOAT NOT NULL DEFAULT 0 CHECK (nilai_akhir BETWEEN 0 AND 100),
    semester INT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_nilai_siswa_id ON nilai_akademik(siswa_id);
CREATE TABLE IF NOT EXISTS hasil_clustering (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    siswa_id UUID NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
    klaster VARCHAR(50) NOT NULL,
    periode_analisis VARCHAR(100) NOT NULL,
    jarak_ke_centroid FLOAT,
    nilai_silhouette FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hasil_siswa_id ON hasil_clustering(siswa_id);`;

export function SupabaseBanner() {
  const [openGuide, setOpenGuide] = useState(false);
  const [copied, setCopied] = useState(false);

  const isConfigured = isConfiguredClient;

  const copySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-xl overflow-hidden shadow-xs text-xs">
      <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${isConfigured ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">
                PostgreSQL Supabase:
              </span>
              {isConfigured ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" /> Terhubung Aktif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <AlertTriangle className="w-3 h-3" /> Mode Lokal (Cache Memori)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isConfigured
                ? 'Data siswa, nilai akademik, & hasil klasterisasi tersimpan permanen di cloud PostgreSQL Supabase.'
                : 'Aplikasi berjalan penuh. Isi .env.local dengan URL & Key Supabase untuk persistensi data cloud.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isConfigured && (
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <span>Buat Proyek Supabase</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <button
            onClick={() => setOpenGuide(!openGuide)}
            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors border border-indigo-100"
          >
            <span>{openGuide ? 'Tutup SQL' : 'Lihat SQL Schema'}</span>
            {openGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {openGuide && (
        <div className="px-4 py-3.5 bg-slate-50 border-t border-slate-200 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-700">Skema DDL PostgreSQL (Supabase SQL Editor):</span>
            <button
              onClick={copySql}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-[11px] transition-colors font-semibold shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin!' : 'Salin SQL'}</span>
            </button>
          </div>
          <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl overflow-x-auto text-[10px] font-mono leading-relaxed max-h-52">
            {sqlSchema}
          </pre>
          <div className="mt-2.5 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 space-y-1">
            <p className="font-bold">Konfigurasi .env.local (di root proyek):</p>
            <div className="font-mono space-y-0.5 text-amber-900">
              <p>NEXT_PUBLIC_SUPABASE_URL=https://your-id.supabase.co</p>
              <p>NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key</p>
              <p>SUPABASE_SERVICE_ROLE_KEY=your-service-role-key</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
