import axios from "axios";
import type { ChatObject, Message } from "../utils/types";

type GetToken = () => Promise<string | null>;

async function authHeaders(getToken: GetToken) {
  const token = await getToken();
  return { Authorization: `Bearer ${token}` };
}

async function readStream(
  response: Response,
  onChunk: (chunk: string) => void,
): Promise<{ conversationId?: string; name?: string }> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let conversationId: string | undefined;
  let name: string | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      if (!part.startsWith("data: ")) continue;
      const data = part.slice(6).trim();
      try {
        const parsed = JSON.parse(data);
        if (parsed.t === "c") onChunk(parsed.v);
        else if (parsed.t === "meta") {
          conversationId = parsed.conversationId;
          name = parsed.name;
        }
      } catch {}
    }
  }

  return { conversationId, name };
}

// ── Guest (unauthenticated) ───────────────────────────────────────────────────

export async function sendMessageGuest(
  message: string,
  history: Message[],
  onChunk: (chunk: string) => void,
): Promise<void> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  if (!response.ok || !response.body) throw new Error("Stream failed");
  await readStream(response, onChunk);
}

// ── Authenticated ─────────────────────────────────────────────────────────────

export async function fetchConversations(getToken: GetToken): Promise<ChatObject[]> {
  const headers = await authHeaders(getToken);
  const { data } = await axios.get("/api/conversations", { headers });
  return data.map((c: { id: string; name: string; created_at: string; message_count: string }) => ({
    id: c.id,
    name: c.name,
    date: c.created_at,
    messages: [],
    messageCount: Number(c.message_count),
  }));
}

export async function fetchMessages(conversationId: string, getToken: GetToken) {
  const headers = await authHeaders(getToken);
  const { data } = await axios.get(`/api/conversations/${conversationId}`, { headers });
  return data as { type: "prompt" | "response"; text: string; timestamp: string }[];
}

export async function sendMessage(
  message: string,
  conversationId: string | null,
  getToken: GetToken,
  onChunk: (chunk: string) => void,
): Promise<{ reply: string; conversationId: string; name?: string }> {
  const token = await getToken();
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, conversationId }),
  });
  if (!response.ok || !response.body) throw new Error("Stream failed");

  let fullText = "";
  const { conversationId: returnedId, name } = await readStream(response, (chunk) => {
    fullText += chunk;
    onChunk(chunk);
  });

  return { reply: fullText, conversationId: returnedId!, name };
}

export async function renameConversation(id: string, name: string, getToken: GetToken) {
  const headers = await authHeaders(getToken);
  const { data } = await axios.put(`/api/conversations/${id}`, { name }, { headers });
  return data;
}

export async function deleteConversation(id: string, getToken: GetToken) {
  const headers = await authHeaders(getToken);
  await axios.delete(`/api/conversations/${id}`, { headers });
}

export async function duplicateConversation(id: string, getToken: GetToken) {
  const headers = await authHeaders(getToken);
  const { data } = await axios.post(`/api/conversations/${id}/duplicate`, {}, { headers });
  return data as { id: string; name: string; created_at: string };
}

export async function migrateLocalStorage(chats: ChatObject[], getToken: GetToken) {
  const headers = await authHeaders(getToken);
  await axios.post("/api/migrate", { chats }, { headers });
}
