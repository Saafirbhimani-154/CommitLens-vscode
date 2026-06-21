import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

// Initialize the Supabase client using the baked-in config
// For local dev: update config.ts with your local DB keys
// For production: config.ts already contains production keys
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
