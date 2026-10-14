import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../db/db";
import * as api from "../../db/api";
import type { BackupData } from "../../db/types";
import { lastSync, sync } from "./sync";

const SECRET = "ab".repeat(32);
const server = new Map<string, ArrayBuffer>(); // stands in for the Worker: id -> ciphertext

beforeEach(() => {
  server.clear();
  vi.stubEnv("VITE_SYNC_URL", "http://sync.test");
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    const id = url.split("/").pop()!;
    if (init?.method === "PUT") {
      server.set(id, await new Response(init.body).arrayBuffer());
      return new Response("ok");
    }
    const buf = server.get(id);
    return buf ? new Response(buf) : new Response(null, { status: 404 });
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// A "device" = its own localStorage + its own copy of the database.
// The app's db is a singleton, so `on` swaps a device in, runs fn, then parks its data.
interface Device {
  store: Map<string, string>;
  data?: BackupData;
}
const newDevice = (): Device => ({ store: new Map([["syncKey", SECRET]]) });
async function on<T>(d: Device, fn: () => Promise<T>): Promise<T> {
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => d.store.get(k) ?? null,
    setItem: (k: string, v: string) => void d.store.set(k, v),
    removeItem: (k: string) => void d.store.delete(k),
  });
  await db.delete();
  await db.open(); // seeds default categories
  if (d.data) await api.replaceAllData(d.data, "restore device");
  const out = await fn();
  d.data = await api.readAllData();
  return out;
}
const at = (s: string) => vi.setSystemTime(new Date(`2026-10-14T10:00:${s}Z`));
const add = (note: string) =>
  api.addTransaction({ type: "expense", amount: 1000, categoryId: "cat-food", date: "2026-10-14", note });
const notes = async () => (await api.listTransactions()).map((t) => t.note).sort();

// Both devices synced a1; B then pushed b1; A has an unsynced a2. Returns A and B.
async function diverge() {
  const [a, b] = [newDevice(), newDevice()];
  at("01");
  await on(a, async () => {
    await add("a1");
    await sync();
  });
  await on(b, () => sync()); // first sync: pulls a1
  at("02");
  await on(b, async () => {
    await add("b1");
    expect(await sync()).toBe("pushed");
  });
  at("03");
  await on(a, () => add("a2"));
  return { a, b };
}

describe("sync", () => {
  it("pushes ciphertext; a second device pulls it; a cloud-only change pulls silently", async () => {
    const [a, b] = [newDevice(), newDevice()];
    at("01");
    await on(a, async () => {
      await add("secret-lunch");
      expect(await sync()).toBe("pushed");
    });
    expect(server.size).toBe(1);
    expect(new TextDecoder("latin1").decode([...server.values()][0]!)).not.toContain("secret-lunch");

    await on(b, async () => {
      expect(await sync()).toBe("pulled");
      expect(await notes()).toEqual(["secret-lunch"]);
      expect(await sync()).toBe("idle");
    });
    at("02");
    await on(a, async () => {
      await add("second");
      expect(await sync()).toBe("pushed");
    });
    await on(b, async () => {
      expect(await sync()).toBe("pulled"); // B had no changes of its own: no question asked
      expect(await notes()).toEqual(["second", "secret-lunch"]);
    });
  });

  it("is idle until local data changes, then pushes, and remembers the last sync", async () => {
    const a = newDevice();
    at("01");
    await on(a, async () => {
      expect(lastSync()).toBeNull();
      await add("one");
      expect(await sync()).toBe("pushed");
      expect(await sync()).toBe("idle");
      expect(lastSync()?.kind).toBe("idle");
      at("02");
      await add("two");
      expect(await sync()).toBe("pushed");
      expect(lastSync()?.kind).toBe("pushed");
    });
  });

  it("both changed: asks first and touches nothing; 'cloud copy' replaces local but snapshots it", async () => {
    const { a } = await diverge();
    const before = [...server.values()][0];
    await on(a, async () => {
      expect(await sync()).toBe("conflict");
      expect(await notes()).toEqual(["a1", "a2"]); // untouched
      expect([...server.values()][0]).toBe(before); // cloud untouched
      expect(await sync("remote")).toBe("pulled");
      expect(await notes()).toEqual(["a1", "b1"]);
      const [snapshot] = await api.listBackups();
      expect(snapshot?.label).toBe("before sync");
      expect(snapshot?.data.transactions.map((t) => t.note).sort()).toEqual(["a1", "a2"]);
    });
  });

  it("both changed: 'this device' overwrites the cloud; the other device pulls it and keeps its old data in a snapshot", async () => {
    const { a, b } = await diverge();
    await on(a, async () => {
      expect(await sync()).toBe("conflict");
      expect(await sync("local")).toBe("pushed");
    });
    await on(b, async () => {
      expect(await sync()).toBe("pulled");
      expect(await notes()).toEqual(["a1", "a2"]);
      const [snapshot] = await api.listBackups();
      expect(snapshot?.data.transactions.map((t) => t.note).sort()).toEqual(["a1", "b1"]);
    });
  });

  it("refuses a damaged copy without touching local data", async () => {
    const a = newDevice();
    at("01");
    await on(a, async () => {
      await add("keep-me");
      await sync();
    });
    const id = [...server.keys()][0]!;
    server.set(id, new Uint8Array(64).buffer);
    at("02");
    await on(a, async () => {
      await expect(sync()).rejects.toThrow(/decrypt/);
      expect(await notes()).toEqual(["keep-me"]);
    });
  });
});
