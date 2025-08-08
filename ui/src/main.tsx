import React from "react";
import { createRoot } from "react-dom/client";
import ChatWidget from "./ChatWidget";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
      <ChatWidget />
    </div>
  </React.StrictMode>
);
