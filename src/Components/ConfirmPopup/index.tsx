import Popup from "reactjs-popup";

import "./styles.scss";

type ConfirmPopupProps = {
  open: boolean;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmPopup = ({
  open,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
}: ConfirmPopupProps) => {
  return (
    <Popup open={open} onClose={onCancel} modal lockScroll>
      <div className="confirmPopup">
        <p className="confirmPopup__message">{message}</p>
        <div className="confirmPopup__actions">
          <button className="confirmPopup__btn confirmPopup__btn--cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="confirmPopup__btn confirmPopup__btn--confirm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </Popup>
  );
};

export default ConfirmPopup;
