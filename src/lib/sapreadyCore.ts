import objectDefinitionsJson from "./objectDefinitions.json";

export type Header = string;
export type Row = Record<string, unknown>;

export const OBJECT_TYPES = [
  "gl_accounts",
  "opening_balances",
  "ytd_movements",
  "suppliers",
  "customers",
  "bank_details",
] as const;

export type ObjectType = (typeof OBJECT_TYPES)[number];
export type Target = ObjectType | "unknown";

export interface MappingEntry { source: string; sap_field: string; }
export interface MissingEntry { sap_field: string; note: string; }
export interface Mapping {
  required: MappingEntry[];
  optional: MappingEntry[];
  missing: MissingEntry[];
}
export interface Issue {
  severity: "error" | "warning" | "info";
  message: string;
  location: { row: number; source: string };
  hint?: string;
}
export interface ValidationResult {
  summary: { errors: number; warnings: number; infos: number };
  issues: Issue[];
  grouped: { errors: Issue[]; warnings: Issue[]; infos: Issue[] };
}
export interface Sheet { name: string; columns: string[]; rows: Record<string, unknown>[] }

const ISO2 = /^[A-Z]{2}$/;
const ISO3 = /^[A-Z]{3}$/;
const BIC_RE = /^[A-Z0-9]{8}([A-Z0-9]{3})?$/i;

