import { useState } from "react";

import { stripMarkdown } from "../../utils/constants";

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

export default SpeakButton;
