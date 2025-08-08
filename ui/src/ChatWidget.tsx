import React, { useEffect, useMemo, useRef, useState } from "react";
import "./chat-widget.css";
// If you ever want to use an image again, put it in /public and import it like this:
// import logoUrl from "/revolt-logo.png";

type Msg = { id: string; role: "user" | "assistant"; text: string; rated?: null | boolean };
const uid = () => Math.random().toString(36).slice(2, 9);

const initialBotMsg = "👋 **Welcome!** How can I help you today?";
const quickReplies = [
  { label: "Appointments",      text: "I’d like to book or change an appointment" },
  { label: "General Questions", text: "I have a general question" },
];

export default function ChatWidget() {
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    { id: uid(), role: "assistant", text: initialBotMsg, rated: null },
  ]);

  // Mobile detection that updates on rotate/resize
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 480px)");
    const onChange = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile("matches" in e ? e.matches : (e as MediaQueryList).matches);
    onChange(mql);
    // @ts-ignore
    (mql.addEventListener ?? mql.addListener).call(mql, "change", onChange);
    return () => {
      // @ts-ignore
      (mql.removeEventListener ?? mql.removeListener).call(mql, "change", onChange);
    };
  }, []);

  // auto-scroll
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const lastAssistant = useMemo(
    () => [...messages].reverse().find((m) => m.role === "assistant"),
    [messages]
  );

  async function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;

    setMessages((m) => [...m, { id: uid(), role: "user", text: t }]);
    setInput("");
    setBusy(true);

    try {
      // Build user/assistant pairs for /chat
      const pairs: [string, string][] = [];
      let u: string | null = null;
      for (const m of messages) {
        if (m.role === "user") u = m.text;
        else if (m.role === "assistant" && u !== null) { pairs.push([u, m.text]); u = null; }
      }
      const resp = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_input: t, history: pairs }),
      });
      const data = await resp.json();
      setMessages((m) => [...m, { id: uid(), role: "assistant", text: data.answer, rated: null }]);
    } catch {
      setMessages((m) => [
        ...m,
        { id: uid(), role: "assistant", text: "Sorry—something went wrong. Please try again.", rated: null },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function handleRate(id: string, ok: boolean) {
    setMessages((m) => m.map((x) => (x.id === id ? { ...x, rated: ok } : x)));
  }

  return (
    <>
      {!open && (
        <button className="rw-launcher" aria-label="Open chat" onClick={() => setOpen(true)}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M21 12a9 9 0 1 1-3.3-6.9l2.3-2.3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M8 11h8M8 15h5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      )}

      {open && (
        <section
          className={`rw-widget ${isMobile ? "rw-mobile" : ""}`}
          role="dialog"
          aria-label="UPFH Virtual Front Desk"
        >
          {/* HEADER */}
          <header className="rw-header">
            {/* Block “AI” monogram (no image) */}
            <div className="rw-logo-tile" aria-hidden>AI</div>

            <div className="rw-brand">
              <div className="rw-title">UPFH Virtual Front Desk</div>
              <div className="rw-subtitle">We typically reply in a few minutes.</div>
            </div>
            <button className="rw-close" aria-label="Minimize" onClick={() => setOpen(false)}>✕</button>

            {/* quick-reply buttons */}
            <div className="rw-quick">
              {quickReplies.map((q) => (
                <button key={q.label} className="rw-chip" onClick={() => send(q.text)}>
                  {q.label}
                </button>
              ))}
            </div>
          </header>

          {/* MESSAGES */}
          <div className="rw-scroll" ref={scrollRef}>
            {messages.map((m) => (
              <div key={m.id} className={`rw-row ${m.role === "user" ? "is-user" : "is-bot"}`}>
                <div className={`rw-msg ${m.role === "user" ? "rw-msg-user" : "rw-msg-bot"}`}>
                  {renderMarkdownLite(m.text)}

                  {m.role === "assistant" && m.id === lastAssistant?.id && m.rated === null && (
                    <div className="rw-rate">
                      <span>Was this helpful?</span>
                      <button onClick={() => handleRate(m.id, true)} aria-label="Yes">👍</button>
                      <button onClick={() => handleRate(m.id, false)} aria-label="No">👎</button>
                    </div>
                  )}
                  {m.role === "assistant" && typeof m.rated === "boolean" && (
                    <div className="rw-rate-note">{m.rated ? "Thanks for the feedback!" : "Got it, thanks!"}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* INPUT + BRAND (icons removed) */}
          <footer className="rw-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder={busy ? "Thinking…" : "Enter your message…"}
              disabled={busy}
              aria-label="Type a message"
            />
            <button className="rw-send" onClick={() => send(input)} disabled={busy || !input.trim()}>
              Send
            </button>

            <div className="rw-powered">
              <div className="rw-powered-dot" aria-hidden>R</div>
              <span>Powered by <strong>Revolt AI</strong></span>
            </div>
          </footer>
        </section>
      )}
    </>
  );
}

/** tiny markdown renderer: **bold** + paragraphs */
function renderMarkdownLite(md: string) {
  return (
    <>
      {md.split(/\n{2,}/).map((p, i) => (
        <p key={i} className="rw-p">
          {p.split(/(\*\*.+?\*\*)/g).map((chunk, j) =>
            chunk.startsWith("**") && chunk.endsWith("**")
              ? <strong key={j}>{chunk.slice(2, -2)}</strong>
              : <span key={j}>{chunk}</span>
          )}
        </p>
      ))}
    </>
  );
}
