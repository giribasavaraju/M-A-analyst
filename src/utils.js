import { GROWTH_CONFIG } from "./constants.js";

export function detectColumn(headers, candidates) {
  for (const c of candidates) {
    const found = headers.find(h => h.toLowerCase().includes(c.toLowerCase()));
    if (found) return found;
  }
  return null;
}

export function detectTA(name = "", ata = "") {
  const text = (name + " " + ata).toLowerCase();
  if (text.match(/onco|tumor|cancer|leuk|lymph|myelom/)) return "Oncology";
  if (text.match(/immun|rheuma|arthr|lupus|crohn|psoria/)) return "Immunology";
  if (text.match(/diab|insulin|gluc|metfor/)) return "Diabetes";
  if (text.match(/cardio|heart|hypert|cholest|statin|coronar/)) return "Cardiovascular";
  if (text.match(/neuro|alzheim|parkin|epilep|depress|psych|schizo/)) return "Neurology";
  if (text.match(/vaccin|immuni|virus|flu|covid/)) return "Vaccines";
  return "Other";
}

export function detectBrandType(name = "", company = "") {
  const n = name.toLowerCase();
  if (n.match(/biosimilar|similar biologic/)) return "Biosimilar";
  if (company.toLowerCase().match(/generic|mylan|teva|sun pharma|cipla|lupin|aurobindo/)) return "Generic";
  return "Brand";
}

export function getTier(sales) {
  if (sales >= 10000) return "Blockbuster";
  if (sales >= 1000) return "Major Brand";
  if (sales >= 100) return "Mid-Market";
  return "Emerging";
}

export function getGrowthLabel(pct) {
  for (const g of GROWTH_CONFIG) {
    if (pct >= g.min) return g.label;
  }
  return "Sig. Decline";
}

export function fmt(n) {
  if (n == null || isNaN(n)) return "—";
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}B`;
  return `$${n.toFixed(0)}M`;
}

export function fmtPct(n) {
  if (n == null || isNaN(n)) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export function parseNumber(v) {
  if (v == null) return NaN;
  const s = String(v).replace(/[$,%\s]/g, "");
  return parseFloat(s);
}
