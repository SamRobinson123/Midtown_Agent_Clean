import React, { useEffect, useMemo, useRef, useState } from "react";
import "./index.css";
import CalendarModal, { Slot } from "./CalendarModal";

type Role = "user" | "ai";
interface Msg { role: Role; text: string }

function WelcomeBubble({ onQuick, onOpenCalendar }: { onQuick: (s: string) => void; onOpenCalendar: () => void }) {
  return (
    <div className="row ai">
      <div className="ai-avatar">AI</div>
      <div className="msg welcome-card">
        <div className="welcome-accent" />
        <div className="welcome-head">
          <div className="welcome-icon">👋</div>
          <div>Welcome!</div>
        </div>
        <div className="welcome-copy">How can I help you today? Try one of these:</div>

        <div className="welcome-chips">
          <button className="chip" onClick={onOpenCalendar}>Book an appointment</button>
          <button className="chip" onClick={() => onQuick("What are your clinic hours?")}>Clinic hours</button>
          <button className="chip" onClick={() => onQuick("I need directions to the dental clinic.")}>Directions</button>
          <button className="chip" onClick={() => onQuick("Can you estimate my costs?")}>Estimate costs</button>
        </div>
      </div>
    </div>
  );
}

function RichText({ text }: { text: string }) {
  const html = useMemo(() => {
    const safe = text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    return safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }, [text]);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function ChatWidget() {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "ai", text: "Welcome! How can I help you today?" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const logoSrc = `${import.meta.env.BASE_URL}revolt-logo.png`;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const nextMsgs = [...msgs, { role: "user", text: trimmed }];
    setMsgs(nextMsgs);
    setInput("");
    setLoading(true);

    const pairs: any[] = [];
    let pending: string | null = null;
    for (const m of nextMsgs) {
      if (m.role === "user") { if (pending !== null) pairs.push([pending, ""]); pending = m.text; }
      else { if (pending !== null) { pairs.push([pending, m.text]); pending = null; } else { pairs.push(["", m.text]); } }
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
    } catch {
      setMsgs((m) => [...m, { role: "ai", text: "⚠️ Sorry—something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  // Availability fetch used by the modal (same shape your server returns)
  async function loadAvailability(date: string): Promise<Slot[]> {
    const res = await fetch(`/api/calendar/availability?date=${date}`);
    if (!res.ok) return [];
    const json = await res.json() as { free_slots?: Record<string, string[]> };
    const isoList = json?.free_slots?.[date] ?? [];
    return isoList.map((startISO) => {
      const start = new Date(startISO);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
        label: start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      };
    });
  }

  // After booking is created (emails sent server-side), post a friendly message.
  function handleBooked(b: { start: string; end: string; patient_name: string }) {
    setCalOpen(false);
    const when = `${new Date(b.start).toLocaleDateString()} at ${new Date(b.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    setMsgs((m) => [
      ...m,
      { role: "ai", text: `**Thanks, ${b.patient_name}!** You’re booked for **${when}**. A confirmation email is on its way. Anything else I can help with?` }
    ]);
  }

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); void send(input); };

  return (
    <div className="widget-container">
      {!open && (
        <button className="launcher" onClick={() => setOpen(true)} aria-label="Open chat">
          <span className="launcher-ai">AI</span>
        </button>
      )}

      {open && (
        <div className="widget-panel">
          <div className="header">
            <div className="brand-left">
              <div className="brand-avatar">AI</div>
              <div className="brand-txt">
                <div className="brand-title">UPFH Virtual Front Desk</div>
                <div className="brand-sub">We typically reply in a few minutes.</div>
              </div>
            </div>
            <button className="close-x" aria-label="Close" onClick={() => setOpen(false)}>×</button>
          </div>

          <div className="pills">
            <button className="pill" onClick={() => setCalOpen(true)}>Appointments</button>
            <button className="pill" onClick={() => send("I have a general question")}>General Questions</button>
          </div>

          <div className="messages" ref={listRef}>
            {msgs.map((m, i) => {
              if (i === 0 && m.role === "ai")
                return <WelcomeBubble key="welcome" onQuick={send} onOpenCalendar={() => setCalOpen(true)} />;
              return (
                <div className={`row ${m.role}`} key={i}>
                  {m.role === "ai" && <div className="ai-avatar">AI</div>}
                  <div className="msg"><RichText text={m.text} /></div>
                </div>
              );
            })}
          </div>

          <form className="composer" onSubmit={onSubmit}>
            <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Enter your message…" disabled={loading} />
            <button className="send-btn" disabled={loading}>{loading ? "…" : "Send"}</button>
          </form>

          <div className="powered">
            <span>Powered by</span>
            <img
              src={logoSrc}
              alt="Revolt AI"
              className="powered-logo"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
            <a href="https://revolt.ai" target="_blank" rel="noreferrer" className="powered-link">Revolt AI</a>
          </div>

          {calOpen && (
            <CalendarModal
              open={calOpen}
              onClose={() => setCalOpen(false)}
              loadAvailability={loadAvailability}
              onBooked={handleBooked}
              timezone="America/Denver"
            />
          )}
        </div>
      )}
    </div>
  );
}
