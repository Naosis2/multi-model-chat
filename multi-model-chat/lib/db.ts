import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function setupDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      model TEXT DEFAULT '',
      mode TEXT DEFAULT 'single',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS knowledge (
      id SERIAL PRIMARY KEY,
      layer TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_knowledge_layer ON knowledge(layer)`;
}

export async function getMessages(sessionId: string) {
  return sql`
    SELECT role, content, model, mode, created_at
    FROM messages
    WHERE session_id = ${sessionId}
    ORDER BY created_at ASC
    LIMIT 50
  `;
}

export async function saveMessage(
  sessionId: string,
  userName: string,
  role: string,
  content: string,
  model: string = "",
  mode: string = "single"
) {
  await sql`
    INSERT INTO messages (session_id, user_name, role, content, model, mode)
    VALUES (${sessionId}, ${userName}, ${role}, ${content}, ${model}, ${mode})
  `;
}

export async function getKnowledge(layers: string[]) {
  if (layers.length === 0) return [];
  return sql`
    SELECT id, layer, title, content, updated_at
    FROM knowledge
    WHERE layer = ANY(${layers})
    ORDER BY layer ASC, updated_at DESC
  `;
}

export async function getAllKnowledge() {
  return sql`SELECT id, layer, title, content, updated_at FROM knowledge ORDER BY layer, updated_at DESC`;
}

export async function addKnowledge(layer: string, title: string, content: string) {
  return sql`
    INSERT INTO knowledge (layer, title, content)
    VALUES (${layer}, ${title}, ${content})
    RETURNING id
  `;
}

export async function updateKnowledge(id: number, title: string, content: string) {
  await sql`
    UPDATE knowledge SET title = ${title}, content = ${content}, updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function deleteKnowledge(id: number) {
  await sql`DELETE FROM knowledge WHERE id = ${id}`;
}

export async function getKnowledgeLayers() {
  const rows = await sql`SELECT DISTINCT layer FROM knowledge ORDER BY layer`;
  return rows.map((r: { layer: string }) => r.layer);
}

export default sql;
