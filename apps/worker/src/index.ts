export default {
  async fetch(request: Request, env: {
    SUPABASE_URL: string
    SUPABASE_SERVICE_ROLE_KEY: string
    AI: Ai
  }) {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    async function jsonResponse(data: unknown, status = 200) {
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
        status,
      })
    }

    async function parseBody<T = Record<string, unknown>>(): Promise<T> {
      return await request.json().catch(() => ({} as T))
    }

    async function getSupabaseClient() {
      const headers = {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      }
      return {
        async from(table: string) {
          return {
            async insert(data: Record<string, unknown>) {
              const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(data),
              })
              const json = await res.json()
              return { data: json, error: res.ok ? null : json }
            },
          }
        },
        async rpc(name: string, params: Record<string, unknown>) {
          const res = await fetch(`${env.SUPABASE_URL}/rpc/${name}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(params),
          })
          const json = await res.json()
          return { data: json, error: res.ok ? null : json }
        },
      }
    }

    if (method === 'GET' && path === '/health') {
      return jsonResponse({ status: 'ok', time: new Date().toISOString() })
    }

    if (method === 'POST' && path === '/api/embed') {
      const { text } = await parseBody<{ text?: string }>()
      if (!text) {
        return jsonResponse({ error: 'text is required' }, 400)
      }
      try {
        const response = await env.AI.run('@cf/baai/bge-m3', { text })
        const embedding = response.data[0].embedding
        return jsonResponse({ embedding })
      } catch (error) {
        return jsonResponse({ error: String(error) }, 500)
      }
    }

    if (method === 'POST' && path === '/api/memory') {
      const { user_id, content } = await parseBody<{ user_id?: string; content?: string }>()
      if (!user_id || !content) {
        return jsonResponse({ error: 'user_id and content are required' }, 400)
      }
      try {
        const response = await env.AI.run('@cf/baai/bge-m3', { text: content })
        const embedding = response.data[0].embedding
        const supabase = await getSupabaseClient()
        const { data, error } = await supabase.from('memories').insert({
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

    if (method === 'POST' && path === '/api/memory/search') {
      const { user_id, query } = await parseBody<{ user_id?: string; query?: string }>()
      if (!user_id || !query) {
        return jsonResponse({ error: 'user_id and query are required' }, 400)
      }
      try {
        const response = await env.AI.run('@cf/baai/bge-m3', { text: query })
        const queryEmbedding = response.data[0].embedding
        const supabase = await getSupabaseClient()
        const { data, error } = await supabase.rpc('match_memories', {
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