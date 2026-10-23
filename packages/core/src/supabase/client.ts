import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

export interface StorageAdapter {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

export interface SupabaseClientConfig {
  url: string;
  anonKey: string;
  storage?: StorageAdapter;
  detectSessionInUrl?: boolean;
}

export function createSupabaseClient(config: SupabaseClientConfig): SupabaseClient<Database> {
  const { url, anonKey, storage, detectSessionInUrl = false } = config;

  return createClient<Database>(url, anonKey, {
    auth: {
      storage: storage as any,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl,
    },
  });
}
