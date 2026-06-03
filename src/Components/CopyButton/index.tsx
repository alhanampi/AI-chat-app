import { useState } from "react";

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

export default CopyButton;
