import { NextResponse } from 'next/server';
import { getSupabaseAdminConfig, isMissingTable, supabaseRest } from '@/lib/supabase-admin';

type RadarPoint = { dimension: string; value: number };
type TrendPoint = { date: string; active: number };
type SkillPoint = { skill: string; count: number };
type ProfilePoint = { label: string; value: number };

type Kpis = {
  totalUsers: number;
  totalEvents: number;
  activeUsers7d: number;
  todayEvents: number;
  totalDiagnoses: number;
};

type Analytic = {
  demo: false;
  configured: boolean;
  source: 'supabase' | 'unconfigured';
  empty: boolean;
  generatedAt: string;
  error?: string;
  kpis: Kpis;
  radar: RadarPoint[];
  trend: TrendPoint[];
  skillDist: SkillPoint[];
  profile: ProfilePoint[];
  profileOverall: number;
};

type EventRow = {
  id?: string;
  user_id?: string;
  anonymous_id?: string | null;
  session_id?: string | null;
  event_name?: string;
  skill_name?: string | null;
  page_path?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
};

type DiagnosisRow = {
  user_id?: string;
  radar?: unknown;
  recommended_roles?: unknown;
  overall_score?: number | null;
  created_at: string;
};

type SkillEventRow = {
  user_id?: string;
  skill_name?: string;
  created_at: string;
};

type MemoryRow = {
  user_id?: string;
  content?: string;
  created_at: string;
};

type ProfileRow = {
  user_id?: string;
  profile?: Record<string, unknown>;
  completeness?: number | null;
};

const RADAR_FALLBACK: RadarPoint[] = [
  { dimension: '技术栈', value: 0 },
  { dimension: '实习经历', value: 0 },
  { dimension: '项目经历', value: 0 },
  { dimension: '算法能力', value: 0 },
  { dimension: '信息差', value: 0 },
];

const PROFILE_FIELDS: { label: string; keys: string[] }[] = [
  { label: '专业', keys: ['major'] },
  { label: '年级', keys: ['grade'] },
  { label: '目标岗位', keys: ['targetRole', 'target_role'] },
  { label: '目标行业', keys: ['targetIndustry', 'target_industry'] },
  { label: '兴趣方向', keys: ['interests', 'goals'] },
];

function emptyAnalytics(configured = false, error?: string): Analytic {
  return {
    demo: false,
    configured,
    source: configured ? 'supabase' : 'unconfigured',
    empty: true,
    generatedAt: new Date().toISOString(),
    ...(error ? { error } : {}),
    kpis: {
      totalUsers: 0,
      totalEvents: 0,
      activeUsers7d: 0,
      todayEvents: 0,
      totalDiagnoses: 0,
    },
    radar: RADAR_FALLBACK,
    trend: buildTrend([]),
    skillDist: [],
    profile: PROFILE_FIELDS.map((field) => ({ label: field.label, value: 0 })),
    profileOverall: 0,
  };
}

function dateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

function shortDate(value: Date): string {
  return `${value.getUTCMonth() + 1}/${value.getUTCDate()}`;
}

function buildTrend(events: EventRow[], days = 14): TrendPoint[] {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - i);
    keys.push(dateKey(date));
  }

  const identitiesByDay = new Map<string, Set<string>>();
  for (const event of events) {
    const key = dateKey(event.created_at);
    const identity =
      event.user_id && event.user_id !== 'anon'
        ? event.user_id
        : event.anonymous_id || event.session_id || event.id || key;
    const bucket = identitiesByDay.get(key) ?? new Set<string>();
    bucket.add(identity);
    identitiesByDay.set(key, bucket);
  }

  return keys.map((key) => {
    const date = new Date(`${key}T00:00:00.000Z`);
    return { date: shortDate(date), active: identitiesByDay.get(key)?.size ?? 0 };
  });
}

