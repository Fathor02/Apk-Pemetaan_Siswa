import { NextRequest, NextResponse } from 'next/server';
import { validateAndMapRow } from '@/lib/parser';
import { processClustering } from '@/lib/clusterEngine';
import { RawNilaiRecord } from '@/types';

// Engine (clusterEngine -> kmeans -> silhouette) memakai import 'server-only',
// therefore this route must stay on the Node.js server runtime.
export const runtime = 'nodejs';

const API_VERSION = '1.0.0';
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_RECORDS = 5000;

const RESPONSE_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

type ErrorDetail = {
  row?: number;
  field?: string;
  received?: unknown;
  message?: string;
};

type ErrorCode =
  | 'INVALID_JSON'
  | 'INVALID_PAYLOAD'
  | 'VALIDATION_ERROR'
  | 'INSUFFICIENT_DATA'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'PAYLOAD_TOO_LARGE'
  | 'INTERNAL_ERROR';

function errorResponse(
  code: ErrorCode,
  message: string,
  status: number,
  details?: ErrorDetail[]
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details && details.length > 0 ? { details } : {}),
      },
    },
    { status, headers: RESPONSE_HEADERS }
  );
}

function inferField(message: string): string {
  const column = message.match(/Kolom '([^']+)'/);
  if (column) return column[1];
  if (/Nilai Harian/.test(message)) return 'nilai_harian';
  if (/Nilai UTS/.test(message)) return 'nilai_uts';
  if (/Nilai UAS/.test(message)) return 'nilai_uas';
  return 'record';
}

function inferReceived(message: string): unknown {
  const value = message.match(/\(([^)]*)\)/);
  return value ? value[1] : undefined;
}

/**
 * GET /api/clustering — metadata dan kontrak API.
 * Tidak membaca/menulis database; aman dipanggil publik.
 */
export async function GET() {
  return NextResponse.json(
    {
      success: true,
      meta: {
        endpoint: '/api/clustering',
        version: API_VERSION,
        runtime: 'nodejs',
        documentation: 'docs/laporan-integrasi-api.md',
      },
      data: {
        name: 'EduCluster AI Clustering API',
        description:
          'API internal untuk menjalankan K-Means (k=3, K-Means++ multi-restart) dan Silhouette Coefficient secara server-side.',
        endpoints: [
          { method: 'GET', path: '/api/clustering', purpose: 'Metadata API' },
          { method: 'POST', path: '/api/clustering', purpose: 'Jalankan klasterisasi' },
          { method: 'GET', path: '/api/clustering/sample', purpose: 'Unduh template CSV' },
        ],
        defaults: {
          mode: '3D',
          k: 3,
          nInit: 5,
          maxIterations: 100,
          featureVector3D: ['nilai_harian', 'nilai_uts', 'nilai_uas'],
          featureVector1D: ['nilai_akhir'],
          nilaiAkhirWeights: { harian: 0.3, uts: 0.3, uas: 0.4 },
          labelOrder: ['Tinggi', 'Sedang', 'Rendah'],
        },
        limits: {
          maxBodyBytes: MAX_BODY_BYTES,
          maxRecords: MAX_RECORDS,
          minUniqueStudents: 3,
        },
      },
    },
    { status: 200, headers: RESPONSE_HEADERS }
  );
}

/**
 * POST /api/clustering — terima data nilai siswa, kembalikan hasil klasterisasi.
 * Stateless: tidak ada penulisan ke Supabase / penyimpanan apa pun.
 */