export function normCountry(s: unknown) {
  if (!hasValue(s)) return s as string | undefined;
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
  if (!hasValue(s)) return s as string | undefined;
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

interface DetectionDefinition {
  allOf: string[][];
  keywords: string[];
}

interface BaseRecordRule {
  type: string;
  field: string;
  message: string;
  severity?: Issue["severity"];
  hint?: string;
}

type RecordRule =
  | (BaseRecordRule & { type: "regex"; pattern: string; flags?: string })
  | (BaseRecordRule & { type: "isoCurrency" | "isoCountry" | "iban" | "bic" | "nonEmpty" | "numeric" })
  | (BaseRecordRule & { type: "inList"; values: string[]; caseSensitive?: boolean })
  | (BaseRecordRule & { type: "dependency"; dependsOn: string });

type AggregateRule =
  | {
      type: "balanceBy";
      groupBy: string[];
      debitField: string;
      creditField: string;
      message: string;
      hint?: string;
      severity?: Issue["severity"];
    }
  | {
      type: "documentBalance";
      documentField: string;
      amountField: string;
      dcField: string;
      message: string;
      hint?: string;
      severity?: Issue["severity"];
    };

interface ValidationRules {
  record?: RecordRule[];
  aggregate?: AggregateRule[];
}

interface ObjectDefinition {
  label: string;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  fieldAliases?: Record<string, string[]>;
  detection?: DetectionDefinition;
  ltmcSheets?: { name: string; columns: string[] }[];
  validationRules?: ValidationRules;
}

const OBJECT_DEFINITIONS = objectDefinitionsJson as Record<ObjectType, ObjectDefinition>;

function isKnownTarget(target: Target): target is ObjectType {
  return target !== "unknown";
}

const toKey = (value: string) => value.trim().toLowerCase();

const buildAliasMap = (definition: ObjectDefinition) => {
  const aliases = definition.fieldAliases ?? {};
  const allFields = new Set([...definition.requiredFields, ...definition.optionalFields]);
  const map = new Map<string, Set<string>>();
  for (const field of allFields) {
    const aliasSet = new Set<string>([toKey(field)]);
    (aliases[field] ?? []).forEach((alias) => aliasSet.add(toKey(alias)));
    map.set(field, aliasSet);
  }
  return map;
};

const hasValue = (value: unknown): boolean =>
  value !== undefined && value !== null && !(typeof value === "string" && value.trim() === "");

const asNumber = (value: unknown): number => {
  if (!hasValue(value)) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatMessage = (template: string, ctx: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (_, key) => String(ctx[key] ?? ""));

/* --------------- detection --------------- */
export function detectObject(headers: Header[]): Target {
  const normalizedHeaders = headers.map((h) => toKey(String(h)));
  let best: { target: ObjectType; ratio: number; requiredCoverage: number } | undefined;

  for (const target of OBJECT_TYPES) {
    const def = OBJECT_DEFINITIONS[target];
    const aliasMap = buildAliasMap(def);
    const fields = Array.from(aliasMap.keys());
    if (fields.length === 0) continue;

    let matched = 0;
    let requiredMatched = 0;

    for (const field of fields) {
      const aliases = aliasMap.get(field)!;
      const hasMatch = normalizedHeaders.some((header) => aliases.has(header));
      if (hasMatch) {
        matched += 1;
        if (def.requiredFields.includes(field)) requiredMatched += 1;
      }
    }

    const ratio = matched / fields.length;
    const requiredCoverage = def.requiredFields.length
      ? requiredMatched / def.requiredFields.length
      : 0;

    if (matched === 0 || requiredCoverage < 0.5) continue;

    if (!best || ratio > best.ratio || (ratio === best.ratio && requiredCoverage > best.requiredCoverage)) {
      best = { target, ratio, requiredCoverage };
    }
  }

  return best?.target ?? "unknown";
}

/* --------------- mapping ----------------- */
export function mapColumns(headers: Header[], target: Target): Mapping {
  if (!isKnownTarget(target)) return { required: [], optional: [], missing: [] };
  const def = OBJECT_DEFINITIONS[target];
  const normalizedHeaders = headers.map((h) => ({ raw: String(h), key: toKey(String(h)) }));
  const matchField = (field: string): string | undefined => {
    const aliases = def.fieldAliases?.[field] ?? [];
    const keys = new Set<string>([toKey(field), ...aliases.map(toKey)]);
    return normalizedHeaders.find((header) => keys.has(header.key))?.raw;
  };

  const required: MappingEntry[] = [];
  const optional: MappingEntry[] = [];
  const missing: MissingEntry[] = [];

  for (const field of def.requiredFields) {
    const source = matchField(field);
    if (source) required.push({ source, sap_field: field });
    else missing.push({ sap_field: field, note: "required" });
  }

  for (const field of def.optionalFields) {
    const source = matchField(field);
    if (source) optional.push({ source, sap_field: field });
  }

  return { required, optional, missing };
}

/* --------------- validation --------------- */
export function validate({
  target,
  headers,
  rows,
}: {
  target: Target;
  headers: Header[];
  rows: Row[];
}): ValidationResult {
  const issues: Issue[] = [];
  void headers;
  if (!isKnownTarget(target)) return summarise(issues);
  const def = OBJECT_DEFINITIONS[target];
  const rules = def.validationRules;
  const recordRules = rules?.record ?? [];

  const locate = (row: number, source: string) => ({ row, source });
  const pushIssue = (rule: { severity?: Issue["severity"]; message: string; hint?: string }, row: number, source: string) => {
    issues.push({
      severity: rule.severity ?? "error",
      message: rule.message,
      hint: rule.hint,
      location: locate(row, source),
    });
  };

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2; // include header row
    for (const rule of recordRules) {
      const value = row[rule.field];
      switch (rule.type) {
        case "regex": {
          if (!hasValue(value)) break;
          const flags = rule.flags ?? "i";
          const regex = new RegExp(rule.pattern, flags);
          if (!regex.test(String(value))) pushIssue(rule, rowNumber, rule.field);
          break;
        }
        case "isoCurrency": {
          if (!hasValue(value)) break;
          const normalised = normCurrency(value);
          if (!normalised || !ISO3.test(String(normalised))) pushIssue(rule, rowNumber, rule.field);
          break;
        }
        case "isoCountry": {
          if (!hasValue(value)) break;
          const normalised = normCountry(value);
          if (!normalised || !ISO2.test(String(normalised))) pushIssue(rule, rowNumber, rule.field);
          break;
        }
        case "iban": {
          if (!hasValue(value)) break;
          const res = validateIBAN(String(value));
          if (!res.ok) pushIssue(rule, rowNumber, rule.field);
          break;
        }
        case "bic": {
          if (!hasValue(value)) break;
          const res = validateBIC(String(value));
          if (!res.ok) pushIssue(rule, rowNumber, rule.field);
          break;
        }
        case "nonEmpty": {
          if (!hasValue(value)) pushIssue(rule, rowNumber, rule.field);
          break;
        }
        case "numeric": {
          if (!hasValue(value)) break;
          const n = Number(value);
          if (!Number.isFinite(n)) pushIssue(rule, rowNumber, rule.field);
          break;
        }
        case "inList": {
          if (!hasValue(value)) break;
          const comparator = rule.caseSensitive ? String(value) : String(value).toUpperCase();
          const candidates = rule.caseSensitive
            ? rule.values
            : rule.values.map((v) => v.toUpperCase());
          if (!candidates.includes(comparator)) pushIssue(rule, rowNumber, rule.field);
          break;
        }
        case "dependency": {
          if (hasValue(row[rule.field]) && !hasValue(row[rule.dependsOn])) pushIssue(rule, rowNumber, rule.field);
          break;
        }
        default:
          break;
      }
    }
  });

  const aggregateRules = rules?.aggregate ?? [];
  for (const rule of aggregateRules) {
    switch (rule.type) {
      case "balanceBy": {
        const totals = new Map<string, { debit: number; credit: number }>();
        rows.forEach((row) => {
          const key = rule.groupBy.map((f) => String(row[f] ?? "")).join("|");
          const current = totals.get(key) ?? { debit: 0, credit: 0 };
          current.debit += asNumber(row[rule.debitField]);
          current.credit += asNumber(row[rule.creditField]);
          totals.set(key, current);
        });
        for (const [group, { debit, credit }] of totals) {
          if (Math.abs(debit - credit) > 0.0001) {
            const context = { group, debit, credit };
            issues.push({
              severity: rule.severity ?? "error",
              message: formatMessage(rule.message, context),
              hint: rule.hint,
              location: locate(1, rule.debitField),
            });
          }
        }
        break;
      }
      case "documentBalance": {
        const totals = new Map<string, { debit: number; credit: number }>();
        rows.forEach((row) => {
          const doc = String(row[rule.documentField] ?? "");
          const amount = asNumber(row[rule.amountField]);
          const dc = String(row[rule.dcField] ?? "").toUpperCase();
          const current = totals.get(doc) ?? { debit: 0, credit: 0 };
          if (dc === "D") current.debit += amount;
          else if (dc === "C") current.credit += amount;
          totals.set(doc, current);
        });
        for (const [group, { debit, credit }] of totals) {
          if (Math.abs(debit - credit) > 0.0001) {
            const context = { group, debit, credit };
            issues.push({
              severity: rule.severity ?? "error",
              message: formatMessage(rule.message, context),
              hint: rule.hint,
              location: locate(1, rule.amountField),
            });
          }
        }
        break;
      }
      default:
        break;
    }
  }

  return summarise(issues);
}

