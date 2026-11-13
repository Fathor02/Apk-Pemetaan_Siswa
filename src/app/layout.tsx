import type { Metadata } from 'next';
import './globals.css';
import { Navigation } from '@/components/Navigation';
import { ThemeProvider } from '@/components/ThemeToggle';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'EduCluster AI | Pemetaan Hasil Belajar Siswa (K-Means & Silhouette)',
  description:
    'Aplikasi Web Pemetaan Otomatis Hasil Belajar Siswa Menggunakan Algoritma K-Means Clustering & Pengujian Validitas Silhouette Coefficient',
};

const themeInitScript = `
(function() {
  try {
    var t = localStorage.getItem('educluster-theme');
    if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row">
        {/* Theme Provider */}
        <ThemeProvider>
          {/* Navigation Sidebar / Header */}
          <Navigation />

          {/* Main Content Area */}
          <div className="flex-1 lg:pl-64 flex flex-col min-h-screen w-full">
            {children}
          </div>

          {/* Global Toast Notifications */}
          <Toaster richColors position="top-right" closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
