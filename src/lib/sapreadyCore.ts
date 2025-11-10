/* SAPReady – core mapping & validation (TypeScript) */
export type Header = string;
export type Row = Record<string, unknown>;
export type Target =
  | "gl_accounts"
  | "opening_balances"
  | "ytd_movements"
  | "suppliers"
  | "customers"
  | "bank_details"
  | "unknown";

export interface MappingEntry { source: string; sap_field: string; }
export interface MissingEntry { sap_field: string; note: string; }
export interface Mapping { required: MappingEntry[]; optional: MappingEntry[]; missing: MissingEntry[]; }
export interface Issue {
  severity: "error" | "warning" | "info";
  message: string;
  location: { row: number; source: string };
  hint?: string;
}
export interface ValidationResult {
  summary: { errors: number; warnings: number; infos: number };
  issues: Issue[];
}
export interface Sheet { name: string; columns: string[]; rows: Record<string, unknown>[] }

/* ---------------- utils ---------------- */
const ISO2 = /^[A-Z]{2}$/;
const ISO3 = /^[A-Z]{3}$/;
const BIC_RE = /^[A-Z0-9]{8}([A-Z0-9]{3})?$/i;

export function normCountry(s: unknown) {
  if (!s && s !== 0) return s as string | undefined;
  const t = String(s).trim().toUpperCase();
  const map: Record<string, string> = {
    FRANCE: "FR",
    "UNITED STATES": "US",
    "ETATS-UNIS": "US",
    GERMANY: "DE",
    ESPAGNE: "ES",
    SPAIN: "ES",
  };
  return ISO2.test(t) ? t : map[t] || t;
}
export function normCurrency(s: unknown) {
  if (!s && s !== 0) return s as string | undefined;
  const t = String(s).trim().toUpperCase();
  const map: Record<string, string> = { EURO: "EUR", DOLLAR: "USD" };
  return ISO3.test(t) ? t : map[t] || t;
}
export function validateIBAN(iban: string | undefined) {
  if (!iban) return { ok: false, reason: "empty" as const };
  const s = iban.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}[0-9A-Z]{13,32}$/.test(s)) return { ok: false, reason: "format" as const };
  const minLenMap: Record<string, number> = { FR: 27, MC: 27, DE: 22, ES: 24, IT: 27, BE: 16, NL: 18 };
  const cc = s.slice(0, 2);
  const minLen = minLenMap[cc] ?? 15;
  if (s.length < minLen) return { ok: false, reason: (`len<${minLen}`) as const };
  const rearr = s.slice(4) + s.slice(0, 4);
  const digits = rearr.replace(/[A-Z]/g, (c) => (c.charCodeAt(0) - 55).toString());
  let rem = 0n;
  let chunk = "";
  for (let i = 0; i < digits.length; i++) {
    chunk += digits[i];
    const n = BigInt(chunk);
    if (n > 1_000_000n) {
      rem = n % 97n;
      chunk = rem.toString();
    }
  }
  const total = BigInt(chunk) % 97n;
  const ok = total === 1n;
  return { ok, reason: ok ? undefined : ("mod97" as const) };
}
export function validateBIC(bic: string | undefined) {
  if (!bic) return { ok: false, reason: "empty" as const };
  return { ok: BIC_RE.test(bic), reason: BIC_RE.test(bic) ? undefined : ("format" as const) };
}

/* --------------- detection --------------- */
export function detectObject(headers: Header[]): Target {
  const H = headers.map((h) => String(h).toLowerCase());
  const has = (k: string) => H.includes(k);
  const any = (arr: string[]) => arr.some((a) => has(a.toLowerCase()));
  if (any(["g/l account", "gl account", "account"]) && any(["account group", "fsg", "field status group"])) return "gl_accounts";
  if (any(["debit"]) && any(["credit"]) && any(["posting date", "posting"])) return "opening_balances";
  if (any(["document no", "doc no"]) && any(["d/c", "dc"])) return "ytd_movements";
  if (any(["vendor"]) || any(["supplier"])) return "suppliers";
  if (any(["customer"])) return "customers";
  if (any(["iban"]) || any(["swift", "bic"])) return "bank_details";
  return "unknown";
}

