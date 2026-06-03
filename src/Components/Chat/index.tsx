import { useEffect, useRef, useState } from "react";
import EmojiPicker, { type EmojiClickData, Theme } from "emoji-picker-react";

import type { ChatProps } from "../../utils/types";
import { hasNonLatinScript } from "../../utils/constants";
import { useConversations } from "./hooks/useConversations";
import { useMessaging } from "./hooks/useMessaging";
import MarkdownMessage from "../../utils/Markdown/index";
import SideBar from "../SideBar";
import CopyButton from "../CopyButton";
import SpeakButton from "../SpeakButton";

import "./styles.scss";

const Chat = ({ mobileOpen, onCloseMobile }: ChatProps) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDark, setIsDark] = useState(() =>
    document.body.classList.contains("dark"),
  );

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const {
    isLoaded,
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
  } = useConversations(setErrorMsg);

  const { isLoading, handleSendMessage, handleRegenerate } = useMessaging({
    chats,
    setChats,
    activeChat,
    setActiveChat,
    messages,
    setMessages,
    streamingRef,
    setErrorMsg,
  });

  useEffect(() => {
    const observer = new MutationObserver(() =>
      setIsDark(document.body.classList.contains("dark")),
    );
    observer.observe(document.body, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight);
    textarea.style.height = `${Math.min(textarea.scrollHeight, lineHeight * 5)}px`;
  }, [inputValue]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const onSend = async () => {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue("");
    try {
      await handleSendMessage(text);
    } catch {
      setInputValue(text);
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setInputValue((prev) => prev + emojiData.emoji);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

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
        onSelectChat={(id) => { handleSelectChat(id); onCloseMobile(); }}
        onDeleteChat={handleDeleteChat}
        onNewChat={() => { createNewChat(); onCloseMobile(); }}
        onRenameChat={handleRenameChat}
        onDuplicateChat={handleDuplicateChat}
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
              isLoading && index === messages.length - 1 && message.type === "response";
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
                    isAIMsg && hasNonLatinScript(message.text) ? "aiResponse--nonLatin" : "",
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
            <i
              className="fa-solid fa-xmark errorBanner__close"
              onClick={() => setErrorMsg(null)}
            />
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
            />
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
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            autoFocus
          />
          <i className="fa-solid fa-paper-plane" onClick={onSend} />
        </form>
      </div>
    </div>
  );
};

export default Chat;
