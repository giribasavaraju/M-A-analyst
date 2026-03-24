import { useMemo } from "react";
import { C, TA_COLORS } from "../constants.js";
import { fmt, fmtPct } from "../utils.js";
import { Bar, Badge } from "../components.js";

export function TherapyTab({ data }) {
  const groups = useMemo(() => {
    const g = {};
    data.forEach(r => {
      if (!g[r._ta]) g[r._ta] = [];
      g[r._ta].push(r);
    });
    return Object.entries(g).sort((a, b) =>
      b[1].reduce((s, r) => s + (r._sales || 0), 0) - a[1].reduce((s, r) => s + (r._sales || 0), 0)
    );
  }, [data]);

  return (
    <div style={{ padding: "28px 32px" }}>
      {groups.map(([ta, rows]) => {
        const total = rows.reduce((s, r) => s + (r._sales || 0), 0);
        const top = [...rows].sort((a, b) => (b._sales || 0) - (a._sales || 0)).slice(0, 8);
        const maxRev = top[0]?._sales || 1;
        const color = TA_COLORS[ta] || C.muted;
        return (
          <div key={ta} style={{ background: C.card, border: `1px solid ${color}44`, borderRadius: 14, padding: 24, marginBottom: 20, borderLeft: `4px solid ${color}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: color }} />
                <span style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{ta}</span>
                <span style={{ fontSize: 12, color: C.muted }}>{rows.length} products</span>
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 800, color }}>{fmt(total)}</div>
            </div>
            {top.map((r, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: C.text }}>{r._name}</span>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: r._growth >= 0 ? C.green : C.red, fontFamily: "monospace" }}>{fmtPct(r._growth)}</span>
                    <span style={{ fontSize: 12, color, fontFamily: "monospace", minWidth: 70, textAlign: "right" }}>{fmt(r._sales)}</span>
                  </div>
                </div>
                <Bar pct={(r._sales / maxRev) * 100} color={color} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
