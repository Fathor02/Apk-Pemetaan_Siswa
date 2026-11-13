import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * Autentikasi Admin Ringan
 * ------------------------
 * Mode Admin vs Pengguna (dual-mode persistence):
 * - Admin  : sudah login (cookie sesi valid) → hasil klasterisasi disimpan ke Supabase.
 * - Pengguna: tanpa login → komputasi pass-through, tidak ada penulisan ke database.
 *
 * Kredensial: password tunggal dari environment variable (tanpa tabel admin).
 * Sesi: cookie HttpOnly bertanda tangan HMAC-SHA256, kedaluwarsa 8 jam.
 */

const COOKIE_NAME = 'educluster_admin_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 jam

function getConfig(): { password: string; secret: string } {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!password || !secret) {
    throw new Error(
      'ADMIN_PASSWORD dan ADMIN_SESSION_SECRET belum diisi di .env.local. ' +
        'Salin .env.local.example dan atur kredensial Admin.'
    );
  }

  return { password, secret };
}

/** Buat token sesi: "<expiryMs>.<hmac(expiryMs)>". */
function signSession(secret: string, expiryMs: number): string {
  const payload = String(expiryMs);
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

/** Verifikasi token sesi: signature valid DAN belum kedaluwarsa. */
function verifySessionToken(secret: string, token: string): boolean {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  const expiryMs = Number(payload);
  if (!Number.isFinite(expiryMs) || expiryMs < Date.now()) return false;

  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Bandingkan password dengan timing-safe agar tidak rentan timing attack. */
function safeComparePassword(input: string, expected: string): boolean {
  const a = Buffer.from(input, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Login Admin: cocokkan password lalu set cookie sesi. */
export async function createAdminSession(inputPassword: string): Promise<boolean> {
  const { password, secret } = getConfig();
  if (!safeComparePassword(inputPassword, password)) {
    return false;
  }

  const token = signSession(secret, Date.now() + SESSION_TTL_MS);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return true;
}

/** Logout Admin: hapus cookie sesi. */
export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Cek apakah request saat ini berasal dari Admin yang sudah login.
 * Dipanggil di Server Action untuk memutuskan dual-mode:
 * true → simpan ke DB, false → pass-through in-memory.
 */
export async function isAdminRequest(): Promise<boolean> {
  try {
    const { secret } = getConfig();
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return false;
    return verifySessionToken(secret, token);
  } catch {
    // Env belum dikonfigurasi → tidak ada mode admin sama sekali.
    return false;
  }
}
