import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { readEnvFile, resolveEnvFilePath, writeEnvFile } from "@/lib/local-env";

const created: string[] = [];

afterEach(() => {
  for (const directory of created.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
  delete process.env.BTB_ENV_FILE;
});

describe("writeEnvFile", () => {
  it("escribe en el mismo archivo y no deja el permiso abierto a otros", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "btb-env-"));
    created.push(directory);
    const filePath = path.join(directory, ".env");
    fs.writeFileSync(filePath, "PORT=8080\n", { mode: 0o600 });
    writeEnvFile(filePath, "PORT=8080\nAPI_BASE_URL=http://127.0.0.1:8080\n");
    const read = readEnvFile(filePath);
    expect(read.values.get("PORT")).toBe("8080");
    expect(read.values.get("API_BASE_URL")).toBe("http://127.0.0.1:8080");
    expect(fs.statSync(filePath).mode & 0o777).toBe(0o600);
  });

  it("no escribe un archivo más grande de lo que después se puede leer", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "btb-env-"));
    created.push(directory);
    const filePath = path.join(directory, ".env");
    fs.writeFileSync(filePath, "PORT=8080\n", { mode: 0o600 });
    expect(() => writeEnvFile(filePath, "A".repeat(64 * 1024 + 1))).toThrow("unsafe-value");
    expect(fs.readFileSync(filePath, "utf8")).toBe("PORT=8080\n");
  });
});

describe("resolveEnvFilePath", () => {
  it("respeta BTB_ENV_FILE", () => {
    process.env.BTB_ENV_FILE = "/tmp/btb-marcado.env";
    expect(resolveEnvFilePath()).toBe("/tmp/btb-marcado.env");
  });
});