function normalizeRadar(raw: unknown): RadarPoint[] {
  if (!Array.isArray(raw)) return [];
  const result: RadarPoint[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const value = item as Record<string, unknown>;
    const dimension =
      typeof value.dimension === 'string'
        ? value.dimension
        : typeof value.name === 'string'
          ? value.name
          : '';
    const numeric =
      typeof value.value === 'number'
        ? value.value
        : typeof value.current === 'number'
          ? value.current
          : null;
    if (dimension && numeric != null) result.push({ dimension, value: numeric });
  }
  return result;
}

async function fetchPrimaryEvents(): Promise<{
  events: EventRow[];
  fallback: boolean;
  error?: string;
}> {
  const primary = await supabaseRest<EventRow[]>(
    'user_events?select=id,user_id,anonymous_id,session_id,event_name,skill_name,page_path,metadata,created_at&order=created_at.desc&limit=5000'
  );
  if (primary.ok) return { events: primary.data ?? [], fallback: false };
  if (!isMissingTable(primary)) return { events: [], fallback: false, error: primary.error };

  const [skillEvents, memoryEvents] = await Promise.all([
    supabaseRest<SkillEventRow[]>(
      'skill_events?select=user_id,skill_name,created_at&order=created_at.desc&limit=5000'
    ),
    supabaseRest<MemoryRow[]>(
      'memory?select=user_id,content,created_at&layer=eq.interaction&order=created_at.desc&limit=5000'
    ),
  ]);

  const events: EventRow[] = [];
  for (const row of skillEvents.data ?? []) {
    events.push({
      user_id: row.user_id,
      event_name: 'skill_call',
      skill_name: row.skill_name,
      created_at: row.created_at,
    });
  }

  for (const row of memoryEvents.data ?? []) {
    if (!row.content) continue;
    try {
      const parsed = JSON.parse(row.content) as Record<string, unknown>;
      if (parsed.type !== 'user_event') continue;
      events.push({
        id: typeof parsed.id === 'string' ? parsed.id : undefined,
        user_id: typeof parsed.user_id === 'string' ? parsed.user_id : row.user_id,
        anonymous_id: typeof parsed.anonymous_id === 'string' ? parsed.anonymous_id : null,
        session_id: typeof parsed.session_id === 'string' ? parsed.session_id : null,
        event_name: typeof parsed.event_name === 'string' ? parsed.event_name : 'unknown',
        skill_name: typeof parsed.skill_name === 'string' ? parsed.skill_name : null,
        page_path: typeof parsed.page_path === 'string' ? parsed.page_path : null,
        metadata:
          parsed.metadata && typeof parsed.metadata === 'object'
            ? (parsed.metadata as Record<string, unknown>)
            : {},
        created_at: typeof parsed.created_at === 'string' ? parsed.created_at : row.created_at,
      });
    } catch {
      // Ignore ordinary memories that are not analytics events.
    }
  }

  events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return { events, fallback: true, error: skillEvents.error || memoryEvents.error };
}

async function fetchDiagnoses(): Promise<{ rows: DiagnosisRow[]; error?: string }> {
  const primary = await supabaseRest<DiagnosisRow[]>(
    'diagnosis_results?select=user_id,radar,recommended_roles,overall_score,created_at&order=created_at.desc&limit=1000'
  );
  if (primary.ok) return { rows: primary.data ?? [] };
  if (!isMissingTable(primary)) return { rows: [], error: primary.error };

  const fallback = await supabaseRest<MemoryRow[]>(
    'memory?select=user_id,content,created_at&layer=eq.diagnosis&order=created_at.desc&limit=1000'
  );
  if (!fallback.ok) return { rows: [], error: fallback.error };

  const rows: DiagnosisRow[] = [];
  for (const row of fallback.data ?? []) {
    try {
      rows.push({
        user_id: row.user_id,
        radar: row.content ? JSON.parse(row.content) : [],
        created_at: row.created_at,
      });
    } catch {
      // Ignore malformed historical diagnosis memories.
    }
  }
  return { rows };
}

