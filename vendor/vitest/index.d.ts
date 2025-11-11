export type TestFunction = () => void | Promise<void>;
export interface RuntimeResult {
  name: string;
  error: unknown | null;
}

export interface RuntimeApi {
  describe(name: string, fn: TestFunction): void;
  it(name: string, fn: TestFunction): void;
  test(name: string, fn: TestFunction): void;
  beforeAll(fn: TestFunction): void;
  afterAll(fn: TestFunction): void;
  beforeEach(fn: TestFunction): void;
  afterEach(fn: TestFunction): void;
  expect<T>(value: T): Expectation<T>;
  run(): Promise<RuntimeResult[]>;
  reset(): void;
}

export interface Expectation<T> {
  toBe(expected: T): void;
  toEqual(expected: unknown): void;
  toMatchObject(expected: Partial<T extends object ? T : never>): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toContain(expected: unknown extends T ? never : unknown): void;
  toHaveLength(expected: number): void;
  toThrow(message?: string): void;
}

export declare function setRuntime(runtime: RuntimeApi): void;
export declare function createRuntimeInstance(): RuntimeApi;
export declare function getRuntimeState(): RuntimeApi;

export declare const describe: RuntimeApi["describe"];
export declare const it: RuntimeApi["it"];
export declare const test: RuntimeApi["test"];
export declare const beforeAll: RuntimeApi["beforeAll"];
export declare const afterAll: RuntimeApi["afterAll"];
export declare const beforeEach: RuntimeApi["beforeEach"];
export declare const afterEach: RuntimeApi["afterEach"];
export declare const expect: RuntimeApi["expect"];
