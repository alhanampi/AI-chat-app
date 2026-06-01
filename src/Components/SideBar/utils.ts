import type { ChatObject } from "../../utils/types";
import type { DateGroup } from "./types";

const MS_PER_DAY = 86_400_000;

export function groupChatsByDate(chats: ChatObject[]): DateGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - MS_PER_DAY);
  const weekAgo = new Date(today.getTime() - 7 * MS_PER_DAY);

  const groups: DateGroup[] = [
    { label: "Today", chats: [] },
    { label: "Yesterday", chats: [] },
    { label: "This week", chats: [] },
    { label: "Older", chats: [] },
  ];

  for (const chat of chats) {
    const d = new Date(chat.date);
    if (isNaN(d.getTime())) {
      groups[3].chats.push(chat);
      continue;
    }
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day >= today) groups[0].chats.push(chat);
    else if (day >= yesterday) groups[1].chats.push(chat);
    else if (day >= weekAgo) groups[2].chats.push(chat);
    else groups[3].chats.push(chat);
  }

  return groups.filter((g) => g.chats.length > 0);
}