function summarise(issues: Issue[]): ValidationResult {
  const grouped: ValidationResult["grouped"] = { errors: [], warnings: [], infos: [] };
  for (const issue of issues) {
    if (issue.severity === "warning") grouped.warnings.push(issue);
    else if (issue.severity === "info") grouped.infos.push(issue);
    else grouped.errors.push(issue);
  }

  return {
    issues,
    grouped,
    summary: {
      errors: grouped.errors.length,
      warnings: grouped.warnings.length,
      infos: grouped.infos.length,
    },
  };
}

/* --------------- shaping LTMC --------------- */
export function shapeLTMC({
  target,
  headers,
  rows,
  mapping,
  userHints,
}: {
  target: Target;
  headers: Header[];
  rows: Row[];
  mapping: Mapping;
  userHints?: Record<string, unknown>;
}): { sheets: Sheet[] } {
  void headers;
  void userHints;

  if (!isKnownTarget(target)) return { sheets: [] };
  const def = OBJECT_DEFINITIONS[target];
  const mappedFields = [...mapping.required, ...mapping.optional];
  const mappedFieldNames = new Set<string>(mappedFields.map((entry) => entry.sap_field));

  const orderedColumns: string[] = [];
  const pushUnique = (field: string) => {
    if (!orderedColumns.includes(field)) orderedColumns.push(field);
  };

  def.requiredFields.forEach(pushUnique);
  mappedFields.forEach((entry) => pushUnique(entry.sap_field));
  def.optionalFields
    .filter((field) => mappedFieldNames.has(field))
    .forEach(pushUnique);

  if (orderedColumns.length === 0) return { sheets: [] };

  const columnToSource = new Map<string, string>();
  mappedFields.forEach((entry) => columnToSource.set(entry.sap_field, entry.source));

  const sheetName = `${def.label} (${orderedColumns.length} colonnes)`;
  const sheetRows = rows.map((row) => {
    const shaped: Record<string, unknown> = {};
    orderedColumns.forEach((column) => {
      const source = columnToSource.get(column);
      shaped[column] = source ? row[source] ?? "" : "";
    });
    return shaped;
  });

  const sheets: Sheet[] = [
    {
      name: sheetName,
      columns: orderedColumns,
      rows: sheetRows,
    },
  ];

  return { sheets };
}
