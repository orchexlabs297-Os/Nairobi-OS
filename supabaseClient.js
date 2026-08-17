import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // Non-fatal: the app still runs with demo data, but auth and live
  // data (contacts, conversations, messages) will stay disabled until
  // VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env
  console.warn(
    "[Nairobi OS] Supabase no está configurado. Copia .env.example a .env y completa tus credenciales."
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