/* --------------- mapping ----------------- */
const MAPS: Record<string, { required: Record<string, string[]>; optional: Record<string, string[]> }> = {
  gl_accounts: {
    required: {
      "Chart": ["chart", "coa", "plan", "chart of accts", "chart of accounts"],
      "G/L Account": ["g/l account", "gl account", "account", "hkont"],
      "Account Group": ["account group", "acct group"],
      "Account Type": ["account type", "type", "b/s", "p&l", "pl"],
      "Short Text": ["short text", "name", "short name", "description"],
    },
    optional: {
      "Company Code": ["company code", "company", "bukrs"],
      "Currency": ["currency", "waers"],
      "Open Item Managed": ["open item managed", "oim"],
      "Field Status Group": ["field status group", "fsg"],
    },
  },
  opening_balances: {
    required: {
      "Company Code": ["company code", "company", "bukrs"],
      "Chart": ["chart", "coa", "plan"],
      "G/L Account": ["g/l account", "gl account", "account", "hkont"],
      "Currency": ["currency", "waers"],
      "Posting Date": ["posting date", "date"],
      "Debit": ["debit", "dr"],
      "Credit": ["credit", "cr"],
    },
    optional: { "Text": ["text", "reference", "memo"] },
  },
  ytd_movements: {
    required: {
      "Document No": ["document no", "doc no", "document"],
      "Company Code": ["company code", "company", "bukrs"],
      "Posting Date": ["posting date", "date"],
      "G/L Account": ["g/l account", "gl account", "account", "hkont"],
      "Currency": ["currency", "waers"],
      "Amount": ["amount", "value"],
      "D/C": ["d/c", "dc", "debit/credit"],
    },
    optional: { "Text": ["text", "reference", "memo"] },
  },
  suppliers: {
    required: {
      "Vendor": ["vendor", "supplier", "lifnr", "bp number"],
      "BP Grouping": ["bp grouping", "grouping"],
      "Account Group": ["account group", "ktokk"],
      "Name1": ["name1", "name", "company name"],
      "Street": ["street", "address1"],
      "Postal Code": ["postal code", "zip"],
      "City": ["city", "town"],
      "Country": ["country", "country code"],
    },
    optional: { "Telephone": ["telephone", "phone"], "Company Code": ["company code", "bukrs"] },
  },
  bank_details: {
    required: {
      "Vendor": ["vendor", "supplier", "lifnr"],
      "Bank Country": ["bank country", "country"],
      "Bank Key": ["bank key", "routing", "aba"],
      "Account No/IBAN": ["account no", "account", "iban"],
    },
    optional: { "IBAN": ["iban"], "SWIFT/BIC": ["swift", "bic"], "Account Holder": ["account holder", "holder"] },
  },
};

export function mapColumns(headers: Header[], target: Target): Mapping {
  const spec = MAPS[target] || { required: {}, optional: {} };
  const lower = headers.map((h) => String(h));
  const find = (aliases: string[]) => {
    const set = lower.map((h) => ({ src: h, key: h.toLowerCase() }));
    const toks = aliases.map((a) => a.toLowerCase());
    const hit = set.find((s) => toks.includes(s.key));
    return hit?.src;
  };
  const required: MappingEntry[] = [];
  const optional: MappingEntry[] = [];
  const missing: MissingEntry[] = [];
  for (const [sap, aliases] of Object.entries(spec.required)) {
    const src = find(aliases);
    if (src) required.push({ source: src, sap_field: sap });
    else missing.push({ sap_field: sap, note: "required" });
  }
  for (const [sap, aliases] of Object.entries(spec.optional)) {
    const src = find(aliases);
    if (src) optional.push({ source: src, sap_field: sap });
  }
  return { required, optional, missing };
}

