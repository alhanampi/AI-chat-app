import { useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";

import { sendMessageToAPI } from "../../services/chatService";

import type { ChatObject, Message } from "../../utils/types";
import MarkdownMessage from "../../utils/Markdown";

import "./styles.scss";

const Chat = () => {
  const [chats, setChats] = useState<ChatObject[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>(chats[0]?.messages || []);
  const [activeChat, setActiveChat] = useState<null | string>(null);
  const [isLoading, setIsLoading] = useState(false);

  // autoscroll
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const activeChatObj = chats.find((chat) => chat.id === activeChat);
    setMessages(activeChatObj ? activeChatObj.messages : []);
  }, [activeChat, chats]);

  const handleSelectChat = (id: string) => {
    setActiveChat(id);
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
        chat.id === activeChat ? { ...chat, messages: finalMessages } : chat
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

  // scroll
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className="chatApp">
      <div className="chatList">
        <div className="chatListHeader">
          <h2>Chat List</h2>
          <i
            className="bx bx-edit-alt newChat"
            onClick={() => createNewChat()}
          ></i>
        </div>

        {chats &&
          chats.map((chat) => (
            <div
              key={chat.id}
              className={`chatListItem${
                chat.id === activeChat ? " active" : ""
              }`}
              onClick={() => handleSelectChat(chat.id)}
            >
              <h4 className={chat.id === activeChat ? "active" : ""}>
                {chat.date}
              </h4>
              <i
                className="bx bx-x circle"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteChat(chat.id);
                }}
              ></i>
            </div>
          ))}
      </div>
      <div className="chatWindow">
        <div className="chatTitle">
          <h3>Chat with the AI</h3>
          <i className="bx bx-arrow-back arrow"></i>
        </div>
        <div className="chat">
          {messages.map((message, index) => (
            <div
              key={index}
              className={
                message.type === "prompt" ? "userPrompt" : "aiResponse"
              }
            >
              <MarkdownMessage text={message.text} />
              <div className="messageTimestamp">{message.timeStamp}</div>
            </div>
          ))}

          {isLoading && <div className="aiResponse loading">loading...</div>}
          <div ref={chatEndRef} />
        </div>

        <form className="messageForm" onSubmit={(e) => e.preventDefault()}>
          <i className="fa-solid fa-face-smile emoji"></i>
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
