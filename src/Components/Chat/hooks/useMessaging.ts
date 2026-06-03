import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { v4 as uuid } from "uuid";

import { fetchConversations, sendMessage, sendMessageGuest } from "../../../services/chatService";
import type { ChatObject, Message } from "../../../utils/types";
import { PENDING_CHAT_ID } from "../../../utils/constants";

interface UseMessagingParams {
  chats: ChatObject[];
  setChats: React.Dispatch<React.SetStateAction<ChatObject[]>>;
  activeChat: string | null;
  setActiveChat: React.Dispatch<React.SetStateAction<string | null>>;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  streamingRef: React.MutableRefObject<boolean>;
  setErrorMsg: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useMessaging({
  chats,
  setChats,
  activeChat,
  setActiveChat,
  messages,
  setMessages,
  streamingRef,
  setErrorMsg,
}: UseMessagingParams) {
  const { isSignedIn, getToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Returns normally on success; throws on failure so the caller can restore inputValue.
  const handleSendMessage = async (text: string) => {
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
        setErrorMsg("Failed to send message. Try again.");
        setIsLoading(false);
        throw error;
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
        setErrorMsg("Failed to send message. Try again.");
        setIsLoading(false);
        throw error;
      }

      // Sync sidebar with DB outside try/catch so a failure here never wipes shown messages.
      if (isNewChat) {
        fetchConversations(getToken).then(setChats).catch(() => {});
      }
    }

    setIsLoading(false);
  };

  const handleRegenerate = async () => {
    if (isLoading) return;

    const lastUserIdx = messages.map((m) => m.type).lastIndexOf("prompt");
    if (lastUserIdx === -1) return;

    const lastUserText = messages[lastUserIdx].text;
    const historyBeforeRegen = messages.slice(0, lastUserIdx);
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
            c.id === activeChat ? { ...c, messages: [...messagesWithUser, aiMessage] } : c,
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

  return { isLoading, handleSendMessage, handleRegenerate };
}
