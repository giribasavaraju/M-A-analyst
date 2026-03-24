import { fmt, fmtPct } from "./utils.js";

export const PRIORITY_TAS = ["Neurology", "Oncology", "Immunology"];

export const INDICATIVE_COMPS = [
  { acquirer: "Specialty Pharma (undisclosed)", target: "Niche CNS Branded Asset", year: "2022", ev: "~$18M", evRev: "~3.2x", ta: "CNS/Neurology" },
  { acquirer: "Mid-Cap Acquirer (undisclosed)", target: "Dermatology Portfolio Asset", year: "2021", ev: "~$22M", evRev: "~4.1x", ta: "Dermatology" },
  { acquirer: "Specialty Generic Co. (undisclosed)", target: "Niche Hospital Asset", year: "2023", ev: "~$12M", evRev: "~2.8x", ta: "Niche Hospital" },
];

export function scoreAsset(r) {
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

export function getRiskLevel(rkey, r) {
  const g = isNaN(r._growth) ? 0 : r._growth;
  if (rkey === "patent") return r._brandType === "Brand" ? "Low" : r._brandType === "Biosimilar" ? "Medium" : "High";
  if (rkey === "generic") return g < -20 ? "High" : g < 0 ? "Medium" : "Low";
  if (rkey === "regulatory") return "Medium";
  if (rkey === "concentration") return "Medium";
  if (rkey === "payer") return PRIORITY_TAS.includes(r._ta) ? "Low" : "Medium";
  return "Medium";
}

export function riskColor(level) {
  return level === "Low" ? "#00C896" : level === "Medium" ? "#FFD32A" : "#FF4757";
}

export function riskEmoji(level) {
  return level === "Low" ? "🟢" : level === "Medium" ? "🟡" : "🔴";
}

export function generateUSBusinessHighlight(r, s) {
  const g = isNaN(r._growth) ? null : r._growth;
  const evBase = (r._sales * 3.0).toFixed(1);
  const isPriority = PRIORITY_TAS.includes(r._ta);

  // Revenue profile sentence
  const revSentence = g == null
    ? `${r._name} currently generates ${fmt(r._sales)} in US moving annual total (MAT) revenue; year-over-year growth data is unavailable and should be verified against IQVIA source data.`
    : g > 20
    ? `${r._name} is generating ${fmt(r._sales)} in US MAT revenue with strong positive momentum of ${fmtPct(g)} YoY, indicating active market uptake and sustained commercial execution in the US.`
    : g > 5
    ? `${r._name} records ${fmt(r._sales)} in US MAT revenue and is growing steadily at ${fmtPct(g)} YoY, reflecting a commercially stable asset with modest positive trajectory in the US market.`
    : g > -5
    ? `${r._name} holds ${fmt(r._sales)} in US MAT revenue with a near-flat YoY change of ${fmtPct(g)}, consistent with a mature, off-patent brand maintaining formulary position without significant volume loss.`
    : g > -20
    ? `${r._name} reports ${fmt(r._sales)} in US MAT revenue with a YoY decline of ${fmtPct(g)}, reflecting managed erosion typical of post-LOE brands facing generic competition or pricing pressure in the US.`
    : `${r._name} shows ${fmt(r._sales)} in US MAT revenue with significant YoY erosion of ${fmtPct(g)}, suggesting material volume or pricing headwinds in the US market that require diligence on payor mix and competitive entries.`;

  // Competitive / brand positioning sentence
  const brandSentence = r._brandType === "Brand"
    ? `As a branded product in ${r._ta}, it retains commercial identity and potential formulary defensibility, which typically supports higher EV multiples in the sub-$25M specialty deal space.`
    : r._brandType === "Biosimilar"
    ? `As a biosimilar in the ${r._ta} space, the asset occupies a mid-ground position — benefiting from established clinical use while facing ongoing biosimilar competition and payor-driven substitution pressure in the US.`
    : `As a generic or off-patent product in ${r._ta}, the asset competes on price and distribution, with US commercial value tied primarily to market share retention and manufacturing cost efficiency.`;

  // TA / strategic context sentence
  const taSentence = isPriority
    ? `${r._ta} is a high-priority therapeutic area for specialty acquirers, where sub-$25M assets with established US prescriber bases command a scarcity premium and strategic fit premium in BD processes.`
    : `${r._ta} assets at this revenue scale are typically acquired for portfolio breadth, geographic fill, or lifecycle extension plays, with US commercial teams often already in place for adjacent products.`;

  // Valuation sentence
  const valSentence = `At a base-case acquisition EV of approximately $${evBase}M (3.0x MAT revenue), this asset falls within the structurally accessible range for mid-cap specialty acquirers and regional pharma operators active in the US market. The composite M&A score of ${s.composite}/50 places it in ${s.acqTier} status with a recommended next step of ${s.nextStep}.`;

  return `${revSentence} ${brandSentence} ${taSentence} ${valSentence}`;
}

export function generateRationale(r, s) {
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
