import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Absolute path to the shin root directory (one level above scripts/). */
export const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Load key=value pairs from a file into process.env.
 * Existing env variables are never overwritten (uses ??=).
 * Silently skips if the file does not exist.
 */
export function loadEnvFile(fileName) {
  const filePath = path.join(appDir, fileName);
  if (!existsSync(filePath)) return;

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
    process.env[key.trim()] ??= value;
  }
}

/** Parse a JSON file and return the result. */
export function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

/** SHA-256 hex digest of a string value. */
export function checksum(value) {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Assert that childPath is strictly inside parentDir.
 * Throws if the path escapes via '..' or is absolute.
 */
export function assertPathInside(parentDir, childPath) {
  const relative = path.relative(parentDir, childPath);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(
      `Refusing to access path outside ${path.relative(appDir, parentDir)}: ${childPath}`
    );
  }
}
