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