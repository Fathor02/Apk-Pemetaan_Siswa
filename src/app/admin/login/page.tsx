'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, GraduationCap, ArrowRight, ShieldCheck, Database } from 'lucide-react';
import { loginAdminAction } from '../../actions/auth';
import { toast } from 'sonner';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await loginAdminAction(password);
      if (res.success) {
        toast.success('Login Admin berhasil.', {
          description: 'Mode penyimpanan database aktif. Hasil analisis akan tersimpan permanen.',
        });
        router.push('/');
        router.refresh();
      } else {
        toast.error(res.error || 'Password Admin salah.');
      }
    } catch {
      toast.error('Terjadi kesalahan sistem saat login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-screen px-4 py-10 bg-gradient-to-br from-slate-100 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      <div className="w-full max-w-md">
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-3xl p-8 shadow-xl shadow-slate-900/5 space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 dark:shadow-indigo-950">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Login Admin
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Mode pengelolaan sekolah utama — hasil analisis tersimpan permanen di database.
              </p>
            </div>
          </div>

          {/* Info Dual-Mode */}
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/50">
              <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-300 shrink-0" />
              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                Admin: data siswa &amp; hasil klasterisasi tersimpan ke Supabase
              </span>
            </div>
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <ShieldCheck className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Pengguna (tanpa login): pass-through, data tidak disimpan
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Password Admin
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password Admin"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-md shadow-indigo-200 dark:shadow-indigo-950 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  Masuk Mode Admin
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
            Tanpa login, aplikasi tetap berjalan penuh dalam mode{' '}
            <Link href="/" className="font-semibold text-indigo-600 dark:text-indigo-300 hover:underline">
              Pengguna (userless)
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
