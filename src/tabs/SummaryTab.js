import { C, TA_COLORS, GROWTH_CONFIG } from "../constants.js";
import { fmt, fmtPct, getGrowthLabel } from "../utils.js";
import { KPICard, Bar, Badge } from "../components.js";

export function SummaryTab({ data }) {
  const totalRev = data.reduce((s, r) => s + (r._sales || 0), 0);
  const avgGrowth = data.filter(r => !isNaN(r._growth)).reduce((s, r) => s + r._growth, 0) / (data.filter(r => !isNaN(r._growth)).length || 1);
  const byTA = Object.entries(
    data.reduce((acc, r) => { acc[r._ta] = (acc[r._ta] || 0) + (r._sales || 0); return acc; }, {})
  ).sort((a, b) => b[1] - a[1]);
  const maxTA = byTA[0]?.[1] || 1;

  const top10 = [...data].sort((a, b) => (b._sales || 0) - (a._sales || 0)).slice(0, 10);
  const maxTop = top10[0]?._sales || 1;

  const growthBuckets = GROWTH_CONFIG.map(g => ({
    ...g, count: data.filter(r => getGrowthLabel(r._growth) === g.label).length
  }));

  return (
    <div style={{ padding: "28px 32px" }}>
      {/* KPIs */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
        <KPICard label="Total Products" value={data.length} sub="in dataset" color={C.accent} />
        <KPICard label="Total Revenue" value={fmt(totalRev)} sub="across all products" color={C.accent3} />
        <KPICard label="Avg YoY Growth" value={fmtPct(avgGrowth)} sub="portfolio-wide" color={avgGrowth >= 0 ? C.green : C.red} />
        <KPICard label="Blockbusters" value={data.filter(r => r._tier === "Blockbuster").length} sub="> $10B revenue" color={C.accent3} />
        <KPICard label="High Growth" value={data.filter(r => r._growth >= 50).length} sub="≥ 50% YoY" color={C.green} />
        <KPICard label="Therapy Areas" value={new Set(data.map(r => r._ta)).size} sub="distinct TAs" color={C.accent4} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
        {/* By Therapy Area */}
        <div style={{ background: C.card, borderRadius: 14, padding: 24, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 18 }}>REVENUE BY THERAPY AREA</div>
          {byTA.map(([ta, rev]) => (
            <div key={ta} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{ta}</span>
                <span style={{ fontSize: 13, color: TA_COLORS[ta] || C.muted, fontFamily: "monospace" }}>{fmt(rev)}</span>
              </div>
              <Bar pct={(rev / maxTA) * 100} color={TA_COLORS[ta] || C.muted} />
            </div>
          ))}
        </div>

        {/* Growth Distribution */}
        <div style={{ background: C.card, borderRadius: 14, padding: 24, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 18 }}>GROWTH DISTRIBUTION</div>
          {growthBuckets.map(g => (
            <div key={g.label} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{g.label}</span>
                <span style={{ fontSize: 13, color: g.color, fontFamily: "monospace" }}>{g.count} products</span>
              </div>
              <Bar pct={(g.count / data.length) * 100} color={g.color} />
            </div>
          ))}
        </div>
      </div>

      {/* Top 10 */}
      <div style={{ background: C.card, borderRadius: 14, padding: 24, border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 18 }}>TOP 10 PRODUCTS BY REVENUE</div>
        {top10.map((r, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, color: C.muted, fontFamily: "monospace", width: 20 }}>#{i + 1}</span>
                <span style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>{r._name}</span>
                <Badge label={r._ta} color={TA_COLORS[r._ta] || C.muted} />
              </div>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: r._growth >= 0 ? C.green : C.red, fontFamily: "monospace" }}>{fmtPct(r._growth)}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: C.accent3, fontFamily: "monospace", minWidth: 80, textAlign: "right" }}>{fmt(r._sales)}</span>
              </div>
            </div>
            <Bar pct={(r._sales / maxTop) * 100} color={TA_COLORS[r._ta] || C.accent} />
          </div>
        ))}
      </div>
    </div>
  );
}
