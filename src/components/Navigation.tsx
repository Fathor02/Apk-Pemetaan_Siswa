'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderUp,
  FileSpreadsheet,
  GraduationCap,
  BookOpen,
  Menu,
  X,
  BrainCircuit,
  Database,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  LogIn,
  LogOut,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { checkAdminAction, logoutAdminAction } from '@/app/actions/auth';
import { toast } from 'sonner';

const NAV_ITEMS = [
  {
    name: 'Dashboard Analisis',
    href: '/dashboard',
    icon: LayoutDashboard,
    badge: 'K-Means 2D/3D',
    description: 'Visualisasi visual, metrik & scatter plot',
  },
  {
    name: 'Kelola & Import Data',
    href: '/',
    icon: FolderUp,
    badge: 'CSV / Excel',
    description: 'Unggah berkas & jalankan pemrosesan',
  },
  {
    name: 'Detail Hasil & Laporan',
    href: '/laporan',
    icon: FileSpreadsheet,
    badge: 'Tabel & Cetak',
    description: 'Daftar nilai, filter & ekspor laporan',
  },
  {
    name: 'Edukasi Algoritma',
    href: '/edukasi',
    icon: BookOpen,
    badge: 'Teori & Rumus',
    description: 'Pembuktian matematis & simulasi',
  },
];

export function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAction()
      .then((res) => setIsAdmin(res.isAdmin))
      .catch(() => setIsAdmin(false));
  }, [pathname]);

  const handleLogout = async () => {
    await logoutAdminAction();
    setIsAdmin(false);
    toast.info('Logout Admin berhasil.', {
      description: 'Kembali ke mode Pengguna (pass-through tanpa penyimpanan).',
    });
  };

  // Menu khusus Admin (UC-07) — hanya tampil saat sesi admin aktif
  const adminItems = isAdmin
    ? [
        {
          name: 'Kelola Data Siswa',
          href: '/admin/data',
          icon: Database,
          badge: 'Edit / Hapus',
          description: 'Siswa terkelola & hitung ulang klaster',
        },
      ]
    : [];

  return (
    <>
      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
              EduCluster AI
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full font-semibold border border-indigo-200">
                k=3
              </span>
            </span>
            <p className="text-[10px] text-slate-500">Pemetaan Belajar Siswa</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Buka Menu Navigasi"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer Menu */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transform transition-transform duration-200 ease-in-out flex flex-col justify-between ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="font-bold text-slate-900 text-sm">EduCluster AI</span>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-5 space-y-1">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
              Menu Utama
            </div>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="flex-1">{item.name}</span>
                </Link>
              );
            })}
            {adminItems.length > 0 && (
              <>
                <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider px-3 mt-4 mb-2 pt-3 border-t border-slate-200">
                  Menu Admin
                </div>
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-emerald-600'}`} />
                      <span className="flex-1">{item.name}</span>
                    </Link>
                  );
                })}
              </>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500">
          <p className="font-medium text-slate-700">K-Means & Silhouette</p>
          <p className="text-[10px] text-slate-400">Userless Next.js System</p>
          <div className="mt-2">
            {isAdmin ? (
              <button
                onClick={handleLogout}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                <LogOut className="w-3 h-3" />
                Mode Admin — Keluar
              </button>
            ) : (
              <Link
                href="/admin/login"
                onClick={() => setMobileOpen(false)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 transition-colors"
              >
                <LogIn className="w-3 h-3" />
                Login Admin
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-r border-white/60 dark:border-white/10 flex-col justify-between shadow-xs">
        <div>
          {/* Logo & App Branding */}
          <div className="p-6 border-b border-slate-200">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-900 text-base tracking-tight">
                    EduCluster
                  </span>
                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full border border-indigo-200">
                    AI
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">Pemetaan Belajar Siswa</p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 flex-1">
            <div className="flex items-center justify-between px-3 pt-2 pb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Navigasi Aplikasi
              </span>
              <ThemeToggle />
            </div>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'
                    }`}
                  />
                  <div className="flex-1 truncate">
                    <div>{item.name}</div>
                  </div>
                  {isActive ? (
                    <ChevronRight className="w-3.5 h-3.5 text-white/70" />
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400 group-hover:text-slate-600">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
            {adminItems.length > 0 && (
              <>
                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider px-3 mt-4 mb-1 pt-3 border-t border-slate-200 dark:border-slate-700">
                  Menu Admin
                </div>
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100 font-bold'
                          : 'text-slate-600 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                          isActive ? 'text-white' : 'text-emerald-500'
                        }`}
                      />
                      <div className="flex-1 truncate">
                        <div>{item.name}</div>
                      </div>
                      {isActive ? (
                        <ChevronRight className="w-3.5 h-3.5 text-white/70" />
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400 group-hover:text-slate-600">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>
        </div>

        {/* Admin Session Footer */}
        <div className="px-4 pb-2">
          {isAdmin ? (
            <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-300 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 truncate">
                    Mode Admin Aktif
                  </p>
                  <p className="text-[9px] text-emerald-600 dark:text-emerald-400 truncate">
                    Data tersimpan permanen (Supabase)
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Keluar dari Mode Admin"
                className="p-1.5 rounded-lg text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              href="/admin/login"
              className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group"
            >
              <LogIn className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 group-hover:text-indigo-600 dark:group-hover:text-indigo-300" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                  Mode Pengguna
                </p>
                <p className="text-[9px] text-slate-400 dark:text-slate-500">
                  Pass-through — data tidak disimpan · Login Admin
                </p>
              </div>
            </Link>
          )}
        </div>

        {/* Sidebar Footer Info */}
        <div className="p-4 m-3 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/50 dark:from-slate-800/70 dark:to-indigo-950/40 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Sistem Aktif (Userless)</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Algoritma: K-Means (k = 3) &amp; koefisien validitas Silhouette [-1 s/d +1].
          </p>
          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            <span>Next.js 15 App Router</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
