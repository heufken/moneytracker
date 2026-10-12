import { useEffect, useRef, useState } from "react";
import { Download, RotateCcw, Upload } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { formatMoney } from "../../lib/money";
import { toCsv } from "../../lib/csv";
import { diffBackup, type BackupDiff } from "../../lib/backup-diff";
import {
  listBackups,
  readAllData,
  replaceAllData,
  restoreBackup,
} from "../../db/api";
import type { Backup, BackupData } from "../../db/types";
import { parseBackupFile } from "./schema";

/** Local datetime for snapshot labels, e.g. "Oct 12, 14:03". */
const stamp = (ms: number) =>
  new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function DiffTable({ title, diff }: { title: string; diff: BackupDiff["transactions"] }) {
  const { added, changed, removed } = diff;
  const allZero = added === 0 && changed === 0 && removed === 0;
  return (
    <tr className="border-b-2 border-border">
      <th scope="row" className="py-2 text-left font-bold">
        {title}
      </th>
      <td className={allZero || added === 0 ? "text-muted-foreground" : "text-success"}>+{added}</td>
      <td className={allZero || changed === 0 ? "text-muted-foreground" : "text-warning"}>~{changed}</td>
      <td className={allZero || removed === 0 ? "text-muted-foreground" : "text-destructive"}>-{removed}</td>
    </tr>
  );
}

interface ImportDialogProps {
  open: boolean;
  diff: BackupDiff | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Final warning: diff summary + net change before the replace. */
function ImportConfirmDialog({ open, diff, onConfirm, onCancel }: ImportDialogProps) {
  if (!diff) return null;
  const empty =
    diff.transactions.added + diff.transactions.changed === 0 &&
    diff.categories.added + diff.categories.changed === 0;
  return (
    <Dialog open={open} title="Replace all data?" destructive onClose={onCancel}>
      <p className="mb-4 text-base">
        This replaces everything currently in the app. Your current data is saved
        as a snapshot you can restore afterwards.
      </p>
      <table className="mb-4 w-full text-center text-base">
        <thead>
          <tr className="border-b-2 border-border text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <th className="text-left"> </th>
            <th>Added</th>
            <th>Changed</th>
            <th>Removed</th>
          </tr>
        </thead>
        <tbody>
          <DiffTable title="Transactions" diff={diff.transactions} />
          <DiffTable title="Categories" diff={diff.categories} />
          <DiffTable title="Wallets" diff={diff.wallets} />
        </tbody>
      </table>
      <p className="mb-4 text-sm">
        Net money change:{" "}
        <span className="font-bold">{formatMoney(diff.netChange)}</span>
      </p>
      {empty && (
        <p className="mb-4 text-sm text-warning">
          Warning: this file adds nothing — it only removes data.
        </p>
      )}
      <div className="flex gap-2">
        <Button variant="destructive" className="flex-1" onClick={onConfirm}>
          Replace data
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Dialog>
  );
}

interface RestoreDialogProps {
  backup: Backup | null;
  onConfirm: () => void;
  onCancel: () => void;
}

function RestoreConfirmDialog({ backup, onConfirm, onCancel }: RestoreDialogProps) {
  if (!backup) return null;
  return (
    <Dialog
      open
      title={`Restore ${stamp(backup.createdAt)}?`}
      destructive
      onClose={onCancel}
    >
      <p className="mb-4 text-base">
        {backup.data.transactions.length} transactions and {backup.data.categories.length}{" "}
        categories from this snapshot will replace current data. Current data is
        saved as a new snapshot first.
      </p>
      <div className="flex gap-2">
        <Button variant="destructive" className="flex-1" onClick={onConfirm}>
          Restore
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Dialog>
  );
}

export function BackupSection() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [importDiff, setImportDiff] = useState<BackupDiff | null>(null);
  const [incoming, setIncoming] = useState<BackupData | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Backup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    listBackups().then((list) => {
      if (!cancelled) setBackups(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshBackups() {
    setBackups(await listBackups());
  }

  async function exportJson() {
    const data = await readAllData();
    download(
      `moneytracker-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data }, null, 2),
      "application/json",
    );
  }

  async function exportCsv() {
    const data = await readAllData();
    const categoryNames = new Map(
      data.categories.map((c: { id: string; name: string }) => [c.id, c.name] as const),
    );
    const rows: (string | number)[][] = [
      ["id", "date", "type", "amount", "category", "note"],
      ...[...data.transactions]
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id.localeCompare(b.id)))
        .map((t) => [
          t.id,
          t.date,
          t.type,
          t.amount,
          categoryNames.get(t.categoryId) ?? "",
          t.note ?? "",
        ]),
    ];
    download(
      `moneytracker-transactions-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(rows),
      "text/csv",
    );
  }

  async function pickImportFile(file: File) {
    setError(null);
    const text = await file.text();
    const parsed = parseBackupFile(text);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setIncoming(parsed.file.data);
    setImportDiff(diffBackup(await readAllData(), parsed.file.data));
  }

  async function confirmImport() {
    if (!incoming) return;
    await replaceAllData(incoming, "before import");
    setImportDiff(null);
    setIncoming(null);
    await refreshBackups();
  }

  return (
    <section aria-label="Backup" className="space-y-3">
      <h2 className="font-display text-xl font-bold">Backup</h2>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => void exportJson()}>
          <Download aria-hidden />
          Export JSON
        </Button>
        <Button variant="secondary" onClick={() => void exportCsv()}>
          <Download aria-hidden />
          Export CSV
        </Button>
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>
          <Upload aria-hidden />
          Import JSON
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ""; // allow re-picking the same file
            if (file) void pickImportFile(file);
          }}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {backups.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Snapshots
          </h3>
          <ul className="divide-y-2 divide-border border-2 border-border bg-card">
            {backups.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2 px-4 py-2">
                <div className="min-w-0">
                  <p className="font-bold">
                    {stamp(b.createdAt)}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {b.label}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {b.data.transactions.length} transactions · {b.data.categories.length} categories · {(b.data.wallets ?? []).length} wallets
                  </p>
                </div>
                <Button variant="ghost" onClick={() => setRestoreTarget(b)}>
                  <RotateCcw aria-hidden />
                  Restore
                </Button>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Newest {backups.length} snapshots are kept automatically.
          </p>
        </div>
      )}

      <ImportConfirmDialog
        open={importDiff !== null}
        diff={importDiff}
        onConfirm={() => void confirmImport()}
        onCancel={() => {
          setImportDiff(null);
          setIncoming(null);
        }}
      />
      <RestoreConfirmDialog
        backup={restoreTarget}
        onConfirm={async () => {
          if (restoreTarget) await restoreBackup(restoreTarget.id);
          setRestoreTarget(null);
          await refreshBackups();
        }}
        onCancel={() => setRestoreTarget(null)}
      />
    </section>
  );
}
