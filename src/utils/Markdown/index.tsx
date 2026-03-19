import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";

import "./styles.scss";

const useDarkMode = () => {
  const [isDark, setIsDark] = useState(() =>
    document.body.classList.contains("dark"),
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.body.classList.contains("dark"));
    });
    observer.observe(document.body, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
};

const CopyButton = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button className="copyButton" onClick={handleCopy}>
      {copied ? "Copied!" : "Copy"}
    </button>
  );
};

const MarkdownMessage = ({ text }: { text: string }) => {
  const isDark = useDarkMode();

  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");

            return !inline ? (
              <div className="codeBlock">
                <CopyButton code={codeString} />
                <SyntaxHighlighter
                  language={match?.[1] || "javascript"}
                  style={isDark ? oneDark : oneLight}
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className="inlineCode" {...props}>
                {children}
              </code>
            );
          },
          a({ href, children }: any) {
            return (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            );
          },
          h1: ({ children }: any) => <h1 className="mdH1">{children}</h1>,
          h2: ({ children }: any) => <h2 className="mdH2">{children}</h2>,
          h3: ({ children }: any) => <h3 className="mdH3">{children}</h3>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownMessage;
