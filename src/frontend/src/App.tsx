import { useAuth0 } from "@auth0/auth0-react";
import {
  ChevronDown,
  ChevronUp,
  Home,
  LayoutList,
  Lock,
  Pencil,
  Plus,
  Settings,
  Wallet,
  X,
} from "lucide-react";
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

type ActivePage = "home" | "collection" | "advance";

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────
const COLOR_CASH = "#00ff88";
const COLOR_UPI = "#a78bfa";
const COLOR_BOTH = "#fbbf24";
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyyE1ZlzDGVpTAA35_0K3Onlg1y1PpmU4pZl74Qf1PuVfbvYZ-Ux6eQCfIzvyPDQgNi/exec";

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

function getISTDateTime(): { date: string; time: string } {
  const now = new Date();
  const istMs = now.getTime() + 5.5 * 60 * 60 * 1000;
  const ist = new Date(istMs);
  const dd = String(ist.getUTCDate()).padStart(2, "0");
  const mm = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = ist.getUTCFullYear();
  const hh = String(ist.getUTCHours()).padStart(2, "0");
  const mi = String(ist.getUTCMinutes()).padStart(2, "0");
  const ss = String(ist.getUTCSeconds()).padStart(2, "0");
  return { date: `${dd}-${mm}-${yyyy}`, time: `${hh}:${mi}:${ss} IST` };
}

