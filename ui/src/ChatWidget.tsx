import React, { useEffect, useMemo, useRef, useState } from "react";

type Msg = { id: string; role: "user" | "assistant"; text: string; rated?: null | boolean };

const BRAND = {
  headerFrom: "from-indigo-600",
  headerTo: "to-sky-500",
  primary: "indigo-600",
};

const initialBotMsg =
  "👋 **Welcome!** How can I help you today?";

const quickReplies = [
  "I’d like to book or change an appointment",
  "Can you estimate my costs?",
  "I have a general question",
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function ChatWidget() {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { id: uid(), role: "assistant", text: initialBotMsg },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const lastAssistant = useMemo(
    () => [...messages].reverse().find((m) => m.role === "assistant"),
    [messages]
  );

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const user: Msg = { id: uid(), role: "user", text: text.trim() };
    setMessages((m) => [...m, user]);
    setInput("");
    setBusy(true);

    try {
      // Build history pairs for your FastAPI /chat endpoint
      // It wants: [{"user_input": "...", "history": [[u1,a1],[u2,a2], ...]}]
      const pairs: [string, string][] = [];
      let u: string | null = null;
      for (const m of messages) {
        if (m.role === "user") u = m.text;
        else if (m.role === "assistant" && u !== null) {
          pairs.push([u, m.text]);
          u = null;
        }
      }
      // (The “text” we’re sending now is the new user turn)
      const resp = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_input: text.trim(), history: pairs }),
      });
      const data = await resp.json();
      const bot: Msg = { id: uid(), role: "assistant", text: data.answer, rated: null };
      setMessages((m) => [...m, bot]);
    } catch (e) {
      const bot: Msg = {
        id: uid(),
        role: "assistant",
        text: "Sorry—something went wrong. Please try again in a moment.",
      };
      setMessages((m) => [...m, bot]);
    } finally {
      setBusy(false);
    }
  }

  function handleRate(id: string, ok: boolean) {
    setMessages((m) => m.map((x) => (x.id === id ? { ...x, rated: ok } : x)));
    // TODO: optionally POST rating to your backend
  }

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
          {/* Header */}
          <div className={`relative bg-gradient-to-r ${BRAND.headerFrom} ${BRAND.headerTo} p-4 pb-14 text-white`}>
            <div className="flex items-center gap-3">
              {/* Avatar w/ AI letters */}
              <div className="h-11 w-11 rounded-full bg-white/15 border border-white/20 grid place-items-center font-semibold">
                <span className="tracking-wide">AI</span>
              </div>
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

            {/* Quick replies */}
            <div className="absolute left-0 right-0 -bottom-4 px-4">
              <div className="flex gap-2 flex-wrap">
                {quickReplies.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="px-3 py-1.5 rounded-full bg-white text-gray-800 text-sm shadow-sm hover:bg-gray-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Messages */}
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
                  {/* rating row for the last assistant message */}
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
                    <div className="mt-2 text-xs text-gray-500">{m.rated ? "Thanks for the feedback!" : "Got it, thanks!"}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="relative p-3 border-t border-gray-200 bg-white">
            <div className="flex items-center gap-2">
              {/* fake icons (non-functional placeholders) */}
              <button className="p-2 rounded-full hover:bg-gray-100" title="Attach">
                📎
              </button>
              <button className="p-2 rounded-full hover:bg-gray-100" title="Emoji">
                😊
              </button>
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

            {/* Powered by */}
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
              <img src="/revolt-logo.png" className="h-4 w-4 object-contain opacity-80" alt="Revolt AI" />
              <span>Powered by <span className="font-medium">Revolt AI</span></span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Tiny markdown renderer: **bold** and basic line breaks only */
function renderMarkdownLite(md: string) {
  const withBreaks = md.split(/\n{2,}/).map((p, i) => (
    <p key={i} className="mb-2 last:mb-0">
      {p.split(/(\*\*.+?\*\*)/g).map((chunk, j) =>
        chunk.startsWith("**") && chunk.endsWith("**") ? (
          <strong key={j}>{chunk.slice(2, -2)}</strong>
        ) : (
          <span key={j}>{chunk}</span>
        )
      )}
    </p>
  ));
  return <>{withBreaks}</>;
}
