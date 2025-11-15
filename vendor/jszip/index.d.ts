export interface GenerateAsyncOptions {
  type?: "blob" | "base64";
}

declare class JSZip {
  constructor();
  file(name: string, content: string): void;
  generateAsync(options?: GenerateAsyncOptions): Promise<Blob | string>;
}

export default JSZip;
