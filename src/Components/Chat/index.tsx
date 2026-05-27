import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { v4 as uuid } from "uuid";
import EmojiPicker, { type EmojiClickData, Theme } from "emoji-picker-react";

import {
  deleteConversation,
  duplicateConversation,
  fetchConversations,
  fetchMessages,
  migrateLocalStorage,
  renameConversation,
  sendMessage,
  sendMessageGuest,
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
  const { isLoaded, isSignedIn, getToken } = useAuth();
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
  const wasSignedOut = useRef(false);

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

  // Initialize based on auth state; handle guest → signed-in migration
  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      const migrate = wasSignedOut.current;
      wasSignedOut.current = false;

      setIsInitializing(true);
      (async () => {
        try {
          const dbChats = await fetchConversations(getToken);

          if (migrate) {
            // User just signed in — migrate any guest localStorage chats
            const stored = localStorage.getItem("chats");
            if (stored && dbChats.length === 0) {
              const localChats: ChatObject[] = JSON.parse(stored);
              if (localChats.length > 0) {
                await migrateLocalStorage(localChats, getToken);
                localStorage.removeItem("chats");
                localStorage.removeItem("activeChat");
                const migrated = await fetchConversations(getToken);
                setChats(migrated);
                setActiveChat(migrated.length > 0 ? migrated[0].id : null);
                return;
              }
            }
            localStorage.removeItem("chats");
            localStorage.removeItem("activeChat");
          }

          setChats(dbChats);
          setActiveChat(dbChats.length > 0 ? dbChats[0].id : null);
          setMessages([]);
        } finally {
          setIsInitializing(false);
        }
      })();
    } else {
      // Guest mode — load from localStorage
      wasSignedOut.current = true;
      try {
        const stored = localStorage.getItem("chats");
        const localChats: ChatObject[] = stored ? JSON.parse(stored) : [];
        setChats(localChats);
        const lastActive = localStorage.getItem("activeChat");
        const first = localChats.find((c) => c.id === lastActive) ?? localChats[0];
        setActiveChat(first?.id ?? null);
        setMessages(first?.messages ?? []);
      } catch {
        setChats([]);
        setActiveChat(null);
        setMessages([]);
      }
      setIsInitializing(false);
    }
  }, [isLoaded, isSignedIn]);

  // Load messages from DB when active chat changes (auth mode only)
  useEffect(() => {
    if (!isSignedIn || !activeChat) return;
    fetchMessages(activeChat, getToken).then((rows) => {
      setMessages(
        rows.map((r) => ({ type: r.type, text: r.text, timeStamp: r.timestamp })),
      );
    });
  }, [activeChat, isSignedIn]);

  // Persist guest chats to localStorage
  useEffect(() => {
    if (!isLoaded || isSignedIn) return;
    localStorage.setItem("chats", JSON.stringify(chats));
  }, [chats, isSignedIn, isLoaded]);

  useEffect(() => {
    if (!isLoaded || isSignedIn) return;
    if (activeChat) localStorage.setItem("activeChat", activeChat);
    else localStorage.removeItem("activeChat");
  }, [activeChat, isSignedIn, isLoaded]);

  // Keep guest messages in sync with chats state
  useEffect(() => {
    if (isSignedIn) return;
    const activeChatObj = chats.find((c) => c.id === activeChat);
    if (activeChatObj) setMessages(activeChatObj.messages);
  }, [activeChat, chats, isSignedIn]);

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

    setInputValue("");
    setIsLoading(true);

    if (!isSignedIn) {
      // ── Guest mode ──────────────────────────────────────────────────────────
      let targetChat = activeChat;
      let updatedChats = chats;

      if (!targetChat) {
        const newChat: ChatObject = {
          id: uuid(),
          date: new Date().toLocaleString("en-US"),
          messages: [userMessage],
          name: `Conversation ${chats.length + 1}`,
        };
        updatedChats = [newChat, ...chats];
        setChats(updatedChats);
        setActiveChat(newChat.id);
        targetChat = newChat.id;
        setMessages([userMessage]);
      } else {
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        updatedChats = chats.map((c) =>
          c.id === targetChat ? { ...c, messages: updatedMessages } : c,
        );
        setChats(updatedChats);
      }

      try {
        const reply = await sendMessageGuest(inputValue, messages);
        const aiMessage: Message = {
          type: "response",
          text: reply,
          timeStamp: new Date().toLocaleString("en-US"),
        };
        const finalMessages = [
          ...(targetChat === activeChat ? messages : [userMessage]),
          aiMessage,
        ];
        setMessages((prev) => [...prev, aiMessage]);
        setChats((prev) =>
          prev.map((c) =>
            c.id === targetChat ? { ...c, messages: finalMessages } : c,
          ),
        );
      } catch (error) {
        console.error(error);
        setMessages((prev) => prev.filter((m) => m !== userMessage));
      }
    } else {
      // ── Auth mode ───────────────────────────────────────────────────────────
      setMessages((prev) => [...prev, userMessage]);

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
          setActiveChat(conversationId);
          const updated = await fetchConversations(getToken);
          setChats(updated);
        } else {
          setChats((prev) => {
            const idx = prev.findIndex((c) => c.id === conversationId);
            if (idx === -1) return prev;
            const next = [...prev];
            const [moved] = next.splice(idx, 1);
            return [moved, ...next];
          });
        }
      } catch (error) {
        console.error(error);
        setMessages((prev) => prev.slice(0, -1));
      }
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
    if (!isSignedIn) {
      const newChat: ChatObject = {
        id: uuid(),
        date: new Date().toLocaleString("en-US"),
        messages: [],
        name: `Conversation ${chats.length + 1}`,
      };
      setChats((prev) => [newChat, ...prev]);
      setActiveChat(newChat.id);
    } else {
      setActiveChat(null);
      setMessages([]);
    }
    onCloseMobile();
  };

  const handleDuplicateChat = async (id: string) => {
    const idx = chats.findIndex((c) => c.id === id);

    if (!isSignedIn) {
      const source = chats[idx];
      const duplicate: ChatObject = {
        ...source,
        id: uuid(),
        name: `Copy of ${source.name}`,
        date: new Date().toLocaleString("en-US"),
      };
      setChats((prev) => {
        const next = [...prev];
        next.splice(idx + 1, 0, duplicate);
        return next;
      });
    } else {
      const newConv = await duplicateConversation(id, getToken);
      const duplicate: ChatObject = {
        id: newConv.id,
        name: newConv.name,
        date: newConv.created_at,
        messages: [],
      };
      setChats((prev) => {
        const next = [...prev];
        next.splice(idx + 1, 0, duplicate);
        return next;
      });
    }
  };

  const handleRenameChat = async (id: string, name: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name } : c)),
    );
    if (isSignedIn) await renameConversation(id, name, getToken);
  };

  const handleDeleteChat = async (id: string) => {
    if (isSignedIn) await deleteConversation(id, getToken);
    const remaining = chats.filter((c) => c.id !== id);
    setChats(remaining);
    if (id === activeChat) {
      setActiveChat(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (!isLoaded || isInitializing) {
    return (
      <div className="chatApp">
        <div className="chatWindow">
          <div className="chatTitle">
            <h3>Loading...</h3>
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
