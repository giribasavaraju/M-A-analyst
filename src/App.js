import { useState, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";

// ─── Color Palette ───────────────────────────────────────────────────────────
const C = {
  bg: "#0D0F1A",
  surface: "#13162A",
  card: "#1A1E35",
  border: "#252A45",
  accent: "#00E5C3",
  accent2: "#FF6B6B",
  accent3: "#FFB800",
  accent4: "#7B6FFF",
  text: "#E8ECF4",
  muted: "#6B7494",
  green: "#00C896",
  red: "#FF4757",
  yellow: "#FFD32A",
  blue: "#4A9EFF",
};

const TA_COLORS = {
  Oncology: "#FF6B6B",
  Immunology: "#7B6FFF",
  Diabetes: "#FFB800",
  Cardiovascular: "#FF4757",
  Neurology: "#00E5C3",
  Vaccines: "#4A9EFF",
  Other: "#6B7494",
};

const TIER_CONFIG = {
  Blockbuster: { color: "#FFB800", min: 10000, label: "> $10B" },
  "Major Brand": { color: "#00E5C3", min: 1000, label: "$1B–$10B" },
  "Mid-Market": { color: "#7B6FFF", min: 100, label: "$100M–$1B" },
  Emerging: { color: "#4A9EFF", min: 0, label: "< $100M" },
};

const GROWTH_CONFIG = [
  { label: "High Growth", color: "#00C896", min: 50 },
  { label: "Growth", color: "#4A9EFF", min: 10 },
  { label: "Stable", color: "#6B7494", min: -10 },
  { label: "Decline", color: "#FFB800", min: -30 },
  { label: "Sig. Decline", color: "#FF4757", min: -Infinity },
];

// ─── Utility Functions ────────────────────────────────────────────────────────
function detectColumn(headers, candidates) {
  for (const c of candidates) {
    const found = headers.find(h => h.toLowerCase().includes(c.toLowerCase()));
    if (found) return found;
  }
  return null;
}

function detectTA(name = "", ata = "") {
  const text = (name + " " + ata).toLowerCase();
  if (text.match(/onco|tumor|cancer|leuk|lymph|myelom/)) return "Oncology";
  if (text.match(/immun|rheuma|arthr|lupus|crohn|psoria/)) return "Immunology";
  if (text.match(/diab|insulin|gluc|metfor/)) return "Diabetes";
  if (text.match(/cardio|heart|hypert|cholest|statin|coronar/)) return "Cardiovascular";
  if (text.match(/neuro|alzheim|parkin|epilep|depress|psych|schizo/)) return "Neurology";
  if (text.match(/vaccin|immuni|virus|flu|covid/)) return "Vaccines";
  return "Other";
}

function detectBrandType(name = "", company = "") {
  const n = name.toLowerCase();
  if (n.match(/biosimilar|similar biologic/)) return "Biosimilar";
  if (company.toLowerCase().match(/generic|mylan|teva|sun pharma|cipla|lupin|aurobindo/)) return "Generic";
  return "Brand";
}

function getTier(sales) {
  if (sales >= 10000) return "Blockbuster";
  if (sales >= 1000) return "Major Brand";
  if (sales >= 100) return "Mid-Market";
  return "Emerging";
}

function getGrowthLabel(pct) {
  for (const g of GROWTH_CONFIG) {
    if (pct >= g.min) return g.label;
  }
  return "Sig. Decline";
}

function fmt(n) {
  if (n == null || isNaN(n)) return "—";
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}B`;
  return `$${n.toFixed(0)}M`;
}

function fmtPct(n) {
  if (n == null || isNaN(n)) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function parseNumber(v) {
  if (v == null) return NaN;
  const s = String(v).replace(/[$,%\s]/g, "");
  return parseFloat(s);
}

// ─── M&A Screening Logic ─────────────────────────────────────────────────────
const PRIORITY_TAS = ["Neurology", "Oncology", "Immunology"];

const INDICATIVE_COMPS = [
  { acquirer: "Specialty Pharma (undisclosed)", target: "Niche CNS Branded Asset", year: "2022", ev: "~$18M", evRev: "~3.2x", ta: "CNS/Neurology" },
  { acquirer: "Mid-Cap Acquirer (undisclosed)", target: "Dermatology Portfolio Asset", year: "2021", ev: "~$22M", evRev: "~4.1x", ta: "Dermatology" },
  { acquirer: "Specialty Generic Co. (undisclosed)", target: "Niche Hospital Asset", year: "2023", ev: "~$12M", evRev: "~2.8x", ta: "Niche Hospital" },
];

function scoreAsset(r) {
  const g = isNaN(r._growth) ? 0 : r._growth;
  const revenueStability = g > 20 ? 9 : g > 5 ? 8 : g > -5 ? 6 : g > -20 ? 4 : g > -40 ? 2 : 1;
  const growthTrajectory = g > 50 ? 9 : g > 20 ? 7 : g > 5 ? 6 : g > -10 ? 4 : g > -30 ? 2 : 1;
  const isPriorityTA = PRIORITY_TAS.includes(r._ta);
  const competitiveMoat = r._brandType === "Brand" ? (isPriorityTA ? 8 : 7) : r._brandType === "Biosimilar" ? 5 : 4;
  const exclusivityRunway = r._brandType === "Brand" ? 7 : r._brandType === "Biosimilar" ? 5 : 3;
  const strategicFit = isPriorityTA ? 8 : 6;
  const composite = revenueStability + growthTrajectory + competitiveMoat + exclusivityRunway + strategicFit;
  const acqTier = composite >= 35 ? "Tier 1" : composite >= 25 ? "Tier 2" : "Tier 3";
  const nextStep = composite >= 35 ? "Fast-Track Outreach" : composite >= 25 ? "Monitor 1 Quarter" : "Pass";
  return { revenueStability, growthTrajectory, competitiveMoat, exclusivityRunway, strategicFit, composite, acqTier, nextStep };
}

function getRiskLevel(rkey, r) {
  const g = isNaN(r._growth) ? 0 : r._growth;
  if (rkey === "patent") return r._brandType === "Brand" ? "Low" : r._brandType === "Biosimilar" ? "Medium" : "High";
  if (rkey === "generic") return g < -20 ? "High" : g < 0 ? "Medium" : "Low";
  if (rkey === "regulatory") return "Medium";
  if (rkey === "concentration") return "Medium";
  if (rkey === "payer") return PRIORITY_TAS.includes(r._ta) ? "Low" : "Medium";
  return "Medium";
}

function riskColor(level) {
  return level === "Low" ? "#00C896" : level === "Medium" ? "#FFD32A" : "#FF4757";
}

function riskEmoji(level) {
  return level === "Low" ? "🟢" : level === "Medium" ? "🟡" : "🔴";
}

function generateRationale(r, s) {
  const g = isNaN(r._growth) ? 0 : r._growth;
  const evBase = (r._sales * 3.0).toFixed(1);
  const archetype = r._brandType === "Brand"
    ? "specialty acquirer focused on branded lifecycle management"
    : r._brandType === "Biosimilar"
    ? "biosimilar-experienced operator seeking portfolio fill"
    : "niche specialty pharma seeking market access expansion";
  const growthStory = g > 10 ? "demonstrating positive growth momentum"
    : g > -10 ? "showing revenue stability"
    : "in a managed decline phase offering predictable near-term cash flows";
  const quality = s.composite >= 35 ? "compelling" : s.composite >= 25 ? "moderate" : "limited";
  return `${r._name} (${r._ta}) is a sub-$25M asset ${growthStory} at ${fmt(r._sales)} MAT revenue (${fmtPct(g)} YoY). As a ${r._brandType.toLowerCase()} product, it presents a ${quality} acquisition case for a ${archetype}. The asset fits a portfolio fill or geographic expansion thesis for acquirers seeking ${r._ta.toLowerCase()}-focused assets with an established commercial footprint. At an estimated base EV of $${evBase}M (3.0x revenue), the transaction is structurally accessible to mid-cap specialty buyers. Exclusivity and IP status require [REQUIRES FDA ORANGE BOOK VERIFICATION] before advancing to LOI stage. Formulary retention, payor mix, and lifecycle management potential will be key diligence workstreams.`;
}

// ─── Sub Components ───────────────────────────────────────────────────────────
function KPICard({ label, value, sub, color }) {
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

function Bar({ pct, color }) {
  return (
    <div style={{ background: C.border, borderRadius: 4, height: 6, width: "100%", overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: "100%", background: color || C.accent, borderRadius: 4, transition: "width 0.4s" }} />
    </div>
  );
}

function Badge({ label, color }) {
  return (
    <span style={{
      background: `${color}22`, color, border: `1px solid ${color}55`,
      borderRadius: 20, padding: "2px 10px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap"
    }}>{label}</span>
  );
}

function SortHeader({ label, field, sort, onSort }) {
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

// ─── Upload Screen ────────────────────────────────────────────────────────────
function UploadScreen({ onData }) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const process = (file) => {
    if (!file) return;
    setError("");
    const reader = new FileReader();
    const isCsv = file.name.toLowerCase().endsWith(".csv");

    reader.onload = (e) => {
      try {
        const wb = isCsv
          ? XLSX.read(e.target.result, { type: "string", sheetRows: 10000 })
          : XLSX.read(e.target.result, { type: "array", sheetRows: 10000 });
        const ws = wb.Sheets[wb.SheetNames[0]];
        if (ws["!ref"]) {
          const range = XLSX.utils.decode_range(ws["!ref"]);
          range.e.c = Math.min(range.e.c, 200);
          range.e.r = Math.min(range.e.r, 50000);
          ws["!ref"] = XLSX.utils.encode_range(range);
        }
        const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (!raw.length) { setError("File appears empty."); return; }
        onData(raw);
      } catch (err) {
        console.log("Parse error:", err);
        setError(`Could not parse file: ${err.message || err}`);
      }
    };

    if (isCsv) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    process(file);
  }, []);

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, display: "flex",
      alignItems: "center", justifyContent: "center", flexDirection: "column",
      fontFamily: "'DM Mono', 'Courier New', monospace"
    }}>
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: C.accent, letterSpacing: 4, marginBottom: 10 }}>PHARMA M&A INTELLIGENCE</div>
        <div style={{ fontSize: 36, fontWeight: 800, color: C.text, letterSpacing: -1 }}>M&A Analytics</div>
        <div style={{ fontSize: 14, color: C.muted, marginTop: 8 }}>Upload your IQVIA / sales dataset to generate a full screening dashboard</div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          width: 480, border: `2px dashed ${dragging ? C.accent : C.border}`,
          borderRadius: 16, padding: "48px 32px", textAlign: "center",
          background: dragging ? `${C.accent}08` : C.card,
          cursor: "pointer", transition: "all 0.2s"
        }}
        onClick={() => document.getElementById("file-input").click()}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
        <div style={{ fontSize: 16, color: C.text, fontWeight: 700, marginBottom: 8 }}>Drop your .xlsx file here</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>or click to browse</div>
        <div style={{
          display: "inline-block", background: C.accent, color: C.bg,
          padding: "10px 28px", borderRadius: 8, fontSize: 13, fontWeight: 800
        }}>
          Select File
        </div>
        <input id="file-input" type="file" accept=".xlsx,.csv,.xls"
          style={{ display: "none" }}
          onChange={(e) => process(e.target.files[0])} />
      </div>

      {error && <div style={{ color: C.red, marginTop: 16, fontSize: 13 }}>⚠ {error}</div>}

      <div style={{ marginTop: 32, display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
        {["Molecule / Product Name", "Revenue / Sales ($M)", "YoY Growth %", "Therapy Area / ATC", "Brand / Company"].map(col => (
          <div key={col} style={{ fontSize: 11, color: C.muted, background: C.card, padding: "6px 14px", borderRadius: 20, border: `1px solid ${C.border}` }}>
            ✓ {col}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "summary", label: "Summary Dashboard" },
  { id: "master", label: "Master Data" },
  { id: "therapy", label: "By Therapy Area" },
  { id: "tier", label: "By Revenue Tier" },
  { id: "growth", label: "Growth vs Decline" },
  { id: "brand", label: "Brand vs Generic" },
  { id: "screening", label: "M&A Screening" },
];

// ─── Summary Tab ──────────────────────────────────────────────────────────────
function SummaryTab({ data }) {
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

// ─── Master Data Tab ──────────────────────────────────────────────────────────
function MasterTab({ data, columns }) {
  const [search, setSearch] = useState("");
  const [taFilter, setTaFilter] = useState("All");
  const [sort, setSort] = useState({ field: "_sales", dir: "desc" });

  const tas = ["All", ...Array.from(new Set(data.map(r => r._ta))).sort()];

  const filtered = useMemo(() => {
    let d = data.filter(r => {
      const q = search.toLowerCase();
      return (!q || r._name?.toLowerCase().includes(q) || r._company?.toLowerCase().includes(q)) &&
        (taFilter === "All" || r._ta === taFilter);
    });
    d = [...d].sort((a, b) => {
      const av = a[sort.field], bv = b[sort.field];
      if (typeof av === "number") return sort.dir === "asc" ? av - bv : bv - av;
      return sort.dir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return d;
  }, [data, search, taFilter, sort]);

  const onSort = (field) => setSort(s => ({ field, dir: s.field === field && s.dir === "desc" ? "asc" : "desc" }));

  const tierColor = (t) => TIER_CONFIG[t]?.color || C.muted;
  const growthColor = (g) => GROWTH_CONFIG.find(x => x.label === g)?.color || C.muted;

  return (
    <div style={{ padding: "24px 32px" }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          placeholder="Search molecule or company..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
            padding: "9px 16px", color: C.text, fontSize: 13, width: 280,
            outline: "none", fontFamily: "inherit"
          }}
        />
        <select value={taFilter} onChange={e => setTaFilter(e.target.value)}
          style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
            padding: "9px 14px", color: C.text, fontSize: 13, fontFamily: "inherit"
          }}>
          {tas.map(t => <option key={t}>{t}</option>)}
        </select>
        <div style={{ marginLeft: "auto", fontSize: 12, color: C.muted, alignSelf: "center" }}>
          {filtered.length} of {data.length} products
        </div>
      </div>

      <div style={{ overflowX: "auto", borderRadius: 12, border: `1px solid ${C.border}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              <SortHeader label="Product" field="_name" sort={sort} onSort={onSort} />
              <SortHeader label="Company" field="_company" sort={sort} onSort={onSort} />
              <SortHeader label="Therapy Area" field="_ta" sort={sort} onSort={onSort} />
              <SortHeader label="Revenue" field="_sales" sort={sort} onSort={onSort} />
              <SortHeader label="YoY Growth" field="_growth" sort={sort} onSort={onSort} />
              <SortHeader label="Tier" field="_tier" sort={sort} onSort={onSort} />
              <SortHeader label="Growth Label" field="_growthLabel" sort={sort} onSort={onSort} />
              <SortHeader label="Type" field="_brandType" sort={sort} onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? C.surface : C.card, borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: "11px 14px", color: C.text, fontWeight: 700 }}>{r._name || "—"}</td>
                <td style={{ padding: "11px 14px", color: C.muted }}>{r._company || "—"}</td>
                <td style={{ padding: "11px 14px" }}>
                  <Badge label={r._ta} color={TA_COLORS[r._ta] || C.muted} />
                </td>
                <td style={{ padding: "11px 14px", fontFamily: "monospace", color: C.accent3, fontWeight: 700 }}>{fmt(r._sales)}</td>
                <td style={{ padding: "11px 14px", fontFamily: "monospace", color: r._growth >= 0 ? C.green : C.red, fontWeight: 700 }}>
                  {fmtPct(r._growth)}
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <Badge label={r._tier} color={tierColor(r._tier)} />
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <Badge label={r._growthLabel} color={growthColor(r._growthLabel)} />
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <Badge label={r._brandType} color={r._brandType === "Brand" ? C.accent : r._brandType === "Biosimilar" ? C.accent4 : C.muted} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Therapy Area Tab ─────────────────────────────────────────────────────────
function TherapyTab({ data }) {
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

// ─── Revenue Tier Tab ─────────────────────────────────────────────────────────
function TierTab({ data }) {
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

// ─── Growth vs Decline Tab ────────────────────────────────────────────────────
function GrowthTab({ data }) {
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

// ─── Brand vs Generic Tab ─────────────────────────────────────────────────────
function BrandTab({ data }) {
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

// ─── M&A Screening Tab ───────────────────────────────────────────────────────
function ScreeningTab({ data }) {
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

  const RISK_ROWS = [
    { rkey: "patent", label: "Patent / IP Risk" },
    { rkey: "generic", label: "Generic Erosion Risk" },
    { rkey: "regulatory", label: "Regulatory Risk" },
    { rkey: "concentration", label: "Commercial Concentration Risk" },
    { rkey: "payer", label: "Payer / Reimbursement Risk" },
  ];

  return (
    <div style={{ padding: "28px 32px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: C.accent, letterSpacing: 4, marginBottom: 6 }}>SUB-$25M ACQUISITION SCREEN</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 8 }}>M&A Screening Report</div>
        <div style={{ fontSize: 13, color: C.muted }}>
          Screening criteria: MAT Revenue &lt; $25M · Brand / Biosimilar / Niche assets · Priority TAs weighted
        </div>
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
                        <td style={{ padding: "11px 14px", color: C.text, fontWeight: 700 }}>{r._name}</td>
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
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [rawData, setRawData] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [fileName, setFileName] = useState("");

  const handleData = useCallback((raw) => {
    const headers = Object.keys(raw[0] || {});
    const nameCol = detectColumn(headers, ["molecule", "product", "drug", "name", "brand"]);
    const salesCol = detectColumn(headers, ["revenue", "sales", "usd", "value", "amount", "$"]);
    const growthCol = detectColumn(headers, ["growth", "change", "yoy", "delta", "%"]);
    const taCol = detectColumn(headers, ["therapy", "area", "atc", "indication", "therapeutic"]);
    const companyCol = detectColumn(headers, ["company", "mah", "manufacturer", "corp", "pharma"]);

    const processed = raw.map(row => {
      const sales = parseNumber(row[salesCol]);
      const growth = parseNumber(row[growthCol]);
      const name = row[nameCol] || row[headers[0]] || "Unknown";
      const company = row[companyCol] || "";
      const taRaw = row[taCol] || "";
      const ta = detectTA(name, taRaw) !== "Other" ? detectTA(name, taRaw) : (taRaw || "Other");
      const brandType = detectBrandType(name, company);
      const tier = isNaN(sales) ? "Emerging" : getTier(sales);
      const growthLabel = isNaN(growth) ? "Stable" : getGrowthLabel(growth);

      return {
        ...row,
        _name: String(name).trim(),
        _sales: isNaN(sales) ? 0 : sales,
        _growth: isNaN(growth) ? NaN : growth,
        _ta: ta,
        _company: String(company).trim(),
        _brandType: brandType,
        _tier: tier,
        _growthLabel: growthLabel,
      };
    });
    setRawData(processed);
  }, []);

  if (!rawData) return <UploadScreen onData={(data) => { handleData(data); }} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      {/* Top Bar */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div>
          <div style={{ fontSize: 9, color: C.accent, letterSpacing: 3, fontWeight: 700 }}>PHARMA M&A INTELLIGENCE</div>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.3 }}>Revenue Analytics Dashboard</div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ fontSize: 11, color: C.muted }}>📊 {rawData.length} products loaded</div>
          <button
            onClick={() => setRawData(null)}
            style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}
          >
            ← New File
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 32px", display: "flex", gap: 4 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              padding: "14px 18px", fontSize: 12, fontWeight: 700, fontFamily: "inherit",
              color: activeTab === t.id ? C.accent : C.muted,
              borderBottom: `2px solid ${activeTab === t.id ? C.accent : "transparent"}`,
              transition: "all 0.15s", whiteSpace: "nowrap"
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 105px)" }}>
        {activeTab === "summary" && <SummaryTab data={rawData} />}
        {activeTab === "master" && <MasterTab data={rawData} />}
        {activeTab === "therapy" && <TherapyTab data={rawData} />}
        {activeTab === "tier" && <TierTab data={rawData} />}
        {activeTab === "growth" && <GrowthTab data={rawData} />}
        {activeTab === "brand" && <BrandTab data={rawData} />}
        {activeTab === "screening" && <ScreeningTab data={rawData} />}
      </div>
    </div>
  );
}