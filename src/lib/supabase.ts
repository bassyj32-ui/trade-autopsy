import { createClient, SupabaseClient } from '@supabase/supabase-js';

// For Vite, we use import.meta.env
// In a real app, these keys should be in .env
// For this MVP/Demo, we might need the user to provide them or use a placeholder.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseClient: SupabaseClient | null = null;

try {
    // Only create the client if the URL is valid to avoid runtime crashes
    if (SUPABASE_URL && SUPABASE_URL.startsWith('http')) {
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (e) {
    console.warn("Supabase client failed to initialize:", e);
}

export const supabase = supabaseClient;

export interface Confession {
  id: string;
  created_at: string;
  message: string;
  loss_amount: number;
  asset: string;
}
