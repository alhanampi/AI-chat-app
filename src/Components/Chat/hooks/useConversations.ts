import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { v4 as uuid } from "uuid";

import {
  deleteConversation,
  duplicateConversation,
  fetchConversations,
  fetchMessages,
  migrateLocalStorage,
  renameConversation,
} from "../../../services/chatService";
import type { ChatObject, Message } from "../../../utils/types";
import { PENDING_CHAT_ID } from "../../../utils/constants";

export function useConversations(
  setErrorMsg: React.Dispatch<React.SetStateAction<string | null>>
) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [chats, setChats] = useState<ChatObject[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  const authInitInProgress = useRef(false);
  const wasSignedOut = useRef(false);
  // Shared with useMessaging so the guest-sync effect skips during streaming.
  const streamingRef = useRef(false);

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
  // isSignedIn excluded from deps intentionally — see Chat/index.tsx for rationale.
  useEffect(() => {
    if (!isSignedIn || !activeChat || activeChat === PENDING_CHAT_ID || authInitInProgress.current) return;
    fetchMessages(activeChat, getToken)
      .then((rows) => {
        const mapped: Message[] = rows.map((r) => ({
          type: r.type as Message["type"],
          text: r.text,
          timeStamp: r.timestamp,
        }));
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

  // Persist guest activeChat to localStorage
  useEffect(() => {
    if (!isLoaded || isSignedIn) return;
    if (activeChat) localStorage.setItem("activeChat", activeChat);
    else localStorage.removeItem("activeChat");
  }, [activeChat, isSignedIn, isLoaded]);

  // Keep guest messages in sync with chats state (suppressed during streaming)
  useEffect(() => {
    if (isSignedIn || streamingRef.current) return;
    const activeChatObj = chats.find((c) => c.id === activeChat);
    if (activeChatObj) setMessages(activeChatObj.messages);
  }, [activeChat, chats, isSignedIn]);

  const handleSelectChat = (id: string) => {
    if (activeChat === PENDING_CHAT_ID) {
      setChats((prev) => prev.filter((c) => c.id !== PENDING_CHAT_ID));
    }
    setActiveChat(id);
    setErrorMsg(null);
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
  };

  return {
    isLoaded,
    isSignedIn: isSignedIn ?? false,
    chats,
    setChats,
    activeChat,
    setActiveChat,
    messages,
    setMessages,
    isInitializing,
    streamingRef,
    handleSelectChat,
    handleDeleteChat,
    handleRenameChat,
    handleDuplicateChat,
    createNewChat,
  };
}
