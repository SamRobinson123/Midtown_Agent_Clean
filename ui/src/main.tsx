import React from "react";
import { createRoot } from "react-dom/client";
import ChatWidget from "./ChatWidget";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ChatWidget />
  </React.StrictMode>
);
