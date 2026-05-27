import axios from "axios";
import type { ChatObject } from "../utils/types";

type GetToken = () => Promise<string | null>;

async function authHeaders(getToken: GetToken) {
  const token = await getToken();
  return { Authorization: `Bearer ${token}` };
}

export async function fetchConversations(getToken: GetToken): Promise<ChatObject[]> {
  const headers = await authHeaders(getToken);
  const { data } = await axios.get("/api/conversations", { headers });
  return data.map((c: { id: string; name: string; created_at: string; updated_at: string }) => ({
    id: c.id,
    name: c.name,
    date: c.created_at,
    messages: [],
  }));
}

export async function fetchMessages(
  conversationId: string,
  getToken: GetToken,
) {
  const headers = await authHeaders(getToken);
  const { data } = await axios.get(`/api/conversations/${conversationId}`, { headers });
  return data as { id: string; type: "prompt" | "response"; text: string; timestamp: string }[];
}

export async function sendMessage(
  message: string,
  conversationId: string | null,
  getToken: GetToken,
): Promise<{ reply: string; conversationId: string }> {
  const headers = await authHeaders(getToken);
  const { data } = await axios.post("/api/chat", { message, conversationId }, { headers });
  return data;
}

export async function renameConversation(
  id: string,
  name: string,
  getToken: GetToken,
) {
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
  const { data } = await axios.post(
    `/api/conversations/${id}/duplicate`,
    {},
    { headers },
  );
  return data as { id: string; name: string; created_at: string; updated_at: string };
}

export async function migrateLocalStorage(
  chats: ChatObject[],
  getToken: GetToken,
) {
  const headers = await authHeaders(getToken);
  await axios.post("/api/migrate", { chats }, { headers });
}
