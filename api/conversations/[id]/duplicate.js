import { sql } from "../../_db.js";
import { getUserId } from "../../_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let userId;
  try {
    userId = await getUserId(req);
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;

  const [source] = await sql`
    SELECT id, name FROM conversations WHERE id = ${id} AND user_id = ${userId}
  `;
  if (!source) return res.status(404).json({ error: "Not found" });

  const [newConv] = await sql`
    INSERT INTO conversations (user_id, name)
    VALUES (${userId}, ${"Copy of " + source.name})
    RETURNING id, name, created_at, updated_at
  `;

  await sql`
    INSERT INTO messages (conversation_id, type, text, timestamp)
    SELECT ${newConv.id}, type, text, timestamp
    FROM messages
    WHERE conversation_id = ${id}
    ORDER BY created_at ASC
  `;

  return res.status(201).json(newConv);
}
