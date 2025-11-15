import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { detectObject, mapColumns, validate, shapeLTMC } from "../src/lib/sapreadyCore";

type CsvRecord = Record<string, string>;

function loadFixture(name: string): { headers: string[]; rows: CsvRecord[] } {
  const fullPath = path.resolve(__dirname, "fixtures", name);
  const content = readFileSync(fullPath, "utf8").trim();
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim());
    const record: CsvRecord = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });
    return record;
  });
  return { headers, rows };
}

describe("sapreadyCore", () => {
  it("detects opening balance files from headers", () => {
    const { headers, rows } = loadFixture("opening_balances.csv");
    const target = detectObject(headers);
    expect(target).toBe("opening_balances");

    const validation = validate({ target, headers, rows });
    expect(validation.summary.errors).toBe(0);
    expect(validation.summary.warnings).toBe(0);
    expect(validation.issues).toHaveLength(0);
  });

  it("flags unbalanced YTD documents", () => {
    const { headers, rows } = loadFixture("ytd_unbalanced.csv");
    const target = detectObject(headers);
    expect(target).toBe("ytd_movements");

    const validation = validate({ target, headers, rows });
    expect(validation.summary.errors).toBeGreaterThan(0);
    const message = validation.issues.map((issue) => issue.message).join("\n");
    expect(message).toContain("900002");
  });

  it("shapes LTMC sheets with mapped SAP columns", () => {
    const { headers, rows } = loadFixture("gl_accounts.csv");
    const target = detectObject(headers);
    expect(target).toBe("gl_accounts");

    const mapping = mapColumns(headers, target);
    const shaped = shapeLTMC({ target, headers, rows, mapping, userHints: {} });

    expect(shaped.sheets).toHaveLength(1);
    const sheet = shaped.sheets[0];
    expect(sheet.columns).toContain("G/L Account");
    expect(sheet.columns).toContain("Field Status Group");
    expect(sheet.rows).toHaveLength(2);
    expect(sheet.rows[0]["G/L Account"]).toBe("101000");
    expect(sheet.rows[1]["Open Item Managed"]).toBe("X");
  });
});
