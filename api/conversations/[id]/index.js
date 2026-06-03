import { sql } from "../../_db.js";
import { getUserId } from "../../_auth.js";

export default async function handler(req, res) {
  let userId;
  try {
    userId = await getUserId(req);
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const id = req.params?.id ?? req.query?.id;

  try {
    const [conv] = await sql`
      SELECT id FROM conversations WHERE id = ${id} AND user_id = ${userId}
    `;
    if (!conv) return res.status(404).json({ error: "Not found" });

    if (req.method === "GET") {
      const messages = await sql`
        SELECT id, type, text, timestamp
        FROM messages
        WHERE conversation_id = ${id}
        ORDER BY created_at ASC
      `;
      return res.json(messages);
    }

    if (req.method === "PUT") {
      const { name } = req.body;
      const [updated] = await sql`
        UPDATE conversations
        SET name = ${name}, updated_at = NOW()
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING id, name, updated_at
      `;
      return res.json(updated);
    }

    if (req.method === "DELETE") {
      await sql`DELETE FROM conversations WHERE id = ${id} AND user_id = ${userId}`;
      return res.status(204).end();
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("conversations/[id] error:", err);
    return res.status(500).json({ error: err.message });
  }
}
