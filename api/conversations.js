import { sql } from "./_db.js";
import { getUserId } from "./_auth.js";

export default async function handler(req, res) {
  let userId;
  try {
    userId = await getUserId(req);
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    if (req.method === "GET") {
      const rows = await sql`
        SELECT c.id, c.name, c.created_at, c.updated_at,
               COUNT(m.id) AS message_count
        FROM conversations c
        LEFT JOIN messages m ON m.conversation_id = c.id
        WHERE c.user_id = ${userId}
        GROUP BY c.id, c.name, c.created_at, c.updated_at
        ORDER BY c.updated_at DESC
      `;
      return res.json(rows);
    }

    if (req.method === "POST") {
      const name = req.body?.name || "New Conversation";
      const [row] = await sql`
        INSERT INTO conversations (user_id, name)
        VALUES (${userId}, ${name})
        RETURNING id, name, created_at, updated_at
      `;
      return res.status(201).json(row);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("conversations error:", err);
    return res.status(500).json({ error: err.message });
  }
}
