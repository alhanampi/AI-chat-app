import { sql } from "./_db.js";
import { getUserId } from "./_auth.js";

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

  const { chats } = req.body;
  if (!Array.isArray(chats) || chats.length === 0) {
    return res.status(400).json({ error: "No chats provided" });
  }

  let count = 0;
  for (const chat of chats) {
    const [conv] = await sql`
      INSERT INTO conversations (user_id, name)
      VALUES (${userId}, ${chat.name || "Imported Conversation"})
      RETURNING id
    `;

    if (Array.isArray(chat.messages) && chat.messages.length > 0) {
      for (const msg of chat.messages) {
        await sql`
          INSERT INTO messages (conversation_id, type, text, timestamp)
          VALUES (${conv.id}, ${msg.type}, ${msg.text}, ${msg.timeStamp || ""})
        `;
      }
    }
    count++;
  }

  res.json({ migrated: count });
}
