import { useEffect, useRef, useState } from "react";

import type { ChatObject, SideBarProps } from "../../utils/types";
import ChatCard from "../ChatCard";

import "./styles.scss";

const SideBar = ({
  chats,
  activeChat,
  onSelectChat,
  onDeleteChat,
  onNewChat,
  onRenameChat,
  onDuplicateChat,
  mobileOpen,
  onCloseMobile,
}: SideBarProps) => {
  const [width, setWidth] = useState(() => window.innerWidth / 3);
  const isDragging = useRef(false);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const min = window.innerWidth / 5;
      const max = window.innerWidth / 2;
      setWidth(Math.min(Math.max(e.clientX, min), max));
    };

    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const handleMouseDown = () => {
    isDragging.current = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  };

  return (
    <div
      className={`chatList${mobileOpen ? " mobileOpen" : ""}`}
      style={{ width }}
    >
      <div className="chatListHeader">
        <h2>Chat List</h2>
        <div className="headerActions">
          <i
            className="fa fa-plus-circle"
            title="New conversation"
            onClick={() => onNewChat()}
          ></i>
          <i
            className="bx bx-x circle mobileCloseBtn"
            title="Close menu"
            onClick={onCloseMobile}
          ></i>
        </div>
      </div>

      {chats &&
        chats.map((chat: ChatObject) => (
          <ChatCard
            key={chat.id}
            chat={chat}
            isActive={chat.id === activeChat}
            onSelect={() => onSelectChat(chat.id)}
            onDelete={() => onDeleteChat(chat.id)}
            onRename={(name) => onRenameChat(chat.id, name)}
            onDuplicate={() => onDuplicateChat(chat.id)}
          />
        ))}

      <div className="resizeHandle" onMouseDown={handleMouseDown} />
    </div>
  );
};

export default SideBar;
