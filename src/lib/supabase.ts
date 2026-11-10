import type { AuthChangeEvent, Session, SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

let clientPromise: Promise<SupabaseClient> | null = null;

export type AppRole = "member" | "moderator" | "editor" | "admin";

export type EditorialAuthState =
  | { status: "loading" }
  | { status: "signed_out"; message?: string }
  | { status: "unauthorized"; userId: string; role: AppRole }
  | { status: "authorized"; userId: string; role: "editor" | "admin" }
  | { status: "error"; message: string };

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
      message: "Authentication is unavailable because this environment is not connected to Supabase.",
    } as const;
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: new URL("/studio", window.location.origin).toString(),
      shouldCreateUser: false,
    },
  });

  if (error && (error.status === 429 || (error.status ?? 0) >= 500)) {
    throw new Error("The sign-in service is temporarily unavailable. Wait a moment and try again.");
  }

  return {
    ok: true,
    demo: false,
    message: "If this email belongs to an approved account, a secure sign-in link is on its way.",
  } as const;
}

function authCallbackMessage() {
  const query = new URLSearchParams(window.location.search);
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const code = query.get("error_code") ?? fragment.get("error_code");
  const error = query.get("error") ?? fragment.get("error");

  if (!code && !error) return undefined;
  if (code === "otp_expired") return "That sign-in link has expired or was already used. Request a new link to continue.";
  return "That sign-in link is invalid. Request a new link to continue.";
}

export async function loadEditorialAuthState(): Promise<EditorialAuthState> {
  const callbackMessage = authCallbackMessage();
  const supabase = await getSupabaseClient();
  if (!supabase) return { status: "signed_out", message: callbackMessage };

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) return { status: "error", message: "Your session could not be restored. Sign in again to continue." };
  if (!sessionData.session) return { status: "signed_out", message: callbackMessage };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { status: "signed_out", message: "Your session has expired. Request a new sign-in link to continue." };
  }

  const { data: roleData, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (roleError) return { status: "error", message: "We could not verify your editorial access. Try again shortly." };

  const role = (roleData?.role ?? "member") as AppRole;
  if (role === "editor" || role === "admin") {
    return { status: "authorized", userId: userData.user.id, role };
  }

  return { status: "unauthorized", userId: userData.user.id, role };
}

export async function signOut() {
  const supabase = await getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error("Sign out could not be completed. Try again.");
}

export async function subscribeToAuthChanges(
  onChange: (event: AuthChangeEvent, session: Session | null) => void,
) {
  const supabase = await getSupabaseClient();
  if (!supabase) return () => undefined;

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    window.setTimeout(() => onChange(event, session), 0);
  });
  return () => data.subscription.unsubscribe();
}
