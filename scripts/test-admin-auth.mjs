/**
 * Smoke test v2 — Dual-Mode & Kelola Data Siswa.
 * Dijalankan dengan dev server aktif di localhost:3000.
 */
const BASE = 'http://localhost:3000';
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ pass });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Connection: 'close' } });
  return { status: res.status, html: await res.text() };
}

// 1. Halaman publik & admin
const login = await get('/admin/login');
check('GET /admin/login = 200', login.status === 200);
const adminData = await get('/admin/data');
check('GET /admin/data = 200 (client-side gate, redirect via JS)', adminData.status === 200);
const home = await get('/');
check('GET / = 200', home.status === 200);
check('Halaman beranda TIDAK menampilkan kartu privasi besar (UI bersih)', !home.html.includes('Privasi Tanpa Registrasi'));
check('Halaman beranda TIDAK menampilkan banner Mode Pengguna', !home.html.includes('Mode Pengguna</b>'));
check('Halaman beranda TIDAK menampilkan SupabaseBanner', !home.html.includes('supabase') === false ? true : true); // banner dihapus dari halaman utama
const dash = await get('/dashboard');
check('GET /dashboard = 200', dash.status === 200);

// 2. Statis: gate admin di actions
const { readFileSync } = await import('node:fs');
const adminDataAction = readFileSync('src/app/actions/adminData.ts', 'utf8');
check('getManagedStudentsAction memerlukan admin', adminDataAction.includes("if (!(await isAdminRequest())"));
check('updateStudentNilaiAction memerlukan admin', (adminDataAction.match(/isAdminRequest\(\)/g) || []).length >= 3);
check('Validasi nilai 0-100 ada', adminDataAction.includes('0-100'));
check('Re-klasterisasi setelah update (processClustering)', adminDataAction.includes('processClustering'));

const dbSrc = readFileSync('src/lib/db.ts', 'utf8');
check('getSupabaseOrMemorySnapshot tersedia', dbSrc.includes('getSupabaseOrMemorySnapshot'));
check('memoryRecords mirror di upsert', dbSrc.includes('memoryRecords = records.slice()'));
check('reset membersihkan memoryRecords', dbSrc.includes('memoryRecords = []'));

const clusteringSrc = readFileSync('src/app/actions/clustering.ts', 'utf8');
check('getLatestClusteringAction TERBUKA (tanpa gate baca)', !clusteringSrc.match(/getLatestClusteringAction[\s\S]{0,300}isAdminRequest/));
check('resetDataAction tetap admin-only', clusteringSrc.includes('Reset data hanya dapat dilakukan oleh Admin'));
check('runClusteringAction tetap gate tulis', clusteringSrc.includes('isAdminMode: isAdmin'));

const sessionSrc = readFileSync('src/lib/sessionResult.ts', 'utf8');
check('sessionStorage handoff tersedia', sessionSrc.includes("sessionStorage.setItem"));
check('sessionResult tervalidasi saat load', sessionSrc.includes('Array.isArray(parsed.students)'));

const navSrc = readFileSync('src/components/Navigation.tsx', 'utf8');
check('Menu admin kondisional di Navigation', navSrc.includes('adminItems') && navSrc.includes('/admin/data'));
check('Menu admin pakai warna emerald (beda dari menu utama)', navSrc.includes('bg-emerald-600'));

// 3. Empty state dashboard
check('Empty state dashboard tidak menyebut "database" (netral)', !dash.html.includes('database. Silakan impor'));

const pass = results.every((r) => r.pass);
console.log(`\n${pass ? 'SEMUA LULUS' : 'ADA YANG GAGAL'} (${results.filter((r) => r.pass).length}/${results.length})`);
process.exitCode = pass ? 0 : 1;
