import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase project values
const supabaseUrl = 'https://cwikhqnvptblfupcolio.supabase.co';
const supabaseAnonKey = 'sb_publishable_WpyhUvdOHKWAr4Hy0RsM_w_zik6yHA7';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);