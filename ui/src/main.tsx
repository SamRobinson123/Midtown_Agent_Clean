import React from "react";
import { createRoot } from "react-dom/client";
import ChatWidget from "./ChatWidget";

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
      <ChatWidget />
    </div>
  </React.StrictMode>
);
