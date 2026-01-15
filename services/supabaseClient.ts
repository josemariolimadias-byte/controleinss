
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Se as chaves não estiverem configuradas, o cliente ainda será criado mas as chamadas falharão graciosamente.
// O App lidará com o fallback para localStorage se desejar, ou apenas mostrará erro.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);
