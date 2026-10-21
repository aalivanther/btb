import fs from "node:fs";
import path from "node:path";

import { parseEnv, type EnvMap } from "@/lib/env-file";

const MAX_ENV_BYTES = 64 * 1024;

export function resolveEnvFilePath(): string {
  const override = process.env.BTB_ENV_FILE?.trim();
  if (override) {
    return override;
  }
  if (fs.existsSync(path.join(process.cwd(), "compose.yaml"))) {
    return path.join(process.cwd(), ".env");
  }
  return path.resolve(process.cwd(), "..", ".env");
}

export function readEnvFile(filePath = resolveEnvFilePath()): { content: string; values: EnvMap } {
  if (!fs.existsSync(filePath)) {
    return { content: "", values: new Map() };
  }
  const stat = fs.statSync(filePath);
  if (!stat.isFile() || stat.size > MAX_ENV_BYTES) {
    throw new Error("env-file-unreadable");
  }
  const content = fs.readFileSync(filePath, "utf8");
  return { content, values: parseEnv(content) };
}

export function writeEnvFile(filePath: string, content: string): void {
  if (Buffer.byteLength(content, "utf8") > MAX_ENV_BYTES) {
    throw new Error("unsafe-value");
  }
  const directory = path.dirname(filePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  }
  const exists = fs.existsSync(filePath);
  const fd = fs.openSync(filePath, exists ? "r+" : "w", 0o600);
  try {
    fs.ftruncateSync(fd, 0);
    fs.writeSync(fd, content);
  } finally {
    fs.closeSync(fd);
  }
  try {
    fs.chmodSync(filePath, 0o600);
  } catch {}
}
