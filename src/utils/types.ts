export const hasNonLatinScript = (text: string): boolean =>
  /[\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF\u0600-\u06FF\u0590-\u05FF\u0900-\u097F\u0E00-\u0E7F\u0400-\u04FF\u0370-\u03FF]/.test(
    text,
  );

export interface ChatObject {
  id: string;
  date: string;
  messages: Message[];
  name: string;
}

export interface Message {
  type: "prompt" | "response";
  text: string;
  timeStamp: string;
}

export type ConfirmPopupProps = {
  open: boolean;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export type ChatCardProps = {
  chat: ChatObject;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
};

export type ChatProps = {
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

export type SideBarProps = {
  chats: ChatObject[];
  activeChat: string | null;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onNewChat: () => void;
  onRenameChat: (id: string, name: string) => void;
  onDuplicateChat: (id: string) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
};
