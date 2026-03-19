import { useEffect, useState } from "react";
import Chat from "./Components/Chat";
import "./index.scss";

const App = () => {
  const [isDarkMode, setisDarkMode] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

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
        <div className="headerRight">
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
          <i
            className="fa fa-bars mobileMenuBtn"
            onClick={() => setMobileOpen((prev) => !prev)}
          ></i>
        </div>
      </div>
      <Chat mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
    </div>
  );
};

export default App;
