import Groq from "groq-sdk";
import { sql } from "./_db.js";
import { tryGetUserId } from "./_auth.js";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

function writeChunk(res, text) {
  res.write(`data: ${JSON.stringify({ t: "c", v: text })}\n\n`);
}

function writeMeta(res, data) {
  res.write(`data: ${JSON.stringify({ t: "meta", ...data })}\n\n`);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const userId = await tryGetUserId(req);
  const { message, conversationId, history = [] } = req.body;

  // ── Guest mode ──────────────────────────────────────────────────────────
  if (!userId) {
    const groqMessages = [
      ...history.map((m) => ({
        role: m.type === "prompt" ? "user" : "assistant",
        content: m.text,
      })),
      { role: "user", content: message },
    ];
    try {
      const stream = await client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: groqMessages,
        stream: true,
      });
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) writeChunk(res, text);
      }
    } catch (error) {
      console.error(error);
    }
    return res.end();
  }

  // ── Authenticated mode ──────────────────────────────────────────────────
  let convId = conversationId;
  const isNewConversation = !convId;

  try {
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
      if (!conv) return res.end();
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

    let fullReply = "";
    const stream = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: groqMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      if (text) {
        fullReply += text;
        writeChunk(res, text);
      }
    }

    // Save AI response and update conversation timestamp
    const aiTimestamp = new Date().toLocaleString("en-US");
    await sql`
      INSERT INTO messages (conversation_id, type, text, timestamp)
      VALUES (${convId}, 'response', ${fullReply}, ${aiTimestamp})
    `;
    await sql`UPDATE conversations SET updated_at = NOW() WHERE id = ${convId}`;

    // Generate name for new conversations
    let conversationName = "New Conversation";
    if (isNewConversation) {
      try {
        const nameCompletion = await client.chat.completions.create({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "user",
              content: `Give a very short title (2-5 words) for a conversation that starts with: "${message}". Reply with ONLY the title, no quotes, no punctuation at the end.`,
            },
          ],
          max_tokens: 15,
        });
        const generated = nameCompletion.choices[0].message.content?.trim().replace(/^["']|["']$/g, "");
        if (generated) {
          conversationName = generated;
          await sql`UPDATE conversations SET name = ${conversationName} WHERE id = ${convId}`;
        }
      } catch {
        // keep "New Conversation" on failure
      }
    }

    writeMeta(res, { conversationId: convId, ...(isNewConversation && { name: conversationName }) });
  } catch (error) {
    console.error(error);
  }

  res.end();
}
