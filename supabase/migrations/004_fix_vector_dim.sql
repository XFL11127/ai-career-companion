-- 004: 修正向量维度 mismatch
-- 背景：001 误用 vector(1536)（OpenAI text-embedding 维度），
--       但 Cloudflare Workers AI 的 @cf/baai/bge-m3 输出 1024 维。
--       维度不一致会导致语义搜索的向量写入/检索失败。
-- 影响：memories.embedding 列 + match_memories 函数 + ivfflat 索引。

-- 1. 先删旧向量索引（改列维度前必须先解除依赖）
drop index if exists memories_embedding_idx;

-- 2. 改 embedding 维度 1536 → 1024（现有数据全为 NULL，安全）
alter table memories
  alter column embedding type vector(1024)
  using embedding::vector(1024);

-- 3. 重建向量余弦索引
create index if not exists memories_embedding_idx
  on memories using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- 4. 重建 match_memories（签名与维度对齐 1024）
create or replace function match_memories(
  query_embedding vector(1024),
  user_id_param uuid,
  match_count int default 5
) returns table (
  id uuid,
  content text,
  layer text,
  similarity float
) language plpgsql as $$
begin
  return query
  select
    m.id,
    m.content,
    m.layer,
    1 - (m.embedding <=> query_embedding) as similarity
  from memories m
  where (m.user_id = user_id_param or m.user_id is null)
    and m.embedding is not null
  order by m.embedding <=> query_embedding
  limit match_count;
end;
$$;
