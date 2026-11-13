'use client';

import React, { useState } from 'react';
import { Table, ChevronDown, ChevronUp } from 'lucide-react';
import { RawNilaiRecord } from '@/types';

interface RawDataPreviewProps {
  records: RawNilaiRecord[];
}

export function RawDataPreview({ records }: RawDataPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const displayLimit = 10;

  if (records.length === 0) return null;

  return (
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl shadow-xl shadow-slate-900/5 overflow-hidden">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Table className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Pratinjau Data Mentah Akademik
            </h3>
            <p className="text-xs text-slate-500">
              Total {records.length} baris nilai mata pelajaran yang terbaca dari berkas.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="text-xs font-semibold text-indigo-600 flex items-center gap-1"
        >
          <span>{isOpen ? 'Sembunyikan' : 'Tampilkan Data'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-slate-200">
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">NIS</th>
                  <th className="py-2.5 px-3">Nama Lengkap</th>
                  <th className="py-2.5 px-3">Kelas</th>
                  <th className="py-2.5 px-3">Mata Pelajaran</th>
                  <th className="py-2.5 px-3 text-right">Harian</th>
                  <th className="py-2.5 px-3 text-right">UTS</th>
                  <th className="py-2.5 px-3 text-right">UAS</th>
                  <th className="py-2.5 px-3 text-right font-bold text-slate-900">Nilai Akhir</th>
                  <th className="py-2.5 px-3 text-center">Semester</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {records.slice(0, 100).map((r, i) => (
                  <tr key={`${r.nis}-${r.kode_mapel}-${i}`} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-slate-600 font-semibold">{r.nis}</td>
                    <td className="py-2 px-3 font-sans text-slate-900 font-medium">{r.nama_lengkap}</td>
                    <td className="py-2 px-3 text-slate-600">{r.kelas}</td>
                    <td className="py-2 px-3 font-sans text-slate-700">{r.nama_mapel} ({r.kode_mapel})</td>
                    <td className="py-2 px-3 text-right">{r.nilai_harian}</td>
                    <td className="py-2 px-3 text-right">{r.nilai_uts}</td>
                    <td className="py-2 px-3 text-right">{r.nilai_uas}</td>
                    <td className="py-2 px-3 text-right font-bold text-indigo-700 bg-indigo-50/40">
                      {r.nilai_akhir.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-center font-sans">{r.semester}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {records.length > 100 && (
            <div className="p-2 text-center text-[11px] text-slate-400 bg-slate-50 border-t border-slate-200">
              Menampilkan 100 baris pertama dari {records.length} total baris.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
