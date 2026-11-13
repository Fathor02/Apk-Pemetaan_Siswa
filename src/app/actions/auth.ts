'use server';

import { createAdminSession, destroyAdminSession, isAdminRequest } from '@/lib/auth';

export async function loginAdminAction(
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!password || typeof password !== 'string') {
      return { success: false, error: 'Password wajib diisi.' };
    }

    const ok = await createAdminSession(password);
    if (!ok) {
      return { success: false, error: 'Password Admin salah.' };
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Gagal memproses login Admin.',
    };
  }
}

export async function logoutAdminAction(): Promise<{ success: boolean }> {
  await destroyAdminSession();
  return { success: true };
}

export async function checkAdminAction(): Promise<{ isAdmin: boolean }> {
  return { isAdmin: await isAdminRequest() };
}
