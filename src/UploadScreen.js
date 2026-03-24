import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { C } from "./constants.js";

export function UploadScreen({ onData }) {
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
