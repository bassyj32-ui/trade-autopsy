import { createClient } from '@supabase/supabase-js';

// WARNING: In a real app, these keys should be in .env
// For this MVP/Demo, we might need the user to provide them or use a placeholder.
// Since the user asked for "guide me", we'll set this up to be easily configurable.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface Confession {
  id: string;
  created_at: string;
  message: string;
  loss_amount: number;
  asset: string;
}
