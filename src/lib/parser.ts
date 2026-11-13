import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { RawNilaiRecord, SiswaAggregated } from '@/types';

export function calculateNilaiAkhir(harian: number, uts: number, uas: number): number {
  const result = (0.3 * harian) + (0.3 * uts) + (0.4 * uas);
  return Math.round(result * 100) / 100;
}

function normalizeHeaderKey(key: string): string {
  return key.toLowerCase().trim().replace(/[\s\-_]+/g, '_');
}

export function validateAndMapRow(row: Record<string, any>, rowIndex: number): RawNilaiRecord {
  const normalized: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[normalizeHeaderKey(key)] = value;
  }

  const nis = String(normalized.nis || '').trim();
  const nama_lengkap = String(normalized.nama_lengkap || normalized.nama || '').trim();
  const kelas = String(normalized.kelas || '').trim();
  const kode_mapel = String(normalized.kode_mapel || normalized.kodemapel || '').trim();
  const nama_mapel = String(normalized.nama_mapel || normalized.mapel || '').trim();
  
  const harianRaw = normalized.nilai_harian ?? normalized.harian;
  const utsRaw = normalized.nilai_uts ?? normalized.uts;
  const uasRaw = normalized.nilai_uas ?? normalized.uas;
  const semesterRaw = normalized.semester ?? 1;

  if (!nis) {
    throw new Error(`Baris ke-${rowIndex + 1}: Kolom 'nis' tidak boleh kosong.`);
  }
  if (!nama_lengkap) {
    throw new Error(`Baris ke-${rowIndex + 1}: Kolom 'nama_lengkap' tidak boleh kosong (NIS: ${nis}).`);
  }
  if (!kelas) {
    throw new Error(`Baris ke-${rowIndex + 1}: Kolom 'kelas' tidak boleh kosong (Siswa: ${nama_lengkap}).`);
  }
  if (!kode_mapel) {
    throw new Error(`Baris ke-${rowIndex + 1}: Kolom 'kode_mapel' tidak boleh kosong.`);
  }
  if (!nama_mapel) {
    throw new Error(`Baris ke-${rowIndex + 1}: Kolom 'nama_mapel' tidak boleh kosong.`);
  }

  const nilai_harian = parseFloat(String(harianRaw).replace(',', '.'));
  const nilai_uts = parseFloat(String(utsRaw).replace(',', '.'));
  const nilai_uas = parseFloat(String(uasRaw).replace(',', '.'));
  const semester = parseInt(String(semesterRaw), 10) || 1;

  if (isNaN(nilai_harian) || nilai_harian < 0 || nilai_harian > 100) {
    throw new Error(`Baris ke-${rowIndex + 1}: Nilai Harian (${harianRaw}) harus berada di antara 0 - 100.`);
  }
  if (isNaN(nilai_uts) || nilai_uts < 0 || nilai_uts > 100) {
    throw new Error(`Baris ke-${rowIndex + 1}: Nilai UTS (${utsRaw}) harus berada di antara 0 - 100.`);
  }
  if (isNaN(nilai_uas) || nilai_uas < 0 || nilai_uas > 100) {
    throw new Error(`Baris ke-${rowIndex + 1}: Nilai UAS (${uasRaw}) harus berada di antara 0 - 100.`);
  }

  const nilai_akhir = calculateNilaiAkhir(nilai_harian, nilai_uts, nilai_uas);

  return {
    nis,
    nama_lengkap,
    kelas,
    kode_mapel,
    nama_mapel,
    nilai_harian,
    nilai_uts,
    nilai_uas,
    semester,
    nilai_akhir,
  };
}

export function parseCSVString(csvContent: string): RawNilaiRecord[] {
  const result = Papa.parse<Record<string, any>>(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
  });

  if (result.errors && result.errors.length > 0) {
    const firstErr = result.errors[0];
    throw new Error(`Format CSV tidak valid: ${firstErr.message} (Baris ${firstErr.row ?? '?'})`);
  }

  if (!result.data || result.data.length === 0) {
    throw new Error('Berkas CSV tidak berisi data.');
  }

  return result.data.map((row, idx) => validateAndMapRow(row, idx));
}

export function parseExcelBuffer(buffer: ArrayBuffer): RawNilaiRecord[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Berkas Excel tidak memiliki sheet yang dapat dibaca.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
    raw: false,
  });

  if (!rawData || rawData.length === 0) {
    throw new Error('Sheet Excel pertama tidak memiliki baris data.');
  }

  return rawData.map((row, idx) => validateAndMapRow(row, idx));
}

export function aggregateBySiswa(records: RawNilaiRecord[]): SiswaAggregated[] {
  const grouped: Record<string, RawNilaiRecord[]> = {};

  for (const r of records) {
    if (!grouped[r.nis]) {
      grouped[r.nis] = [];
    }
    grouped[r.nis].push(r);
  }

  return Object.values(grouped).map(group => {
    const first = group[0];
    const n = group.length;
    const sumHarian = group.reduce((acc, c) => acc + c.nilai_harian, 0);
    const sumUTS = group.reduce((acc, c) => acc + c.nilai_uts, 0);
    const sumUAS = group.reduce((acc, c) => acc + c.nilai_uas, 0);
    const sumAkhir = group.reduce((acc, c) => acc + c.nilai_akhir, 0);

    return {
      nis: first.nis,
      nama_lengkap: first.nama_lengkap,
      kelas: first.kelas,
      nilai_harian_avg: Math.round((sumHarian / n) * 100) / 100,
      nilai_uts_avg: Math.round((sumUTS / n) * 100) / 100,
      nilai_uas_avg: Math.round((sumUAS / n) * 100) / 100,
      nilai_akhir_avg: Math.round((sumAkhir / n) * 100) / 100,
      mapel_count: n,
      records: group,
    };
  });
}
