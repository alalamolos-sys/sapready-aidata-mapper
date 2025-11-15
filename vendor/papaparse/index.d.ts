export type PapaParseResult = {
  data: unknown[];
  errors: unknown[];
  meta: { fields?: string[] };
};

export type PapaParseOptions = {
  header?: boolean;
  skipEmptyLines?: boolean | "greedy";
  transformHeader?: (header: string) => string;
  delimiter?: string;
  complete?: (results: PapaParseResult) => void;
  error?: (error: Error) => void;
};

declare const Papa: {
  parse(input: File | string, options?: PapaParseOptions): void;
};

export default Papa;
