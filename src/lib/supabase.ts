import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseUrl !== 'https://your-project.supabase.co' && 
  (supabaseAnonKey || supabaseServiceKey)
);

// Client-side / Public Supabase Client
let publicClient: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  publicClient = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey);
}

// Server-side Admin / Service Client
let adminClient: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  adminClient = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);
}

export function getSupabaseClient(): SupabaseClient | null {
  return publicClient;
}

export function getSupabaseAdmin(): SupabaseClient | null {
  return adminClient || publicClient;
}
