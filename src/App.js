import { useState, useCallback } from "react";
import { C } from "./constants.js";
import { detectColumn, detectTA, detectBrandType, getTier, getGrowthLabel, parseNumber } from "./utils.js";
import { UploadScreen } from "./UploadScreen.js";
import { SummaryTab } from "./tabs/SummaryTab.js";
import { MasterTab } from "./tabs/MasterTab.js";
import { TherapyTab } from "./tabs/TherapyTab.js";
import { TierTab } from "./tabs/TierTab.js";
import { GrowthTab } from "./tabs/GrowthTab.js";
import { BrandTab } from "./tabs/BrandTab.js";
import { ScreeningTab } from "./tabs/ScreeningTab.js";

const TABS = [
  { id: "summary", label: "Summary Dashboard" },
  { id: "master", label: "Master Data" },
  { id: "therapy", label: "By Therapy Area" },
  { id: "tier", label: "By Revenue Tier" },
  { id: "growth", label: "Growth vs Decline" },
  { id: "brand", label: "Brand vs Generic" },
  { id: "screening", label: "M&A Screening" },
];

export default function App() {
  const [rawData, setRawData] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");

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
