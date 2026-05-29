export const PENDING_CHAT_ID = "__pending_new__";

export const stripMarkdown = (text: string): string =>
  text
    .replace(/```[\s\S]*?```/g, "code block")
    .replace(/`[^`]+`/g, "")
    .replace(/[#*_~>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();

export const hasNonLatinScript = (text: string): boolean =>
  /[぀-ヿ一-鿿가-힯؀-ۿ֐-׿ऀ-ॿ฀-๿Ѐ-ӿͰ-Ͽ]/.test(
    text,
  );