function averageRadar(rows: DiagnosisRow[]): RadarPoint[] {
  const totals = new Map<string, { total: number; count: number }>();
  for (const row of rows) {
    for (const point of normalizeRadar(row.radar)) {
      const current = totals.get(point.dimension) ?? { total: 0, count: 0 };
      current.total += point.value;
      current.count += 1;
      totals.set(point.dimension, current);
    }
  }
  if (totals.size === 0) return RADAR_FALLBACK;
  return Array.from(totals.entries())
    .map(([dimension, value]) => ({
      dimension,
      value: Math.round(value.total / value.count),
    }))
    .slice(0, 8);
}

function profileFieldComplete(profile: Record<string, unknown>, keys: string[]): boolean {
  return keys.some((key) => {
    const value = profile[key];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim().length > 0;
    return value != null;
  });
}

function profileMetrics(rows: ProfileRow[]) {
  if (rows.length === 0) {
    return {
      profile: PROFILE_FIELDS.map((field) => ({ label: field.label, value: 0 })),
      overall: 0,
    };
  }

  const profile = PROFILE_FIELDS.map((field) => {
    const complete = rows.filter((row) =>
      profileFieldComplete(row.profile ?? {}, field.keys)
    ).length;
    return { label: field.label, value: Math.round((complete / rows.length) * 100) };
  });

  const explicit = rows
    .map((row) => row.completeness)
    .filter((value): value is number => typeof value === 'number');
  const overall =
    explicit.length > 0
      ? Math.round(explicit.reduce((sum, value) => sum + value, 0) / explicit.length)
      : Math.round(profile.reduce((sum, item) => sum + item.value, 0) / profile.length);

  return { profile, overall };
}

export async function GET() {
  const config = getSupabaseAdminConfig();
  if (!config.configured)
    return NextResponse.json(emptyAnalytics(false, 'Supabase is not configured'));

  const [eventResult, diagnosisResult, profileResult] = await Promise.all([
    fetchPrimaryEvents(),
    fetchDiagnoses(),
    supabaseRest<ProfileRow[]>(
      'user_profiles?select=user_id,profile,completeness,updated_at&order=updated_at.desc&limit=5000'
    ),
  ]);

  if (eventResult.error && !eventResult.fallback) {
    return NextResponse.json(emptyAnalytics(true, eventResult.error), { status: 502 });
  }

  const events = eventResult.events;
  const diagnoses = diagnosisResult.rows;
  const profiles = profileResult.ok ? (profileResult.data ?? []) : [];
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 86400000;
  const today = dateKey(new Date());

  const skillCounts = new Map<string, number>();
  for (const event of events) {
    if (event.event_name !== 'skill_call' || !event.skill_name) continue;
    skillCounts.set(event.skill_name, (skillCounts.get(event.skill_name) ?? 0) + 1);
  }

  const userIds = new Set<string>();
  for (const row of [...events, ...diagnoses, ...profiles]) {
    const userId = row.user_id;
    if (userId && userId !== 'anon') userIds.add(userId);
  }

  const activeUsers7d = new Set(
    events
      .filter((event) => new Date(event.created_at).getTime() >= sevenDaysAgo)
      .map((event) =>
        event.user_id && event.user_id !== 'anon'
          ? event.user_id
          : event.anonymous_id || event.session_id || ''
      )
      .filter(Boolean)
  ).size;

  const profileData = profileMetrics(profiles);
  const totalEvents = events.length;
  const totalDiagnoses = diagnoses.length;

  const result: Analytic = {
    demo: false,
    configured: true,
    source: 'supabase',
    empty: totalEvents === 0 && totalDiagnoses === 0 && profiles.length === 0,
    generatedAt: new Date().toISOString(),
    kpis: {
      totalUsers: userIds.size,
      totalEvents,
      activeUsers7d,
      todayEvents: events.filter((event) => dateKey(event.created_at) === today).length,
      totalDiagnoses,
    },
    radar: averageRadar(diagnoses),
    trend: buildTrend(events),
    skillDist: Array.from(skillCounts.entries())
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count),
    profile: profileData.profile,
    profileOverall: profileData.overall,
  };

  return NextResponse.json(result);
}
