#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { transformSync } from "esbuild";
import { createRuntimeInstance, setRuntime, getRuntimeState } from "../index.js";

const cwd = process.cwd();
const realRequire = createRequire(import.meta.url);
const args = process.argv.slice(2).filter((arg) => arg !== "run");
const patterns = args.length ? args : ["tests"];

const moduleCache = new Map();

function collectFiles(entry, acc) {
  const stat = fs.statSync(entry);
  if (stat.isDirectory()) {
    const files = fs.readdirSync(entry);
    files.forEach((file) => collectFiles(path.join(entry, file), acc));
    return;
  }
  if (/\.test\.ts$/.test(entry)) {
    acc.push(entry);
  }
}

function resolveModule(request, parent) {
  if (request.startsWith(".") || request.startsWith("/")) {
    const base = request.startsWith(".") ? path.resolve(path.dirname(parent), request) : path.resolve(request);
    if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
    const tryExts = [".ts", ".tsx", ".js", ".mjs", ".cjs", ".json"];
    for (const ext of tryExts) {
      const candidate = base + ext;
      if (fs.existsSync(candidate)) return candidate;
    }
    if (fs.existsSync(base) && fs.statSync(base).isDirectory()) {
      for (const ext of [".ts", ".tsx", ".js", ".mjs", ".cjs"]) {
        const indexFile = path.join(base, "index" + ext);
        if (fs.existsSync(indexFile)) return indexFile;
      }
    }
    return base;
  }
  return request;
}

function compileTs(filename) {
  const source = fs.readFileSync(filename, "utf8");
  const result = transformSync(source, {
    loader: filename.endsWith(".tsx") ? "tsx" : "ts",
    format: "cjs",
    target: "es2020",
    platform: "node",
    sourcemap: "inline",
    sourcefile: filename,
  });
  return result.code;
}

function loadModule(filename) {
  if (moduleCache.has(filename)) return moduleCache.get(filename).exports;
  const ext = path.extname(filename);
  if (ext === ".js" || ext === ".cjs" || ext === ".mjs") {
    const exports = realRequire(filename);
    moduleCache.set(filename, { exports });
    return exports;
  }
  if (ext === ".json") {
    const data = JSON.parse(fs.readFileSync(filename, "utf8"));
    moduleCache.set(filename, { exports: data });
    return data;
  }
  const code = compileTs(filename);
  const module = { exports: {} };
  moduleCache.set(filename, module);
  const context = vm.createContext({
    console,
    process,
    Buffer,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    module,
    exports: module.exports,
    __dirname: path.dirname(filename),
    __filename: filename,
    require: (request) => customRequire(request, filename),
  });
  vm.runInContext(code, context, { filename });
  return module.exports;
}

function customRequire(request, parent) {
  if (request === "vitest") {
    return {
      describe: (...args) => getRuntimeState().describe(...args),
      it: (...args) => getRuntimeState().it(...args),
      test: (...args) => getRuntimeState().test(...args),
      beforeAll: (...args) => getRuntimeState().beforeAll(...args),
      afterAll: (...args) => getRuntimeState().afterAll(...args),
      beforeEach: (...args) => getRuntimeState().beforeEach(...args),
      afterEach: (...args) => getRuntimeState().afterEach(...args),
      expect: (...args) => getRuntimeState().expect(...args),
    };
  }
  const resolved = resolveModule(request, parent);
  if (resolved === request && !(request.startsWith(".") || request.startsWith("/"))) {
    return realRequire(request);
  }
  const ext = path.extname(resolved);
  if (ext === ".ts" || ext === ".tsx") {
    return loadModule(resolved);
  }
  if (ext === ".json") {
    return JSON.parse(fs.readFileSync(resolved, "utf8"));
  }
  return realRequire(resolved);
}

function executeTestFile(filename) {
  const runtime = createRuntimeInstance();
  setRuntime(runtime);
  runtime.reset();
  moduleCache.clear();
  const code = compileTs(filename);
  const context = vm.createContext({
    console,
    process,
    Buffer,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    module: { exports: {} },
    exports: {},
    __dirname: path.dirname(filename),
    __filename: filename,
    require: (request) => customRequire(request, filename),
  });
  vm.runInContext(code, context, { filename });
  return runtime;
}

function relative(file) {
  return path.relative(cwd, file) || file;
}

function printResult(result) {
  if (!result.error) {
    console.log(`  \x1b[32m✓\x1b[0m ${result.name}`);
  } else {
    console.log(`  \x1b[31m✗\x1b[0m ${result.name}`);
    console.log(`    ${result.error.stack || result.error.message || result.error}`);
  }
}

const files = [];
patterns.forEach((pattern) => {
  const target = path.resolve(cwd, pattern);
  if (!fs.existsSync(target)) return;
  collectFiles(target, files);
});

if (!files.length) {
  console.error("Aucun test trouvé.");
  process.exit(1);
}

let passed = 0;
let failed = 0;

for (const file of files.sort()) {
  console.log(`\n\x1b[1m${relative(file)}\x1b[0m`);
  const runtime = executeTestFile(file);
  const results = await runtime.run();
  results.forEach((result) => {
    printResult(result);
    if (result.error) failed += 1;
    else passed += 1;
  });
}

console.log("\nRésumé :", `${passed} réussites`, `${failed} échecs`);
process.exit(failed ? 1 : 0);
