import { useMemo } from "react";
import { C, TA_COLORS, TIER_CONFIG } from "../constants.js";
import { fmt, fmtPct } from "../utils.js";
import { Badge } from "../components.js";

export function TierTab({ data }) {
  const tiers = ["Blockbuster", "Major Brand", "Mid-Market", "Emerging"];
  const groups = useMemo(() => {
    const g = {};
    tiers.forEach(t => { g[t] = data.filter(r => r._tier === t).sort((a, b) => (b._sales || 0) - (a._sales || 0)); });
    return g;
  }, [data]);

  return (
    <div style={{ padding: "28px 32px" }}>
      {tiers.map(tier => {
        const rows = groups[tier] || [];
        const cfg = TIER_CONFIG[tier];
        const total = rows.reduce((s, r) => s + (r._sales || 0), 0);
        if (!rows.length) return null;
        return (
          <div key={tier} style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <div style={{ background: cfg.color, color: C.bg, padding: "4px 16px", borderRadius: 20, fontSize: 13, fontWeight: 800 }}>{tier}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{cfg.label} · {rows.length} products · {fmt(total)} total</div>
            </div>
            <div style={{ overflowX: "auto", borderRadius: 10, border: `1px solid ${C.border}` }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: C.surface }}>
                    {["#", "Product", "Company", "Therapy Area", "Revenue", "YoY Growth", "Type"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: C.muted, textTransform: "uppercase", textAlign: "left", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? C.surface : C.card, borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "10px 14px", color: C.muted, fontFamily: "monospace" }}>{i + 1}</td>
                      <td style={{ padding: "10px 14px", color: C.text, fontWeight: 700 }}>{r._name}</td>
                      <td style={{ padding: "10px 14px", color: C.muted }}>{r._company || "—"}</td>
                      <td style={{ padding: "10px 14px" }}><Badge label={r._ta} color={TA_COLORS[r._ta] || C.muted} /></td>
                      <td style={{ padding: "10px 14px", fontFamily: "monospace", fontWeight: 800, color: cfg.color }}>{fmt(r._sales)}</td>
                      <td style={{ padding: "10px 14px", fontFamily: "monospace", color: r._growth >= 0 ? C.green : C.red }}>{fmtPct(r._growth)}</td>
                      <td style={{ padding: "10px 14px" }}><Badge label={r._brandType} color={r._brandType === "Brand" ? C.accent : r._brandType === "Biosimilar" ? C.accent4 : C.muted} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
