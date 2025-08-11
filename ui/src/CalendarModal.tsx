import React, { useEffect, useMemo, useState } from "react";

export type Slot = { start: string; end: string; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  /** Return slots for YYYY-MM-DD. */
  loadAvailability: (date: string) => Promise<Slot[]>;
  /** Called after a successful booking (so chat can acknowledge). */
  onBooked: (booking: {
    start: string;
    end: string;
    patient_name: string;
    email: string;
    phone: string;
    reason?: string;
    event_id?: string;
    status?: string;
  }) => void;
  timezone?: string;
};

function fmtMonthYear(d: Date) {
  return d.toLocaleString([], { month: "long", year: "numeric" });
}
function ymd(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function CalendarModal({
  open,
  onClose,
  onBooked,
  loadAvailability,
  timezone = "America/Denver",
}: Props) {
  const [view, setView] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [chosen, setChosen] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(false);

  // step = "select" | "details"
  const [step, setStep] = useState<"select" | "details">("select");

  // Contact form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedDate(null);
      setSlots([]);
      setChosen(null);
      setView(() => {
        const now = new Date();
        now.setDate(1);
        return now;
      });
      setStep("select");
      setName(""); setEmail(""); setPhone(""); setReason(""); setErr(null);
    }
  }, [open]);

  const days = useMemo(() => {
    const first = new Date(view);
    const firstDow = first.getDay();
    const last = new Date(view.getFullYear(), view.getMonth() + 1, 0);
    const dim = last.getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= dim; d++) cells.push(new Date(view.getFullYear(), view.getMonth(), d));
    return cells;
  }, [view]);

  const onPickDate = async (d: Date | null) => {
    if (!d) return;
    const today = new Date(); today.setHours(0,0,0,0);
    if (d < today) return;
    const key = ymd(d);
    setSelectedDate(key);
    setChosen(null);
    setLoading(true);
    try {
      const res = await loadAvailability(key);
      setSlots(res);
    } finally {
      setLoading(false);
    }
  };

  const prettyDate = selectedDate
    ? new Date(selectedDate + "T00:00:00").toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })
    : "Select a date";

  function emailOk(e: string) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.trim());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!chosen) return;
    const nm = name.trim();
    const em = email.trim();
    if (!nm) { setErr("Please enter your name."); return; }
    if (!emailOk(em)) { setErr("Please enter a valid email address."); return; }
    setSubmitting(true);
    setErr(null);
    try {
      const resp = await fetch("/api/calendar/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_name: nm,
          email: em,
          phone: phone.trim(),
          reason: reason.trim(),
          start: chosen.start,
          end: chosen.end
        }),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || "Booking failed.");
      }
      const data = await resp.json();
      // Backend (create_calendar_event) also sends confirmation emails immediately. :contentReference[oaicite:3]{index=3}
      onBooked({
        start: chosen.start,
        end: chosen.end,
        patient_name: nm,
        email: em,
        phone: phone.trim(),
        reason: reason.trim(),
        event_id: data?.event_id,
        status: data?.status
      });
    } catch (ex: any) {
      setErr(ex?.message || "Something went wrong booking your appointment.");
      setSubmitting(false);
      return;
    }
  }

  if (!open) return null;

  return (
    <div className="cal-overlay" role="dialog" aria-modal="true" aria-label="Book an appointment">
      <div className="cal-modal">
        <div className="cal-headbar">
          <div className="cal-title">Book an appointment</div>
          <button className="cal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* Calendar / Select step */}
        {step === "select" && (
          <>
            <div className="cal-col">
              <div className="cal-top">
                <div className="cal-month">{fmtMonthYear(view)}</div>
                <div className="cal-nav">
                  <button className="icon-btn" aria-label="Previous month"
                          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}>‹</button>
                  <button className="icon-btn" aria-label="Next month"
                          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}>›</button>
                </div>
              </div>

              <div className="cal-dow">
                <div>Sun</div><div>Mon</div><div>Tue</div>
                <div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
              </div>

              <div className="cal-grid">
                {days.map((d, i) => {
                  if (!d) return <div key={i} />;
                  const key = ymd(d);
                  const today = new Date(); today.setHours(0,0,0,0);
                  const past = d < today;
                  const sel = selectedDate === key;
                  return (
                    <button
                      key={key}
                      disabled={past}
                      onClick={() => onPickDate(d)}
                      className={`cal-cell ${past ? "is-disabled" : ""} ${sel ? "is-selected" : ""}`}
                    >
                      <div className="num">{d.getDate()}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="slot-col">
              <div className="slot-top">
                <div className="slot-title">{prettyDate}</div>
                <div className="slot-tz">{timezone}</div>
              </div>

              <div className="slot-list">
                {loading && <div className="slot-loading">Loading slots…</div>}
                {!loading && selectedDate && slots.length === 0 && (
                  <div className="slot-empty">No availability for this day.</div>
                )}
                {!loading && slots.map((s) => (
                  <button
                    key={s.start}
                    className={`slot-btn ${chosen?.start === s.start ? "is-active" : ""}`}
                    onClick={() => setChosen(s)}
                    aria-pressed={chosen?.start === s.start}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="slot-sticky">
                <div className="slot-picked">
                  {chosen ? `Selected: ${new Date(chosen.start).toLocaleDateString()} • ${chosen.label}` : ""}
                </div>
                <div className="slot-actions">
                  <button className="ghost" onClick={() => setChosen(null)} disabled={!chosen}>Clear</button>
                  <button className="primary" onClick={() => setStep("details")} disabled={!chosen}>
                    Continue
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Details step */}
        {step === "details" && (
          <>
            <div className="cal-col">
              <div className="cal-top">
                <div className="cal-month">Your appointment</div>
              </div>
              <div className="appt-summary">
                <div className="appt-row">
                  <div className="appt-k">Date</div>
                  <div className="appt-v">
                    {chosen ? new Date(chosen.start).toLocaleDateString([], { weekday:"long", month:"long", day:"numeric" }) : "—"}
                  </div>
                </div>
                <div className="appt-row">
                  <div className="appt-k">Time</div>
                  <div className="appt-v">{chosen?.label ?? "—"} <span className="tz-small">({timezone})</span></div>
                </div>
              </div>
              <div style={{ marginTop: "auto" }} />
              <div className="slot-sticky">
                <button className="ghost" onClick={() => setStep("select")}>← Back</button>
              </div>
            </div>

            <div className="slot-col">
              <div className="slot-top">
                <div className="slot-title">Contact details</div>
              </div>

              <form className="form" onSubmit={handleSubmit}>
                <div className="field">
                  <label className="label" htmlFor="name">Full name</label>
                  <input id="name" className="control" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" />
                </div>

                <div className="field">
                  <label className="label" htmlFor="email">Email</label>
                  <input id="email" className="control" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" />
                </div>

                <div className="field">
                  <label className="label" htmlFor="phone">Phone (optional)</label>
                  <input id="phone" className="control" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123‑4567" />
                </div>

                <div className="field">
                  <label className="label" htmlFor="reason">Reason (optional)</label>
                  <input id="reason" className="control" value={reason} onChange={e => setReason(e.target.value)} placeholder="Annual check‑up" />
                </div>

                {err && <div className="error">{err}</div>}

                <div className="slot-sticky">
                  <div />
                  <div className="slot-actions">
                    <button type="button" className="ghost" onClick={() => setStep("select")} disabled={submitting}>Back</button>
                    <button type="submit" className="primary" disabled={submitting}>
                      {submitting ? "Booking…" : "Confirm & Book"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
