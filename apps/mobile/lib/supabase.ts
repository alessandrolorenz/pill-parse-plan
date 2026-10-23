import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSupabaseClient } from '../../../packages/core/src/supabase/client';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://ekqygszihajwzeztdbqq.supabase.co";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrcXlnc3ppaGFqd3plenRkYnFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NTYzNzEsImV4cCI6MjA3MjQzMjM3MX0.gKpJhq3STwMi-iIfTnxQ5kez76QV0ncibSkPQZoQvLU";

const storageAdapter = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // ignore
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

export const supabase = createSupabaseClient({
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  storage: storageAdapter,
  detectSessionInUrl: false,
});
