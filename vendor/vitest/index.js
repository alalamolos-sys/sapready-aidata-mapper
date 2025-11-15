import { AssertionError } from "node:assert";
import { inspect, isDeepStrictEqual } from "node:util";

const runtimeSymbol = Symbol.for("local-vitest-runtime");

function format(value) {
  return inspect(value, { depth: 6, colors: false, compact: false });
}

function createExpect() {
  const expectFn = (received) => {
    const ensureNumber = (value, matcher) => {
      if (typeof value !== "number") {
        throw new AssertionError({
          actual: typeof value,
          expected: "number",
          message: `${matcher} attend un nombre, reçu ${typeof value}`,
        });
      }
      return value;
    };

    const ensureArrayLike = (value, matcher) => {
      if (!(typeof value === "string" || Array.isArray(value))) {
        throw new AssertionError({
          actual: value,
          expected: "Array|string",
          message: `${matcher} attend un tableau ou une chaîne, reçu ${format(value)}`,
        });
      }
      return value;
    };

    const matchers = {
      toBe(expected) {
        if (!Object.is(received, expected)) {
          throw new AssertionError({
            actual: received,
            expected,
            message: `Attendu ${format(expected)}, reçu ${format(received)}`,
          });
        }
      },
      toEqual(expected) {
        if (!isDeepStrictEqual(received, expected)) {
          throw new AssertionError({
            actual: received,
            expected,
            message: `Objet différent. Attendu ${format(expected)} reçu ${format(received)}`,
          });
        }
      },
      toMatchObject(expected) {
        if (typeof received !== "object" || received === null) {
          throw new AssertionError({
            actual: received,
            expected,
            message: `toMatchObject requiert un objet, reçu ${format(received)}`,
          });
        }
        for (const [key, value] of Object.entries(expected)) {
          if (!isDeepStrictEqual(received[key], value)) {
            throw new AssertionError({
              actual: received,
              expected,
              message: `Clé ${key} attendue ${format(value)}, reçu ${format(received[key])}`,
            });
          }
        }
      },
      toBeGreaterThan(expected) {
        const actual = ensureNumber(received, "toBeGreaterThan");
        if (!(actual > expected)) {
          throw new AssertionError({
            actual,
            expected,
            message: `Attendu un nombre > ${expected}, reçu ${actual}`,
          });
        }
      },
      toBeGreaterThanOrEqual(expected) {
        const actual = ensureNumber(received, "toBeGreaterThanOrEqual");
        if (!(actual >= expected)) {
          throw new AssertionError({
            actual,
            expected,
            message: `Attendu un nombre ≥ ${expected}, reçu ${actual}`,
          });
        }
      },
      toContain(expected) {
        const actual = ensureArrayLike(received, "toContain");
        if (!actual.includes(expected)) {
          throw new AssertionError({
            actual,
            expected,
            message: `L'élément ${format(expected)} est absent de ${format(actual)}`,
          });
        }
      },
      toHaveLength(expected) {
        if (received == null || typeof received.length !== "number") {
          throw new AssertionError({
            actual: received,
            expected,
            message: `Objet sans propriété length: ${format(received)}`,
          });
        }
        if (received.length !== expected) {
          throw new AssertionError({
            actual: received.length,
            expected,
            message: `Attendu une longueur ${expected}, reçu ${received.length}`,
          });
        }
      },
      toThrow(expected) {
        if (typeof received !== "function") {
          throw new AssertionError({
            actual: received,
            expected: "function",
            message: "toThrow requiert une fonction",
          });
        }
        let thrown = false;
        let error;
        try {
          received();
        } catch (err) {
          thrown = true;
          error = err;
        }
        if (!thrown) {
          throw new AssertionError({
            actual: undefined,
            expected,
            message: `La fonction n'a pas levé d'erreur`,
          });
        }
        if (expected && typeof expected === "string" && (!error || !String(error).includes(expected))) {
          throw new AssertionError({
            actual: String(error ?? ""),
            expected,
            message: `Message d'erreur attendu contenant ${expected}, reçu ${error}`,
          });
        }
      },
    };

    return matchers;
  };

  return expectFn;
}

function createSuite(name, parent = null) {
  return {
    name,
    parent,
    entries: [],
    beforeAll: [],
    afterAll: [],
    beforeEach: [],
    afterEach: [],
  };
}

function createRuntime() {
  const root = createSuite("root");
  let currentSuite = root;

  const runtime = {
    describe(name, fn) {
      const suite = createSuite(name, currentSuite);
      currentSuite.entries.push({ type: "suite", suite });
      const prev = currentSuite;
      currentSuite = suite;
      try {
        fn();
      } finally {
        currentSuite = prev;
      }
    },
    it(name, fn) {
      currentSuite.entries.push({ type: "test", name, fn });
    },
    test(name, fn) {
      runtime.it(name, fn);
    },
    beforeAll(fn) {
      currentSuite.beforeAll.push(fn);
    },
    afterAll(fn) {
      currentSuite.afterAll.push(fn);
    },
    beforeEach(fn) {
      currentSuite.beforeEach.push(fn);
    },
    afterEach(fn) {
      currentSuite.afterEach.push(fn);
    },
    expect: createExpect(),
    async run() {
      const results = [];
      await runSuite(root, [], results);
      return results;
    },
    reset() {
      root.entries = [];
      root.beforeAll = [];
      root.afterAll = [];
      root.beforeEach = [];
      root.afterEach = [];
      currentSuite = root;
    },
  };

  return runtime;
}

async function runSuite(suite, ancestors, results) {
  const stack = [...ancestors, suite];

  for (const hook of suite.beforeAll) {
    await hook();
  }

  for (const entry of suite.entries) {
    if (entry.type === "suite") {
      await runSuite(entry.suite, stack, results);
      continue;
    }
    const nameParts = stack.slice(1).map((s) => s.name).filter(Boolean);
    nameParts.push(entry.name);
    const displayName = nameParts.join(" > ");

    const beforeEachFns = stack.flatMap((s) => s.beforeEach);
    const afterEachFns = stack.flatMap((s) => s.afterEach).reverse();

    let error = null;

    try {
      for (const fn of beforeEachFns) {
        const res = fn();
        if (res && typeof res.then === "function") await res;
      }

      const result = entry.fn();
      if (result && typeof result.then === "function") await result;
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
    }

    for (const fn of afterEachFns) {
      try {
        const res = fn();
        if (res && typeof res.then === "function") await res;
      } catch (err) {
        if (!error) {
          error = err instanceof Error ? err : new Error(String(err));
        }
      }
    }

    results.push({ name: displayName, error });
  }

  for (const hook of suite.afterAll.slice().reverse()) {
    await hook();
  }
}

function getRuntime() {
  if (!globalThis[runtimeSymbol]) {
    globalThis[runtimeSymbol] = createRuntime();
  }
  return globalThis[runtimeSymbol];
}

export function setRuntime(runtime) {
  globalThis[runtimeSymbol] = runtime;
}

export function createRuntimeInstance() {
  return createRuntime();
}

export const describe = (...args) => getRuntime().describe(...args);
export const it = (...args) => getRuntime().it(...args);
export const test = (...args) => getRuntime().test(...args);
export const beforeAll = (...args) => getRuntime().beforeAll(...args);
export const afterAll = (...args) => getRuntime().afterAll(...args);
export const beforeEach = (...args) => getRuntime().beforeEach(...args);
export const afterEach = (...args) => getRuntime().afterEach(...args);
export const expect = (...args) => getRuntime().expect(...args);

export function getRuntimeState() {
  return getRuntime();
}
