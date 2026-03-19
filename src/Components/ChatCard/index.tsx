import { useState } from "react";

import type { ChatCardProps } from "../../utils/types";
import ConfirmPopup from "../ConfirmPopup";

import "./styles.scss";

type PendingAction = "delete" | "duplicate" | "saveEdit" | "cancelEdit" | null;

const ChatCard = ({ chat, isActive, onSelect, onDelete, onRename, onDuplicate }: ChatCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(chat.name);
    setIsEditing(true);
  };

  const handleConfirm = () => {
    if (pendingAction === "delete") onDelete();
    if (pendingAction === "duplicate") onDuplicate();
    if (pendingAction === "saveEdit") { onRename(editValue); setIsEditing(false); }
    if (pendingAction === "cancelEdit") setIsEditing(false);
    setPendingAction(null);
  };

  const handleCancel = () => setPendingAction(null);

  const popupMessages: Record<NonNullable<PendingAction>, string> = {
    delete: "Delete this conversation? This cannot be undone.",
    duplicate: "Duplicate this conversation?",
    saveEdit: "Save the new name?",
    cancelEdit: "Discard your changes?",
  };

  const popupLabels: Record<NonNullable<PendingAction>, string> = {
    delete: "Delete",
    duplicate: "Duplicate",
    saveEdit: "Save",
    cancelEdit: "Discard",
  };

  return (
    <>
      <div
        className={`chatListItem${isActive ? " active" : ""}`}
        onClick={onSelect}
      >
        {isEditing ? (
          <>
            <input
              className="chatNameInput"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              maxLength={30}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") { e.preventDefault(); setPendingAction("saveEdit"); }
                if (e.key === "Escape") setPendingAction("cancelEdit");
              }}
              autoFocus
            />
            <div className="chatListItemActions">
              <i
                className="fa fa-check"
                title="Save changes"
                onClick={(e) => { e.stopPropagation(); setPendingAction("saveEdit"); }}
              ></i>
              <i
                className="fa fa-times"
                title="Cancel"
                onClick={(e) => { e.stopPropagation(); setPendingAction("cancelEdit"); }}
              ></i>
            </div>
          </>
        ) : (
          <>
            <h4 className={isActive ? "active" : ""}>{chat.name || chat.date}</h4>
            <div className="chatListItemActions">
              <i className="bx bx-edit-alt" title="Edit name" onClick={startEditing}></i>
              <i
                className="fa fa-clone"
                title="Duplicate this conversation"
                onClick={(e) => { e.stopPropagation(); setPendingAction("duplicate"); }}
              ></i>
              <i
                className="bx bx-x circle"
                title="Delete this conversation"
                onClick={(e) => { e.stopPropagation(); setPendingAction("delete"); }}
              ></i>
            </div>
          </>
        )}
      </div>

      <ConfirmPopup
        open={pendingAction !== null}
        message={pendingAction ? popupMessages[pendingAction] : ""}
        confirmLabel={pendingAction ? popupLabels[pendingAction] : "Confirm"}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
};

export default ChatCard;
