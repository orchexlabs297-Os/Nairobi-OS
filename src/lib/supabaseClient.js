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

// PostgREST rechaza con "JWT issued at future" un token cuyo claim `iat` es
// posterior a su propio reloj. Pasa en los primeros segundos después de iniciar
// sesión: el servicio que firma el token va unos segundos adelantado respecto
// al que lo valida, así que el token nace "en el futuro" y caduca esa ventaja
// sola en cuestión de segundos.
//
// No es un error de credenciales ni del panel, pero Nairobi veía el texto crudo
// en rojo y la primera consulta de la pantalla se quedaba vacía. Se reintenta
// solo ese caso concreto, y solo dos veces.
//
// Deliberadamente NO se reintenta un token expirado: eso se arregla renovando
// la sesión, no repitiendo la misma petición, y el SDK ya lo hace por su cuenta.
const ESPERA_MS = [900, 1800];

async function fetchReintentandoDesfaseDeReloj(input, init, intento = 0) {
  const res = await fetch(input, init);
  if (res.ok || intento >= ESPERA_MS.length) return res;

  let cuerpo = "";
  try {
    cuerpo = await res.clone().text();
  } catch {
    return res; // cuerpo ya consumido o no legible: se devuelve tal cual
  }
  if (!/issued at future/i.test(cuerpo)) return res;

  await new Promise((r) => setTimeout(r, ESPERA_MS[intento]));
  return fetchReintentandoDesfaseDeReloj(input, init, intento + 1);
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: { fetch: fetchReintentandoDesfaseDeReloj },
    })
  : null;
