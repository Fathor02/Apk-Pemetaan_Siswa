import { RawNilaiRecord } from '@/types';
import { calculateNilaiAkhir } from './parser';

export const SAMPLE_STUDENTS: Array<{ nis: string; nama: string; kelas: string; tier: 'tinggi' | 'sedang' | 'rendah' }> = [
  // Kelompok Tinggi (Rata-rata 80 - 95)
  { nis: "NIS-1001", nama: "Ahmad Fauzi Rahman", kelas: "XII-MIPA-1", tier: 'tinggi' },
  { nis: "NIS-1002", nama: "Bunga Citra Lestari", kelas: "XII-MIPA-1", tier: 'tinggi' },
  { nis: "NIS-1003", nama: "Dian Sastrowardoyo", kelas: "XII-MIPA-1", tier: 'tinggi' },
  { nis: "NIS-1004", nama: "Farhan Maulana", kelas: "XII-MIPA-2", tier: 'tinggi' },
  { nis: "NIS-1005", nama: "Gita Gutawa", kelas: "XII-MIPA-2", tier: 'tinggi' },
  { nis: "NIS-1006", nama: "Hafizh Rabbani", kelas: "XII-MIPA-2", tier: 'tinggi' },
  
  // Kelompok Sedang (Rata-rata 65 - 79)
  { nis: "NIS-1007", nama: "Indra Lesmana", kelas: "XII-MIPA-1", tier: 'sedang' },
  { nis: "NIS-1008", nama: "Joko Susilo", kelas: "XII-MIPA-1", tier: 'sedang' },
  { nis: "NIS-1009", nama: "Kartika Putri", kelas: "XII-MIPA-1", tier: 'sedang' },
  { nis: "NIS-1010", nama: "Lukman Sardi", kelas: "XII-MIPA-2", tier: 'sedang' },
  { nis: "NIS-1011", nama: "Maya Septha", kelas: "XII-MIPA-2", tier: 'sedang' },
  { nis: "NIS-1012", nama: "Naufal Samudra", kelas: "XII-MIPA-2", tier: 'sedang' },
  { nis: "NIS-1013", nama: "Oki Setiana", kelas: "XII-MIPA-2", tier: 'sedang' },

  // Kelompok Rendah (Rata-rata 40 - 64)
  { nis: "NIS-1014", nama: "Putri Titian", kelas: "XII-MIPA-1", tier: 'rendah' },
  { nis: "NIS-1015", nama: "Rafi Ahmad", kelas: "XII-MIPA-1", tier: 'rendah' },
  { nis: "NIS-1016", nama: "Sule Wijaya", kelas: "XII-MIPA-1", tier: 'rendah' },
  { nis: "NIS-1017", nama: "Taufik Hidayat", kelas: "XII-MIPA-2", tier: 'rendah' },
  { nis: "NIS-1018", nama: "Umar Bakri", kelas: "XII-MIPA-2", tier: 'rendah' },
  { nis: "NIS-1019", nama: "Vina Panduwinata", kelas: "XII-MIPA-2", tier: 'rendah' },
  { nis: "NIS-1020", nama: "Wahyu Subrata", kelas: "XII-MIPA-2", tier: 'rendah' },
];

export const MAPEL_LIST = [
  { kode_mapel: "MAT-01", nama_mapel: "Matematika Peminatan" },
  { kode_mapel: "FIS-01", nama_mapel: "Fisika Terapan" },
  { kode_mapel: "KIM-01", nama_mapel: "Kimia Analitik" },
];

export function generateSampleRecords(): RawNilaiRecord[] {
  const records: RawNilaiRecord[] = [];

  const tierBase: Record<'tinggi' | 'sedang' | 'rendah', { harian: number; uts: number; uas: number }> = {
    tinggi: { harian: 88, uts: 86, uas: 90 },
    sedang: { harian: 72, uts: 70, uas: 74 },
    rendah: { harian: 52, uts: 48, uas: 55 },
  };

  for (const s of SAMPLE_STUDENTS) {
    const base = tierBase[s.tier];
    for (const m of MAPEL_LIST) {
      // Tambahkan variasi nilai deterministik
      const var1 = ((s.nis.charCodeAt(7) + m.kode_mapel.charCodeAt(2)) % 9) - 4;
      const var2 = ((s.nis.charCodeAt(6) + m.kode_mapel.charCodeAt(1)) % 9) - 4;
      const var3 = ((s.nis.charCodeAt(5) + m.kode_mapel.charCodeAt(0)) % 9) - 4;

      const harian = Math.min(100, Math.max(20, base.harian + var1));
      const uts = Math.min(100, Math.max(20, base.uts + var2));
      const uas = Math.min(100, Math.max(20, base.uas + var3));
      const nilai_akhir = calculateNilaiAkhir(harian, uts, uas);

      records.push({
        nis: s.nis,
        nama_lengkap: s.nama,
        kelas: s.kelas,
        kode_mapel: m.kode_mapel,
        nama_mapel: m.nama_mapel,
        nilai_harian: harian,
        nilai_uts: uts,
        nilai_uas: uas,
        semester: 1,
        nilai_akhir,
      });
    }
  }

  return records;
}

export function generateSampleCSVString(): string {
  const records = generateSampleRecords();
  const headers = [
    'nis',
    'nama_lengkap',
    'kelas',
    'kode_mapel',
    'nama_mapel',
    'nilai_harian',
    'nilai_uts',
    'nilai_uas',
    'semester',
  ];

  const rows = records.map(r => [
    r.nis,
    `"${r.nama_lengkap}"`,
    r.kelas,
    r.kode_mapel,
    `"${r.nama_mapel}"`,
    r.nilai_harian,
    r.nilai_uts,
    r.nilai_uas,
    r.semester,
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}
