import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseAdminConfig, isMissingTable, supabaseRest } from '@/lib/supabase-admin';

const ALLOWED_EVENTS = new Set([
  'page_view',
  'skill_call',
  'diagnosis_result',
  'profile_update',
  'login',
  'logout',
]);

type TrackBody = {
  eventName?: string;
  anonymousId?: string;
  sessionId?: string;
  skillName?: string;
  pagePath?: string;
  metadata?: Record<string, unknown>;
};

function cleanText(value: unknown, max = 200): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text ? text.slice(0, max) : null;
}

function cleanMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function profileCompleteness(profile: Record<string, unknown>): number {
  const fields = [
    'nickname',
    'school',
    'grade',
    'major',
    'targetRole',
    'targetIndustry',
    'interests',
  ];
  const filled = fields.filter((field) => {
    const value = profile[field];
    if (Array.isArray(value)) return value.length > 0;
    return typeof value === 'string' ? value.trim().length > 0 : value != null;
  }).length;
  return Math.round((filled / fields.length) * 100);
}

export async function POST(request: Request) {
  const config = getSupabaseAdminConfig();
  if (!config.configured) {
    return NextResponse.json(
      { ok: false, configured: false, error: 'Supabase is not configured' },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as TrackBody;
  const eventName = cleanText(body.eventName, 80);
  if (!eventName || !ALLOWED_EVENTS.has(eventName)) {
    return NextResponse.json({ ok: false, error: 'invalid eventName' }, { status: 400 });
  }

  const session = await auth().catch(() => null);
  const userId = session?.user?.id ? String(session.user.id) : 'anon';
  const metadata = cleanMetadata(body.metadata);
  const skillName = cleanText(body.skillName, 40);
  const pagePath = cleanText(body.pagePath, 300);
  const anonymousId = cleanText(body.anonymousId, 120);
  const sessionId = cleanText(body.sessionId, 120);

  const eventRow = {
    user_id: userId,
    anonymous_id: anonymousId,
    session_id: sessionId,
    event_name: eventName,
    skill_name: skillName,
    page_path: pagePath,
    metadata,
  };

  const eventWrite = await supabaseRest<unknown>('user_events', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(eventRow),
  });

  let usedFallback = false;
  let stored = eventWrite.ok;

  if (!eventWrite.ok && isMissingTable(eventWrite)) {
    usedFallback = true;
    const fallback = await supabaseRest<unknown>('memory', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id: userId,
        layer: 'interaction',
        content: JSON.stringify({
          type: 'user_event',
          ...eventRow,
          created_at: new Date().toISOString(),
        }),
        embedding: null,
      }),
    });
    stored = fallback.ok;
  }

  if (eventName === 'diagnosis_result') {
    const diagnosisRow = {
      user_id: userId,
      anonymous_id: anonymousId,
      session_id: sessionId,
      target_role: cleanText(metadata.targetRole, 120),
      radar: Array.isArray(metadata.radar) ? metadata.radar : [],
      recommended_roles: Array.isArray(metadata.recommendedRoles) ? metadata.recommendedRoles : [],
      overall_score:
        typeof metadata.overallScore === 'number' ? Math.round(metadata.overallScore) : null,
    };

    const diagnosisWrite = await supabaseRest<unknown>('diagnosis_results', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(diagnosisRow),
    });

    if (!diagnosisWrite.ok && isMissingTable(diagnosisWrite)) {
      usedFallback = true;
      await supabaseRest<unknown>('memory', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          user_id: userId,
          layer: 'diagnosis',
          content: JSON.stringify(diagnosisRow.radar),
          embedding: null,
        }),
      });
    }
  }

  if (eventName === 'profile_update') {
    const profile =
      metadata.profile && typeof metadata.profile === 'object' && !Array.isArray(metadata.profile)
        ? (metadata.profile as Record<string, unknown>)
        : {};
    const completeness = profileCompleteness(profile);
    await supabaseRest<unknown>('user_profiles?on_conflict=user_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        user_id: userId,
        profile,
        completeness,
        updated_at: new Date().toISOString(),
      }),
    });
  }

  return NextResponse.json(
    {
      ok: stored,
      configured: true,
      fallback: usedFallback,
      ...(stored ? {} : { error: eventWrite.error }),
    },
    { status: stored ? 200 : 502 }
  );
}
