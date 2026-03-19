import { useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import EmojiPicker, { type EmojiClickData, Theme } from "emoji-picker-react";

import { sendMessageToAPI } from "../../services/chatService";

import type { ChatObject, ChatProps, Message } from "../../utils/types";
import MarkdownMessage from "../../utils/Markdown/index";
import SideBar from "../SideBar";

import "./styles.scss";

const Chat = ({ mobileOpen, onCloseMobile }: ChatProps) => {
  const [chats, setChats] = useState<ChatObject[]>(() => {
    try {
      const stored = localStorage.getItem("chats");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [inputValue, setInputValue] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>(chats[0]?.messages || []);
  const [activeChat, setActiveChat] = useState<null | string>(() =>
    localStorage.getItem("activeChat"),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDark, setIsDark] = useState(() =>
    document.body.classList.contains("dark"),
  );

  // autoscroll
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new MutationObserver(() =>
      setIsDark(document.body.classList.contains("dark")),
    );
    observer.observe(document.body, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setInputValue((prev) => prev + emojiData.emoji);
  };

  useEffect(() => {
    const activeChatObj = chats.find((chat) => chat.id === activeChat);
    setMessages(activeChatObj ? activeChatObj.messages : []);
  }, [activeChat, chats]);

  const handleSelectChat = (id: string) => {
    setActiveChat(id);
    onCloseMobile();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() === "") return;

    const newMessage: Message = {
      type: "prompt",
      text: inputValue,
      timeStamp: new Date().toLocaleString("en-US"),
    };

    let updatedMessages;

    if (!activeChat) {
      createNewChat(inputValue);
      return;
    }

    updatedMessages = [...messages, newMessage];

    setMessages(updatedMessages);

    setInputValue("");

    const updatedChats = chats.map((chat) => {
      if (chat.id === activeChat) {
        return { ...chat, messages: updatedMessages };
      }
      return chat;
    });
    setChats(updatedChats);

    setIsLoading(true);

    try {
      const responseText = await sendMessageToAPI(inputValue);

      const aiMessage: Message = {
        type: "response",
        text: responseText,
        timeStamp: new Date().toLocaleString("en-US"),
      };

      const finalMessages = [...updatedMessages, aiMessage];

      setMessages(finalMessages);

      const finalChats = chats.map((chat) =>
        chat.id === activeChat ? { ...chat, messages: finalMessages } : chat,
      );

      setChats(finalChats);
    } catch (error) {
      console.error(error);
    }

    setIsLoading(false);
  };

  const handleKeyDown = (e: { key: string; preventDefault: () => void }) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const createNewChat = (initialMessage: string = "") => {
    const newChat: ChatObject = {
      id: uuid(),
      date: new Date().toLocaleString("en-US"),
      messages: initialMessage
        ? [
            {
              type: "prompt",
              text: initialMessage,
              timeStamp: new Date().toLocaleDateString("en-Us"),
            },
          ]
        : [],
      name: `Conversation ${uuid()}`,
    };

    const updatedChats = [newChat, ...chats];
    setChats(updatedChats);
    setActiveChat(newChat.id);
    setInputValue("");
  };

  const handleDuplicateChat = (id: string) => {
    const source = chats.find((chat) => chat.id === id);
    if (!source) return;
    const duplicate: ChatObject = {
      ...source,
      id: uuid(),
      name: `Copy of ${source.name}`,
      date: new Date().toLocaleString("en-US"),
    };
    setChats((prev) => {
      const index = prev.findIndex((c) => c.id === id);
      const updated = [...prev];
      updated.splice(index + 1, 0, duplicate);
      return updated;
    });
  };

  const handleRenameChat = (id: string, name: string) => {
    setChats((prev) =>
      prev.map((chat) => (chat.id === id ? { ...chat, name } : chat)),
    );
  };

  const handleDeleteChat = (id: string) => {
    const updatedChats = chats.filter((chat) => chat.id !== id);
    setChats(updatedChats);

    if (id === activeChat) {
      const newActiveChat = updatedChats.length > 0 ? updatedChats[0].id : null;
      setActiveChat(newActiveChat);
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (chats.length === 0) {
      createNewChat();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("chats", JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    if (activeChat) localStorage.setItem("activeChat", activeChat);
    else localStorage.removeItem("activeChat");
  }, [activeChat]);

  // scroll
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className="chatApp">
      <SideBar
        chats={chats}
        activeChat={activeChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onNewChat={() => {
          createNewChat();
          onCloseMobile();
        }}
        onDuplicateChat={handleDuplicateChat}
        onRenameChat={handleRenameChat}
        mobileOpen={mobileOpen}
        onCloseMobile={onCloseMobile}
      />
      <div className="chatWindow">
        {messages.length === 0 && (
          <div className="chatTitle">
            <h3>Start a conversation!</h3>
          </div>
        )}
        <div className="chat">
          {messages.map((message, index) => (
            <>
              <div
                key={index}
                className={
                  message.type === "prompt" ? "userPrompt" : "aiResponse"
                }
              >
                <MarkdownMessage text={message.text} />
              </div>
              <div
                className={`messageTimestamp ${message.type === "prompt" ? "messageTimestamp--right" : "messageTimestamp--left"}`}
              >
                {message.timeStamp}
              </div>
            </>
          ))}

          {isLoading && <div className="aiResponse loading">loading...</div>}
          <div ref={chatEndRef} />
        </div>

        <form className="messageForm" onSubmit={(e) => e.preventDefault()}>
          <div className="emojiWrapper" ref={emojiPickerRef}>
            <i
              className="fa-solid fa-face-smile emoji"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
            ></i>
            {showEmojiPicker && (
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                theme={isDark ? Theme.DARK : Theme.LIGHT}
              />
            )}
          </div>
          <input
            type="text"
            className="userInput"
            placeholder="start typing here!"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />
          <i
            className="fa-solid fa-paper-plane"
            onClick={handleSendMessage}
          ></i>
        </form>
      </div>
    </div>
  );
};

export default Chat;
