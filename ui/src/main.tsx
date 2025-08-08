import React from "react";
import { createRoot } from "react-dom/client";
import ChatWidget from "./ChatWidget";

const el = document.getElementById("root")!;
createRoot(el).render(<ChatWidget />);
