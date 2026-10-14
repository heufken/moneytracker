import { useState } from "react";
import { Button } from "../../components/ui/button";
import { enableSync, pair, stopSync, syncAvailable, syncLink, syncNow } from "./sync";

const input =
  "h-11 w-full rounded-none border-2 border-border bg-card px-3 text-base shadow-hard-sm focus:outline-3 focus:outline-ring focus:outline-offset-2";

/** Optional multi-device sync. Renders nothing unless VITE_SYNC_URL is set (and crypto is available). */
export function SyncSection() {
  const [link, setLink] = useState(syncLink); // null = sync is off on this device
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [showLink, setShowLink] = useState(false);
  const [busy, setBusy] = useState(false);

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
      setBusy(false);
    }
  }

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
        Optional. Keeps an encrypted copy on your sync server so your devices share the same data. The pairing
        link is the password: anyone who has it can read and overwrite your data.
      </p>

      {link ? (
        <div className="space-y-3">
          <p className="font-bold">Sync is on for this device.</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  const r = await syncNow();
                  return r === "idle" ? "Already up to date." : r === "pushed" ? "Sent your changes." : "Got newer data.";
                })
              }
            >
              Sync now
            </Button>
            <Button variant="secondary" onClick={() => void copy()}>
              Copy pairing link
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                stopSync();
                setLink(null);
                setShowLink(false);
                setMsg("Sync is off here. Your data on this device is untouched.");
              }}
            >
              Turn off here
            </Button>
          </div>
          {showLink && <input readOnly aria-label="Pairing link" value={link} className={input} onFocus={(e) => e.target.select()} />}
        </div>
      ) : (
        <div className="space-y-3">
          <Button variant="secondary" disabled={busy} onClick={() => void act(async () => { await enableSync(); return "Sync is on. Copy the pairing link to your other device."; })}>
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
    </section>
  );
}
