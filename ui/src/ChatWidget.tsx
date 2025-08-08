import React, { useEffect, useMemo, useRef, useState } from "react";
import logoUrl from "/revolt-logo.png"; // put the PNG in ui/public/

type Msg = { id: string; role: "user" | "assistant"; text: string; rated?: null | boolean };

const initialBotMsg = "👋 **Welcome!** How can I help you today?";

const quickReplies = [
  { label: "Appointments",       text: "I’d like to book or change an appointment" },
  { label: "General Questions",  text: "I have a general question" },
];

const gradientHeader = "bg-gradient-to-r from-indigo-600 to-sky-500";

const uid = () => Math.random().toString(36).slice(2, 10);

export default function ChatWidget() {
  const [open, setOpen]   = useState(true);
  const [input, setInput] = useState("");
  const [busy, setBusy]   = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { id: uid(), role: "assistant", text: initialBotMsg, rated: null },
  ]);
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

    const user: Msg = { id: uid(), role: "user", text: t };
    setMessages((m) => [...m, user]);
    setInput("");
    setBusy(true);

    try {
      // Build history pairs for /chat
      const pairs: [string, string][] = [];
      let u: string | null = null;
      for (const m of messages) {
        if (m.role === "user") u = m.text;
        else if (m.role === "assistant" && u !== null) {
          pairs.push([u, m.text]);
          u = null;
        }
      }
      const resp = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_input: t, history: pairs }),
      });
      const data = await resp.json();
      const bot: Msg = { id: uid(), role: "assistant", text: data.answer, rated: null };
      setMessages((m) => [...m, bot]);
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
    // optional: POST the rating to your backend
  }

  // Launcher (when minimized)
  const Launcher = (
    <button
      aria-label="Open chat"
      onClick={() => setOpen(true)}
      className="fixed bottom-5 right-5 h-14 w-14 rounded-full shadow-xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white grid place-items-center hover:opacity-95 focus:outline-none"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M21 12a9 9 0 1 1-3.3-6.9l2.3-2.3" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8 11h8M8 15h5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );

  return (
    <>
      {!open && Launcher}

      {open && (
        <div className="fixed bottom-5 right-5 w-[360px] sm:w-[390px] max-h-[78vh] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
          {/* HEADER — gradient + logo + quick chips */}
          <div className={`relative ${gradientHeader} p-4 pb-14 text-white`}>
            <div className="flex items-center gap-3">
              {/* avatar with your logo */}
              <img
                src={logoUrl}
                alt="Revolt AI"
                className="h-11 w-11 rounded-full object-cover ring-1 ring-white/30"
              />
              <div className="min-w-0">
                <div className="font-semibold leading-5">UPFH Virtual Front Desk</div>
                <div className="text-white/90 text-[13px]">We typically reply in a few minutes.</div>
              </div>
              <button
                className="ml-auto rounded-full p-2 hover:bg-white/10"
                onClick={() => setOpen(false)}
                aria-label="Minimize"
                title="Minimize"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M7 15l10-10M7 5h10v10" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* quick-reply BUTTONS (only two, no Estimated Costs) */}
            <div className="absolute left-0 right-0 -bottom-4 px-4">
              <div className="flex gap-2 flex-wrap">
                {quickReplies.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => send(q.text)}
                    className="px-3 py-1.5 rounded-full bg-white text-gray-800 text-sm shadow-sm hover:bg-gray-50"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* MESSAGES */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 pt-6 space-y-3 bg-white">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed shadow-sm ${
                    m.role === "user"
                      ? "bg-indigo-50 text-gray-900 border border-indigo-100"
                      : "bg-white text-gray-900 border border-gray-200"
                  }`}
                >
                  {renderMarkdownLite(m.text)}

                  {/* rating only on the last assistant message */}
                  {m.role === "assistant" && m.id === lastAssistant?.id && m.rated === null && (
                    <div className="mt-2.5 flex items-center gap-2 text-gray-500 text-sm">
                      <span>Was this helpful?</span>
                      <button
                        className="rounded-full p-1.5 hover:bg-gray-100"
                        aria-label="Yes"
                        onClick={() => handleRate(m.id, true)}
                      >
                        👍
                      </button>
                      <button
                        className="rounded-full p-1.5 hover:bg-gray-100"
                        aria-label="No"
                        onClick={() => handleRate(m.id, false)}
                      >
                        👎
                      </button>
                    </div>
                  )}
                  {m.role === "assistant" && typeof m.rated === "boolean" && (
                    <div className="mt-2 text-xs text-gray-500">
                      {m.rated ? "Thanks for the feedback!" : "Got it, thanks!"}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* INPUT + “Powered by Revolt AI” */}
          <div className="relative p-3 border-t border-gray-200 bg-white">
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-full hover:bg-gray-100" title="Attach">📎</button>
              <button className="p-2 rounded-full hover:bg-gray-100" title="Emoji">😊</button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(input)}
                placeholder={busy ? "Thinking…" : "Enter your message…"}
                className="flex-1 rounded-xl border border-gray-300 px-3.5 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-indigo-200"
                disabled={busy}
              />
              <button
                onClick={() => send(input)}
                disabled={busy || !input.trim()}
                className="rounded-xl bg-indigo-600 text-white px-3 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-40"
              >
                Send
              </button>
            </div>

            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
              <img src={logoUrl} className="h-4 w-4 object-contain opacity-80" alt="Revolt AI" />
              <span>Powered by <span className="font-medium">Revolt AI</span></span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Tiny markdown: supports **bold** + paragraphs */
function renderMarkdownLite(md: string) {
  const blocks = md.split(/\n{2,}/).map((p, i) => (
    <p key={i} className="mb-2 last:mb-0">
      {p.split(/(\*\*.+?\*\*)/g).map((chunk, j) =>
        chunk.startsWith("**") && chunk.endsWith("**")
          ? <strong key={j}>{chunk.slice(2, -2)}</strong>
          : <span key={j}>{chunk}</span>
      )}
    </p>
  ));
  return <>{blocks}</>;
}
