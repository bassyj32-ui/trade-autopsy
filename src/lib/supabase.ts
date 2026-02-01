import { createClient, SupabaseClient } from '@supabase/supabase-js';

// WARNING: In a real app, these keys should be in .env
// For this MVP/Demo, we might need the user to provide them or use a placeholder.
// Since the user asked for "guide me", we'll set this up to be easily configurable.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

let supabaseClient: SupabaseClient | null = null;

try {
    // Only create the client if the URL is valid to avoid runtime crashes
    if (SUPABASE_URL.startsWith('http')) {
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
