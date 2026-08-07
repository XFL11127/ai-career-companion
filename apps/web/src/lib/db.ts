// 免登即用：IndexedDB 本地缓存 Skill 结果（双非学生零门槛使用，数据存浏览器）。
const DB_NAME = 'ai-career-companion'
const STORE = 'skill_results'
const VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveResult(name: string, data: unknown): Promise<void> {
  const db = await openDB()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(data, name)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
  // 登录后自动同步到云端
  syncResultToCloud(name, data)
}

/** 尝试将 Skill 结果同步到 Supabase（已登录时生效） */
async function syncResultToCloud(skillName: string, data: unknown): Promise<void> {
  try {
    const { supabase } = await import('./supabase')
    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData.session?.user?.id
    if (!userId) return
    await supabase.from('skill_sessions').insert({
      user_id: userId,
      skill_name: skillName,
      input: {},
      output: data,
    })
  } catch { /* 云端写入失败不阻塞 */ }
}

export async function loadResult(name: string): Promise<unknown | null> {
  const db = await openDB()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(name)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}
