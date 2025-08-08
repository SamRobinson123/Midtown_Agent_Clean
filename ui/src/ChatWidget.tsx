import React, { useEffect, useMemo, useRef, useState } from "react";
import "./index.css";

type Role = "user" | "ai";

interface Msg {
  role: Role;
  text: string;
}

/* ----------------------- Welcome Bubble ----------------------- */
function WelcomeBubble({ onQuick }: { onQuick: (s: string) => void }) {
  return (
    <div className="row ai">
      <div className="ai-avatar">AI</div>
      <div className="msg welcome-card">
        <div className="welcome-accent" />
        <div className="welcome-head">
          <div className="welcome-icon">👋</div>
          <div>Welcome!</div>
        </div>
        <div className="welcome-copy">
          How can I help you today? Try one of these:
        </div>

        <div className="welcome-chips">
          <button
            className="chip"
            onClick={() =>
              onQuick("I’d like to book or change an appointment")
            }
          >
            Book an appointment
          </button>
          <button
            className="chip"
            onClick={() => onQuick("What are your clinic hours?")}
          >
            Clinic hours
          </button>
          <button
            className="chip"
            onClick={() => onQuick("I need directions to the dental clinic.")}
          >
            Directions
          </button>
          <button
            className="chip"
            onClick={() => onQuick("Can you estimate my costs?")}
          >
            Estimate costs
          </button>
        </div>

        <div className="welcome-meta">Was this helpful? 👍 👎</div>
      </div>
    </div>
  );
}

/* ----------------------- Rich Text (lightweight) ----------------------- */
function RichText({ text }: { text: string }) {
  // super light markdown: **bold**
  const html = useMemo(() => {
    const safe = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }, [text]);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ----------------------- Main Widget ----------------------- */
export default function ChatWidget() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "ai", text: "Welcome! How can I help you today?" }, // placeholder for WelcomeBubble
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  // auto-scroll on new messages
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextMsgs = [...msgs, { role: "user", text: trimmed }];
    setMsgs(nextMsgs);
    setInput("");
    setLoading(true);

    // Build history as pairs like [[user, ai], ...] for your FastAPI backend
    const pairs: any[] = [];
    let pending: string | null = null;
    for (const m of nextMsgs) {
      if (m.role === "user") {
        if (pending !== null) pairs.push([pending, ""]);
        pending = m.text;
      } else {
        if (pending !== null) {
          pairs.push([pending, m.text]);
          pending = null;
        } else {
          pairs.push(["", m.text]);
        }
      }
    }
    if (pending !== null) pairs.push([pending, ""]);

    try {
      const resp = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_input: trimmed, history: pairs }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      const answer: string = data?.answer ?? "Sorry, something went wrong.";
      setMsgs((m) => [...m, { role: "ai", text: answer }]);
    } catch (e: any) {
      setMsgs((m) => [
        ...m,
        { role: "ai", text: "⚠️ Sorry—something went wrong. Please try again." },
      ]);
      // optionally console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  return (
    <div className="widget">
      {/* Header */}
      <div className="header">
        <div className="brand-left">
          <div className="brand-avatar">AI</div>
          <div className="brand-txt">
            <div className="brand-title">UPFH Virtual Front Desk</div>
            <div className="brand-sub">We typically reply in a few minutes.</div>
          </div>
        </div>
        <button
          className="close-x"
          aria-label="Close"
          onClick={() => al
