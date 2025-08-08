import React from "react";
import { createRoot } from "react-dom/client";
import ChatWidget from "./ChatWidget";

const container = document.getElementById("root")!;
createRoot(container).render(<ChatWidget />);
