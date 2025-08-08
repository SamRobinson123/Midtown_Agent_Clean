import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Phone, Loader2, Sparkles } from "lucide-react";

export type ChatWidgetProps = {
  apiBase?: string;      // default "/chat" (same origin as FastAPI)
  title?: string;
  subtitle?: string;
  brandColor?: string;   // CSS color e.g. "#2563eb"
  logoUrl?: string;
  callHref?: string;     // e.g., "/voice" or "tel:+18014170131"
  welcome?: string;
  position?: "bottom-right" | "bottom-left";
  tenant?: string;       // optional for analytics
};

type Pair = [string | null, string | null]; // [user, assistant]

const toPlain = (md: string) =>
  md.replace(/[*_`>#\\\-•]/g, " ").replace(/\s+/g, " ").trim();

const DEFAULT_WELCOME = "👋 **Welcome!** How can I help you today?";

export default function ChatWidget({
  apiBase = "/chat",
  title = "UPFH Virtual Front Desk",
  subtitle = "Book, pricing, providers",
  brandColor = "#2563eb",
  logoUrl,
  callHref,
  welcome = DEFAULT_WELCOME,
  position = "bottom-right",
  tenant = "default",
}: ChatWidgetProps) {
  // Server history: pairs like [[null, welcome], [user, assistant], ...]
  const [history, setHistory] = useState<Pair[]>([[null, welcome]]);
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([{ role: "assistant", content: welcome }]);

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  const posClass = position === "bottom-left" ? "left-6" : "right-6";
  const headerStyle = useMemo(() => ({ background: brandColor }), [brandColor]);
  const pillStyle = useMemo(() => ({ background: `${brandColor}1A`, color: brandColor }), [brandColor]);
  const launcherStyle = useMemo(() => ({ background: brandColor }), [brandColor]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;

    setError(null);
    setBusy(true);
    setInput("");

    // optimistic bubble
    setMessages((m) => [...m, { role: "user", content: text }]);

    try {
      const resp = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_input: text, history }),
      });
      if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
      const data = (await resp.json()) as { answer: string };

      setMessages((m) => [...m, { role: "assistant", content: data.answer || "" }]);
      setHistory((h) => [...h, [text, data.answer || ""]]);
    } catch (e: any) {
      setError(e.message || "Request failed");
      setMessages((m) => [...m, { role: "assistant", content: "Sorry—something went wrong. Please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  function quick(text: string) {
    setInput(text);
    setTimeout(send, 0);
  }

  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="revolt-chat-widget">
      {/* Floating launcher */}
      <button
        aria-label="Open chat"
        onClick={() => setOpen((v) => !v)}
        className={`fixed ${posClass} bottom-6 w-14 h-14 rounded-full shadow-xl text-white flex items-center justify-center focus:outline-none focus:ring-4 transition-transform`}
        style={launcherStyle}
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
            className={`fixed ${posClass} bottom-24 w-[380px] max-w-[92vw] max-h-[75vh] bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden`}
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-3 text-white" style={headerStyle}>
              {logoUrl ? (
                <img src={logoUrl} alt="logo" className="w-6 h-6 rounded-sm bg-white/90 p-1" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              <div className="flex-1">
                <div className="text-sm font-semibold leading-tight">{title}</div>
                <div className="text-xs leading-5 opacity-90">{subtitle}</div>
              </div>
              <button
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick actions */}
            <div className="flex gap-2 px-3 pt-3 pb-2 flex-wrap">
              <button className="px-3 py-1.5 text-xs font-medium rounded-full"
                style={pillStyle} onClick={() => quick("I’d like to book or change an appointment")}>
                Appointments
              </button>
              <button className="px-3 py-1.5 text-xs font-medium rounded-full"
                style={pillStyle} onClick={() => quick("Can you estimate my costs?")}>
                Estimated Costs
              </button>
              <button className="px-3 py-1.5 text-xs font-medium rounded-full"
                style={pillStyle} onClick={() => quick("I have a general question")}>
                General Questions
              </button>
              {callHref && (
                <a href={callHref}
                   className="px-3 py-1.5 text-xs font-medium rounded-full inline-flex items-center gap-1"
                   style={pillStyle}>
                  <Phone className="w-3.5 h-3.5" /> Call
                </a>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 pb-2" aria-live="polite" aria-relevant="additions">
              {messages.map((m, i) => (
                <div key={i} className={`my-1.5 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`${m.role === "user" ? "bg-indigo-50" : "bg-white"} max-w-[80%] border border-gray-200 rounded-2xl px-3 py-2 text-[14px] leading-relaxed shadow-sm`}
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  </div>
                </div>
              ))}
              {busy && (
                <div className="my-1.5 flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl px-3 py-2 text-[14px] shadow-sm inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Thinking…
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Error */}
            {error && <div className="px-3 pb-2 text-xs text-red-600">{error}</div>}

            {/* Input */}
            <form
              className="p-2 border-t border-gray-200 flex items-center gap-2 bg-white"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <input
                name="message"
                autoComplete="off"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 h-10 px-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                aria-label="Your message"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="h-10 px-3 rounded-xl text-white flex items-center gap-1 disabled:opacity-50"
                style={{ background: brandColor }}
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </form>

            {/* Footer */}
            <div className="px-3 py-2 text-[11px] text-gray-400 border-t border-gray-100">
              Powered by Revolt AI
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Accessibility live region (hidden) */}
      <div className="sr-only" aria-live="polite">
        {toPlain(messages[messages.length - 1]?.content || "")}
      </div>
    </div>
  );
}
