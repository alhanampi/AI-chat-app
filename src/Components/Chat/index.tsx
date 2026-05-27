import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import EmojiPicker, { type EmojiClickData, Theme } from "emoji-picker-react";

import {
  deleteConversation,
  duplicateConversation,
  fetchConversations,
  fetchMessages,
  migrateLocalStorage,
  renameConversation,
  sendMessage,
} from "../../services/chatService";

import type { ChatObject, ChatProps, Message } from "../../utils/types";
import { hasNonLatinScript } from "../../utils/types";
import MarkdownMessage from "../../utils/Markdown/index";
import SideBar from "../SideBar";

import "./styles.scss";

const stripMarkdown = (text: string) =>
  text
    .replace(/```[\s\S]*?```/g, "code block")
    .replace(/`[^`]+`/g, "")
    .replace(/[#*_~>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();

const SpeakButton = ({ text }: { text: string }) => {
  const [speaking, setSpeaking] = useState(false);

  const handleSpeak = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(stripMarkdown(text));
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  return (
    <i
      className={`fa-solid ${speaking ? "fa-stop" : "fa-volume-high"} speakBtn`}
      onClick={handleSpeak}
      title={speaking ? "Stop" : "Read aloud"}
    />
  );
};

const Chat = ({ mobileOpen, onCloseMobile }: ChatProps) => {
  const { getToken } = useAuth();
  const [chats, setChats] = useState<ChatObject[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChat, setActiveChat] = useState<null | string>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDark, setIsDark] = useState(() =>
    document.body.classList.contains("dark"),
  );

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  // Load conversations on mount, migrate localStorage if needed
  useEffect(() => {
    async function init() {
      setIsInitializing(true);
      try {
        const dbChats = await fetchConversations(getToken);

        const stored = localStorage.getItem("chats");
        if (stored && dbChats.length === 0) {
          try {
            const localChats: ChatObject[] = JSON.parse(stored);
            if (localChats.length > 0) {
              await migrateLocalStorage(localChats, getToken);
              localStorage.removeItem("chats");
              localStorage.removeItem("activeChat");
              const migrated = await fetchConversations(getToken);
              setChats(migrated);
              if (migrated.length > 0) setActiveChat(migrated[0].id);
            }
          } catch {
            setChats(dbChats);
          }
        } else {
          setChats(dbChats);
          if (dbChats.length > 0) setActiveChat(dbChats[0].id);
        }
      } finally {
        setIsInitializing(false);
      }
    }
    init();
  }, []);

  // Load messages when active chat changes
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }
    fetchMessages(activeChat, getToken).then((rows) => {
      setMessages(
        rows.map((r) => ({ type: r.type, text: r.text, timeStamp: r.timestamp })),
      );
    });
  }, [activeChat]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setInputValue((prev) => prev + emojiData.emoji);
  };

  const handleSelectChat = (id: string) => {
    setActiveChat(id);
    onCloseMobile();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight);
    textarea.style.height = `${Math.min(textarea.scrollHeight, lineHeight * 5)}px`;
  }, [inputValue]);

  const handleSendMessage = async () => {
    if (inputValue.trim() === "") return;

    const userMessage: Message = {
      type: "prompt",
      text: inputValue,
      timeStamp: new Date().toLocaleString("en-US"),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const { reply, conversationId } = await sendMessage(
        userMessage.text,
        activeChat,
        getToken,
      );

      const aiMessage: Message = {
        type: "response",
        text: reply,
        timeStamp: new Date().toLocaleString("en-US"),
      };

      setMessages((prev) => [...prev, aiMessage]);

      if (!activeChat) {
        // New conversation was created — refresh list and set it as active
        setActiveChat(conversationId);
        const updated = await fetchConversations(getToken);
        setChats(updated);
      } else {
        // Bubble the updated conversation to the top of the list
        setChats((prev) => {
          const idx = prev.findIndex((c) => c.id === conversationId);
          if (idx === -1) return prev;
          const updated = [...prev];
          const [moved] = updated.splice(idx, 1);
          return [moved, ...updated];
        });
      }
    } catch (error) {
      console.error(error);
      // Roll back the optimistic user message on error
      setMessages((prev) => prev.slice(0, -1));
    }

    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const createNewChat = () => {
    setActiveChat(null);
    setMessages([]);
    onCloseMobile();
  };

  const handleDuplicateChat = async (id: string) => {
    const newConv = await duplicateConversation(id, getToken);
    const idx = chats.findIndex((c) => c.id === id);
    const duplicate: ChatObject = {
      id: newConv.id,
      name: newConv.name,
      date: newConv.created_at,
      messages: [],
    };
    setChats((prev) => {
      const updated = [...prev];
      updated.splice(idx + 1, 0, duplicate);
      return updated;
    });
  };

  const handleRenameChat = async (id: string, name: string) => {
    setChats((prev) =>
      prev.map((chat) => (chat.id === id ? { ...chat, name } : chat)),
    );
    await renameConversation(id, name, getToken);
  };

  const handleDeleteChat = async (id: string) => {
    await deleteConversation(id, getToken);
    const remaining = chats.filter((c) => c.id !== id);
    setChats(remaining);
    if (id === activeChat) {
      setActiveChat(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  if (isInitializing) {
    return (
      <div className="chatApp">
        <div className="chatWindow">
          <div className="chatTitle">
            <h3>Loading your conversations...</h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chatApp">
      <SideBar
        chats={chats}
        activeChat={activeChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onNewChat={createNewChat}
        onDuplicateChat={handleDuplicateChat}
        onRenameChat={handleRenameChat}
        mobileOpen={mobileOpen}
        onCloseMobile={onCloseMobile}
      />
      <div className="chatWindow">
        {messages.length === 0 && !isInitializing && (
          <div className="chatTitle">
            <h3>Start a conversation!</h3>
          </div>
        )}
        <div className="chat">
          {messages.map((message, index) => (
            <>
              <div
                key={index}
                className={[
                  message.type === "prompt" ? "userPrompt" : "aiResponse",
                  message.type === "response" && hasNonLatinScript(message.text)
                    ? "aiResponse--nonLatin"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <MarkdownMessage
                  text={message.text}
                  nonLatin={
                    message.type === "response" &&
                    hasNonLatinScript(message.text)
                  }
                />
              </div>
              <div
                className={`messageTimestamp ${message.type === "prompt" ? "messageTimestamp--right" : "messageTimestamp--left"}`}
              >
                <SpeakButton text={message.text} />
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
          <textarea
            ref={textareaRef}
            className="userInput"
            placeholder="start typing here!"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
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
