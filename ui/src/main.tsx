import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import ChatWidget from "./ChatWidget";

// Same-origin FastAPI: /chat and /voice already exist in your backend
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ChatWidget
      apiBase="/chat"
      title="UPFH Virtual Front Desk"
      subtitle="Book, pricing, providers"
      brandColor="#2563eb"
      logoUrl="/ui/logo.svg"   /* optional: place a logo in ui/public or copy into ui/dist */
      callHref="/voice"
    />
  </React.StrictMode>
);
