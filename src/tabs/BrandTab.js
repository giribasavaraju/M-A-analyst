import { useMemo } from "react";
import { C, TA_COLORS, TIER_CONFIG } from "../constants.js";
import { fmt, fmtPct } from "../utils.js";
import { Badge } from "../components.js";

export function BrandTab({ data }) {
  const types = ["Brand", "Biosimilar", "Generic"];
  const typeColors = { Brand: C.accent, Biosimilar: C.accent4, Generic: C.muted };
  const typeDesc = {
    Brand: "Originator / innovator branded products",
    Biosimilar: "Biosimilar / similar biologic products",
    Generic: "Generic manufacturers and off-patent molecules"
  };

  const groups = useMemo(() => {
    const g = {};
    types.forEach(t => { g[t] = data.filter(r => r._brandType === t).sort((a, b) => (b._sales || 0) - (a._sales || 0)); });
    return g;
  }, [data]);

  return (
    <div style={{ padding: "28px 32px" }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
        {types.map(t => {
          const rows = groups[t] || [];
          const total = rows.reduce((s, r) => s + (r._sales || 0), 0);
          return (
            <div key={t} style={{
              flex: 1, background: C.card, borderRadius: 12, padding: "18px 22px",
              border: `1px solid ${typeColors[t]}44`, borderTop: `3px solid ${typeColors[t]}`
            }}>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 6 }}>{t.toUpperCase()}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: typeColors[t], fontFamily: "monospace" }}>{rows.length}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{fmt(total)} total revenue</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{typeDesc[t]}</div>
            </div>
          );
        })}
      </div>

      {types.map(t => {
        const rows = groups[t] || [];
        if (!rows.length) return null;
        const color = typeColors[t];
        return (
          <div key={t} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>{t} Products</div>
            <div style={{ overflowX: "auto", borderRadius: 10, border: `1px solid ${C.border}` }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: C.surface }}>
                    {["Product", "Company", "Therapy Area", "Revenue", "YoY Growth", "Tier"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: C.muted, textTransform: "uppercase", textAlign: "left", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? C.surface : C.card, borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "10px 14px", color: C.text, fontWeight: 700 }}>{r._name}</td>
                      <td style={{ padding: "10px 14px", color: C.muted }}>{r._company || "—"}</td>
                      <td style={{ padding: "10px 14px" }}><Badge label={r._ta} color={TA_COLORS[r._ta] || C.muted} /></td>
                      <td style={{ padding: "10px 14px", fontFamily: "monospace", fontWeight: 800, color }}>{fmt(r._sales)}</td>
                      <td style={{ padding: "10px 14px", fontFamily: "monospace", color: r._growth >= 0 ? C.green : C.red }}>{fmtPct(r._growth)}</td>
                      <td style={{ padding: "10px 14px" }}><Badge label={r._tier} color={TIER_CONFIG[r._tier]?.color || C.muted} /></td>
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
