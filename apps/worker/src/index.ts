// Cloudflare Worker：语义记忆 + 用户认证
// 路由：
//   GET  /health             — 健康检查
//   POST /api/embed          — 文本转向量（bge-m3，1024 维）
//   POST /api/memory         — 存储记忆（需登录，按 user_id 隔离）
//   POST /api/memory/search  — 向量检索 Top K（需登录，按 user_id 隔离）
//
// 认证：前端 Supabase 登录后携带 Authorization: Bearer <access_token>，
//       本 Worker 调 Supabase /auth/v1/user 校验 token 并取回 sub（即 user_id），
//       读写统一使用「已验证的 user_id」，防止跨用户越权。

// Cloudflare Workers AI 绑定的最小类型（避免依赖 @cloudflare/workers-types 的全局 Ai）
interface Ai {
  run(model: string, input: { text: string[] }): Promise<{ data: number[][] }>
}

interface Env {
  AI: Ai
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    const jsonResponse = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
        status,
      })

    const parseBody = async (): Promise<any> => {
      try {
        return await request.json()
      } catch {
        return {}
      }
    }

    // 写库用 service_role（绕过 RLS），但 user_id 已在下方校验，隔离由认证保证。
    // 新版 Supabase 密钥 sb_secret_* 是 opaque key（非 JWT），必须放 apikey，
    // 不能放 Authorization: Bearer（否则 PostgREST 报 401 "Expected 3 parts in JWT"）。
    const serviceHeaders = () => ({
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    })

    const supabaseInsert = async (table: string, row: unknown) => {
      const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: serviceHeaders(),
        body: JSON.stringify(row),
      })
      const json: any = await res.json()
      return { data: json, error: res.ok ? null : json }
    }

    const supabaseRpc = async (name: string, params: unknown) => {
      const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`, {
        method: 'POST',
        headers: serviceHeaders(),
        body: JSON.stringify(params),
      })
      const json: any = await res.json()
      return { data: json, error: res.ok ? null : json }
    }

    // 校验前端下发的 Supabase access token，返回真实 user_id（sub）
    const verifyUser = async (request: Request): Promise<string | null> => {
      const auth = request.headers.get('Authorization') ?? ''
      const token = auth.replace(/^Bearer\s+/i, '')
      if (!token) return null
      try {
        const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
          headers: { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_ANON_KEY },
        })
        if (!res.ok) return null
        const data = (await res.json()) as { id?: string }
        return data?.id ?? null
      } catch {
        return null
      }
    }

    // bge-m3 向量化：入参为字符串数组，取 data[0] 得到 1024 维向量
    const embed = async (text: string): Promise<number[]> => {
      const response = (await env.AI.run('@cf/baai/bge-m3', { text: [text] })) as { data: number[][] }
      return response.data[0]
    }

    // 健康检查
    if (method === 'GET' && path === '/health') {
      return jsonResponse({ status: 'ok', time: new Date().toISOString() })
    }

    // 文本转向量（公开，用于调试/离线索引）
    if (method === 'POST' && path === '/api/embed') {
      const { text } = await parseBody()
      if (!text) return jsonResponse({ error: 'text is required' }, 400)
      try {
        const embedding = await embed(text)
        return jsonResponse({ embedding })
      } catch (error) {
        return jsonResponse({ error: String(error) }, 500)
      }
    }

    // 存储记忆（需登录）
    if (method === 'POST' && path === '/api/memory') {
      const userId = await verifyUser(request)
      if (!userId) return jsonResponse({ error: 'unauthorized' }, 401)
      const { content } = await parseBody()
      if (!content) return jsonResponse({ error: 'content is required' }, 400)
      try {
        const embedding = await embed(content)
        const { data, error } = await supabaseInsert('memories', { user_id: userId, content, embedding })
        if (error) throw error
        return jsonResponse({ ok: true, id: data?.[0]?.id })
      } catch (error) {
        return jsonResponse({ error: String(error) }, 500)
      }
    }

    // 语义检索（需登录）
    if (method === 'POST' && path === '/api/memory/search') {
      const userId = await verifyUser(request)
      if (!userId) return jsonResponse({ error: 'unauthorized' }, 401)
      const { query, match_count } = await parseBody()
      if (!query) return jsonResponse({ error: 'query is required' }, 400)
      try {
        const queryEmbedding = await embed(query)
        const { data, error } = await supabaseRpc('match_memories', {
          query_embedding: queryEmbedding,
          user_id_param: userId,
          match_count: match_count ?? 5,
        })
        if (error) throw error
        return jsonResponse({ results: data })
      } catch (error) {
        return jsonResponse({ error: String(error) }, 500)
      }
    }

    return jsonResponse({ error: 'Not found' }, 404)
  },
}
