import { useMemo, useCallback, useState } from "react";
import * as XLSX from "xlsx";
import { C, TA_COLORS } from "../constants.js";
import { fmt, fmtPct } from "../utils.js";
import { PRIORITY_TAS, INDICATIVE_COMPS, scoreAsset, getRiskLevel, riskColor, riskEmoji, generateRationale, generateUSBusinessHighlight } from "../screening.js";
import { KPICard, Badge } from "../components.js";

export function ScreeningTab({ data }) {
  const screened = useMemo(() => {
    return data
      .filter(r => r._sales > 0 && r._sales < 25)
      .map(r => ({ ...r, _scores: scoreAsset(r) }))
      .sort((a, b) => b._scores.composite - a._scores.composite);
  }, [data]);

  const tier1 = screened.filter(r => r._scores.acqTier === "Tier 1");
  const tier2 = screened.filter(r => r._scores.acqTier === "Tier 2");
  const tier3 = screened.filter(r => r._scores.acqTier === "Tier 3");
  const totalEVBase = tier1.reduce((s, r) => s + r._sales * 3.0, 0);

  const [tooltip, setTooltip] = useState(null);

  const showTooltip = (e, r, s) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.right + 12;
    const y = rect.top;
    setTooltip({ r, s, x, y });
  };

  const RISK_ROWS = [
    { rkey: "patent", label: "Patent / IP Risk" },
    { rkey: "generic", label: "Generic Erosion Risk" },
    { rkey: "regulatory", label: "Regulatory Risk" },
    { rkey: "concentration", label: "Commercial Concentration Risk" },
    { rkey: "payer", label: "Payer / Reimbursement Risk" },
  ];

  const buildRows = useCallback(() =>
    screened.map((r, i) => {
      const s = r._scores;
      return {
        "Rank": i + 1,
        "Molecule / Brand": r._name,
        "Company": r._company || "",
        "Therapy Area": r._ta,
        "Type": r._brandType,
        "MAT Revenue ($M)": r._sales,
        "YoY Growth (%)": isNaN(r._growth) ? "" : r._growth,
        "Revenue Stability": s.revenueStability,
        "Growth Trajectory": s.growthTrajectory,
        "Competitive Moat": s.competitiveMoat,
        "Exclusivity Runway": s.exclusivityRunway,
        "Strategic Fit": s.strategicFit,
        "Composite Score": s.composite,
        "Tier": s.acqTier,
        "Priority Action": s.nextStep,
        "EV Low ($M) 2.0x": (r._sales * 2.0).toFixed(1),
        "EV Base ($M) 3.0x": (r._sales * 3.0).toFixed(1),
        "EV High ($M) 5.5x": (r._sales * 5.5).toFixed(1),
        "Patent / IP Risk": `${riskEmoji(getRiskLevel("patent", r))} ${getRiskLevel("patent", r)}`,
        "Generic Erosion Risk": `${riskEmoji(getRiskLevel("generic", r))} ${getRiskLevel("generic", r)}`,
        "Regulatory Risk": `${riskEmoji(getRiskLevel("regulatory", r))} ${getRiskLevel("regulatory", r)}`,
        "Concentration Risk": `${riskEmoji(getRiskLevel("concentration", r))} ${getRiskLevel("concentration", r)}`,
        "Payer Risk": `${riskEmoji(getRiskLevel("payer", r))} ${getRiskLevel("payer", r)}`,
        "Acquisition Rationale": generateRationale(r, s),
      };
    }), [screened]);

  const downloadCSV = useCallback(() => {
    const rows = buildRows();
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const escape = v => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers.map(escape).join(","), ...rows.map(r => headers.map(h => escape(r[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "MA_Screening_Sub25M.csv"; a.click();
    URL.revokeObjectURL(url);
  }, [buildRows]);

  const downloadXLSX = useCallback(() => {
    const rows = buildRows();
    if (!rows.length) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length, 18) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "M&A Screening Sub-$25M");
    XLSX.writeFile(wb, "MA_Screening_Sub25M.xlsx");
  }, [buildRows]);

  return (
    <div style={{ padding: "28px 32px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: C.accent, letterSpacing: 4, marginBottom: 6 }}>SUB-$25M ACQUISITION SCREEN</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 8 }}>M&A Screening Report</div>
          <div style={{ fontSize: 13, color: C.muted }}>
            Screening criteria: MAT Revenue &lt; $25M · Brand / Biosimilar / Niche assets · Priority TAs weighted
          </div>
        </div>
        {screened.length > 0 && (
          <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
            <button onClick={downloadCSV} style={{
              background: "transparent", border: `1px solid ${C.accent}`, color: C.accent,
              borderRadius: 8, padding: "8px 18px", fontSize: 12, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5
            }}>
              ↓ CSV
            </button>
            <button onClick={downloadXLSX} style={{
              background: C.accent, border: "none", color: C.bg,
              borderRadius: 8, padding: "8px 18px", fontSize: 12, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5
            }}>
              ↓ XLSX
            </button>
          </div>
        )}
      </div>

      {screened.length === 0 ? (
        <div style={{ background: C.card, borderRadius: 12, padding: 48, textAlign: "center", color: C.muted, border: `1px solid ${C.border}` }}>
          No assets passed the sub-$25M screening filters. Ensure your dataset includes revenue data in $M.
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
            <KPICard label="Assets Screened" value={screened.length} sub="passed primary filters" color={C.accent} />
            <KPICard label="Tier 1 — Priority" value={tier1.length} sub="composite score ≥35/50" color={C.green} />
            <KPICard label="Tier 2 — Watchlist" value={tier2.length} sub="composite score 25–34" color={C.accent3} />
            <KPICard label="Tier 3 — Pass" value={tier3.length} sub="composite score <25" color={C.muted} />
            <KPICard label="Tier 1 EV Pool" value={`$${totalEVBase.toFixed(0)}M`} sub="base case @ 3.0x rev" color={C.accent4} />
          </div>

          {/* Ranked Master Table */}
          <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, marginBottom: 36 }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: 2 }}>RANKED ACQUISITION SHORTLIST — ALL QUALIFYING ASSETS</div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: C.surface }}>
                    {["Rank", "Molecule / Brand", "Company", "TA", "Revenue $M", "Growth %", "Composite", "Tier", "Priority Action"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: C.muted, textTransform: "uppercase", textAlign: "left", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {screened.map((r, i) => {
                    const s = r._scores;
                    const tc = s.acqTier === "Tier 1" ? C.green : s.acqTier === "Tier 2" ? C.accent3 : C.muted;
                    return (
                      <tr key={i} style={{ background: i % 2 === 0 ? C.surface : C.card, borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "11px 14px", color: C.muted, fontFamily: "monospace" }}>{i + 1}</td>
                        <td
                          style={{ padding: "11px 14px", color: C.text, fontWeight: 700, cursor: "default", borderBottom: `1px dotted ${C.accent}55` }}
                          onMouseEnter={e => showTooltip(e, r, s)}
                          onMouseLeave={() => setTooltip(null)}
                        >{r._name}</td>
                        <td style={{ padding: "11px 14px", color: C.muted }}>{r._company || "—"}</td>
                        <td style={{ padding: "11px 14px" }}><Badge label={r._ta} color={TA_COLORS[r._ta] || C.muted} /></td>
                        <td style={{ padding: "11px 14px", fontFamily: "monospace", color: C.accent3, fontWeight: 700 }}>{fmt(r._sales)}</td>
                        <td style={{ padding: "11px 14px", fontFamily: "monospace", color: r._growth >= 0 ? C.green : C.red }}>{fmtPct(r._growth)}</td>
                        <td style={{ padding: "11px 14px", fontFamily: "monospace", fontWeight: 800, color: tc }}>{s.composite}/50</td>
                        <td style={{ padding: "11px 14px" }}><Badge label={s.acqTier} color={tc} /></td>
                        <td style={{ padding: "11px 14px", fontSize: 11, color: tc, fontWeight: 700 }}>{s.nextStep}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Individual Briefs — Tier 1 Only */}
          {tier1.length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <div style={{ fontSize: 11, color: C.green, letterSpacing: 3, marginBottom: 20 }}>TIER 1 ASSET BRIEFS — IMMEDIATE PRIORITY</div>
              {tier1.map((r, i) => {
                const s = r._scores;
                const evLow = (r._sales * 2.0).toFixed(1);
                const evBase = (r._sales * 3.0).toFixed(1);
                const evHigh = (r._sales * 5.5).toFixed(1);
                const scoringRows = [
                  {
                    dim: "Revenue Stability", score: s.revenueStability,
                    rationale: isNaN(r._growth) ? "[DATA NOT AVAILABLE — recommend verification]"
                      : r._growth > 0 ? `Positive YoY of ${fmtPct(r._growth)} supports revenue floor`
                      : `Decline of ${fmtPct(r._growth)} YoY; managed runoff expected`
                  },
                  {
                    dim: "Growth Trajectory", score: s.growthTrajectory,
                    rationale: isNaN(r._growth) ? "[DATA NOT AVAILABLE — recommend verification]"
                      : r._growth > 10 ? "Upward trajectory supports near-term revenue visibility"
                      : r._growth > -10 ? "Flat trajectory; stable base for acquirer"
                      : "Negative trend; price or volume erosion evident"
                  },
                  {
                    dim: "Competitive Moat", score: s.competitiveMoat,
                    rationale: r._brandType === "Brand" ? "Branded product with commercial differentiation potential"
                      : r._brandType === "Biosimilar" ? "Biosimilar; limited generic competition but eroding moat"
                      : "Generic; competitive positioning requires verification"
                  },
                  {
                    dim: "Exclusivity Runway", score: s.exclusivityRunway,
                    rationale: "[REQUIRES FDA ORANGE BOOK VERIFICATION] — estimated from brand classification"
                  },
                  {
                    dim: "Strategic Fit", score: s.strategicFit,
                    rationale: `${r._ta} ${PRIORITY_TAS.includes(r._ta) ? "aligns with priority TA mandate" : "presents moderate TA alignment for specialty acquirer"}`
                  },
                  { dim: "COMPOSITE SCORE", score: `${s.composite}/50`, rationale: `${s.acqTier} — ${s.nextStep}`, isTotal: true },
                ];
                return (
                  <div key={i} style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.green}44`, borderLeft: `4px solid ${C.green}`, marginBottom: 24, overflow: "hidden" }}>
                    {/* Brief Header */}
                    <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 8 }}>{r._name}</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <Badge label={r._ta} color={TA_COLORS[r._ta] || C.muted} />
                          <Badge label={r._brandType} color={r._brandType === "Brand" ? C.accent : C.accent4} />
                          <Badge label="Tier 1" color={C.green} />
                          {r._company && <Badge label={r._company} color={C.muted} />}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: C.green, fontFamily: "monospace" }}>{s.composite}/50</div>
                        <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1 }}>COMPOSITE SCORE</div>
                      </div>
                    </div>

                    <div style={{ padding: "24px" }}>
                      {/* ① Scoring Table */}
                      <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: 10, color: C.accent, letterSpacing: 2.5, marginBottom: 12, fontWeight: 700 }}>① ACQUISITION SCORING TABLE</div>
                        <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${C.border}` }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                              <tr style={{ background: C.surface }}>
                                <th style={{ padding: "9px 14px", textAlign: "left", color: C.muted, fontSize: 10, letterSpacing: 1.5, borderBottom: `1px solid ${C.border}` }}>DIMENSION</th>
                                <th style={{ padding: "9px 14px", textAlign: "center", color: C.muted, fontSize: 10, letterSpacing: 1.5, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>SCORE (0–10)</th>
                                <th style={{ padding: "9px 14px", textAlign: "left", color: C.muted, fontSize: 10, letterSpacing: 1.5, borderBottom: `1px solid ${C.border}` }}>RATIONALE</th>
                              </tr>
                            </thead>
                            <tbody>
                              {scoringRows.map((row, ri) => (
                                <tr key={ri} style={{ background: row.isTotal ? `${C.green}11` : ri % 2 === 0 ? C.surface : C.card, borderBottom: `1px solid ${C.border}` }}>
                                  <td style={{ padding: "10px 14px", color: row.isTotal ? C.green : C.text, fontWeight: row.isTotal ? 800 : 600 }}>{row.dim}</td>
                                  <td style={{ padding: "10px 14px", textAlign: "center", fontFamily: "monospace", fontWeight: 800, color: row.isTotal ? C.green : C.accent3 }}>{row.score}</td>
                                  <td style={{ padding: "10px 14px", color: C.muted, fontSize: 11 }}>{row.rationale}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                          ≥35/50 = Tier 1 (immediate priority) · 25–34 = Tier 2 (watchlist) · &lt;25 = Tier 3 (pass)
                        </div>
                      </div>

                      {/* ② Acquisition Rationale */}
                      <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: 10, color: C.accent, letterSpacing: 2.5, marginBottom: 10, fontWeight: 700 }}>② ACQUISITION RATIONALE</div>
                        <div style={{ background: C.surface, borderRadius: 8, padding: "16px 18px", fontSize: 13, color: C.text, lineHeight: 1.8, border: `1px solid ${C.border}` }}>
                          {generateRationale(r, s)}
                        </div>
                      </div>

                      {/* ③ Financial Snapshot */}
                      <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: 10, color: C.accent, letterSpacing: 2.5, marginBottom: 10, fontWeight: 700 }}>③ FINANCIAL SNAPSHOT</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 14 }}>
                          <div style={{ background: C.surface, borderRadius: 8, padding: "12px 16px", border: `1px solid ${C.border}` }}>
                            <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1.5, marginBottom: 4 }}>MAT REVENUE</div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: C.accent3, fontFamily: "monospace" }}>{fmt(r._sales)}</div>
                          </div>
                          <div style={{ background: C.surface, borderRadius: 8, padding: "12px 16px", border: `1px solid ${C.border}` }}>
                            <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1.5, marginBottom: 4 }}>YoY GROWTH</div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: r._growth >= 0 ? C.green : C.red, fontFamily: "monospace" }}>{fmtPct(r._growth)}</div>
                          </div>
                          <div style={{ background: C.surface, borderRadius: 8, padding: "12px 16px", border: `1px solid ${C.border}` }}>
                            <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1.5, marginBottom: 4 }}>EST. WAC PRICE/UNIT</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>[DATA NOT AVAILABLE]</div>
                          </div>
                        </div>
                        <div style={{ background: C.surface, borderRadius: 8, padding: "16px 18px", border: `1px solid ${C.border}` }}>
                          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1.5, marginBottom: 12 }}>ESTIMATED DEAL EV RANGE — 2.0x–5.5x REVENUE MULTIPLE</div>
                          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 10 }}>
                            <div><span style={{ fontSize: 10, color: C.muted }}>LOW (2.0x)  </span><span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 16, color: C.text }}>${evLow}M</span></div>
                            <div><span style={{ fontSize: 10, color: C.muted }}>BASE (3.0x)  </span><span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 16, color: C.accent3 }}>${evBase}M</span></div>
                            <div><span style={{ fontSize: 10, color: C.muted }}>HIGH (5.5x)  </span><span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 16, color: C.green }}>${evHigh}M</span></div>
                          </div>
                          <div style={{ fontSize: 11, color: C.muted }}>
                            Multiple justified by {r._brandType.toLowerCase()} positioning in {r._ta}; floor reflects mature asset discount, ceiling reflects growth or formulary optionality.
                          </div>
                        </div>
                      </div>

                      {/* ④ Risk Flags */}
                      <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: 10, color: C.accent, letterSpacing: 2.5, marginBottom: 10, fontWeight: 700 }}>④ RISK FLAGS</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10 }}>
                          {RISK_ROWS.map(({ rkey, label }) => {
                            const level = getRiskLevel(rkey, r);
                            const color = riskColor(level);
                            return (
                              <div key={rkey} style={{ background: C.surface, borderRadius: 8, padding: "10px 14px", border: `1px solid ${color}55`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 12, color: C.text }}>{label}</span>
                                <span style={{ fontSize: 12, fontWeight: 800, color }}>{riskEmoji(level)} {level}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
                          Concentration and regulatory risks are indicative. [DATA NOT AVAILABLE — recommend verification before term sheet.]
                        </div>
                      </div>

                      {/* ⑤ Comparable Transactions */}
                      <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: 10, color: C.accent, letterSpacing: 2.5, marginBottom: 10, fontWeight: 700 }}>⑤ COMPARABLE TRANSACTIONS</div>
                        <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${C.border}` }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                              <tr style={{ background: C.surface }}>
                                {["Acquirer", "Target Asset", "Year", "Deal EV ($M)", "EV/Rev", "TA Match"].map(h => (
                                  <th key={h} style={{ padding: "9px 14px", fontSize: 10, letterSpacing: 1.5, color: C.muted, textAlign: "left", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {INDICATIVE_COMPS.map((c, ci) => (
                                <tr key={ci} style={{ background: ci % 2 === 0 ? C.surface : C.card, borderBottom: `1px solid ${C.border}` }}>
                                  <td style={{ padding: "9px 14px", color: C.text }}>{c.acquirer}</td>
                                  <td style={{ padding: "9px 14px", color: C.muted }}>{c.target}</td>
                                  <td style={{ padding: "9px 14px", color: C.muted, fontFamily: "monospace" }}>{c.year}</td>
                                  <td style={{ padding: "9px 14px", color: C.accent3, fontFamily: "monospace", fontWeight: 700 }}>{c.ev}</td>
                                  <td style={{ padding: "9px 14px", color: C.muted, fontFamily: "monospace" }}>{c.evRev}</td>
                                  <td style={{ padding: "9px 14px" }}><Badge label={c.ta} color={C.accent4} /></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
                          All comps are indicative. [REQUIRES VERIFICATION] — confirm deal values via SEC filings or press releases before referencing in IC materials.
                        </div>
                      </div>

                      {/* ⑥ Recommended Next Step */}
                      <div style={{ background: `${C.green}11`, borderRadius: 10, padding: "16px 20px", border: `1px solid ${C.green}33` }}>
                        <div style={{ fontSize: 10, color: C.accent, letterSpacing: 2.5, marginBottom: 8, fontWeight: 700 }}>⑥ RECOMMENDED NEXT STEP</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: C.green, marginBottom: 6 }}>{s.nextStep}</div>
                        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
                          Initiate BD outreach; request commercial data room; validate IP status via FDA Orange Book; confirm single-market vs. multi-market presence; obtain WAC pricing and payor mix data.
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* IC-Ready Executive Summary */}
          <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.accent}55`, padding: "24px 28px" }}>
            <div style={{ fontSize: 10, color: C.accent, letterSpacing: 3, marginBottom: 14, fontWeight: 700 }}>IC-READY EXECUTIVE SUMMARY</div>
            <div style={{ fontSize: 14, color: C.text, lineHeight: 1.9 }}>
              The sub-$25M screen identified <strong style={{ color: C.accent }}>{screened.length} qualifying assets</strong> from the uploaded dataset, of which{" "}
              <strong style={{ color: C.green }}>{tier1.length} reached Tier 1 status</strong> (composite score ≥35/50),{" "}
              {tier2.length} were placed on the Tier 2 watchlist, and {tier3.length} were passed.
              {tier1.length > 0 && (
                <> The Tier 1 shortlist spans{" "}
                  <strong style={{ color: C.accent3 }}>
                    {[...new Set(tier1.map(r => r._ta))].join(", ")}
                  </strong>{" "}
                  therapeutic areas, representing a combined base-case EV pool of approximately{" "}
                  <strong style={{ color: C.green }}>${totalEVBase.toFixed(0)}M</strong> (3.0x revenue).
                </>
              )}
              {" "}All Tier 1 assets are recommended for <strong style={{ color: C.green }}>Fast-Track Outreach</strong>. IP and exclusivity position for all assets requires{" "}
              [REQUIRES FDA ORANGE BOOK VERIFICATION]. Commercial concentration and WAC pricing are{" "}
              [DATA NOT AVAILABLE — recommend verification] prior to term sheet submission.
            </div>
          </div>
        </>
      )}
      {tooltip && (() => {
        const { r, s } = tooltip;
        const g = isNaN(r._growth) ? null : r._growth;
        const evLow  = (r._sales * 2.0).toFixed(1);
        const evBase = (r._sales * 3.0).toFixed(1);
        const evHigh = (r._sales * 5.5).toFixed(1);
        const tierColor = s.acqTier === "Tier 1" ? C.green : s.acqTier === "Tier 2" ? C.accent3 : C.muted;
        const viewW = window.innerWidth;
        const left = tooltip.x + 520 > viewW ? tooltip.x - 540 : tooltip.x;
        const top  = Math.min(tooltip.y, window.innerHeight - 560);

        const highlights = [
          { label: "MAT Revenue",   value: fmt(r._sales),               color: "#b45309" },
          { label: "YoY Growth",    value: g == null ? "—" : fmtPct(g), color: g == null ? "#6b7280" : g >= 0 ? "#059669" : "#dc2626" },
          { label: "Brand Type",    value: r._brandType,                color: "#0891b2" },
          { label: "Composite",     value: `${s.composite}/50`,         color: tierColor },
          { label: "EV Low (2.0x)", value: `$${evLow}M`,               color: "#6b7280" },
          { label: "EV Base (3.0x)",value: `$${evBase}M`,              color: "#b45309" },
          { label: "EV High (5.5x)",value: `$${evHigh}M`,              color: "#059669" },
        ];

        const risks = [
          { label: "IP Risk",    level: getRiskLevel("patent",     r) },
          { label: "Generic",    level: getRiskLevel("generic",    r) },
          { label: "Regulatory", level: getRiskLevel("regulatory", r) },
          { label: "Payer",      level: getRiskLevel("payer",      r) },
        ];

        const businessHighlight = generateUSBusinessHighlight(r, s);

        return (
          <div style={{
            position: "fixed", left, top, zIndex: 9999, width: 500, pointerEvents: "none",
            background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 14,
            boxShadow: "0 16px 48px rgba(0,0,0,0.18)", overflow: "hidden",
            fontFamily: "'DM Sans','Segoe UI',sans-serif",
          }}>
            {/* Header */}
            <div style={{ background: "#f9fafb", padding: "14px 20px", borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 6 }}>{r._name}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Badge label={r._ta} color={TA_COLORS[r._ta] || C.muted} />
                <Badge label={s.acqTier} color={tierColor} />
                {r._company && <Badge label={r._company} color="#6b7280" />}
              </div>
            </div>

            {/* KPI grid */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #e5e7eb", background: "#ffffff" }}>
              <div style={{ fontSize: 9, color: "#6b7280", letterSpacing: 2.5, fontWeight: 700, marginBottom: 10 }}>US MARKET HIGHLIGHTS</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px 12px" }}>
                {highlights.map(h => (
                  <div key={h.label} style={{ borderLeft: `3px solid ${h.color}`, paddingLeft: 8 }}>
                    <div style={{ fontSize: 9, color: "#9ca3af", letterSpacing: 1, marginBottom: 2 }}>{h.label.toUpperCase()}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: h.color, fontFamily: "monospace" }}>{h.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* US Business Highlight */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #e5e7eb", background: "#ffffff" }}>
              <div style={{ fontSize: 9, color: "#6b7280", letterSpacing: 2.5, fontWeight: 700, marginBottom: 8 }}>US MARKET BUSINESS HIGHLIGHT</div>
              <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.8 }}>{businessHighlight}</div>
            </div>

            {/* Risk snapshot */}
            <div style={{ padding: "12px 20px", background: "#f9fafb" }}>
              <div style={{ fontSize: 9, color: "#6b7280", letterSpacing: 2.5, fontWeight: 700, marginBottom: 8 }}>RISK SNAPSHOT</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {risks.map(({ label, level }) => (
                  <div key={label} style={{ fontSize: 11, fontWeight: 700, color: riskColor(level) }}>
                    {riskEmoji(level)} {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
