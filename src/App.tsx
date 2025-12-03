import { useEffect, useState } from "react";
import Chat from "./Components/Chat";
import "./index.scss";

const App = () => {
  const [isDarkMode, setisDarkMode] = useState(true);

  useEffect(() => {
    document.body.classList.toggle("light", !isDarkMode);
    document.body.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  return (
    <div className="appContainer">
      <div className="headerContainer">
        <h1>
          AI CHATBOT BY PAM! <i className="fa-solid fa-heart"></i>
        </h1>
        <label className="colorMode">
          <span className="colorText">Dark Mode</span>
          <span className="switch">
            <input
              type="checkbox"
              checked={isDarkMode}
              onChange={() => setisDarkMode((prev) => !prev)}
            />
            <span className="slider round"></span>
          </span>
        </label>
      </div>
      <Chat />
    </div>
  );
};

export default App;
