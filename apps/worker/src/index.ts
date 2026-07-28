export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    function jsonResponse(data, status = 200) {
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
        status,
      })
    }

    async function parseBody() {
      return await request.json().catch(() => ({}))
    }

    // Supabase REST 客户端（原生 fetch，无依赖）
    function supabaseHeaders() {
      return {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      }
    }

    async function supabaseInsert(table, row) {
      const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: supabaseHeaders(),
        body: JSON.stringify(row),
      })
      const json = await res.json()
      return { data: json, error: res.ok ? null : json }
    }

    async function supabaseRpc(name, params) {
      const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`, {
        method: 'POST',
        headers: supabaseHeaders(),
        body: JSON.stringify(params),
      })
      const json = await res.json()
      return { data: json, error: res.ok ? null : json }
    }

    // 调用 Cloudflare Workers AI 生成 BGE-M3 向量
    async function embed(text) {
      const response = await env.AI.run('@cf/baai/bge-m3', { text })
      return response.data[0].embedding
    }

    // 健康检查
    if (method === 'GET' && path === '/health') {
      return jsonResponse({ status: 'ok', time: new Date().toISOString() })
    }

    // POST /api/embed — 文本转向量
    if (method === 'POST' && path === '/api/embed') {
      const { text } = await parseBody()
      if (!text) {
        return jsonResponse({ error: 'text is required' }, 400)
      }
      try {
        const embedding = await embed(text)
        return jsonResponse({ embedding })
      } catch (error) {
        return jsonResponse({ error: String(error) }, 500)
      }
    }

    // POST /api/memory — 存储记忆（生成向量 + 写入 Supabase）
    if (method === 'POST' && path === '/api/memory') {
      const { user_id, content } = await parseBody()
      if (!user_id || !content) {
        return jsonResponse({ error: 'user_id and content are required' }, 400)
      }
      try {
        const embedding = await embed(content)
        const { data, error } = await supabaseInsert('memories', {
          user_id,
          content,
          embedding,
        })
        if (error) throw error
        return jsonResponse({ ok: true, id: data?.[0]?.id })
      } catch (error) {
        return jsonResponse({ error: String(error) }, 500)
      }
    }

    // POST /api/memory/search — 向量检索 Top 5
    if (method === 'POST' && path === '/api/memory/search') {
      const { user_id, query } = await parseBody()
      if (!user_id || !query) {
        return jsonResponse({ error: 'user_id and query are required' }, 400)
      }
      try {
        const queryEmbedding = await embed(query)
        const { data, error } = await supabaseRpc('match_memories', {
          query_embedding: queryEmbedding,
          user_id_param: user_id,
          match_count: 5,
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
