import { useMemo } from "react";
import { C, TA_COLORS, GROWTH_CONFIG } from "../constants.js";
import { fmt, fmtPct, getGrowthLabel } from "../utils.js";
import { Badge } from "../components.js";

export function GrowthTab({ data }) {
  const groups = useMemo(() => {
    return GROWTH_CONFIG.map(g => ({
      ...g,
      rows: data.filter(r => getGrowthLabel(r._growth) === g.label)
        .sort((a, b) => (b._growth || 0) - (a._growth || 0))
    }));
  }, [data]);

  return (
    <div style={{ padding: "28px 32px" }}>
      {groups.map(g => {
        if (!g.rows.length) return null;
        return (
          <div key={g.label} style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ background: g.color, color: "#000", padding: "4px 16px", borderRadius: 20, fontSize: 13, fontWeight: 800 }}>{g.label}</div>
              <span style={{ fontSize: 11, color: C.muted }}>{g.rows.length} products</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {g.rows.map((r, i) => (
                <div key={i} style={{
                  background: C.card, border: `1px solid ${g.color}33`,
                  borderRadius: 10, padding: "14px 18px", borderLeft: `3px solid ${g.color}`
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6 }}>{r._name}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Badge label={r._ta} color={TA_COLORS[r._ta] || C.muted} />
                    <div style={{ display: "flex", gap: 12 }}>
                      <span style={{ fontSize: 12, fontFamily: "monospace", color: C.muted }}>{fmt(r._sales)}</span>
                      <span style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 800, color: g.color }}>{fmtPct(r._growth)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
