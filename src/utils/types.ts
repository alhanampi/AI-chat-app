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
