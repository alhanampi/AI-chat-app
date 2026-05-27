import { sql } from "./_db.js";
import { getUserId } from "./_auth.js";

export default async function handler(req, res) {
  let userId;
  try {
    userId = await getUserId(req);
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    const rows = await sql`
      SELECT id, name, created_at, updated_at
      FROM conversations
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC
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

  res.status(405).json({ error: "Method not allowed" });
}
