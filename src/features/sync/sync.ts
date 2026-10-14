// Opt-in, MANUAL sync (see PRD "Optional sync"): nothing happens until the user presses
// Sync. One end-to-end encrypted blob on a dumb key-value server; the random secret in
// the pairing link is the only identity. Inert unless VITE_SYNC_URL is set.
// All Dexie access still goes through db/api.
import { readAllData, replaceAllData } from "../../db/api";
import { parseBackupFile, type BackupFile } from "../backup/schema";

export const SYNCED_EVENT = "moneytracker:synced";

// Device-local state lives in localStorage, NOT the settings table:
// replaceAllData wipes settings, and these must never be synced anyway.
const KEY = "syncKey"; // the secret (64 hex chars)
const AT = "syncAt"; // exportedAt of the copy this device last pushed or pulled
const HASH = "syncHash"; // hash of local data as of that moment ("did I change anything?")
const LAST = "syncLast"; // "<ms>:<pulled|pushed|idle>": when this device last synced, and what happened
const get = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null; // storage blocked: sync just stays off
  }
};
const set = (k: string, v: string) => localStorage.setItem(k, v);
const del = (k: string) => localStorage.removeItem(k);

const baseUrl = (): string => String(import.meta.env.VITE_SYNC_URL ?? "").replace(/\/+$/, "");
/** Sync needs a server URL and crypto.subtle (HTTPS or localhost only). */
export const syncAvailable = () => baseUrl() !== "" && typeof crypto !== "undefined" && !!crypto.subtle;

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const sha = (s: string) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));

async function keys(secret: string) {
  return {
    id: hex(await sha("id:" + secret)), // the server only ever sees this + ciphertext
    aes: await crypto.subtle.importKey("raw", await sha("key:" + secret), "AES-GCM", false, ["encrypt", "decrypt"]),
  };
}

async function seal(aes: CryptoKey, text: string): Promise<Blob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aes, new TextEncoder().encode(text));
  return new Blob([iv, ct]); // binary, not base64: spreading big arrays into fromCharCode overflows
}

async function open(aes: CryptoKey, buf: ArrayBuffer): Promise<string> {
  try {
    const iv = new Uint8Array(buf.slice(0, 12));
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aes, buf.slice(12)));
  } catch {
    throw new Error("Could not decrypt the synced copy (wrong or damaged key).");
  }
}

async function snap() {
  const data = await readAllData();
  return { data, hash: hex(await sha(JSON.stringify(data))) };
}

export type SyncResult = "pulled" | "pushed" | "idle" | "conflict";

// ponytail: whole-copy, no merge. Cloud changed only -> pull. This device changed only -> push.
// Both changed -> "conflict": the caller asks the user, then calls again with resolve.
// Device clocks are trusted for "newer". Upgrade: per-record merge by updatedAt + tombstones.
async function run(resolve?: "remote" | "local"): Promise<SyncResult> {
  const secret = get(KEY);
  if (!secret || !syncAvailable()) return "idle";
  const { id, aes } = await keys(secret);
  const url = `${baseUrl()}/${id}`;

  const res = await fetch(url, { cache: "no-store" });
  let remote: BackupFile | null = null;
  if (res.ok) {
    const parsed = parseBackupFile(await open(aes, await res.arrayBuffer())); // Zod before any write
    if (!parsed.ok) throw new Error(parsed.error);
    remote = parsed.file;
  } else if (res.status !== 404) {
    throw new Error(`Sync server answered ${res.status}.`);
  }

  const { data, hash } = await snap();
  const first = get(HASH) === null; // paired but never synced: the cloud copy wins (pairing already asked)
  const changed = hash !== get(HASH);
  const newer = !!remote && remote.exportedAt > (get(AT) ?? "");

  if (newer && changed && !first && !resolve) return "conflict";

  let result: Exclude<SyncResult, "conflict">;
  if (remote && (resolve === "remote" || (newer && (!changed || first)))) {
    await replaceAllData(remote.data, "before sync"); // snapshots current data first
    set(AT, remote.exportedAt);
    set(HASH, (await snap()).hash);
    result = "pulled";
  } else if (changed || resolve === "local") {
    const exportedAt = new Date().toISOString();
    const body = await seal(aes, JSON.stringify({ version: 1, exportedAt, data }));
    const put = await fetch(url, { method: "PUT", body });
    if (!put.ok) throw new Error(`Sync server answered ${put.status}.`);
    set(AT, exportedAt);
    set(HASH, hash);
    result = "pushed";
  } else {
    result = "idle";
  }
  set(LAST, `${Date.now()}:${result}`);
  return result;
}

// One sync at a time: a double-click must not run two syncs.
let inflight: Promise<SyncResult> | null = null;
export const sync = (resolve?: "remote" | "local") => (inflight ??= run(resolve).finally(() => (inflight = null)));

/** sync() + tell the UI to reload its data when something was pulled. */
export async function syncNow(resolve?: "remote" | "local") {
  const result = await sync(resolve);
  if (result === "pulled") window.dispatchEvent(new Event(SYNCED_EVENT));
  return result;
}

/** When this device last synced and what happened, for the "Last synced" line. */
export function lastSync(): { at: number; kind: "pulled" | "pushed" | "idle" } | null {
  const [at, kind] = (get(LAST) ?? "").split(":");
  return at && kind ? { at: Number(at), kind: kind as "pulled" | "pushed" | "idle" } : null;
}

export const syncLink = (): string | null => {
  const k = get(KEY);
  return k ? `${location.origin}${location.pathname}#sync=${k}` : null;
};

function reset(secret: string | null) {
  if (secret) set(KEY, secret);
  else del(KEY);
  del(AT);
  del(HASH);
  del(LAST);
}

/** First device: mint a secret and push this device's data. */
export async function enableSync(): Promise<void> {
  reset(hex(crypto.getRandomValues(new Uint8Array(32)).buffer));
  await syncNow();
}

/** Other devices: accept a pairing link (or the bare key). Returns false if declined or not a key. */
export async function pair(input: string, ask: (msg: string) => boolean = (m) => confirm(m)): Promise<boolean> {
  const secret = input.match(/[0-9a-f]{64}/)?.[0];
  if (!secret) return false;
  const d = await readAllData();
  const hasData = d.transactions.length + (d.wallets ?? []).length > 0;
  if (hasData && !ask("This device already has data. Syncing replaces it with the synced copy (a snapshot is kept in Settings). Continue?"))
    return false;
  reset(secret);
  await syncNow(); // first sync of a paired device: the cloud copy wins
  return true;
}

export const stopSync = () => reset(null);

/** Call once at startup, BEFORE the router mounts: HashRouter would read "#sync=…" as a route. */
export function consumePairingLink() {
  if (!location.hash.startsWith("#sync=")) return;
  const link = location.hash;
  history.replaceState(null, "", location.pathname + location.search);
  if (syncAvailable()) void pair(link).catch(console.error);
}
