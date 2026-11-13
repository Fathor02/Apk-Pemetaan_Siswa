'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Download, Sparkles, AlertCircle, CheckCircle2, RefreshCw, X } from 'lucide-react';
import { RawNilaiRecord } from '@/types';
import { parseCSVString, parseExcelBuffer } from '@/lib/parser';
import { generateSampleRecords } from '@/lib/sampleData';
import { toast } from 'sonner';

interface FileUploadProps {
  onDataLoaded: (records: RawNilaiRecord[], fileName: string) => void;
  onClear: () => void;
  hasData: boolean;
  totalRecords: number;
  totalStudents: number;
}

export function FileUpload({
  onDataLoaded,
  onClear,
  hasData,
  totalRecords,
  totalStudents,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setLoading(true);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let records: RawNilaiRecord[] = [];

      if (ext === 'csv') {
        const text = await file.text();
        records = parseCSVString(text);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        records = parseExcelBuffer(buffer);
      } else {
        throw new Error('Format berkas tidak didukung. Harap unggah berkas .csv atau .xlsx');
      }

      setCurrentFileName(file.name);
      onDataLoaded(records, file.name);
    } catch (err: any) {
      toast.error('Gagal Membaca Berkas', {
        description: err?.message || 'Terjadi kesalahan saat memproses berkas.',
      });
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const loadDummyData = () => {
    setLoading(true);
    try {
      const dummy = generateSampleRecords();
      setCurrentFileName('Data Dummy — 20 Siswa (3 Mata Pelajaran)');
      onDataLoaded(dummy, 'Data Dummy 20 Siswa');
    } catch (err: any) {
      toast.error('Gagal memuat data dummy.', {
        description: err?.message || 'Coba kembali.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    window.open('/api/clustering/sample', '_blank');
  };

  return (
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-6 shadow-xl shadow-slate-900/5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
              1
            </span>
            Unggah Berkas Nilai Siswa (CSV / XLSX)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kolom wajib: <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">nis</code>, <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">nama_lengkap</code>, <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">kelas</code>, <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">kode_mapel</code>, <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">nama_mapel</code>, <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">nilai_harian</code>, <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">nilai_uts</code>, <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">nilai_uas</code>, <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">semester</code>.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Unduh Template CSV</span>
          </button>
          <button
            type="button"
            onClick={loadDummyData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-medium transition-colors disabled:opacity-60"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Muat Data Contoh</span>
          </button>
        </div>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !loading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-7 text-center transition-all ${
          loading
            ? 'cursor-wait border-indigo-400 dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40'
            : isDragging
            ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/50 cursor-copy'
            : hasData
            ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/30 cursor-pointer'
            : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-2.5">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            loading ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300' : hasData ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300' : 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300'
          }`}>
            {loading ? (
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-300" />
            ) : hasData ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-300" />
            ) : (
              <Upload className="w-6 h-6 text-indigo-600 dark:text-indigo-300" />
            )}
          </div>

          <div>
            {loading ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                  Sedang memproses berkas...
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Harap tunggu sebentar</p>
              </div>
            ) : hasData ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Berkas Aktif: <span className="text-emerald-700 dark:text-emerald-300">{currentFileName}</span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Klik atau seret berkas baru ke sini untuk mengganti dataset
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Klik untuk memilih berkas, atau seret &amp; lepas di sini
                </p>
                <p className="text-xs text-slate-500">
                  Mendukung format <strong>.CSV</strong> dan <strong>.XLSX</strong> (Microsoft Excel)
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Summary Bar */}
      {hasData && (
        <div className="mt-4 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="text-slate-600">Baris Nilai Terbaca:</span>
              <span className="font-bold text-slate-900">{totalRecords} baris</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span className="text-slate-600">Siswa Unik (Agregasi K-Means):</span>
              <span className="font-bold text-slate-900">{totalStudents} siswa</span>
            </div>
            <div className="hidden sm:flex text-slate-400">|</div>
            <div className="text-[11px] text-slate-500">
              Formula: <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">Nilai Akhir = 30% Harian + 30% UTS + 40% UAS</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setCurrentFileName('');
              onClear();
            }}
            className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-semibold self-end sm:self-auto hover:underline flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            <span>Kosongkan</span>
          </button>
        </div>
      )}
    </div>
  );
}
