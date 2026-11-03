import type { SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

let clientPromise: Promise<SupabaseClient> | null = null;

export function isSupabaseConfigured() {
  return Boolean(url && publishableKey);
}

export async function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;

  if (!clientPromise) {
    clientPromise = import("@supabase/supabase-js").then(({ createClient }) =>
      createClient(url!, publishableKey!, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }),
    );
  }

  return clientPromise;
}

export async function requestMagicLink(email: string) {
  const supabase = await getSupabaseClient();

  if (!supabase) {
    return {
      ok: true,
      demo: true,
      message: "Demo mode: connect Supabase to send a real Magic Link.",
    } as const;
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) throw error;

  return {
    ok: true,
    demo: false,
    message: "Check your email for your secure sign-in link.",
  } as const;
}
