import React, { useMemo, useRef, useState } from "react";

type Msg = { role: "ai" | "user"; text: string };

const WELCOME =
  "👋 **Welcome!** How can I help you today?";

const apiBase = (import.meta as any).env.VITE_API_BASE || ""; // same origin

const asset = (name: string) =>
  `${import.meta.env.BASE_URL}${name}`; // works with base="/ui/"

export default function ChatWidget() {
  const [open, setOpen] = useState(true);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "ai", text: WELCOME }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const logoSrc = asset("revolt-logo.png");

  // Convert flat array of messages → pairs for the backend /chat
  const historyPairs = useMemo(() => {
    const pairs: (string | null)[][] = [];
    let curUser: string | null = null;
    msgs.forEach((m) => {
      if (m.role === "user") {
        if (curUser !== null) pairs.push([curUser, ""]); // stray safety
        curUser = m.text;
      } else {
        // ai
        if (curUser === null) pairs.push([null, m.text]);
        else {
          pairs.push([curUser, m.text]);
          curUser = null;
        }
      }
    });
    // If last is dangling user (no AI yet), push it paired with empty answer
    if (curUser !== null) pairs.push([curUser, ""]);
    return pairs;
  }, [msgs]);

  const scrollToEnd = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
    });
  };

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;

    setMsgs((m) => [...m, { role: "user", text: content }]);
    setInput("");
    setSending(true);
    scrollToEnd();

    try {
      const res = await fetch(`${apiBase}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_input: content,
          history: historyPairs,
        }),
      });
      const data = await res.json();
      const answer = (data?.answer ?? "").toString();
      setMsgs((m) => [...m, { role: "ai", text: answer }]);
    } catch (e) {
      setMsgs((m) => [
        ...m,
        {
          role: "ai",
          text:
            "Sorry—I'm having trouble reaching the server. Please try again in a moment.",
        },
      ]);
    } finally {
      setSending(false);
      scrollToEnd();
    }
  };

  const quick = (prompt: string) => () => send(prompt);

  if (!open) {
    // could show a floating launcher; for now, a small pill:
    return (
      <div className="fixed-panel">
        <button className="pill" onClick={() => setOpen(true)}>
          💬 Chat
        </button>
      </div>
    );
  }

  return (
    <div className="fixed-panel">
      <div className="chat-card" role="dialog" aria-label="Chat widget">
        {/* Header */}
        <div className="header">
          <div className="avatar-badge">AI</div>
          <div>
            <div className="title">UPFH Virtual Front Desk</div>
            <div className="subtitle">We typically reply in a few minutes.</div>
          </div>
          <div className="header-x" onClick={() => setOpen(false)} aria-label="Close">
            ×
          </div>
        </div>

        {/* Quick actions */}
        <div className="pills">
          <button className="pill" onClick={quick("I’d like to book or change an appointment")}>
            Appointments
          </button>
          <button className="pill" onClick={quick("I have a general question")}>
            General Questions
          </button>
        </div>

        {/* Messages */}
        <div className="messages" ref={listRef}>
          {msgs.map((m, i) => (
            <div className={`row ${m.role}`} key={i}>
              {m.role === "ai" && <div className="ai-avatar">AI</div>}
              <div className="msg">
                {/* allow lightweight markdown (**bold**) for welcome, very simple */}
                <RichText text={m.text} />
                {i === 0 && m.role === "ai" && (
                  <div className="meta">
                    <span>Was this helpful?</span> <span>👍</span> <span>👎</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="footer">
          <input
            className="input"
            placeholder="Enter your message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => (e.key === "Enter" ? send() : null)}
            disabled={sending}
            aria-label="Message input"
          />
          <button className="send" onClick={() => send()} disabled={sending}>
            {sending ? "…" : "Send"}
          </button>
          <div className="brand" aria-hidden>
            <img src={logoSrc} alt="Revolt AI" />
            <span>Powered by <strong>Revolt AI</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Very tiny “markdown” renderer: supports **bold** and line breaks only */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <div>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : (
          <span key={i}>
            {p.split("\n").map((line, j) => (
              <React.Fragment key={j}>
                {line}
                {j < p.split("\n").length - 1 && <br />}
              </React.Fragment>
            ))}
          </span>
        )
      )}
    </div>
  );
}