export async function POST(request: NextRequest) {
  const contentType = (request.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    return errorResponse(
      'UNSUPPORTED_MEDIA_TYPE',
      'Content-Type harus application/json.',
      415
    );
  }

  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return errorResponse(
      'PAYLOAD_TOO_LARGE',
      `Ukuran request melebihi batas ${MAX_BODY_BYTES} byte.`,
      413
    );
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return errorResponse('INVALID_PAYLOAD', 'Gagal membaca body request.', 400);
  }

  if (rawBody.length > MAX_BODY_BYTES) {
    return errorResponse(
      'PAYLOAD_TOO_LARGE',
      `Ukuran request melebihi batas ${MAX_BODY_BYTES} byte.`,
      413
    );
  }
  if (rawBody.trim() === '') {
    return errorResponse('INVALID_JSON', 'Body JSON tidak boleh kosong.', 400);
  }

  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return errorResponse(
        'INVALID_PAYLOAD',
        'Body JSON harus berupa objek.',
        400
      );
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return errorResponse('INVALID_JSON', 'Body bukan JSON yang valid.', 400);
  }

  const recordsInput = body.records;
  if (!Array.isArray(recordsInput)) {
    return errorResponse(
      'INVALID_PAYLOAD',
      "Parameter 'records' wajib berupa array.",
      400,
      [{ field: 'records', message: 'Parameter tidak ditemukan atau bukan array.' }]
    );
  }
  if (recordsInput.length === 0) {
    return errorResponse(
      'INSUFFICIENT_DATA',
      "Array 'records' tidak boleh kosong.",
      400
    );
  }
  if (recordsInput.length > MAX_RECORDS) {
    return errorResponse(
      'PAYLOAD_TOO_LARGE',
      `Jumlah records melebihi batas ${MAX_RECORDS} baris.`,
      413
    );
  }

  const modeInput = body.mode === undefined ? '3D' : body.mode;
  if (modeInput !== '3D' && modeInput !== '1D') {
    return errorResponse(
      'VALIDATION_ERROR',
      "Parameter 'mode' harus bernilai '3D' atau '1D'.",
      400,
      [{ field: 'mode', received: modeInput }]
    );
  }
  const mode: '3D' | '1D' = modeInput;

  const periodeInput = body.periode;
  if (
    periodeInput !== undefined &&
    (typeof periodeInput !== 'string' || periodeInput.trim() === '')
  ) {
    return errorResponse(
      'VALIDATION_ERROR',
      "Parameter 'periode' harus berupa string tidak kosong.",
      400,
      [{ field: 'periode', received: periodeInput }]
    );
  }

  // Validasi setiap baris memakai parser yang sama dengan upload CSV/XLSX,
  // sehingga Nilai Akhir selalu dihitung ulang di server (0.3/0.3/0.4).
  const records: RawNilaiRecord[] = [];
  const details: ErrorDetail[] = [];

  for (let idx = 0; idx < recordsInput.length; idx++) {
    const row = recordsInput[idx];
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      details.push({ row: idx + 1, field: 'record', message: 'Baris harus berupa objek.' });
      continue;
    }
    try {
      records.push(validateAndMapRow(row as Record<string, any>, idx));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      details.push({
        row: idx + 1,
        field: inferField(message),
        ...(() => {
          const received = inferReceived(message);
          return received === undefined ? {} : { received };
        })(),
        message,
      });
    }
  }

  if (details.length > 0) {
    return errorResponse(
      'VALIDATION_ERROR',
      `${details.length} baris tidak valid. Periksa field yang ditandai.`,
      400,
      details.slice(0, 20)
    );
  }

  try {
    const result = processClustering(records, {
      mode,
      ...(typeof periodeInput === 'string' ? { periode: periodeInput.trim() } : {}),
    });

    return NextResponse.json(
      {
        success: true,
        meta: {
          endpoint: '/api/clustering',
          version: API_VERSION,
          mode,
          recordsReceived: records.length,
          processedAt: result.calculatedAt,
        },
        data: result,
      },
      { status: 200, headers: RESPONSE_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (/kurang dari k=3/.test(message)) {
      return errorResponse('INSUFFICIENT_DATA', message, 400);
    }

    // Jangan pernah mengirim stack trace / detail internal ke klien.
    console.error('[api/clustering] internal error:', message);
    return errorResponse(
      'INTERNAL_ERROR',
      'Terjadi kesalahan internal saat memproses klasterisasi.',
      500
    );
  }
}
