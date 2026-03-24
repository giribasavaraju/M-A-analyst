import { C } from "./constants.js";

export function KPICard({ label, value, sub, color }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: "18px 22px", flex: 1, minWidth: 140,
      borderTop: `3px solid ${color || C.accent}`
    }}>
      <div style={{ fontSize: 11, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || C.accent, fontFamily: "'Courier New', monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export function Bar({ pct, color }) {
  return (
    <div style={{ background: C.border, borderRadius: 4, height: 6, width: "100%", overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: "100%", background: color || C.accent, borderRadius: 4, transition: "width 0.4s" }} />
    </div>
  );
}

export function Badge({ label, color }) {
  return (
    <span style={{
      background: `${color}22`, color, border: `1px solid ${color}55`,
      borderRadius: 20, padding: "2px 10px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap"
    }}>{label}</span>
  );
}

export function SortHeader({ label, field, sort, onSort }) {
  const active = sort.field === field;
  return (
    <th
      onClick={() => onSort(field)}
      style={{
        padding: "10px 14px", fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
        textTransform: "uppercase", color: active ? C.accent : C.muted,
        cursor: "pointer", whiteSpace: "nowrap", userSelect: "none",
        borderBottom: `2px solid ${active ? C.accent : C.border}`,
        background: C.surface
      }}
    >
      {label} {active ? (sort.dir === "asc" ? "↑" : "↓") : ""}
    </th>
  );
}
