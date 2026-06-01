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
import {
  hasNonLatinScript,
  stripMarkdown,
  PENDING_CHAT_ID,
} from "../../utils/constants";
import MarkdownMessage from "../../utils/Markdown/index";
import SideBar from "../SideBar";

import "./styles.scss";

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard access denied
    }
  };

  return (
    <i
      className={`fa-solid ${copied ? "fa-check" : "fa-copy"} copyBtn`}
      onClick={handleCopy}
      title={copied ? "Copied!" : "Copy"}
    />
  );
};

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(() =>
    document.body.classList.contains("dark"),
  );

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const wasSignedOut = useRef(false);
  const streamingRef = useRef(false);
  // Set synchronously at the start of auth init so fetchMessages (which runs
  // in the same effect flush, after the init effect) sees it immediately.
  const authInitInProgress = useRef(false);

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

      setActiveChat(null);
      setMessages([]);
      setIsInitializing(true);
      authInitInProgress.current = true;
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
          authInitInProgress.current = false;
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

  // Load messages from DB when active chat changes (auth mode only).
  // isSignedIn is intentionally excluded from deps: the auth transition is handled
  // by the init effect above; including it here fires this effect with a stale
  // guest activeChat before setActiveChat(null) takes effect.
  useEffect(() => {
    if (!isSignedIn || !activeChat || activeChat === PENDING_CHAT_ID || authInitInProgress.current) return;
    fetchMessages(activeChat, getToken)
      .then((rows) => {
        const mapped = rows.map((r) => ({ type: r.type, text: r.text, timeStamp: r.timestamp }));
        setMessages(mapped);
        setChats((prev) =>
          prev.map((c) => (c.id === activeChat ? { ...c, messageCount: mapped.length } : c)),
        );
      })
      .catch((err) => {
        console.error(`fetchMessages failed for ${activeChat}:`, err?.response?.status, err?.message);
        setErrorMsg("Failed to load messages. Refresh or try another conversation.");
      });
  }, [activeChat]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Keep guest messages in sync with chats state (suppressed during streaming
  // to prevent the effect from wiping the live streaming placeholder).
  useEffect(() => {
    if (isSignedIn || streamingRef.current) return;
    const activeChatObj = chats.find((c) => c.id === activeChat);
    if (activeChatObj) setMessages(activeChatObj.messages);
  }, [activeChat, chats, isSignedIn]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setInputValue((prev) => prev + emojiData.emoji);
  };

  const handleSelectChat = (id: string) => {
    if (activeChat === PENDING_CHAT_ID) {
      setChats((prev) => prev.filter((c) => c.id !== PENDING_CHAT_ID));
    }
    setActiveChat(id);
    setErrorMsg(null);
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
    // Capture before clearing so closures and error recovery both see the original text
    const text = inputValue;

    setInputValue("");
    setIsLoading(true);
    setErrorMsg(null);

    const userMessage: Message = {
      type: "prompt",
      text,
      timeStamp: new Date().toLocaleString("en-US"),
    };

    if (!isSignedIn) {
      // ── Guest mode ──────────────────────────────────────────────────────────
      let targetChat = activeChat;
      const wasNewChat = !activeChat;

      // Suppress sync effect for the duration of streaming so it doesn't
      // wipe the live placeholder from messages state.
      streamingRef.current = true;

      if (!targetChat) {
        const newChat: ChatObject = {
          id: uuid(),
          date: new Date().toLocaleString("en-US"),
          messages: [userMessage],
          name: `Conversation ${chats.length + 1}`,
        };
        setChats([newChat, ...chats]);
        setActiveChat(newChat.id);
        targetChat = newChat.id;
        setMessages([userMessage, { type: "response", text: "", timeStamp: "" }]);
      } else {
        const withUser = [...messages, userMessage];
        setMessages([...withUser, { type: "response", text: "", timeStamp: "" }]);
        setChats((prev) =>
          prev.map((c) => (c.id === targetChat ? { ...c, messages: withUser } : c)),
        );
      }

      try {
        let fullReply = "";
        await sendMessageGuest(text, messages, (chunk) => {
          fullReply += chunk;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.type !== "response") return prev;
            return [...prev.slice(0, -1), { ...last, text: last.text + chunk }];
          });
        });

        const aiMessage: Message = {
          type: "response",
          text: fullReply,
          timeStamp: new Date().toLocaleString("en-US"),
        };
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.type !== "response") return prev;
          return [...prev.slice(0, -1), { ...last, timeStamp: aiMessage.timeStamp }];
        });

        const finalMessages = wasNewChat
          ? [userMessage, aiMessage]
          : [...messages, userMessage, aiMessage];

        streamingRef.current = false;
        setChats((prev) =>
          prev.map((c) => (c.id === targetChat ? { ...c, messages: finalMessages } : c)),
        );
      } catch (error) {
        console.error(error);
        streamingRef.current = false;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          return last?.type === "response" && !last.timeStamp ? prev.slice(0, -1) : prev;
        });
        setInputValue(text);
        setErrorMsg("Failed to send message. Try again.");
      }
    } else {
      // ── Auth mode ───────────────────────────────────────────────────────────
      const isNewChat = !activeChat || activeChat === PENDING_CHAT_ID;
      setMessages((prev) => [
        ...prev,
        userMessage,
        { type: "response", text: "", timeStamp: "" },
      ]);

      try {
        const { reply, conversationId, name } = await sendMessage(
          text,
          isNewChat ? null : activeChat,
          getToken,
          (chunk) => {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.type !== "response") return prev;
              return [...prev.slice(0, -1), { ...last, text: last.text + chunk }];
            });
          },
        );

        const timestamp = new Date().toLocaleString("en-US");
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.type !== "response") return prev;
          return [...prev.slice(0, -1), { ...last, text: reply, timeStamp: timestamp }];
        });

        if (isNewChat) {
          // Replace sidebar placeholder with the real conversation
          setChats((prev) => [
            { id: conversationId, name: name || "New Conversation", date: new Date().toLocaleString("en-US"), messages: [], messageCount: 2 },
            ...prev.filter((c) => c.id !== PENDING_CHAT_ID),
          ]);
          setActiveChat(conversationId);
        } else {
          setChats((prev) => {
            const idx = prev.findIndex((c) => c.id === conversationId);
            if (idx === -1) return prev;
            const next = [...prev];
            const [moved] = next.splice(idx, 1);
            const prevCount = Number.isFinite(moved.messageCount) ? moved.messageCount! : 0;
            return [{ ...moved, messageCount: prevCount + 2 }, ...next];
          });
        }
      } catch (error) {
        console.error(error);
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          return last?.type === "response" && !last.timeStamp ? prev.slice(0, -1) : prev;
        });
        setInputValue(text);
        setErrorMsg("Failed to send message. Try again.");
      }

      // Sync the sidebar with DB — outside the try/catch so a failure here
      // never wipes the messages that were already shown.
      if (isNewChat) {
        fetchConversations(getToken).then(setChats).catch(() => {});
      }
    }

    setIsLoading(false);
  };

  const handleRegenerate = async () => {
    if (isLoading) return;

    // Find the last user message in the current conversation
    const lastUserIdx = messages.map((m) => m.type).lastIndexOf("prompt");
    if (lastUserIdx === -1) return;

    const lastUserText = messages[lastUserIdx].text;
    // History for the API = everything before the last user message
    const historyBeforeRegen = messages.slice(0, lastUserIdx);
    // UI messages to keep = up to and including the last user message
    const messagesWithUser = messages.slice(0, lastUserIdx + 1);

    setErrorMsg(null);
    setIsLoading(true);
    setMessages([...messagesWithUser, { type: "response", text: "", timeStamp: "" }]);

    if (!isSignedIn) {
      streamingRef.current = true;

      try {
        let fullReply = "";
        await sendMessageGuest(lastUserText, historyBeforeRegen, (chunk) => {
          fullReply += chunk;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.type !== "response") return prev;
            return [...prev.slice(0, -1), { ...last, text: last.text + chunk }];
          });
        });

        const aiMessage: Message = {
          type: "response",
          text: fullReply,
          timeStamp: new Date().toLocaleString("en-US"),
        };
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.type !== "response") return prev;
          return [...prev.slice(0, -1), { ...last, timeStamp: aiMessage.timeStamp }];
        });

        streamingRef.current = false;
        setChats((prev) =>
          prev.map((c) =>
            c.id === activeChat
              ? { ...c, messages: [...messagesWithUser, aiMessage] }
              : c,
          ),
        );
      } catch (error) {
        console.error(error);
        streamingRef.current = false;
        setMessages(messagesWithUser);
        setErrorMsg("Failed to regenerate. Try again.");
      }
    } else {
      try {
        const { reply } = await sendMessage(
          lastUserText,
          activeChat!,
          getToken,
          (chunk) => {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.type !== "response") return prev;
              return [...prev.slice(0, -1), { ...last, text: last.text + chunk }];
            });
          },
        );

        const timestamp = new Date().toLocaleString("en-US");
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.type !== "response") return prev;
          return [...prev.slice(0, -1), { ...last, text: reply, timeStamp: timestamp }];
        });
      } catch (error) {
        console.error(error);
        setMessages(messagesWithUser);
        setErrorMsg("Failed to regenerate. Try again.");
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
      setChats((prev) => {
        if (prev.some((c) => c.id === PENDING_CHAT_ID)) return prev;
        return [
          { id: PENDING_CHAT_ID, date: new Date().toLocaleString("en-US"), messages: [], name: "New Conversation" },
          ...prev,
        ];
      });
      setActiveChat(PENDING_CHAT_ID);
      setMessages([]);
    }
    setErrorMsg(null);
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
      try {
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
      } catch (error) {
        console.error(error);
        setErrorMsg("Failed to duplicate conversation. Try again.");
      }
    }
  };

  const handleRenameChat = async (id: string, name: string) => {
    const originalName = chats.find((c) => c.id === id)?.name ?? name;
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    if (isSignedIn) {
      try {
        await renameConversation(id, name, getToken);
      } catch (error) {
        console.error(error);
        setChats((prev) => prev.map((c) => (c.id === id ? { ...c, name: originalName } : c)));
        setErrorMsg("Failed to rename conversation. Try again.");
      }
    }
  };

  const handleDeleteChat = async (id: string) => {
    if (isSignedIn) {
      try {
        await deleteConversation(id, getToken);
      } catch (error) {
        console.error(error);
        setErrorMsg("Failed to delete conversation. Try again.");
        return;
      }
    }
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
          {messages.map((message, index) => {
            const isStreamingMsg =
              isLoading &&
              index === messages.length - 1 &&
              message.type === "response";
            const isLastMsg = index === messages.length - 1;
            const isAIMsg = message.type === "response";
            return (
              <div
                key={index}
                className={`messagePair messagePair--${isAIMsg ? "left" : "right"}`}
              >
                <div
                  className={[
                    isAIMsg ? "aiResponse" : "userPrompt",
                    isAIMsg && hasNonLatinScript(message.text)
                      ? "aiResponse--nonLatin"
                      : "",
                    isStreamingMsg ? "streaming" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {isStreamingMsg && !message.text ? (
                    <span className="streamingDots" />
                  ) : (
                    <MarkdownMessage
                      text={message.text}
                      nonLatin={isAIMsg && hasNonLatinScript(message.text)}
                    />
                  )}
                </div>
                <div
                  className={`messageTimestamp ${isAIMsg ? "messageTimestamp--left" : "messageTimestamp--right"}`}
                >
                  {!isStreamingMsg && <CopyButton text={message.text} />}
                  {!isStreamingMsg && <SpeakButton text={message.text} />}
                  {message.timeStamp}
                </div>
                {isLastMsg && isAIMsg && !isLoading && (
                  <button className="regenerateBtn" onClick={handleRegenerate}>
                    <i className="fa-solid fa-rotate-right" /> Regenerate response
                  </button>
                )}
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {errorMsg && (
          <div className="errorBanner">
            <i className="fa-solid fa-circle-exclamation" />
            <span>{errorMsg}</span>
            <i className="fa-solid fa-xmark errorBanner__close" onClick={() => setErrorMsg(null)} />
          </div>
        )}

        <form
          className="messageForm"
          onSubmit={(e) => e.preventDefault()}
          onClick={() => textareaRef.current?.focus()}
        >
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
            autoFocus
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
