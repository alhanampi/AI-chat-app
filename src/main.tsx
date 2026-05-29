import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App.tsx";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={{
        variables: {
          fontSize: "16px",
          colorPrimary: "#907ad6",
          borderRadius: "14px",
          spacingUnit: "1.1rem",
        },
        elements: {
          rootBox: { width: "min(680px, 95vw)", maxWidth: "95vw", margin: "0 auto" },
          card: { width: "100%", maxWidth: "none", backgroundColor: "var(--bg-color)", boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(169,148,198,0.2)", border: "none" },
          cardBox: { width: "100%", maxWidth: "none" },
          headerTitle: { color: "var(--text-color)", fontFamily: "'Outfit', sans-serif" },
          headerSubtitle: { color: "var(--text-color-soft)", fontFamily: "'Outfit', sans-serif" },
          socialButtonsBlockButton: { position: "relative", backgroundColor: "transparent", borderColor: "var(--accent)", color: "var(--text-color)", fontFamily: "'Outfit', sans-serif", padding: "0.9rem 1.2rem" },
          socialButtonsBlockButtonText: { color: "var(--text-color)" },
          dividerText: { color: "var(--text-color-soft)" },
          dividerLine: { backgroundColor: "var(--accent)", opacity: 0.35 },
          formFieldLabel: { color: "var(--text-color)", fontFamily: "'Outfit', sans-serif" },
          formFieldInput: { backgroundColor: "var(--switch-inactive)", color: "var(--text-color)", borderColor: "var(--accent)", fontFamily: "'Outfit', sans-serif", padding: "1rem 1.2rem", minHeight: "48px" },
          footerActionText: { color: "var(--text-color-soft)", fontFamily: "'Outfit', sans-serif" },
          footerActionLink: { color: "var(--main)", fontFamily: "'Outfit', sans-serif" },
        },
      }}
    >
      <App />
    </ClerkProvider>
  </StrictMode>,
);
