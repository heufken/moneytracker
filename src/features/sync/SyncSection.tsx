import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { enableSync, lastSync, pair, stopSync, syncAvailable, syncLink, syncNow } from "./sync";

const input =
  "h-11 w-full rounded-none border-2 border-border bg-card px-3 text-base shadow-hard-sm focus:outline-3 focus:outline-ring focus:outline-offset-2";

const stamp = (ms: number) =>
  new Date(ms).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const WHAT = {
  pulled: "received changes from your other device",
  pushed: "sent this device's changes",
  idle: "already up to date",
};

/** Optional multi-device sync, press-to-sync. Renders nothing unless VITE_SYNC_URL is set (and crypto is available). */
export function SyncSection() {
  const [link, setLink] = useState(syncLink); // null = sync is off on this device
  const [last, setLast] = useState(lastSync);
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [showLink, setShowLink] = useState(false);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);

  if (!syncAvailable()) return null;

  async function act(fn: () => Promise<string | void>) {
    setBusy(true);
    setMsg(null);
    try {
      setMsg((await fn()) ?? null);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setLink(syncLink());
      setLast(lastSync());
      setBusy(false);
    }
  }

  /** resolve is only set after the user picked a side in the conflict dialog. */
  const doSync = (resolve?: "remote" | "local") =>
    act(async () => {
      if ((await syncNow(resolve)) === "conflict") setConflict(true);
    });

  async function copy() {
    try {
      await navigator.clipboard.writeText(link!);
      setMsg("Pairing link copied.");
    } catch {
      setShowLink(true); // clipboard blocked: show it to copy by hand
    }
  }

  return (
    <section aria-label="Sync" className="space-y-3">
      <h2 className="font-display text-xl font-bold">Sync</h2>
      <p className="text-sm text-muted-foreground">
        Optional. Press Sync to copy this device&apos;s changes to your other devices, or to get theirs. Nothing
        syncs by itself. The pairing link is the password: anyone who has it can read and overwrite your data.
      </p>

      {link ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => void doSync()}>
              {busy ? "Syncing…" : "Sync"}
            </Button>
            <Button variant="secondary" onClick={() => void copy()}>
              Copy pairing link
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                stopSync();
                setLink(null);
                setLast(null);
                setShowLink(false);
                setMsg("Sync is off here. Your data on this device is untouched.");
              }}
            >
              Turn off here
            </Button>
          </div>
          <p className="text-sm">
            {last ? `Last synced ${stamp(last.at)}: ${WHAT[last.kind]}.` : "Not synced yet. Press Sync."}
          </p>
          {showLink && <input readOnly aria-label="Pairing link" value={link} className={input} onFocus={(e) => e.target.select()} />}
        </div>
      ) : (
        <div className="space-y-3">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void act(async () => {
                await enableSync();
                return "Sync is on. Copy the pairing link to your other device.";
              })
            }
          >
            Turn on sync
          </Button>
          <label htmlFor="pair" className="block text-xs font-semibold uppercase tracking-widest">
            Already have a pairing link?
          </label>
          <div className="flex gap-2">
            <input id="pair" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Paste it here" className={input} />
            <Button
              variant="secondary"
              disabled={busy || paste.trim() === ""}
              onClick={() =>
                void act(async () => {
                  const ok = await pair(paste);
                  if (ok) setPaste("");
                  return ok ? "Paired." : "Not paired (that is not a pairing link, or you cancelled).";
                })
              }
            >
              Pair
            </Button>
          </div>
        </div>
      )}

      {msg && (
        <p role="status" className="text-sm">
          {msg}
        </p>
      )}

      <Dialog open={conflict} title="Both devices changed" destructive onClose={() => setConflict(false)}>
        <p className="mb-4 text-base">
          This device and the cloud copy both have changes the other doesn&apos;t. They can&apos;t be combined, so pick
          the one to keep.
        </p>
        <div className="space-y-3">
          <div>
            <Button
              className="w-full"
              onClick={() => {
                setConflict(false);
                void doSync("remote");
              }}
            >
              Use cloud copy
            </Button>
            <p className="mt-1 text-sm text-muted-foreground">
              Replaces this device&apos;s data. A snapshot of it is saved in Settings.
            </p>
          </div>
          <div>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                setConflict(false);
                void doSync("local");
              }}
            >
              Use this device
            </Button>
            <p className="mt-1 text-sm text-muted-foreground">
              Replaces the cloud copy. Your other device keeps its data until it syncs next, and saves a snapshot first.
            </p>
          </div>
          <Button variant="ghost" className="w-full" onClick={() => setConflict(false)}>
            Cancel
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
