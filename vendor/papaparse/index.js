function sanitizeInput(raw) {
  if (raw.length > 0 && raw.charCodeAt(0) === 0xfeff) {
    return raw.slice(1);
  }
  return raw;
}

function parseCsvLine(line, delimiter) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === "\"") {
      if (inQuotes && line[i + 1] === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

async function parseFile(input, options) {
  try {
    const rawText = typeof input === "string" ? input : await input.text();
    const normalized = sanitizeInput(rawText);
    const delimiter = (options.delimiter ?? ",").toString();
    const effectiveDelimiter = delimiter.length > 0 ? delimiter[0] : ",";

    const lines = normalized
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+$/, ""))
      .filter((line) => {
        if (!options.skipEmptyLines) return true;
        if (options.skipEmptyLines === "greedy") {
          return line.trim().length > 0;
        }
        return line.length > 0;
      });

    if (lines.length === 0) {
      options.complete?.({ data: [], errors: [], meta: {} });
      return;
    }

    const headerLine = parseCsvLine(lines[0], effectiveDelimiter);
    const headers = options.transformHeader
      ? headerLine.map((h) => options.transformHeader?.(h) ?? h)
      : headerLine;

    const rows = [];

    for (let index = 1; index < lines.length; index += 1) {
      const values = parseCsvLine(lines[index], effectiveDelimiter);
      if (values.every((value) => value.trim().length === 0)) {
        continue;
      }
      const record = {};
      headers.forEach((header, headerIndex) => {
        const value = values[headerIndex] ?? "";
        record[header] = options.header ? value.trim() : value;
      });
      rows.push(record);
    }

    options.complete?.({
      data: options.header ? rows : rows.map((row) => Object.values(row)),
      errors: [],
      meta: { fields: options.header ? headers : undefined },
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    options.error?.(error);
  }
}

const Papa = {
  parse(input, options = {}) {
    void parseFile(input, options);
  },
};

export default Papa;
