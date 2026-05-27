import Groq from "groq-sdk";
import { sql } from "./_db.js";
import { tryGetUserId } from "./_auth.js";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userId = await tryGetUserId(req);
  const { message, conversationId, history = [] } = req.body;

  // Guest mode: no DB, just call Groq with the history sent from the client
  if (!userId) {
    const groqMessages = [
      ...history.map((m) => ({
        role: m.type === "prompt" ? "user" : "assistant",
        content: m.text,
      })),
      { role: "user", content: message },
    ];
    try {
      const completion = await client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: groqMessages,
      });
      return res.json({ reply: completion.choices[0].message.content });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Error with Groq" });
    }
  }

  // Authenticated mode: save to DB and use DB history
  let convId = conversationId;

  if (!convId) {
    const [newConv] = await sql`
      INSERT INTO conversations (user_id, name)
      VALUES (${userId}, ${"New Conversation"})
      RETURNING id
    `;
    convId = newConv.id;
  } else {
    const [conv] = await sql`
      SELECT id FROM conversations WHERE id = ${convId} AND user_id = ${userId}
    `;
    if (!conv) return res.status(403).json({ error: "Forbidden" });
  }

  const timestamp = new Date().toLocaleString("en-US");
  await sql`
    INSERT INTO messages (conversation_id, type, text, timestamp)
    VALUES (${convId}, 'prompt', ${message}, ${timestamp})
  `;

  const dbHistory = await sql`
    SELECT type, text FROM messages
    WHERE conversation_id = ${convId}
    ORDER BY created_at ASC
  `;

  const groqMessages = dbHistory.map((m) => ({
    role: m.type === "prompt" ? "user" : "assistant",
    content: m.text,
  }));

  try {
    const completion = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: groqMessages,
    });
    const reply = completion.choices[0].message.content;

    const aiTimestamp = new Date().toLocaleString("en-US");
    await sql`
      INSERT INTO messages (conversation_id, type, text, timestamp)
      VALUES (${convId}, 'response', ${reply}, ${aiTimestamp})
    `;

    await sql`UPDATE conversations SET updated_at = NOW() WHERE id = ${convId}`;

    res.json({ reply, conversationId: convId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error with Groq" });
  }
}
