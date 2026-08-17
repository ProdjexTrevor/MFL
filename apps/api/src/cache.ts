import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

const cacheDir = process.env.VERCEL
  ? join("/tmp", "mfl-cache")
  : join(dirname(fileURLToPath(import.meta.url)), "../.cache");

function fileFor(key: string) {
  const safe = key.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "cache";
  return join(cacheDir, `${safe}.json`);
}

function readDisk<T>(key: string): CacheEntry<T> | undefined {
  try {
    const path = fileFor(key);
    if (!existsSync(path)) return undefined;
    return JSON.parse(readFileSync(path, "utf8")) as CacheEntry<T>;
  } catch {
    return undefined;
  }
}

function writeDisk<T>(key: string, entry: CacheEntry<T>) {
  if (entry.value instanceof Map || entry.value instanceof Set) return;
  try {
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(fileFor(key), JSON.stringify(entry));
  } catch {
    // /tmp or local disk may be unavailable; memory cache still works.
  }
}

export function getStale<T>(key: string): T | undefined {
  const memory = store.get(key) as CacheEntry<T> | undefined;
  if (memory) return memory.value;
  return readDisk<T>(key)?.value;
}

export function getCached<T>(key: string): T | undefined {
  const memory = store.get(key) as CacheEntry<T> | undefined;
  if (memory && Date.now() <= memory.expiresAt) return memory.value;
  const disk = readDisk<T>(key);
  if (disk && Date.now() <= disk.expiresAt) {
    store.set(key, disk);
    return disk.value;
  }
  return undefined;
}

export function setCached<T>(key: string, value: T, ttlMs: number): T {
  const entry: CacheEntry<T> = { value, expiresAt: Date.now() + ttlMs };
  store.set(key, entry);
  writeDisk(key, entry);
  return value;
}

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const hit = getCached<T>(key);
  if (hit !== undefined) return hit;
  const value = await loader();
  return setCached(key, value, ttlMs);
}

export async function cachedOrStale<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  try {
    return await cached(key, ttlMs, loader);
  } catch (err) {
    const stale = getStale<T>(key);
    if (stale !== undefined) {
      console.warn(`Using stale ${key}`, err);
      return stale;
    }
    throw err;
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
