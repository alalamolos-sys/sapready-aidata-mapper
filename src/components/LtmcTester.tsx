import React, { useState } from "react";
import Papa from "papaparse";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  detectObject,
  mapColumns,
  validate,
  shapeLTMC,
  type Header,
  type Row,
  type Target,
  type Mapping,
  type ValidationResult,
  type Sheet,
} from "../lib/sapreadyCore";

interface TesterResult {
  target: Target;
  mapping: Mapping;
  dataQuality: ValidationResult;
  ltmcPayload: { sheets: Sheet[] };
}

export default function LtmcTester() {
  const [fileName, setFileName] = useState<string>("");
  const [result, setResult] = useState<TesterResult | null>(null);

  function parseCsv(file: File): Promise<{ headers: Header[]; rows: Row[] }> {
    return new Promise((resolve, reject) => {
      Papa.parse<Row>(file, {
        header: true,
        skipEmptyLines: "greedy",
        transformHeader: (header) => header.trim(),
        complete: (res) => {
          const rows = res.data.map((row) => {
            const cleaned: Row = {};
            Object.entries(row ?? {}).forEach(([key, value]) => {
              if (typeof value === "string") {
                cleaned[key] = value.trim();
              } else {
                cleaned[key] = value ?? "";
              }
            });
            return cleaned;
          });
          const headers = res.meta.fields ?? Object.keys(rows[0] ?? {});
          resolve({ headers, rows });
        },
        error: reject,
      });
    });
  }

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const { headers, rows } = await parseCsv(file);
    const target = detectObject(headers);
    const mapping = mapColumns(headers, target);
    const dataQuality = validate({ target, headers, rows });
    const ltmcPayload = shapeLTMC({ target, headers, rows, mapping, userHints: {} });
    setResult({ target, mapping, dataQuality, ltmcPayload });
  }

  async function exportZip() {
    const sheets = result?.ltmcPayload.sheets ?? [];
    if (!sheets.length) return;
    const zip = new JSZip();
    sheets.forEach((sheet) => {
      const { name, columns, rows } = sheet;
      const csv = [
        columns.join(","),
        ...rows.map((row) =>
          columns
            .map((column) => `"${String(row[column] ?? "").replace(/"/g, '""')}"`)
            .join(","),
        ),
      ].join("\n");
      zip.file(`${name}.csv`, csv);
    });
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `LTMC_${result?.target ?? "unknown"}_${Date.now()}.zip`);
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">LTMC Tester (Finance)</h1>
      <input type="file" accept=".csv" onChange={onFile} className="block" />
      {fileName && <p className="text-sm text-gray-500">Fichier: {fileName}</p>}

      {result && (
        <div className="space-y-4">
          <div className="p-3 rounded bg-gray-100">
            <p>
              <b>Objet détecté:</b> {result.target}
            </p>
            <p>
              <b>Résumé qualité:</b> {result.dataQuality.summary.errors} erreurs, {result.dataQuality.summary.warnings} warnings
            </p>
          </div>

          <div>
            <h2 className="font-semibold">Champs requis manquants</h2>
            <ul className="list-disc ml-6">
              {(result.mapping.missing || []).map((entry, index) => (
                <li key={index}>
                  {entry.sap_field} <span className="text-gray-500">({entry.note})</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-semibold">Issues</h2>
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left">Severity</th>
                  <th className="text-left">Message</th>
                  <th className="text-left">Location</th>
                  <th className="text-left">Hint</th>
                </tr>
              </thead>
              <tbody>
                {result.dataQuality.issues.map((issue, index) => (
                  <tr key={index}>
                    <td className={issue.severity === "error" ? "text-red-600" : issue.severity === "warning" ? "text-yellow-700" : ""}>
                      {issue.severity}
                    </td>
                    <td>{issue.message}</td>
                    <td>
                      {issue.location?.row ?? ""} / {issue.location?.source ?? ""}
                    </td>
                    <td className="text-gray-600">{issue.hint ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h2 className="font-semibold">Feuilles LTMC</h2>
            <ul className="list-disc ml-6">
              {result.ltmcPayload.sheets.map((sheet, index) => (
                <li key={index}>
                  {sheet.name} — {sheet.columns.length} colonnes, {sheet.rows.length} lignes
                </li>
              ))}
            </ul>
          </div>

          <button onClick={exportZip} className="px-3 py-2 rounded bg-black text-white">
            Exporter ZIP LTMC
          </button>
        </div>
      )}
    </div>
  );
}
