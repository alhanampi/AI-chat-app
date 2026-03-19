import { useEffect, useRef, useState } from "react";

import type { ChatObject, SideBarProps } from "../../utils/types";

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
  // resizable sidebar
  const [width, setWidth] = useState(() => window.innerWidth / 3);
  const isDragging = useRef(false);

  // inline rename
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

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

  const startEditing = (e: React.MouseEvent, chat: ChatObject) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditValue(chat.name);
  };

  const saveEdit = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    if (editingChatId) onRenameChat(editingChatId, editValue);
    setEditingChatId(null);
  };

  const cancelEdit = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    setEditingChatId(null);
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
        chats.map((chat) => (
          <div
            key={chat.id}
            className={`chatListItem${chat.id === activeChat ? " active" : ""}`}
            onClick={() => onSelectChat(chat.id)}
          >
            {editingChatId === chat.id ? (
              <>
                <input
                  className="chatNameInput"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") saveEdit(e);
                    if (e.key === "Escape") cancelEdit(e);
                  }}
                  autoFocus
                />
                <div className="chatListItemActions">
                  <i
                    className="fa fa-check"
                    title="Save changes"
                    onClick={saveEdit}
                  ></i>
                  <i
                    className="fa fa-times"
                    title="Cancel"
                    onClick={cancelEdit}
                  ></i>
                </div>
              </>
            ) : (
              <>
                <h4 className={chat.id === activeChat ? "active" : ""}>
                  {chat.name || chat.date}
                </h4>
                <div className="chatListItemActions">
                  <i
                    className="bx bx-edit-alt"
                    title="Edit name"
                    onClick={(e) => startEditing(e, chat)}
                  ></i>
                  <i
                    className="fa fa-clone"
                    title="Duplicate this conversation"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateChat(chat.id);
                    }}
                  ></i>
                  <i
                    className="bx bx-x circle"
                    title="Delete this conversation"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(chat.id);
                    }}
                  ></i>
                </div>
              </>
            )}
          </div>
        ))}

      <div className="resizeHandle" onMouseDown={handleMouseDown} />
    </div>
  );
};

export default SideBar;
