import { useState, useMemo } from "react";
import { C, TA_COLORS, TIER_CONFIG, GROWTH_CONFIG } from "../constants.js";
import { fmt, fmtPct } from "../utils.js";
import { Badge, SortHeader } from "../components.js";

export function MasterTab({ data, columns }) {
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
