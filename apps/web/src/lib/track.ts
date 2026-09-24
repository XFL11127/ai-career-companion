'use client';

export type TrackEventName =
  'page_view' | 'skill_call' | 'diagnosis_result' | 'profile_update' | 'login' | 'logout';

export type TrackPayload = {
  skillName?: string;
  pagePath?: string;
  metadata?: Record<string, unknown>;
};

const ANON_KEY = 'analytics_anonymous_id';
const SESSION_KEY = 'analytics_session_id';

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readStorage(storage: Storage | undefined, key: string): string {
  if (!storage) return '';
  try {
    const existing = storage.getItem(key);
    if (existing) return existing;
    const created = randomId();
    storage.setItem(key, created);
    return created;
  } catch {
    return '';
  }
}

function ids(): { anonymousId: string; sessionId: string } {
  if (typeof window === 'undefined') return { anonymousId: '', sessionId: '' };
  return {
    anonymousId: readStorage(window.localStorage, ANON_KEY),
    sessionId: readStorage(window.sessionStorage, SESSION_KEY),
  };
}

/**
 * Send a privacy-minimal product event through the server-side BFF.
 * The browser never receives the Supabase service-role key.
 */
export async function trackEvent(name: TrackEventName, payload: TrackPayload = {}): Promise<void> {
  if (typeof window === 'undefined') return;
  const { anonymousId, sessionId } = ids();
  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: name,
        anonymousId,
        sessionId,
        skillName: payload.skillName,
        pagePath: payload.pagePath ?? window.location.pathname,
        metadata: payload.metadata ?? {},
      }),
      keepalive: true,
    });
  } catch {
    // Tracking must never block product usage.
  }
}
