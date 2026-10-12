/**
 * Server-only Supabase REST helper.
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY when available so server-side analytics APIs can
 * aggregate and write events even when the product user is signed in through
 * NextAuth instead of Supabase Auth. Never import this module from a Client Component.
 */

export function getSupabaseAdminConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    '';

  return {
    url: url.replace(/\/$/, ''),
    key,
    configured: Boolean(url && key),
    hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };
}

export type SupabaseRestResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  error: string;
};

export async function supabaseRest<T>(
  path: string,
  init: RequestInit = {}
): Promise<SupabaseRestResult<T>> {
  const { url, key, configured } = getSupabaseAdminConfig();
  if (!configured) {
    return { ok: false, status: 503, data: null, error: 'Supabase is not configured' };
  }

  try {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
      cache: 'no-store',
    });

    const text = await res.text();
    let data: T | null = null;
    if (text) {
      try {
        data = JSON.parse(text) as T;
      } catch {
        data = null;
      }
    }

    if (!res.ok) {
      const parsed = data as { message?: string; details?: string } | null;
      return {
        ok: false,
        status: res.status,
        data,
        error: parsed?.message ?? parsed?.details ?? text.slice(0, 300) ?? `HTTP ${res.status}`,
      };
    }

    return { ok: true, status: res.status, data, error: '' };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function isMissingTable(result: SupabaseRestResult<unknown>): boolean {
  return (
    result.status === 404 ||
    result.error.includes('PGRST205') ||
    result.error.toLowerCase().includes('could not find the table')
  );
}