function formatDateDMY(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

// ──────────────────────────────────────────────
// Google Sheets fetch helpers
// ──────────────────────────────────────────────
async function fetchEntriesFromSheet(
  date: string,
  scriptUrl: string,
): Promise<Entry[] | null> {
  if (!scriptUrl) return null;
  try {
    const res = await fetch(
      `${scriptUrl}?action=getEntries&sheet=Accounts&date=${date}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    return data.map((row: any) => ({
      id: String(row.id || Date.now() + Math.random()),
      name: String(row.name || ""),
      memberId: String(row.memberId || ""),
      type: (["cash", "upi", "both"].includes(row.type) ? row.type : "cash") as
        | "cash"
        | "upi"
        | "both",
      cash: Number(row.cash) || 0,
      upi: Number(row.upi) || 0,
      note: String(row.note || ""),
      time: String(row.time || ""),
    }));
  } catch {
    return null;
  }
}

async function fetchAdvanceRecordsFromSheet(
  scriptUrl: string,
): Promise<AdvanceRecord[] | null> {
  if (!scriptUrl) return null;
  try {
    const res = await fetch(
      `${scriptUrl}?action=getEntries&sheet=Advance+Payments`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    return data.map((row: any) => ({
      id: String(row.id || Date.now() + Math.random()),
      trainerId: String(row.trainerId || row.trainer || ""),
      periodKey: labelToPeriodKey(
        String(row.period || ""),
        String(row.date || ""),
      ),
      amount: Number(row.amount) || 0,
      date: String(row.date || ""),
      byHand: Number(row.byHand) || 0,
      upi: Number(row.upi) || 0,
      notes: String(row.notes || ""),
      commission: Number(row.commission) || 0,
    }));
  } catch {
    return null;
  }
}

async function fetchConfigFromSheet(
  scriptUrl: string,
): Promise<{ adminPin?: string } | null> {
  if (!scriptUrl) return null;
  try {
    const res = await fetch(`${scriptUrl}?action=getEntries&sheet=Config`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    const pinRow = data.find((row: any) => row.key === "adminPin");
    if (pinRow) return { adminPin: String(pinRow.value) };
    return null;
  } catch {
    return null;
  }
}

async function saveConfigToSheet(
  scriptUrl: string,
  key: string,
  value: string,
): Promise<void> {
  if (!scriptUrl) return;
  try {
    fetch(scriptUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save",
        sheet: "Config",
        key,
        value,
        entryId: `config_${key}`,
      }),
    }).catch(() => {});
  } catch {
    // ignore
  }
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
// Entry Card (shared between Home + Collection)
// ──────────────────────────────────────────────
function EntryCard({
  entry,
  index,
  onEdit,
}: { entry: Entry; index: number; onEdit?: (entry: Entry) => void }) {
  const color = getTypeColor(entry.type);
  const total = entry.cash + entry.upi;
  return (
    <div
      key={entry.id}
      data-ocid={`entries.item.${index + 1}`}
      style={{
        backgroundColor: "#111",
        border: "1px solid #1e1e1e",
        borderLeft: `4px solid ${color}`,
        borderRadius: "8px",
        padding: "14px 14px 12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {onEdit && (
            <button
              type="button"
              data-ocid="entries.edit_button"
              onClick={() => onEdit(entry)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px",
                width: "24px",
                height: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#444",
                borderRadius: "4px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#888";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#444";
              }}
            >
              <Pencil size={13} />
            </button>
          )}
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
      </div>

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

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
}

// ──────────────────────────────────────────────
// Edit Entry Modal
// ──────────────────────────────────────────────
function EditEntryModal({
  entry,
  onClose,
  onSave,
}: {
  entry: Entry | null;
  onClose: () => void;
  onSave: (updated: Entry) => void;
}) {
  const [name, setName] = useState(entry?.name || "");
  const [memberId, setMemberId] = useState(entry?.memberId || "");
  const [type, setType] = useState<"cash" | "upi" | "both">(
    entry?.type || "cash",
  );
  const [cash, setCash] = useState(entry?.cash?.toString() || "0");
  const [upi, setUpi] = useState(entry?.upi?.toString() || "0");
  const [note, setNote] = useState(entry?.note || "");

  useEffect(() => {
    if (entry) {
      setName(entry.name);
      setMemberId(entry.memberId);
      setType(entry.type);
      setCash(entry.cash.toString());
      setUpi(entry.upi.toString());
      setNote(entry.note);
    }
  }, [entry]);

  if (!entry) return null;

  const mono = "'JetBrains Mono', monospace";
  const syne = "'Syne', sans-serif";

  const inputStyle: React.CSSProperties = {
    backgroundColor: "#0d0d0d",
    border: "1px solid #2a2a2a",
    borderRadius: "6px",
    padding: "10px 12px",
    color: "#f0f0f0",
    fontFamily: mono,
    fontSize: "14px",
    width: "100%",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "9px",
    color: "#555",
    fontFamily: mono,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginBottom: "4px",
    display: "block",
  };

  return (
    <div
      data-ocid="edit_entry.modal"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        style={{
          backgroundColor: "#111",
          border: "1px solid #222",
          borderRadius: "14px",
          padding: "24px 20px",
          width: "100%",
          maxWidth: "420px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px",
          }}
        >
          <span
            style={{
              fontFamily: syne,
              fontWeight: 800,
              fontSize: "16px",
              color: "#fff",
            }}
          >
            Edit Entry
          </span>
          <button
            type="button"
            data-ocid="edit_entry.close_button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#555",
              padding: "4px",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label htmlFor="edit-name" style={labelStyle}>
              Client Name
            </label>
            <input
              id="edit-name"
              data-ocid="edit_entry.input"
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Client name"
            />
          </div>
          <div>
            <label htmlFor="edit-memberid" style={labelStyle}>
              Membership ID
            </label>
            <input
              id="edit-memberid"
              style={inputStyle}
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              placeholder="Membership ID"
            />
          </div>
          <div>
            <label htmlFor="edit-type" style={labelStyle}>
              Payment Type
            </label>
            <select
              id="edit-type"
              data-ocid="edit_entry.select"
              style={{ ...inputStyle, cursor: "pointer" }}
              value={type}
              onChange={(e) =>
                setType(e.target.value as "cash" | "upi" | "both")
              }
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="both">Both</option>
            </select>
          </div>
          {(type === "cash" || type === "both") && (
            <div>
              <label htmlFor="edit-cash" style={labelStyle}>
                Cash Amount
              </label>
              <input
                id="edit-cash"
                style={inputStyle}
                type="number"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                placeholder="0"
              />
            </div>
          )}
          {(type === "upi" || type === "both") && (
            <div>
              <label htmlFor="edit-upi" style={labelStyle}>
                UPI Amount
              </label>
              <input
                id="edit-upi"
                style={inputStyle}
                type="number"
                value={upi}
                onChange={(e) => setUpi(e.target.value)}
                placeholder="0"
              />
            </div>
          )}
          <div>
            <label htmlFor="edit-note" style={labelStyle}>
              Note
            </label>
            <input
              id="edit-note"
              style={inputStyle}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note"
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button
            type="button"
            data-ocid="edit_entry.cancel_button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor: "#1a1a1a",
              border: "1px solid #2a2a2a",
              borderRadius: "8px",
              color: "#888",
              fontFamily: mono,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            data-ocid="edit_entry.save_button"
            onClick={() =>
              onSave({
                ...entry,
                name,
                memberId,
                type,
                cash: Number(cash) || 0,
                upi: Number(upi) || 0,
                note,
              })
            }
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor: "#00ff8820",
              border: "1px solid #00ff8850",
              borderRadius: "8px",
              color: "#00ff88",
              fontFamily: mono,
              fontSize: "13px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Collection Page
// ──────────────────────────────────────────────
function CollectionPage({
  todayEntries,
  onEdit,
  scriptUrl,
}: {
  todayEntries: Entry[];
  onEdit?: (entry: Entry) => void;
  scriptUrl: string;
}) {
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [entries, setEntries] = useState<Entry[]>(todayEntries);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const loadEntries = async (date: string) => {
    if (!scriptUrl) {
      if (date === todayStr) setEntries(todayEntries);
      return;
    }
    setIsLoading(true);
    setFetchError(false);
    const fetched = await fetchEntriesFromSheet(date, scriptUrl);
    if (fetched !== null) {
      // Success - use cloud data (even if empty for this date)
      setEntries(fetched);
      setFetchError(false);
    } else {
      // Error - fall back to localStorage for today, show error
      if (date === todayStr) setEntries(todayEntries);
      else setEntries([]);
      setFetchError(true);
    }
    setIsLoading(false);
    setHasFetched(true);
  };

  // On mount, load entries from Sheets
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only
  useEffect(() => {
    loadEntries(selectedDate);
  }, []);

  // Sync todayEntries when a new entry is added on Home tab (today only)
  useEffect(() => {
    if (selectedDate === todayStr && hasFetched) {
      setEntries(todayEntries);
    }
  }, [todayEntries, selectedDate, todayStr, hasFetched]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setHasFetched(false);
    loadEntries(date);
  };

  const formatSelectedDate = (dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const cashTotal = entries.reduce((sum, e) => sum + e.cash, 0);
  const upiTotal = entries.reduce((sum, e) => sum + e.upi, 0);
  const grandTotal = cashTotal + upiTotal;
  const isToday = selectedDate === todayStr;

  return (
    <div>
      {/* Page heading */}
      <div
        style={{
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <h2
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "22px",
              fontWeight: 800,
              color: "#fff",
              margin: 0,
              letterSpacing: "-0.3px",
            }}
          >
            {isToday ? "Today's Collection" : "Collection Report"}
          </h2>
          <button
            type="button"
            data-ocid="collection.button"
            onClick={() => {
              setHasFetched(false);
              loadEntries(selectedDate);
            }}
            disabled={isLoading}
            style={{
              backgroundColor: "#141414",
              border: "1px solid #222",
              borderRadius: "6px",
              color: isLoading ? "#444" : "#888",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              padding: "6px 10px",
              cursor: isLoading ? "default" : "pointer",
              letterSpacing: "0.05em",
            }}
          >
            {isLoading ? "⟳ Loading..." : "⟳ Refresh"}
          </button>
        </div>

        {/* Date picker */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <input
            type="date"
            data-ocid="collection.input"
            value={selectedDate}
            max={todayStr}
            onChange={(e) => handleDateChange(e.target.value)}
            style={{
              backgroundColor: "#141414",
              border: "1px solid #222",
              borderRadius: "6px",
              color: "#f5f5f5",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "12px",
              padding: "7px 10px",
              outline: "none",
              colorScheme: "dark",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: "11px",
              color: "#555",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {formatSelectedDate(selectedDate)}
          </span>
        </div>

        {fetchError && (
          <div
            style={{
              backgroundColor: "#fbbf24",
              color: "#1a1a00",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              fontWeight: "bold",
              padding: "8px 10px",
              borderRadius: "6px",
              marginBottom: "8px",
              lineHeight: "1.5",
            }}
          >
            ⚠ Cloud sync not working. Go to Settings, copy the Apps Script code,
            redeploy it in Google Apps Script (Deploy → New version → Anyone
            access), then update the URL here.
          </div>
        )}
        {!fetchError && hasFetched && !isLoading && (
          <div
            style={{
              fontSize: "10px",
              color: "#00ff88",
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: "4px",
            }}
          >
            ✓ Synced from Google Sheets
          </div>
        )}
        {isLoading && (
          <div
            style={{
              fontSize: "10px",
              color: "#888",
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: "4px",
            }}
          >
            ⟳ Loading from cloud...
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span
            data-ocid="collection.card"
            style={{
              backgroundColor: "#1a1a1a",
              border: "1px solid #2a2a2a",
              borderRadius: "12px",
              padding: "2px 8px",
              fontSize: "10px",
              color: "#888",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {isLoading
              ? "..."
              : `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`}
          </span>
        </div>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          marginBottom: "10px",
        }}
      >
        {/* Cash card */}
        <div
          data-ocid="collection.cash.card"
          style={{
            backgroundColor: "#111",
            border: `1px solid ${COLOR_CASH}33`,
            borderTop: `3px solid ${COLOR_CASH}`,
            borderRadius: "10px",
            padding: "16px 14px",
          }}
        >
          <div
            style={{
              fontSize: "9px",
              color: `${COLOR_CASH}88`,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginBottom: "10px",
            }}
          >
            Cash Total
          </div>
          <div
            style={{
              fontSize: "26px",
              fontWeight: 700,
              color: COLOR_CASH,
              fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 1,
              marginBottom: "4px",
            }}
          >
            ₹{cashTotal.toLocaleString("en-IN")}
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "#444",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {entries.filter((e) => e.cash > 0).length} txns
          </div>
        </div>

        {/* UPI card */}
        <div
          data-ocid="collection.upi.card"
          style={{
            backgroundColor: "#111",
            border: `1px solid ${COLOR_UPI}33`,
            borderTop: `3px solid ${COLOR_UPI}`,
            borderRadius: "10px",
            padding: "16px 14px",
          }}
        >
          <div
            style={{
              fontSize: "9px",
              color: `${COLOR_UPI}88`,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginBottom: "10px",
            }}
          >
            UPI Total
          </div>
          <div
            style={{
              fontSize: "26px",
              fontWeight: 700,
              color: COLOR_UPI,
              fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 1,
              marginBottom: "4px",
            }}
          >
            ₹{upiTotal.toLocaleString("en-IN")}
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "#444",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {entries.filter((e) => e.upi > 0).length} txns
          </div>
        </div>
      </div>

      {/* Grand Total card */}
      <div
        data-ocid="collection.grand_total.card"
        style={{
          backgroundColor: "#141006",
          border: `1px solid ${COLOR_BOTH}44`,
          borderRadius: "12px",
          padding: "20px 18px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "9px",
              color: `${COLOR_BOTH}99`,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            Grand Total
          </div>
          <div
            style={{
              fontSize: "36px",
              fontWeight: 800,
              color: COLOR_BOTH,
              fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 1,
              letterSpacing: "-1px",
            }}
          >
            ₹{grandTotal.toLocaleString("en-IN")}
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "#555",
              fontFamily: "'JetBrains Mono', monospace",
              marginTop: "6px",
            }}
          >
            <span style={{ color: `${COLOR_CASH}77` }}>
              ₹{cashTotal.toLocaleString("en-IN")} cash
            </span>
            <span style={{ color: "#333", margin: "0 6px" }}>+</span>
            <span style={{ color: `${COLOR_UPI}77` }}>
              ₹{upiTotal.toLocaleString("en-IN")} upi
            </span>
          </div>
        </div>
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            backgroundColor: `${COLOR_BOTH}18`,
            border: `2px solid ${COLOR_BOTH}44`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "22px",
            flexShrink: 0,
          }}
        >
          ₹
        </div>
      </div>

      {/* Entries list */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "12px",
        }}
      >
        <h3
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
          All Entries
        </h3>
      </div>

      {entries.length === 0 ? (
        <div
          data-ocid="collection.empty_state"
          style={{
            backgroundColor: "#111",
            border: "1px solid #1a1a1a",
            borderRadius: "12px",
            padding: "40px 20px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>📋</div>
          <div
            style={{
              color: "#444",
              fontSize: "13px",
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: "6px",
            }}
          >
            No collections today
          </div>
          <div
            style={{
              color: "#333",
              fontSize: "11px",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Switch to Home tab to add entries for today
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {entries.map((entry, i) => (
            <EntryCard key={entry.id} entry={entry} index={i} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Advance Payment Types
// ──────────────────────────────────────────────
interface AdvanceTrainer {
  id: string;
  name: string;
}

interface AdvanceRecord {
  id: string;
  trainerId: string;
  periodKey: string;
  amount: number;
  date: string;
  byHand: number;
  upi: number;
  notes: string;
  commission: number;
}

function labelToPeriodKey(label: string, dateStr?: string): string {
  if (/^\d{4}-\d{2}$/.test(label)) return label;
  const monthNames = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];
  const match = label.toLowerCase().match(/12\s+([a-z]+)/);
  if (!match) return getCurrentPeriodKey();
  const monthIdx = monthNames.indexOf(match[1].slice(0, 3));
  if (monthIdx === -1) return getCurrentPeriodKey();
  let year = new Date().getFullYear();
  if (dateStr) {
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      year = parts[0].length === 4 ? Number(parts[0]) : Number(parts[2]);
    }
  }
  return `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
}

// Period runs from 12th of one month to 11th of next month
function getCurrentPeriodKey(): string {
  const now = new Date();
  const day = now.getDate();
  if (day >= 12) {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  }
}

function getPeriodLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const startDate = new Date(year, month - 1, 12);
  const endDate = new Date(year, month, 12);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}

function canClosePeriod(key: string): boolean {
  const [year, month] = key.split("-").map(Number);
  const closeDate = new Date(year, month, 12);
  return new Date() >= closeDate;
}

// ──────────────────────────────────────────────
// Advance Payment Page
// ──────────────────────────────────────────────
function AdvancePaymentPage({
  trainers,
  setTrainers,
  records,
  setRecords,
  closedPeriods,
  setClosedPeriods,
  adminPin,
  setAdminPin,
  pinUnlocked,
  setPinUnlocked,
  scriptUrl,
}: {
  trainers: AdvanceTrainer[];
  setTrainers: React.Dispatch<React.SetStateAction<AdvanceTrainer[]>>;
  records: AdvanceRecord[];
  setRecords: React.Dispatch<React.SetStateAction<AdvanceRecord[]>>;
  closedPeriods: string[];
  setClosedPeriods: React.Dispatch<React.SetStateAction<string[]>>;
  adminPin: string;
  setAdminPin: React.Dispatch<React.SetStateAction<string>>;
  pinUnlocked: boolean;
  setPinUnlocked: React.Dispatch<React.SetStateAction<boolean>>;
  scriptUrl: string;
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [advFetchError, setAdvFetchError] = useState(false);

  const refreshRecords = async () => {
    if (!scriptUrl) return;
    setIsRefreshing(true);
    setAdvFetchError(false);
    const fetched = await fetchAdvanceRecordsFromSheet(scriptUrl);
    if (fetched !== null) {
      setRecords(fetched);
      setAdvFetchError(false);
    } else {
      setAdvFetchError(true);
    }
    setIsRefreshing(false);
  };

  // Refresh when tab becomes active
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only
  useEffect(() => {
    refreshRecords();
  }, []);

  // PIN state
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [settingPin, setSettingPin] = useState(!adminPin);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinSetError, setPinSetError] = useState("");
  const [showPinModal, setShowPinModal] = useState(false);

  // Trainer management
  const [showAddTrainer, setShowAddTrainer] = useState(false);
  const [newTrainerName, setNewTrainerName] = useState("");

  // Expanded trainer per period
  const [expandedKey, setExpandedKey] = useState<string | null>(null); // "periodKey::trainerId"

  // Entry forms per trainer+period
  const [formData, setFormData] = useState<
    Record<
      string,
      {
        amount: string;
        date: string;
        byHand: string;
        upi: string;
        notes: string;
        commission: string;
      }
    >
  >({});

  // Filters
  const [filterTrainer, setFilterTrainer] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [commissionOnly, setCommissionOnly] = useState(false);

  const currentPeriodKey = getCurrentPeriodKey();

  // Build list of periods to show (current + any with records or unclosed)
  const allPeriodKeys = Array.from(
    new Set([currentPeriodKey, ...records.map((r) => r.periodKey)]),
  ).sort((a, b) => b.localeCompare(a));

  // Filtered records for summary
  const filteredRecords = records.filter((r) => {
    if (filterTrainer !== "all" && r.trainerId !== filterTrainer) return false;
    if (filterMonth !== "all" && r.periodKey !== filterMonth) return false;
    if (commissionOnly && r.commission <= 0) return false;
    return true;
  });

  const filteredTotalCommission = filteredRecords.reduce(
    (s, r) => s + r.commission,
    0,
  );
  const filteredTotalAmount = filteredRecords.reduce((s, r) => s + r.amount, 0);
  const hasActiveFilter =
    filterTrainer !== "all" || filterMonth !== "all" || commissionOnly;

  function handleUnlock() {
    if (pinInput === adminPin) {
      setPinUnlocked(true);
      setPinError("");
    } else {
      setPinError("Incorrect PIN. Try again.");
    }
  }

  function handleSetPin() {
    if (newPin.length < 4) {
      setPinSetError("PIN must be at least 4 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      setPinSetError("PINs don't match.");
      return;
    }
    setAdminPin(newPin);
    localStorage.setItem("akpack_admin_pin", newPin);
    saveConfigToSheet(scriptUrl, "adminPin", newPin);
    setPinUnlocked(true);
    setSettingPin(false);
  }

  function handleAddTrainer() {
    if (!newTrainerName.trim()) return;
    const t: AdvanceTrainer = {
      id: Date.now().toString(),
      name: newTrainerName.trim(),
    };
    setTrainers((prev) => [...prev, t]);
    setNewTrainerName("");
    setShowAddTrainer(false);
  }

  function getFormKey(periodKey: string, trainerId: string) {
    return `${periodKey}::${trainerId}`;
  }

  function getForm(periodKey: string, trainerId: string) {
    const key = getFormKey(periodKey, trainerId);
    return (
      formData[key] || {
        amount: "",
        date: new Date().toISOString().split("T")[0],
        byHand: "",
        upi: "",
        notes: "",
        commission: "",
      }
    );
  }

  function setForm(
    periodKey: string,
    trainerId: string,
    patch: Partial<(typeof formData)[string]>,
  ) {
    const key = getFormKey(periodKey, trainerId);
    setFormData((prev) => ({
      ...prev,
      [key]: { ...getForm(periodKey, trainerId), ...patch },
    }));
  }

  function handleAddRecord(periodKey: string, trainer: AdvanceTrainer) {
    const form = getForm(periodKey, trainer.id);
    const newRecord: AdvanceRecord = {
      id: Date.now().toString(),
      trainerId: trainer.id,
      periodKey,
      amount: Number(form.amount) || 0,
      date: form.date || new Date().toISOString().split("T")[0],
      byHand: Number(form.byHand) || 0,
      upi: Number(form.upi) || 0,
      notes: form.notes,
      commission: Number(form.commission) || 0,
    };
    setRecords((prev) => [...prev, newRecord]);
    // Sync to "Advance Payments" sheet
    const webhookUrl = localStorage.getItem("akpack_webhook_url");
    if (webhookUrl) {
      const trainerName = trainer.name;
      fetch(webhookUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          sheet: "Advance Payments",
          trainer: trainerName,
          trainerName,
          period: getPeriodLabel(newRecord.periodKey),
          amount: newRecord.amount,
          date: formatDateDMY(newRecord.date),
          byHand: newRecord.byHand,
          upi: newRecord.upi,
          notes: newRecord.notes,
          commission: newRecord.commission,
          status: "open",
          entryId: newRecord.id,
          savedDate: getISTDateTime().date,
          savedTime: getISTDateTime().time,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {});
    }
    setForm(periodKey, trainer.id, {
      amount: "",
      byHand: "",
      upi: "",
      notes: "",
      commission: "",
      date: new Date().toISOString().split("T")[0],
    });
  }

  function handleClosePeriod(key: string) {
    if (!pinUnlocked) {
      alert("Enter admin mode first.");
      return;
    }
    setClosedPeriods((prev) => [...prev, key]);
  }

  const mono = "'JetBrains Mono', monospace";
  const syne = "'Syne', sans-serif";

  // Main content
  return (
    <div>
      {/* Admin PIN Modal */}
      {showPinModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#111",
              border: "1px solid #333",
              borderRadius: "14px",
              padding: "28px 24px",
              width: "90%",
              maxWidth: "300px",
            }}
          >
            {settingPin ? (
              <>
                <div
                  style={{
                    fontFamily: syne,
                    fontSize: "16px",
                    fontWeight: 800,
                    color: "#fff",
                    marginBottom: "16px",
                  }}
                >
                  Set Admin PIN
                </div>
                <input
                  type="password"
                  maxLength={8}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="New PIN (min 4 digits)"
                  style={{ ...inputStyle, marginBottom: "8px" }}
                  data-ocid="advance.new_pin.input"
                />
                <input
                  type="password"
                  maxLength={8}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSetPin()}
                  placeholder="Confirm PIN"
                  style={{ ...inputStyle, marginBottom: "8px" }}
                  data-ocid="advance.confirm_pin.input"
                />
                {pinSetError && (
                  <div
                    style={{
                      color: "#ff4444",
                      fontSize: "11px",
                      fontFamily: mono,
                      marginBottom: "8px",
                    }}
                  >
                    {pinSetError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    handleSetPin();
                    if (pinUnlocked) setShowPinModal(false);
                  }}
                  data-ocid="advance.set_pin.submit_button"
                  style={{
                    width: "100%",
                    backgroundColor: COLOR_CASH,
                    color: "#000",
                    border: "none",
                    borderRadius: "8px",
                    padding: "12px",
                    fontFamily: mono,
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  SET PIN
                </button>
              </>
            ) : (
              <>
                <div
                  style={{
                    fontFamily: syne,
                    fontSize: "16px",
                    fontWeight: 800,
                    color: "#fff",
                    marginBottom: "16px",
                  }}
                >
                  🔒 Admin Mode
                </div>
                <input
                  id="advance-pin"
                  type="password"
                  maxLength={8}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUnlock();
                      if (pinInput === adminPin) setShowPinModal(false);
                    }
                  }}
                  placeholder="Enter PIN"
                  style={{ ...inputStyle, marginBottom: "8px" }}
                  data-ocid="advance.pin.input"
                />
                {pinError && (
                  <div
                    style={{
                      color: "#ff4444",
                      fontSize: "11px",
                      fontFamily: mono,
                      marginBottom: "8px",
                    }}
                  >
                    {pinError}
                  </div>
                )}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      handleUnlock();
                      if (pinInput === adminPin) setShowPinModal(false);
                    }}
                    data-ocid="advance.pin.submit_button"
                    style={{
                      flex: 1,
                      backgroundColor: COLOR_CASH,
                      color: "#000",
                      border: "none",
                      borderRadius: "8px",
                      padding: "12px",
                      fontFamily: mono,
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    UNLOCK
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPinModal(false);
                      setPinInput("");
                      setPinError("");
                    }}
                    data-ocid="advance.pin.cancel_button"
                    style={{
                      backgroundColor: "#222",
                      color: "#888",
                      border: "1px solid #333",
                      borderRadius: "8px",
                      padding: "12px 16px",
                      fontFamily: mono,
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                </div>
                {!adminPin && (
                  <button
                    type="button"
                    onClick={() => setSettingPin(true)}
                    style={{
                      marginTop: "10px",
                      width: "100%",
                      backgroundColor: "transparent",
                      color: "#555",
                      border: "none",
                      fontFamily: mono,
                      fontSize: "11px",
                      cursor: "pointer",
                    }}
                  >
                    No PIN set yet? Set one
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
      {advFetchError && (
        <div
          style={{
            backgroundColor: "#fbbf24",
            color: "#1a1a00",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "11px",
            fontWeight: "bold",
            padding: "8px 10px",
            borderRadius: "6px",
            marginBottom: "10px",
            lineHeight: "1.5",
          }}
        >
          ⚠ Cloud sync not working. Go to Settings, copy the Apps Script code,
          redeploy it in Google Apps Script (Deploy → New version → Anyone
          access), then update the URL here.
        </div>
      )}
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: syne,
              fontSize: "22px",
              fontWeight: 800,
              color: "#fff",
              margin: 0,
              letterSpacing: "-0.3px",
            }}
          >
            Advance Payment
          </h2>
          <div
            style={{
              fontSize: "11px",
              color: "#555",
              fontFamily: mono,
              marginTop: "2px",
            }}
          >
            12th–12th salary cycle
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            data-ocid="advance.button"
            onClick={refreshRecords}
            disabled={isRefreshing}
            style={{
              backgroundColor: "#141414",
              border: "1px solid #222",
              borderRadius: "6px",
              color: isRefreshing ? "#444" : "#888",
              fontFamily: mono,
              fontSize: "10px",
              padding: "6px 10px",
              cursor: isRefreshing ? "default" : "pointer",
              letterSpacing: "0.05em",
            }}
          >
            {isRefreshing ? "⟳ Syncing..." : "⟳ Refresh"}
          </button>
          {pinUnlocked ? (
            <button
              type="button"
              data-ocid="advance.admin_mode.toggle"
              onClick={() => setPinUnlocked(false)}
              style={{
                backgroundColor: "#00ff8822",
                border: "1px solid #00ff8855",
                borderRadius: "6px",
                color: "#00ff88",
                fontFamily: mono,
                fontSize: "10px",
                fontWeight: 700,
                padding: "6px 10px",
                cursor: "pointer",
                letterSpacing: "0.05em",
              }}
            >
              🔓 ADMIN
            </button>
          ) : (
            <button
              type="button"
              data-ocid="advance.admin_mode.toggle"
              onClick={() => setShowPinModal(true)}
              style={{
                backgroundColor: "#141414",
                border: "1px solid #444",
                borderRadius: "6px",
                color: "#888",
                fontFamily: mono,
                fontSize: "10px",
                fontWeight: 700,
                padding: "6px 10px",
                cursor: "pointer",
                letterSpacing: "0.05em",
              }}
            >
              🔒 ADMIN
            </button>
          )}
          {pinUnlocked && (
            <button
              type="button"
              data-ocid="advance.add_trainer.button"
              onClick={() => setShowAddTrainer((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                backgroundColor: "transparent",
                border: `1px solid ${COLOR_CASH}55`,
                color: COLOR_CASH,
                borderRadius: "8px",
                padding: "8px 12px",
                fontFamily: mono,
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: "0.08em",
              }}
            >
              <Plus size={12} />
              ADD TRAINER
            </button>
          )}
        </div>
      </div>

      {/* Add Trainer inline */}
      {showAddTrainer && (
        <div
          style={{
            backgroundColor: "#111",
            border: `1px solid ${COLOR_CASH}33`,
            borderRadius: "10px",
            padding: "14px",
            marginBottom: "14px",
            display: "flex",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            value={newTrainerName}
            onChange={(e) => setNewTrainerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTrainer()}
            placeholder="Trainer name..."
            style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
            data-ocid="advance.trainer.input"
          />
          <button
            type="button"
            onClick={handleAddTrainer}
            data-ocid="advance.trainer.save_button"
            style={{
              backgroundColor: COLOR_CASH,
              color: "#000",
              border: "none",
              borderRadius: "7px",
              padding: "10px 16px",
              fontFamily: mono,
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ADD
          </button>
          <button
            type="button"
            onClick={() => setShowAddTrainer(false)}
            style={{
              backgroundColor: "transparent",
              border: "1px solid #333",
              color: "#666",
              borderRadius: "7px",
              padding: "10px",
              cursor: "pointer",
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div
        style={{
          backgroundColor: "#111",
          border: "1px solid #1e1e1e",
          borderRadius: "10px",
          padding: "14px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            color: "#555",
            fontFamily: mono,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "10px",
          }}
        >
          Filters
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            marginBottom: "8px",
          }}
        >
          <div>
            <label htmlFor="advance-filter-trainer" style={{ ...labelStyle }}>
              Trainer
            </label>
            <select
              id="advance-filter-trainer"
              value={filterTrainer}
              onChange={(e) => setFilterTrainer(e.target.value)}
              data-ocid="advance.filter.trainer"
              style={{ ...inputStyle, padding: "8px 10px", fontSize: "12px" }}
            >
              <option value="all">All Trainers</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="advance-filter-month" style={{ ...labelStyle }}>
              Month
            </label>
            <select
              id="advance-filter-month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              data-ocid="advance.filter.month"
              style={{ ...inputStyle, padding: "8px 10px", fontSize: "12px" }}
            >
              <option value="all">All Months</option>
              {allPeriodKeys.map((k) => (
                <option key={k} value={k}>
                  {getPeriodLabel(k)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          data-ocid="advance.filter.commission"
          onClick={() => setCommissionOnly((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: commissionOnly ? `${COLOR_UPI}22` : "transparent",
            border: `1px solid ${commissionOnly ? COLOR_UPI : "#333"}`,
            color: commissionOnly ? COLOR_UPI : "#555",
            borderRadius: "7px",
            padding: "8px 14px",
            fontFamily: mono,
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer",
            letterSpacing: "0.08em",
            transition: "all 0.15s",
          }}
        >
          Commission Only {commissionOnly ? "✓" : ""}
        </button>

        {/* Summary when filtered */}
        {hasActiveFilter && (
          <div
            style={{
              marginTop: "12px",
              backgroundColor: "#0d0d0d",
              border: "1px solid #2a2a2a",
              borderRadius: "8px",
              padding: "12px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "9px",
                    color: `${COLOR_UPI}88`,
                    fontFamily: mono,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginBottom: "4px",
                  }}
                >
                  Total Commission
                </div>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: COLOR_UPI,
                    fontFamily: mono,
                  }}
                >
                  ₹{filteredTotalCommission.toLocaleString("en-IN")}
                </div>
                <div
                  style={{ fontSize: "10px", color: "#444", fontFamily: mono }}
                >
                  {filteredRecords.length} records
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "9px",
                    color: `${COLOR_CASH}88`,
                    fontFamily: mono,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginBottom: "4px",
                  }}
                >
                  Total Advance
                </div>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: COLOR_CASH,
                    fontFamily: mono,
                  }}
                >
                  ₹{filteredTotalAmount.toLocaleString("en-IN")}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Period Cards */}
      {allPeriodKeys.map((periodKey) => {
        const isClosed = closedPeriods.includes(periodKey);
        const periodRecords = records.filter((r) => r.periodKey === periodKey);

        return (
          <div
            key={periodKey}
            style={{
              backgroundColor: "#111",
              border: `1px solid ${isClosed ? "#222" : "#2a2a2a"}`,
              borderTop: `3px solid ${isClosed ? "#333" : COLOR_BOTH}`,
              borderRadius: "10px",
              marginBottom: "14px",
              overflow: "hidden",
              opacity: isClosed ? 0.7 : 1,
            }}
          >
            {/* Period Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderBottom: "1px solid #1e1e1e",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: syne,
                    fontSize: "15px",
                    fontWeight: 800,
                    color: isClosed ? "#555" : "#fff",
                  }}
                >
                  {getPeriodLabel(periodKey)}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#444",
                    fontFamily: mono,
                    marginTop: "2px",
                  }}
                >
                  {periodRecords.length} advance
                  {periodRecords.length !== 1 ? "s" : ""} · ₹
                  {periodRecords
                    .reduce((s, r) => s + r.amount, 0)
                    .toLocaleString("en-IN")}{" "}
                  total
                </div>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span
                  style={{
                    backgroundColor: isClosed ? "#1a1a1a" : `${COLOR_BOTH}18`,
                    border: `1px solid ${isClosed ? "#333" : `${COLOR_BOTH}44`}`,
                    borderRadius: "12px",
                    padding: "2px 10px",
                    fontSize: "9px",
                    fontFamily: mono,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    color: isClosed ? "#444" : COLOR_BOTH,
                  }}
                >
                  {isClosed ? "CLOSED" : "OPEN"}
                </span>
                {!isClosed && canClosePeriod(periodKey) && (
                  <button
                    type="button"
                    data-ocid="advance.period.close_button"
                    onClick={() => handleClosePeriod(periodKey)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      backgroundColor: "transparent",
                      border: "1px solid #444",
                      color: "#888",
                      borderRadius: "7px",
                      padding: "6px 10px",
                      fontFamily: mono,
                      fontSize: "10px",
                      fontWeight: 700,
                      cursor: "pointer",
                      letterSpacing: "0.08em",
                    }}
                  >
                    <Lock size={10} /> CLOSE
                  </button>
                )}
              </div>
            </div>

            {/* Trainer Rows */}
            <div style={{ padding: "10px 12px" }}>
              {trainers.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    color: "#444",
                    fontFamily: mono,
                    fontSize: "12px",
                    padding: "20px",
                  }}
                >
                  No trainers added yet. Use "Add Trainer" above.
                </div>
              )}
              {trainers.map((trainer, ti) => {
                const expandKey = getFormKey(periodKey, trainer.id);
                const isExpanded = expandedKey === expandKey;
                const trainerRecords = periodRecords.filter(
                  (r) => r.trainerId === trainer.id,
                );
                const trainerTotal = trainerRecords.reduce(
                  (s, r) => s + r.amount,
                  0,
                );
                const trainerCommission = trainerRecords.reduce(
                  (s, r) => s + r.commission,
                  0,
                );
                const form = getForm(periodKey, trainer.id);

                return (
                  <div
                    key={trainer.id}
                    data-ocid={`advance.trainer.item.${ti + 1}`}
                    style={{
                      marginBottom: "8px",
                      border: "1px solid #1e1e1e",
                      borderRadius: "8px",
                      overflow: "hidden",
                    }}
                  >
                    {/* Trainer Header Row */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedKey(isExpanded ? null : expandKey)
                      }
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 14px",
                        backgroundColor: isExpanded ? "#161616" : "transparent",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
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
                            fontFamily: syne,
                            fontSize: "14px",
                            fontWeight: 700,
                            color: "#e0e0e0",
                          }}
                        >
                          {trainer.name}
                        </span>
                        {trainerRecords.length > 0 && (
                          <span
                            style={{
                              backgroundColor: "#1a1a1a",
                              border: "1px solid #2a2a2a",
                              borderRadius: "4px",
                              padding: "1px 6px",
                              fontSize: "10px",
                              color: "#666",
                              fontFamily: mono,
                            }}
                          >
                            {trainerRecords.length} entries
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        {trainerTotal > 0 && (
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              color: COLOR_CASH,
                              fontFamily: mono,
                            }}
                          >
                            ₹{trainerTotal.toLocaleString("en-IN")}
                          </span>
                        )}
                        {trainerCommission > 0 && (
                          <span
                            style={{
                              fontSize: "11px",
                              color: COLOR_UPI,
                              fontFamily: mono,
                            }}
                          >
                            comm ₹{trainerCommission.toLocaleString("en-IN")}
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp size={14} color="#555" />
                        ) : (
                          <ChevronDown size={14} color="#555" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div
                        style={{
                          padding: "12px 14px",
                          backgroundColor: "#0e0e0e",
                          borderTop: "1px solid #1e1e1e",
                        }}
                      >
                        {/* Monthly Summary */}
                        {trainerRecords.length > 0 && (
                          <div
                            style={{
                              backgroundColor: "#0a1a0e",
                              border: "1px solid #00ff8833",
                              borderRadius: "6px",
                              padding: "12px",
                              marginBottom: "16px",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "10px",
                                color: "#555",
                                fontFamily: "'JetBrains Mono', monospace",
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                                marginBottom: "8px",
                              }}
                            >
                              Monthly Summary
                            </div>
                            <div
                              style={{
                                fontSize: "22px",
                                fontWeight: 800,
                                color: "#00ff88",
                                fontFamily: "'JetBrains Mono', monospace",
                                marginBottom: "10px",
                              }}
                            >
                              ₹{trainerTotal.toLocaleString("en-IN")}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "4px",
                              }}
                            >
                              {trainerRecords.map((r) => (
                                <div
                                  key={r.id}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    fontSize: "12px",
                                    fontFamily: "'JetBrains Mono', monospace",
                                    color: "#aaa",
                                    padding: "3px 0",
                                    borderBottom: "1px solid #1a1a1a",
                                  }}
                                >
                                  <span>{r.date || "—"}</span>
                                  <span
                                    style={{
                                      color: "#e0e0e0",
                                      fontWeight: 600,
                                    }}
                                  >
                                    ₹{r.amount.toLocaleString("en-IN")}
                                    {r.byHand > 0 && (
                                      <span
                                        style={{
                                          color: "#555",
                                          fontSize: "10px",
                                        }}
                                      >
                                        {" "}
                                        (cash ₹
                                        {r.byHand.toLocaleString("en-IN")})
                                      </span>
                                    )}
                                    {r.upi > 0 && (
                                      <span
                                        style={{
                                          color: "#a78bfa",
                                          fontSize: "10px",
                                        }}
                                      >
                                        {" "}
                                        (UPI ₹{r.upi.toLocaleString("en-IN")})
                                      </span>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Entry Form */}
                        {!isClosed && pinUnlocked && (
                          <div style={{ marginBottom: "16px" }}>
                            <div
                              style={{
                                fontSize: "10px",
                                color: "#555",
                                fontFamily: mono,
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                                marginBottom: "10px",
                              }}
                            >
                              Add Entry
                            </div>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "8px",
                                marginBottom: "8px",
                              }}
                            >
                              <div>
                                <span style={{ ...labelStyle }}>Amount ₹</span>
                                <input
                                  type="number"
                                  value={form.amount}
                                  onChange={(e) =>
                                    setForm(periodKey, trainer.id, {
                                      amount: e.target.value,
                                    })
                                  }
                                  style={{
                                    ...inputStyle,
                                    fontSize: "13px",
                                    padding: "8px 10px",
                                  }}
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <span style={{ ...labelStyle }}>Date</span>
                                <input
                                  type="date"
                                  value={form.date}
                                  onChange={(e) =>
                                    setForm(periodKey, trainer.id, {
                                      date: e.target.value,
                                    })
                                  }
                                  style={{
                                    ...inputStyle,
                                    fontSize: "13px",
                                    padding: "8px 10px",
                                  }}
                                />
                              </div>
                              <div>
                                <span style={{ ...labelStyle }}>By Hand ₹</span>
                                <input
                                  type="number"
                                  value={form.byHand}
                                  onChange={(e) =>
                                    setForm(periodKey, trainer.id, {
                                      byHand: e.target.value,
                                    })
                                  }
                                  style={{
                                    ...inputStyle,
                                    fontSize: "13px",
                                    padding: "8px 10px",
                                  }}
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <span style={{ ...labelStyle }}>UPI ₹</span>
                                <input
                                  type="number"
                                  value={form.upi}
                                  onChange={(e) =>
                                    setForm(periodKey, trainer.id, {
                                      upi: e.target.value,
                                    })
                                  }
                                  style={{
                                    ...inputStyle,
                                    fontSize: "13px",
                                    padding: "8px 10px",
                                  }}
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <span style={{ ...labelStyle }}>
                                  Commission ₹
                                </span>
                                <input
                                  type="number"
                                  value={form.commission}
                                  onChange={(e) =>
                                    setForm(periodKey, trainer.id, {
                                      commission: e.target.value,
                                    })
                                  }
                                  style={{
                                    ...inputStyle,
                                    fontSize: "13px",
                                    padding: "8px 10px",
                                  }}
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <span style={{ ...labelStyle }}>Notes</span>
                                <input
                                  type="text"
                                  value={form.notes}
                                  onChange={(e) =>
                                    setForm(periodKey, trainer.id, {
                                      notes: e.target.value,
                                    })
                                  }
                                  style={{
                                    ...inputStyle,
                                    fontSize: "13px",
                                    padding: "8px 10px",
                                  }}
                                  placeholder="Optional note"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              data-ocid="advance.record.add_button"
                              onClick={() =>
                                handleAddRecord(periodKey, trainer)
                              }
                              style={{
                                width: "100%",
                                backgroundColor: `${COLOR_CASH}18`,
                                border: `1px solid ${COLOR_CASH}44`,
                                color: COLOR_CASH,
                                borderRadius: "8px",
                                padding: "10px",
                                fontFamily: mono,
                                fontSize: "12px",
                                fontWeight: 700,
                                cursor: "pointer",
                                letterSpacing: "0.05em",
                              }}
                            >
                              + ADD ENTRY
                            </button>
                          </div>
                        )}

                        {/* Records List */}
                        {trainerRecords.length === 0 ? (
                          <div
                            data-ocid="advance.records.empty_state"
                            style={{
                              textAlign: "center",
                              color: "#333",
                              fontFamily: mono,
                              fontSize: "11px",
                              padding: "12px 0",
                            }}
                          >
                            No entries yet
                          </div>
                        ) : (
                          <div>
                            <div
                              style={{
                                fontSize: "10px",
                                color: "#555",
                                fontFamily: mono,
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                                marginBottom: "8px",
                              }}
                            >
                              Entries
                            </div>
                            {/* Table header */}
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "70px 60px 60px 60px 1fr 60px",
                                gap: "6px",
                                padding: "6px 8px",
                                fontSize: "8px",
                                color: "#444",
                                fontFamily: mono,
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                                borderBottom: "1px solid #1e1e1e",
                                marginBottom: "4px",
                              }}
                            >
                              <span>Date</span>
                              <span>Amt</span>
                              <span>Hand</span>
                              <span>UPI</span>
                              <span>Notes</span>
                              <span>Comm</span>
                            </div>
                            {trainerRecords.map((rec, ri) => (
                              <div
                                key={rec.id}
                                data-ocid={`advance.records.item.${ri + 1}`}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns:
                                    "70px 60px 60px 60px 1fr 60px",
                                  gap: "6px",
                                  padding: "7px 8px",
                                  fontSize: "11px",
                                  fontFamily: mono,
                                  color: "#aaa",
                                  borderBottom: "1px solid #141414",
                                  alignItems: "center",
                                }}
                              >
                                <span style={{ color: "#666" }}>
                                  {rec.date}
                                </span>
                                <span
                                  style={{ color: COLOR_CASH, fontWeight: 700 }}
                                >
                                  ₹{rec.amount}
                                </span>
                                <span style={{ color: "#888" }}>
                                  ₹{rec.byHand}
                                </span>
                                <span style={{ color: COLOR_UPI }}>
                                  ₹{rec.upi}
                                </span>
                                <span
                                  style={{
                                    color: "#555",
                                    fontSize: "10px",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {rec.notes || "—"}
                                </span>
                                <span
                                  style={{ color: COLOR_UPI, fontWeight: 700 }}
                                >
                                  ₹{rec.commission}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────
// Main App
// ──────────────────────────────────────────────
export default function App() {
  const { user, logout } = useAuth0();
  // Active page
  const [activePage, setActivePage] = useState<ActivePage>("home");

  // Advance Payment state
  const [advanceTrainers, setAdvanceTrainers] = useState<AdvanceTrainer[]>(
    () => {
      try {
        return JSON.parse(
          localStorage.getItem("akpack_advance_trainers") || "[]",
        );
      } catch {
        return [];
      }
    },
  );
  const [advanceRecords, setAdvanceRecords] = useState<AdvanceRecord[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("akpack_advance_records") || "[]");
    } catch {
      return [];
    }
  });
  const [closedPeriods, setClosedPeriods] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("akpack_closed_periods") || "[]");
    } catch {
      return [];
    }
  });
  const [adminPin, setAdminPin] = useState<string>(
    () => localStorage.getItem("akpack_admin_pin") || "",
  );
  const [pinUnlocked, setPinUnlocked] = useState(false);

  // Entries
  const [entries, setEntries] = useState<Entry[]>(() => {
    try {
      const stored = localStorage.getItem(getTodayKey());
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [_advanceLoading, setAdvanceLoading] = useState(false);

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
    () => localStorage.getItem("akpack_webhook_url") || APPS_SCRIPT_URL,
  );
  // Auto-initialize Apps Script URL on first load
  useEffect(() => {
    if (!localStorage.getItem("akpack_webhook_url")) {
      localStorage.setItem("akpack_webhook_url", APPS_SCRIPT_URL);
    }
  }, []);

  // Sync admin PIN from Google Sheets on mount
  useEffect(() => {
    const url = localStorage.getItem("akpack_webhook_url") || APPS_SCRIPT_URL;
    if (!url) return;
    fetchConfigFromSheet(url).then((cfg) => {
      if (cfg?.adminPin) {
        setAdminPin(cfg.adminPin);
        localStorage.setItem("akpack_admin_pin", cfg.adminPin);
      }
    });
  }, []);

  // Fetch today's entries from Google Sheets on mount
  useEffect(() => {
    const url = localStorage.getItem("akpack_webhook_url") || APPS_SCRIPT_URL;
    if (!url) return;
    const todayStr = new Date().toISOString().split("T")[0];
    setEntriesLoading(true);
    fetchEntriesFromSheet(todayStr, url).then((fetched) => {
      if (fetched !== null && fetched.length > 0) {
        setEntries(fetched);
        localStorage.setItem(getTodayKey(), JSON.stringify(fetched));
      }
      setEntriesLoading(false);
    });
    // Also fetch advance records
    setAdvanceLoading(true);
    fetchAdvanceRecordsFromSheet(url).then((fetched) => {
      if (fetched !== null && fetched.length > 0) {
        setAdvanceRecords(fetched);
      }
      setAdvanceLoading(false);
    });
  }, []);

  // Persist entries
  useEffect(() => {
    localStorage.setItem(getTodayKey(), JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem(
      "akpack_advance_trainers",
      JSON.stringify(advanceTrainers),
    );
  }, [advanceTrainers]);
  useEffect(() => {
    localStorage.setItem(
      "akpack_advance_records",
      JSON.stringify(advanceRecords),
    );
  }, [advanceRecords]);
  useEffect(() => {
    localStorage.setItem(
      "akpack_closed_periods",
      JSON.stringify(closedPeriods),
    );
  }, [closedPeriods]);

  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  const handleEditSave = useCallback((updated: Entry) => {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setEditingEntry(null);
    const url = localStorage.getItem("akpack_webhook_url");
    if (url) {
      fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          sheet: "Accounts",
          id: updated.id,
          name: updated.name,
          memberId: updated.memberId,
          type: updated.type,
          cash: updated.cash,
          upi: updated.upi,
          note: updated.note,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {});
    }
  }, []);

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
          action: "save",
          sheet: "Accounts",
          id: newEntry.id,
          name: newEntry.name,
          memberId: newEntry.memberId,
          type: newEntry.type,
          cash: newEntry.cash,
          upi: newEntry.upi,
          note: newEntry.note,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {});
    }
  }, []);

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
      <style>{`
        @keyframes spin { from { transform: translateY(-50%) rotate(0deg); } to { transform: translateY(-50%) rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .dot-pulse { animation: pulse 1.2s ease-in-out infinite; }
      `}</style>
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
            paddingBottom: "16px",
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {entriesLoading && (
              <div
                data-ocid="home.loading_state"
                style={{
                  fontSize: "10px",
                  color: "#555",
                  fontFamily: "'JetBrains Mono', monospace",
                  animation: "pulse 1.2s ease-in-out infinite",
                }}
              >
                syncing...
              </div>
            )}
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
            {/* User info + logout */}
            {user && (
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    overflow: "hidden",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    color: "#00ff88",
                    fontWeight: 700,
                  }}
                >
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name || "User"}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    (user.name || user.email || "?")[0].toUpperCase()
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    logout({
                      logoutParams: { returnTo: window.location.origin },
                    })
                  }
                  title={`Logged in as ${user.name || user.email}`}
                  style={{
                    backgroundColor: "#141414",
                    border: "1px solid #222",
                    borderRadius: "20px",
                    padding: "5px 10px",
                    fontSize: "10px",
                    color: "#666",
                    fontFamily: "'JetBrains Mono', monospace",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* ── Tab Switcher ── */}
        <div
          style={{
            backgroundColor: "#111",
            border: "1px solid #1e1e1e",
            borderRadius: "10px",
            padding: "4px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "4px",
            marginBottom: "20px",
          }}
        >
          <button
            type="button"
            data-ocid="nav.home.tab"
            onClick={() => setActivePage("home")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "10px 0",
              borderRadius: "7px",
              border: "none",
              cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              transition: "all 0.15s ease",
              backgroundColor:
                activePage === "home" ? "#1e1e1e" : "transparent",
              color: activePage === "home" ? "#f0f0f0" : "#555",
              boxShadow:
                activePage === "home" ? "0 1px 3px rgba(0,0,0,0.4)" : "none",
            }}
          >
            <Home size={12} />
            Home
          </button>
          <button
            type="button"
            data-ocid="nav.collection.tab"
            onClick={() => setActivePage("collection")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "10px 0",
              borderRadius: "7px",
              border: "none",
              cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              transition: "all 0.15s ease",
              backgroundColor:
                activePage === "collection" ? `${COLOR_CASH}18` : "transparent",
              color: activePage === "collection" ? COLOR_CASH : "#555",
              boxShadow:
                activePage === "collection"
                  ? `0 1px 3px rgba(0,0,0,0.4), inset 0 0 0 1px ${COLOR_CASH}22`
                  : "none",
            }}
          >
            <LayoutList size={12} />
            Collection
          </button>
          <button
            type="button"
            data-ocid="nav.advance.tab"
            onClick={() => setActivePage("advance")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "10px 0",
              borderRadius: "7px",
              border: "none",
              cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              transition: "all 0.15s ease",
              backgroundColor:
                activePage === "advance" ? `${COLOR_UPI}18` : "transparent",
              color: activePage === "advance" ? COLOR_UPI : "#555",
              boxShadow:
                activePage === "advance"
                  ? `0 1px 3px rgba(0,0,0,0.4), inset 0 0 0 1px ${COLOR_UPI}22`
                  : "none",
            }}
          >
            <Wallet size={12} />
            Advance
          </button>
        </div>

        {/* ── Pages ── */}
        {activePage === "home" ? (
          <>
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
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
                    margin: 0,
                  }}
                >
                  Manual Entry
                </h2>
              </div>

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
                    style={{ ...inputStyle }}
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
                    style={{ ...inputStyle }}
                  />
                </div>
              </div>

              {/* Type Toggle */}
              <div style={{ marginBottom: "10px" }}>
                <p style={{ ...labelStyle, marginBottom: "6px" }}>Type</p>
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
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {entries.map((entry, i) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      index={i}
                      onEdit={setEditingEntry}
                    />
                  ))}
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
                <span
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Settings size={12} />
                  Settings
                </span>
                {settingsOpen ? (
                  <ChevronUp size={12} />
                ) : (
                  <ChevronDown size={12} />
                )}
              </button>

              {settingsOpen && (
                <div
                  data-ocid="settings.panel"
                  style={{ borderTop: "1px solid #1e1e1e", padding: "16px" }}
                >
                  {/* Unified Apps Script URL */}
                  <label
                    htmlFor="webhook-url"
                    style={{ ...labelStyle, marginBottom: "4px" }}
                  >
                    Google Apps Script URL
                  </label>
                  <p
                    style={{
                      fontSize: "10px",
                      color: "#444",
                      margin: "0 0 6px",
                      lineHeight: 1.5,
                    }}
                  >
                    Single URL for both member lookup (Members sheet) and saving
                    daily reports (Accounts sheet).
                  </p>
                  <input
                    id="webhook-url"
                    data-ocid="settings.input"
                    type="url"
                    placeholder="https://script.google.com/macros/s/..."
                    value={webhookInput}
                    onChange={(e) => {
                      setWebhookInput(e.target.value);
                    }}
                    style={{
                      ...inputStyle,
                      marginBottom: "10px",
                      fontSize: "12px",
                      borderColor: webhookInput ? `${COLOR_CASH}33` : "#222",
                    }}
                  />

                  <button
                    type="button"
                    data-ocid="settings.save_button"
                    onClick={() => {
                      localStorage.setItem("akpack_webhook_url", webhookInput);
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
                    Save Settings
                  </button>

                  {/* Apps Script instructions */}
                  <div
                    style={{
                      marginTop: "16px",
                      borderTop: "1px solid #1a1a1a",
                      paddingTop: "14px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "9px",
                        color: "#444",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        marginBottom: "8px",
                      }}
                    >
                      Apps Script — Full Code (Lookup + Save)
                    </p>
                    <pre
                      style={{
                        backgroundColor: "#0a0a0a",
                        border: "1px solid #1a1a1a",
                        borderRadius: "6px",
                        padding: "12px",
                        fontSize: "10px",
                        color: "#666",
                        overflow: "auto",
                        lineHeight: 1.6,
                        margin: 0,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                      }}
                    >{`var SPREADSHEET_ID = '1No1CQ_w2aI8__AH2yG1JyNtQeHGwl7fGOfpREPk_Cy4';

function doGet(e) {
  var action = e.parameter.action || "";
  if (action === "getEntries") return handleGetEntries(e);
  return respond({ status: "ok", message: "Connected" });
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheetName = data.sheet || "Accounts";
    if (sheetName === "Accounts") return handleAccounts(ss, data);
    if (sheetName === "Advance Payments") return handleAdvance(ss, data);
    return respond({ error: "Unknown sheet" });
  } catch(err) {
    return respond({ error: err.toString() });
  }
}

// ── Header helpers ──────────────────────────────────────────────────────────

function getOrCreate(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1,1,1,headers.length).setFontWeight("bold");
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1,1,1,headers.length).setFontWeight("bold");
  }
  return sheet;
}

function colIdx(headers, name) {
  var lc = headers.map(function(h){ return String(h).trim().toLowerCase(); });
  return lc.indexOf(name.toLowerCase());
}

function findRowByCol(sheet, headers, colName, value) {
  var ci = colIdx(headers, colName);
  if (ci === -1) return -1;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][ci]).trim() === String(value).trim()) return i + 1;
  }
  return -1;
}

function setByHeader(sheet, rowNum, headers, obj) {
  for (var key in obj) {
    var ci = colIdx(headers, key);
    if (ci !== -1) sheet.getRange(rowNum, ci + 1).setValue(obj[key]);
  }
}

function appendByHeader(sheet, headers, obj) {
  var row = new Array(headers.length).fill("");
  for (var key in obj) {
    var ci = colIdx(headers, key);
    if (ci !== -1) row[ci] = obj[key];
  }
  sheet.appendRow(row);
}

// ── IST date/time ────────────────────────────────────────────────────────────

function getIST() {
  var now = new Date();
  var ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  var dd = String(ist.getUTCDate()).padStart(2,"0");
  var mm = String(ist.getUTCMonth()+1).padStart(2,"0");
  var yyyy = ist.getUTCFullYear();
  var hh = String(ist.getUTCHours()).padStart(2,"0");
  var mi = String(ist.getUTCMinutes()).padStart(2,"0");
  var ss = String(ist.getUTCSeconds()).padStart(2,"0");
  return { date: dd+"-"+mm+"-"+yyyy, time: hh+":"+mi+":"+ss+" IST" };
}

// ── Accounts ─────────────────────────────────────────────────────────────────

var ACCOUNTS_HEADERS = ["Entry ID","Name","Membership ID","Type","Cash","UPI","Note","Timestamp"];

function handleAccounts(ss, data) {
  var sheet = getOrCreate(ss, "Accounts", ACCOUNTS_HEADERS);
  var headers = sheet.getDataRange().getValues()[0].map(function(h){ return String(h).trim(); });

  if (data.action === "update" && data.id) {
    var rowNum = findRowByCol(sheet, headers, "Entry ID", data.id);
    if (rowNum !== -1) {
      setByHeader(sheet, rowNum, headers, {
        "Name": data.name || "",
        "Membership ID": data.memberId || "",
        "Type": data.type || "",
        "Cash": data.cash || 0,
        "UPI": data.upi || 0,
        "Note": data.note || "",
        "Timestamp": data.timestamp || new Date().toISOString()
      });
      return respond({ status: "ok", updated: true });
    }
  }

  appendByHeader(sheet, headers, {
    "Entry ID": data.id || Utilities.getUuid(),
    "Name": data.name || "",
    "Membership ID": data.memberId || "",
    "Type": data.type || "",
    "Cash": data.cash || 0,
    "UPI": data.upi || 0,
    "Note": data.note || "",
    "Timestamp": data.timestamp || new Date().toISOString()
  });
  return respond({ status: "ok", inserted: true });
}

// ── Advance Payments ──────────────────────────────────────────────────────────

var AP_HEADERS = ["Entry ID","Trainer Name","Period","Amount","Date","By Hand","UPI","Notes","Commission","Status","Saved Date","Saved Time"];

function handleAdvance(ss, data) {
  var sheet = getOrCreate(ss, "Advance Payments", AP_HEADERS);
  var headers = sheet.getDataRange().getValues()[0].map(function(h){ return String(h).trim(); });
  var ist = getIST();

  if (data.action === "update" && data.entryId) {
    var rowNum = findRowByCol(sheet, headers, "Entry ID", data.entryId);
    if (rowNum !== -1) {
      setByHeader(sheet, rowNum, headers, {
        "Trainer Name": data.trainerName || data.trainer || "",
        "Period": data.period || "",
        "Amount": data.amount || 0,
        "Date": data.date || "",
        "By Hand": data.byHand || 0,
        "UPI": data.upi || 0,
        "Notes": data.notes || "",
        "Commission": data.commission || 0,
        "Status": data.status || "open",
        "Saved Date": ist.date,
        "Saved Time": ist.time
      });
      return respond({ status: "ok", updated: true });
    }
  }

  appendByHeader(sheet, headers, {
    "Entry ID": data.entryId || Utilities.getUuid(),
    "Trainer Name": data.trainerName || data.trainer || "",
    "Period": data.period || "",
    "Amount": data.amount || 0,
    "Date": data.date || "",
    "By Hand": data.byHand || 0,
    "UPI": data.upi || 0,
    "Notes": data.notes || "",
    "Commission": data.commission || 0,
    "Status": data.status || "open",
    "Saved Date": data.savedDate || ist.date,
    "Saved Time": data.savedTime || ist.time
  });
  return respond({ status: "ok", inserted: true });
}

// ── Get Entries ───────────────────────────────────────────────────────────────

function handleGetEntries(e) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheetName = e.parameter.sheet || "Accounts";
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) return respond([]);
    var data = sheet.getDataRange().getValues();
    var headers = data[0].map(function(h){ return String(h).trim(); });
    var rows = [];

    if (sheetName === "Accounts") {
      var dateFilter = e.parameter.date || "";
      for (var i = 1; i < data.length; i++) {
        var ts = String(data[i][colIdx(headers,"Timestamp")] || "");
        if (dateFilter && !ts.startsWith(dateFilter)) continue;
        rows.push({
          id:       String(data[i][colIdx(headers,"Entry ID")] || ""),
          name:     String(data[i][colIdx(headers,"Name")] || ""),
          memberId: String(data[i][colIdx(headers,"Membership ID")] || ""),
          type:     String(data[i][colIdx(headers,"Type")] || "cash"),
          cash:     Number(data[i][colIdx(headers,"Cash")]) || 0,
          upi:      Number(data[i][colIdx(headers,"UPI")]) || 0,
          note:     String(data[i][colIdx(headers,"Note")] || ""),
          time:     ts ? new Date(ts).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}) : ""
        });
      }
    } else if (sheetName === "Advance Payments") {
      for (var j = 1; j < data.length; j++) {
        rows.push({
          id:         String(data[j][colIdx(headers,"Entry ID")] || ""),
          trainer:    String(data[j][colIdx(headers,"Trainer Name")] || ""),
          trainerId:  String(data[j][colIdx(headers,"Trainer Name")] || ""),
          period:     String(data[j][colIdx(headers,"Period")] || ""),
          amount:     Number(data[j][colIdx(headers,"Amount")]) || 0,
          date:       String(data[j][colIdx(headers,"Date")] || ""),
          byHand:     Number(data[j][colIdx(headers,"By Hand")]) || 0,
          upi:        Number(data[j][colIdx(headers,"UPI")]) || 0,
          notes:      String(data[j][colIdx(headers,"Notes")] || ""),
          commission: Number(data[j][colIdx(headers,"Commission")]) || 0,
          status:     String(data[j][colIdx(headers,"Status")] || "open")
        });
      }
    }
    return respond(rows);
  } catch(err) {
    return respond({ error: err.message });
  }
}

// ── Respond ───────────────────────────────────────────────────────────────────

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}`}</pre>
                    <p
                      style={{
                        fontSize: "9px",
                        color: "#333",
                        marginTop: "8px",
                        lineHeight: 1.5,
                      }}
                    >
                      Deploy as Web App → Execute as: Me → Who has access:
                      Anyone. Handles member lookup (Members sheet), saving
                      entries (Accounts sheet), and advance payments (Advance
                      Payments sheet). Columns are auto-created on first use.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </>
        ) : activePage === "collection" ? (
          <CollectionPage
            todayEntries={entries}
            onEdit={setEditingEntry}
            scriptUrl={webhookInput}
          />
        ) : (
          <AdvancePaymentPage
            trainers={advanceTrainers}
            setTrainers={setAdvanceTrainers}
            records={advanceRecords}
            setRecords={setAdvanceRecords}
            closedPeriods={closedPeriods}
            setClosedPeriods={setClosedPeriods}
            adminPin={adminPin}
            setAdminPin={setAdminPin}
            pinUnlocked={pinUnlocked}
            setPinUnlocked={setPinUnlocked}
            scriptUrl={webhookInput}
          />
        )}

        <EditEntryModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSave={handleEditSave}
        />

        {/* ── Footer ── */}
        <footer
          style={{
            textAlign: "center",
            fontSize: "10px",
            color: "#333",
            fontFamily: "'JetBrains Mono', monospace",
            paddingBottom: "16px",
            marginTop: "8px",
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
