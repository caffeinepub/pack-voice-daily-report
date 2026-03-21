import { ChevronDown, ChevronUp, Mic, MicOff, Settings } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
interface Entry {
  id: string;
  name: string;
  memberId: string;
  type: "cash" | "upi" | "both";
  cash: number;
  upi: number;
  note: string;
  time: string;
}

type StatusState = "ready" | "listening" | "processing" | "saved" | "error";

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────
const COLOR_CASH = "#00ff88";
const COLOR_UPI = "#a78bfa";
const COLOR_BOTH = "#fbbf24";

function getTypeColor(type: "cash" | "upi" | "both"): string {
  if (type === "cash") return COLOR_CASH;
  if (type === "upi") return COLOR_UPI;
  return COLOR_BOTH;
}

function getTodayKey(): string {
  return `akpack_entries_${new Date().toISOString().split("T")[0]}`;
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(): string {
  return new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// ──────────────────────────────────────────────
// Voice Parsing
// ──────────────────────────────────────────────
function parseTranscript(
  transcript: string,
): Omit<Entry, "id" | "time"> | null {
  const tokens = transcript.trim().split(/\s+/);
  if (tokens.length < 1 || !tokens[0]) return null;

  const name =
    tokens[0].charAt(0).toUpperCase() + tokens[0].slice(1).toLowerCase();
  let memberId = "";
  let idx = 1;

  if (idx < tokens.length && /^\d+$/.test(tokens[idx])) {
    memberId = tokens[idx];
    idx++;
  }

  let cashAmount = 0;
  let upiAmount = 0;
  const noteWords: string[] = [];
  let currentContext: "cash" | "upi" | "none" = "none";

  const keywords = new Set(["cash", "upi", "both"]);

  while (idx < tokens.length) {
    const token = tokens[idx].toLowerCase();
    if (token === "cash") {
      currentContext = "cash";
    } else if (token === "upi") {
      currentContext = "upi";
    } else if (token === "both") {
      // hint, handled below
    } else if (/^\d+$/.test(token)) {
      const num = Number.parseInt(token, 10);
      if (currentContext === "cash") {
        cashAmount = num;
        currentContext = "none";
      } else if (currentContext === "upi") {
        upiAmount = num;
        currentContext = "none";
      } else {
        noteWords.push(tokens[idx]);
      }
    } else if (!keywords.has(token)) {
      noteWords.push(tokens[idx]);
    }
    idx++;
  }

  let type: "cash" | "upi" | "both";
  if (cashAmount > 0 && upiAmount > 0) {
    type = "both";
  } else if (cashAmount > 0) {
    type = "cash";
  } else if (upiAmount > 0) {
    type = "upi";
  } else {
    type = "cash";
  }

  return {
    name,
    memberId,
    type,
    cash: cashAmount,
    upi: upiAmount,
    note: noteWords.join(" "),
  };
}

// ──────────────────────────────────────────────
// Input styling helpers
// ──────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  backgroundColor: "#141414",
  border: "1px solid #222",
  borderRadius: "6px",
  color: "#f5f5f5",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "14px",
  padding: "10px 12px",
  width: "100%",
  outline: "none",
  boxSizing: "border-box" as const,
};

const labelStyle: React.CSSProperties = {
  fontSize: "10px",
  color: "#555",
  display: "block",
  marginBottom: "4px",
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
};

// ──────────────────────────────────────────────
// Main App
// ──────────────────────────────────────────────
export default function App() {
  // Entries
  const [entries, setEntries] = useState<Entry[]>(() => {
    try {
      const stored = localStorage.getItem(getTodayKey());
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Voice
  const [status, setStatus] = useState<StatusState>("ready");
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  // Manual form
  const [manualName, setManualName] = useState("");
  const [manualMemberId, setManualMemberId] = useState("");
  const [manualType, setManualType] = useState<"cash" | "upi" | "both">("cash");
  const [manualCash, setManualCash] = useState("");
  const [manualUpi, setManualUpi] = useState("");
  const [manualNote, setManualNote] = useState("");

  // Settings
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [webhookInput, setWebhookInput] = useState(
    () => localStorage.getItem("akpack_webhook_url") || "",
  );

  // Check voice support
  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) setVoiceSupported(false);
  }, []);

  // Persist entries
  useEffect(() => {
    localStorage.setItem(getTodayKey(), JSON.stringify(entries));
  }, [entries]);

  const saveEntry = useCallback((entry: Omit<Entry, "id" | "time">) => {
    const newEntry: Entry = {
      ...entry,
      id: Date.now().toString(),
      time: formatTime(),
    };
    setEntries((prev) => [newEntry, ...prev]);

    // Webhook
    const url = localStorage.getItem("akpack_webhook_url");
    if (url) {
      fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newEntry.name,
          memberId: newEntry.memberId,
          type: newEntry.type,
          cash: newEntry.cash,
          upi: newEntry.upi,
          note: newEntry.note,
        }),
      }).catch(() => {});
    }

    setStatus("saved");
    setTimeout(() => setStatus("ready"), 2000);
  }, []);

  // Voice recognition
  const startListening = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition: any = new SR();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setStatus("listening");
      setTranscript("");
    };

    recognition.onresult = (e: any) => {
      const result = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join(" ");
      setTranscript(result);

      if (e.results[e.results.length - 1].isFinal) {
        setStatus("processing");
        const parsed = parseTranscript(result);
        if (parsed?.name) {
          saveEntry(parsed);
          setTranscript("");
        } else {
          setStatus("error");
          setTimeout(() => setStatus("ready"), 2000);
        }
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setStatus("error");
      setTimeout(() => setStatus("ready"), 2000);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [saveEntry]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const toggleMic = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  // Manual save
  const handleManualSave = useCallback(() => {
    if (!manualName.trim()) return;
    saveEntry({
      name: manualName.trim(),
      memberId: manualMemberId.trim(),
      type: manualType,
      cash: manualType === "upi" ? 0 : Number.parseFloat(manualCash) || 0,
      upi: manualType === "cash" ? 0 : Number.parseFloat(manualUpi) || 0,
      note: manualNote.trim(),
    });
    setManualName("");
    setManualMemberId("");
    setManualType("cash");
    setManualCash("");
    setManualUpi("");
    setManualNote("");
  }, [
    manualName,
    manualMemberId,
    manualType,
    manualCash,
    manualUpi,
    manualNote,
    saveEntry,
  ]);

  // Status display
  const statusConfig: Record<
    StatusState,
    { label: string; color: string; dot?: boolean }
  > = {
    ready: { label: "Ready", color: "#555" },
    listening: { label: "Listening...", color: COLOR_CASH, dot: true },
    processing: { label: "Processing...", color: "#fbbf24", dot: true },
    saved: { label: "Saved ✓", color: COLOR_CASH },
    error: { label: "Error", color: "#f87171" },
  };

  const currentStatus = statusConfig[status];
  const manualTotal =
    (Number.parseFloat(manualCash) || 0) + (Number.parseFloat(manualUpi) || 0);
  const typeColor = getTypeColor(manualType);

  return (
    <div
      style={{
        backgroundColor: "#080808",
        minHeight: "100vh",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <div
        style={{ maxWidth: "480px", margin: "0 auto", padding: "0 16px 80px" }}
      >
        {/* ── Header ── */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "20px",
            paddingBottom: "20px",
          }}
        >
          <h1
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "28px",
              fontWeight: 800,
              color: "#fff",
              margin: 0,
              letterSpacing: "-0.5px",
            }}
          >
            AK <span style={{ color: COLOR_CASH }}>Pack</span>
          </h1>
          <div
            style={{
              backgroundColor: "#141414",
              border: "1px solid #222",
              borderRadius: "20px",
              padding: "6px 12px",
              fontSize: "11px",
              color: "#888",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {formatDate()}
          </div>
        </header>

        {/* ── Voice Section ── */}
        <section
          style={{
            backgroundColor: "#111",
            border: "1px solid #222",
            borderRadius: "12px",
            padding: "28px 20px 20px",
            marginBottom: "16px",
            textAlign: "center",
          }}
        >
          {!voiceSupported ? (
            <p style={{ color: "#f87171", fontSize: "13px", margin: 0 }}>
              Voice not supported on this browser
            </p>
          ) : (
            <>
              <button
                type="button"
                data-ocid="voice.primary_button"
                onClick={toggleMic}
                className={isListening ? "mic-listening" : ""}
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  backgroundColor: isListening ? "#0a2a1a" : "#141414",
                  border: isListening
                    ? `2px solid ${COLOR_CASH}`
                    : "2px solid #333",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                  marginBottom: "16px",
                }}
                aria-label={isListening ? "Stop recording" : "Start recording"}
              >
                {isListening ? (
                  <MicOff size={28} color={COLOR_CASH} />
                ) : (
                  <Mic size={28} color="#888" />
                )}
              </button>

              <div
                style={{
                  minHeight: "40px",
                  backgroundColor: "#0a0a0a",
                  border: "1px solid #1a1a1a",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  fontSize: "13px",
                  color: transcript ? "#ddd" : "#444",
                  fontStyle: transcript ? "normal" : "italic",
                  marginBottom: "14px",
                  textAlign: "left",
                  lineHeight: 1.5,
                }}
              >
                {transcript || "Tap mic and speak..."}
              </div>

              <div
                data-ocid="voice.loading_state"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11px",
                  color: currentStatus.color,
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                {currentStatus.dot && (
                  <span
                    className="dot-pulse"
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: currentStatus.color,
                      display: "inline-block",
                    }}
                  />
                )}
                {currentStatus.label}
              </div>
            </>
          )}
        </section>

        {/* ── Manual Entry Form ── */}
        <section
          style={{
            backgroundColor: "#111",
            border: "1px solid #222",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "16px",
          }}
        >
          <h2
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.15em",
              color: "#555",
              textTransform: "uppercase",
              margin: "0 0 16px 0",
            }}
          >
            Manual Entry
          </h2>

          {/* Name + ID */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              marginBottom: "10px",
            }}
          >
            <div>
              <label htmlFor="manual-name" style={labelStyle}>
                Name
              </label>
              <input
                id="manual-name"
                data-ocid="manual.input"
                type="text"
                placeholder="Member name"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="manual-member-id" style={labelStyle}>
                Member ID
              </label>
              <input
                id="manual-member-id"
                data-ocid="manual.input"
                type="number"
                placeholder="ID"
                value={manualMemberId}
                onChange={(e) => setManualMemberId(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Type Toggle */}
          <div style={{ marginBottom: "10px" }}>
            <p
              style={{
                ...labelStyle,
                marginBottom: "6px",
              }}
            >
              Type
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "6px",
              }}
            >
              {(["cash", "upi", "both"] as const).map((t) => {
                const color = getTypeColor(t);
                const active = manualType === t;
                return (
                  <button
                    type="button"
                    key={t}
                    data-ocid={`manual.${t}.toggle`}
                    onClick={() => setManualType(t)}
                    style={{
                      padding: "8px 0",
                      borderRadius: "6px",
                      border: `1px solid ${active ? color : "#222"}`,
                      backgroundColor: active ? `${color}18` : "#141414",
                      color: active ? color : "#555",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "11px",
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      cursor: "pointer",
                      textTransform: "uppercase",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount fields */}
          {manualType === "both" ? (
            <div style={{ marginBottom: "10px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  marginBottom: "6px",
                }}
              >
                <div>
                  <label
                    htmlFor="manual-cash"
                    style={{ ...labelStyle, color: COLOR_CASH }}
                  >
                    Cash ₹
                  </label>
                  <input
                    id="manual-cash"
                    data-ocid="manual.cash.input"
                    type="number"
                    placeholder="0"
                    value={manualCash}
                    onChange={(e) => setManualCash(e.target.value)}
                    style={{
                      ...inputStyle,
                      borderColor: manualCash ? `${COLOR_CASH}44` : "#222",
                    }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="manual-upi"
                    style={{ ...labelStyle, color: COLOR_UPI }}
                  >
                    UPI ₹
                  </label>
                  <input
                    id="manual-upi"
                    data-ocid="manual.upi.input"
                    type="number"
                    placeholder="0"
                    value={manualUpi}
                    onChange={(e) => setManualUpi(e.target.value)}
                    style={{
                      ...inputStyle,
                      borderColor: manualUpi ? `${COLOR_UPI}44` : "#222",
                    }}
                  />
                </div>
              </div>
              {manualTotal > 0 && (
                <div
                  style={{
                    textAlign: "right",
                    fontSize: "12px",
                    color: COLOR_BOTH,
                  }}
                >
                  Total: ₹{manualTotal.toLocaleString("en-IN")}
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginBottom: "10px" }}>
              <label
                htmlFor="manual-amount"
                style={{ ...labelStyle, color: typeColor }}
              >
                Amount ₹
              </label>
              <input
                id="manual-amount"
                data-ocid="manual.amount.input"
                type="number"
                placeholder="0"
                value={manualType === "cash" ? manualCash : manualUpi}
                onChange={(e) =>
                  manualType === "cash"
                    ? setManualCash(e.target.value)
                    : setManualUpi(e.target.value)
                }
                style={{
                  ...inputStyle,
                  borderColor:
                    manualCash || manualUpi ? `${typeColor}44` : "#222",
                }}
              />
            </div>
          )}

          {/* Note */}
          <div style={{ marginBottom: "14px" }}>
            <label htmlFor="manual-note" style={labelStyle}>
              Note
            </label>
            <input
              id="manual-note"
              data-ocid="manual.note.input"
              type="text"
              placeholder="renewal, new membership..."
              value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleManualSave();
              }}
              style={inputStyle}
            />
          </div>

          <button
            type="button"
            data-ocid="manual.submit_button"
            onClick={handleManualSave}
            disabled={!manualName.trim()}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: manualName.trim() ? typeColor : "#222",
              color: manualName.trim() ? "#080808" : "#444",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: manualName.trim() ? "pointer" : "not-allowed",
              transition: "all 0.15s ease",
            }}
          >
            Save Entry
          </button>
        </section>

        {/* ── Today's Entries ── */}
        <section style={{ marginBottom: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            <h2
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.15em",
                color: "#555",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              Today's Entries
            </h2>
            <span
              data-ocid="entries.card"
              style={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #2a2a2a",
                borderRadius: "12px",
                padding: "2px 8px",
                fontSize: "11px",
                color: "#888",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {entries.length}
            </span>
          </div>

          {entries.length === 0 ? (
            <div
              data-ocid="entries.empty_state"
              style={{
                backgroundColor: "#111",
                border: "1px solid #1a1a1a",
                borderRadius: "12px",
                padding: "32px 20px",
                textAlign: "center",
                color: "#333",
                fontSize: "13px",
              }}
            >
              No entries today. Start recording!
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {entries.map((entry, i) => {
                const color = getTypeColor(entry.type);
                const total = entry.cash + entry.upi;
                return (
                  <div
                    key={entry.id}
                    data-ocid={`entries.item.${i + 1}`}
                    style={{
                      backgroundColor: "#111",
                      border: "1px solid #1e1e1e",
                      borderLeft: `4px solid ${color}`,
                      borderRadius: "8px",
                      padding: "14px 14px 12px",
                    }}
                  >
                    {/* Row 1: Name + ID + Time */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'Syne', sans-serif",
                            fontWeight: 700,
                            fontSize: "15px",
                            color: "#f0f0f0",
                          }}
                        >
                          {entry.name}
                        </span>
                        {entry.memberId && (
                          <span
                            style={{
                              backgroundColor: "#1a1a1a",
                              border: "1px solid #2a2a2a",
                              borderRadius: "4px",
                              padding: "1px 6px",
                              fontSize: "10px",
                              color: "#777",
                              fontFamily: "'JetBrains Mono', monospace",
                            }}
                          >
                            #{entry.memberId}
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: "10px",
                          color: "#444",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {entry.time}
                      </span>
                    </div>

                    {/* Row 2: Amount */}
                    <div style={{ marginBottom: "6px" }}>
                      {entry.type === "cash" && (
                        <span
                          style={{
                            fontSize: "18px",
                            fontWeight: 700,
                            color: COLOR_CASH,
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          ₹{entry.cash.toLocaleString("en-IN")}
                        </span>
                      )}
                      {entry.type === "upi" && (
                        <span
                          style={{
                            fontSize: "18px",
                            fontWeight: 700,
                            color: COLOR_UPI,
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          ₹{entry.upi.toLocaleString("en-IN")}
                        </span>
                      )}
                      {entry.type === "both" && (
                        <div>
                          <span
                            style={{
                              fontSize: "18px",
                              fontWeight: 700,
                              color: COLOR_BOTH,
                              fontFamily: "'JetBrains Mono', monospace",
                            }}
                          >
                            ₹{total.toLocaleString("en-IN")} total
                          </span>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#666",
                              marginTop: "2px",
                              fontFamily: "'JetBrains Mono', monospace",
                            }}
                          >
                            <span style={{ color: `${COLOR_CASH}99` }}>
                              ₹{entry.cash.toLocaleString("en-IN")} cash
                            </span>
                            {" + "}
                            <span style={{ color: `${COLOR_UPI}99` }}>
                              ₹{entry.upi.toLocaleString("en-IN")} upi
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Row 3: Badge + Note */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          backgroundColor: `${color}18`,
                          border: `1px solid ${color}44`,
                          borderRadius: "4px",
                          padding: "1px 6px",
                          fontSize: "9px",
                          color: color,
                          fontFamily: "'JetBrains Mono', monospace",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          fontWeight: 600,
                        }}
                      >
                        {entry.type}
                      </span>
                      {entry.note && (
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#555",
                            fontStyle: "italic",
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {entry.note}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Settings ── */}
        <section
          style={{
            backgroundColor: "#111",
            border: "1px solid #1e1e1e",
            borderRadius: "12px",
            overflow: "hidden",
            marginBottom: "24px",
          }}
        >
          <button
            type="button"
            data-ocid="settings.toggle"
            onClick={() => setSettingsOpen((v) => !v)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#555",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Settings size={12} />
              Settings
            </span>
            {settingsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {settingsOpen && (
            <div
              data-ocid="settings.panel"
              style={{ borderTop: "1px solid #1e1e1e", padding: "16px" }}
            >
              <label
                htmlFor="webhook-url"
                style={{ ...labelStyle, marginBottom: "6px" }}
              >
                Google Apps Script URL
              </label>
              <input
                id="webhook-url"
                data-ocid="settings.input"
                type="url"
                placeholder="https://script.google.com/macros/s/..."
                value={webhookInput}
                onChange={(e) => setWebhookInput(e.target.value)}
                style={{
                  ...inputStyle,
                  marginBottom: "10px",
                  fontSize: "12px",
                }}
              />
              <button
                type="button"
                data-ocid="settings.save_button"
                onClick={() => {
                  localStorage.setItem("akpack_webhook_url", webhookInput);
                  setStatus("saved");
                  setTimeout(() => setStatus("ready"), 1500);
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: `1px solid ${COLOR_CASH}44`,
                  backgroundColor: `${COLOR_CASH}12`,
                  color: COLOR_CASH,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Save URL
              </button>
            </div>
          )}
        </section>

        {/* ── Footer ── */}
        <footer
          style={{
            textAlign: "center",
            fontSize: "10px",
            color: "#333",
            fontFamily: "'JetBrains Mono', monospace",
            paddingBottom: "16px",
          }}
        >
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#444", textDecoration: "none" }}
          >
            Built with ♥ using caffeine.ai
          </a>
        </footer>
      </div>
    </div>
  );
}