/* --------------- validation --------------- */
export function validate({
  target, headers, rows,
}: { target: Target; headers: Header[]; rows: Row[]; }): ValidationResult {
  const issues: Issue[] = [];
  const loc = (row: number, header: string) => ({ row, source: header });
  const add = (severity: Issue["severity"], message: string, row: number, header: string, hint?: string) =>
    issues.push({ severity, message, location: loc(row, header), hint });

  if (target === "gl_accounts") {
    rows.forEach((r, idx) => {
      const i = idx + 2; // + header row
      if (!r["Chart"]) add("error", "Champ requis 'Chart' manquant.", i, "Chart", "Renseigner le plan (ex. YCOA).");
      const cur = r["Currency"];
      if (cur) {
        const v = normCurrency(cur);
        if (!ISO3.test(String(v))) add("warning", "Devise non ISO-3", i, "Currency", "Utiliser codes ISO-3 (ex. EUR, USD).");
      }
    });
  }
  if (target === "opening_balances") {
    const byCie = new Map<string, { d: number; c: number }>();
    rows.forEach((r) => {
      const k = String(r["Company Code"] || "");
      const d = Number(r["Debit"] || 0), c = Number(r["Credit"] || 0);
      const acc = byCie.get(k) || { d: 0, c: 0 };
      acc.d += d; acc.c += c; byCie.set(k, acc);
    });
    for (const [k, { d, c }] of byCie) {
      if (Math.abs(d - c) > 0.0001)
        add("error", `Balance non équilibrée pour ${k}: debit=${d} credit=${c}`, 1, "Debit/Credit", "Ajuster les écritures d'ouverture.");
    }
  }
  if (target === "ytd_movements") {
    const byDoc = new Map<string, { d: number; c: number }>();
    rows.forEach((r) => {
      const doc = String(r["Document No"] || r["Doc No"] || "");
      const amt = Number(r["Amount"] || 0);
      const dc = String(r["D/C"] || "").toUpperCase();
      const acc = byDoc.get(doc) || { d: 0, c: 0 };
      if (dc === "D") acc.d += amt;
      else if (dc === "C") acc.c += amt;
      byDoc.set(doc, acc);
    });
    for (const [doc, { d, c }] of byDoc) {
      if (Math.abs(d - c) > 0.0001)
        add("error", `Document ${doc} déséquilibré: D=${d} C=${c}`, 1, "Amount", "Compléter la contrepartie.");
    }
  }
  if (target === "bank_details" || target === "suppliers") {
    rows.forEach((r, idx) => {
      const i = idx + 2;
      if (r["Country"]) {
        const v = normCountry(r["Country"]);
        if (!ISO2.test(String(v))) add("warning", "Pays non ISO-2", i, "Country", "Ex: FR, US, DE.");
      }
      if (r["IBAN"]) {
        const res = validateIBAN(String(r["IBAN"]));
        if (!res.ok) add("error", `IBAN invalide (${res.reason})`, i, "IBAN", "Vérifier longueur & mod97.");
      }
      if (r["SWIFT/BIC"]) {
        const res = validateBIC(String(r["SWIFT/BIC"]));
        if (!res.ok) add("error", "BIC invalide", i, "SWIFT/BIC", "8 ou 11 caractères A-Z0-9.");
      }
    });
  }
  const summary = {
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warning").length,
    infos: issues.filter((i) => i.severity === "info").length,
  };
  return { summary, issues };
}

/* --------------- shaping LTMC --------------- */
export function shapeLTMC({
  target, headers, rows, mapping, userHints,
}: { target: Target; headers: Header[]; rows: Row[]; mapping: Mapping; userHints?: Record<string, unknown>; }): { sheets: Sheet[] } {
  const pick = (r: Row, cols: string[]) => Object.fromEntries(cols.map((c) => [c, r[c] ?? ""]));

  if (target === "gl_accounts") {
    const s1Cols = ["Chart", "G/L Account", "Account Group", "Account Type", "Short Text"];
    const s2Cols = ["G/L Account", "Company Code", "Currency", "Open Item Managed", "Field Status Group"];
    return {
      sheets: [
        { name: "GL_Chart", columns: s1Cols, rows: rows.map((r) => pick(r, s1Cols)) },
        { name: "GL_CompanyCode", columns: s2Cols, rows: rows.map((r) => pick(r, s2Cols)) },
      ],
    };
  }
  if (target === "opening_balances") {
    const cols = ["Company Code", "Chart", "G/L Account", "Currency", "Posting Date", "Debit", "Credit", "Text"];
    return { sheets: [{ name: "GL_Balances", columns: cols, rows: rows.map((r) => pick(r, cols)) }] };
  }
  if (target === "ytd_movements") {
    const cols = ["Document No", "Company Code", "Posting Date", "G/L Account", "Currency", "Amount", "D/C", "Text"];
    return { sheets: [{ name: "GL_Postings", columns: cols, rows: rows.map((r) => pick(r, cols)) }] };
  }
  if (target === "suppliers") {
    const gen = ["Vendor", "BP Grouping", "Account Group", "Name1", "Street", "Postal Code", "City", "Country", "Telephone"];
    const cc = ["Vendor", "Company Code", "Reconciliation Account", "Payment Terms", "Payment Methods"];
    const bank = ["Vendor", "Bank Country", "Bank Key", "Account No/IBAN", "IBAN", "SWIFT/BIC", "Account Holder"];
    return {
      sheets: [
        { name: "BP_General (Vendor)", columns: gen, rows: rows.map((r) => pick(r, gen)) },
        { name: "BP_CompanyCode (Vendor)", columns: cc, rows: rows.map((r) => pick(r, cc)) },
        { name: "BP_Bank", columns: bank, rows: rows.map((r) => pick(r, bank)) },
      ],
    };
  }
  if (target === "customers") {
    const gen = ["Customer", "BP Grouping", "Account Group", "Name1", "Street", "Postal Code", "City", "Country", "Telephone"];
    const cc = ["Customer", "Company Code", "Reconciliation Account", "Payment Terms"];
    return {
      sheets: [
        { name: "BP_General (Customer)", columns: gen, rows: rows.map((r) => pick(r, gen)) },
        { name: "BP_CompanyCode (Customer)", columns: cc, rows: rows.map((r) => pick(r, cc)) },
      ],
    };
  }
  return { sheets: [] };
}
