import { ClusteringResult } from '@/types';

/**
 * Handoff hasil klasterisasi sesi aktif (mode Pengguna pass-through).
 * Hasil hanya hidup selama tab browser terbuka (sessionStorage) — tidak
 * ada penulisan ke database, sesuai prinsip privasi arsitektur userless.
 */
const SESSION_KEY = 'educluster-session-result';

export function saveSessionResult(result: ClusteringResult): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(result));
  } catch {
    // sessionStorage bisa gagal (private mode / quota) — abaikan dengan aman.
  }
}

export function loadSessionResult(): ClusteringResult | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClusteringResult;
    if (!parsed || !Array.isArray(parsed.students)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSessionResult(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // abaikan
  }
}
