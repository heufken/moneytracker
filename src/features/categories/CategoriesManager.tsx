import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { CategoryDialog } from "./CategoryDialog";
import {
  countTransactionsByCategory,
  deleteCategory,
  listCategories,
} from "../../db/api";
import type { Category } from "../../db/types";

export function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [deletingCount, setDeletingCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    listCategories().then((rows) => {
      if (!cancelled) setCategories(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function refresh() {
    setCategories(await listCategories());
  }

  async function askDelete(cat: Category) {
    const count = await countTransactionsByCategory(cat.id);
    setDeletingCount(count);
    setDeleting(cat);
  }

  const income = categories.filter((c) => c.type === "income");
  const expense = categories.filter((c) => c.type === "expense");

  const list = (rows: Category[], label: string) => (
    <section aria-label={label}>
      <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-widest">{label}</h3>
      <ul className="border-2 border-border bg-card shadow-hard-md">
        {rows.map((c) => (
          <li key={c.id} className="flex min-h-[56px] items-center gap-3 border-b-2 border-border px-4 py-2 last:border-b-0">
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-pill border border-border"
              style={{ backgroundColor: `var(--${c.color}-400)` }}
            />
            <span className="min-w-0 flex-1 truncate text-base font-semibold" title={c.name}>{c.name}</span>
            <button
              type="button"
              onClick={() => setEditing(c)}
              aria-label={`Edit category ${c.name}`}
              className="flex size-11 shrink-0 items-center justify-center border-2 border-border bg-card shadow-hard active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
            >
              <Pencil aria-hidden className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => void askDelete(c)}
              aria-label={`Delete category ${c.name}`}
              className="flex size-11 shrink-0 items-center justify-center border-2 border-border bg-card shadow-hard active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
            >
              <Trash2 aria-hidden className="size-5" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Categories</h2>
        <Button onClick={() => setAdding(true)}>
          <Plus aria-hidden />
          Add
        </Button>
      </div>
      {list(income, "Income")}
      {list(expense, "Expense")}
      <CategoryDialog
        key={editing?.id ?? "new"}
        open={adding || editing !== null}
        category={editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        onSaved={() => {
          setAdding(false);
          setEditing(null);
          void refresh();
        }}
      />

      {/* delete confirm: count-aware, force path explicit */}
      <Dialog
        open={deleting !== null}
        title={`Delete ${deleting?.name ?? ""}`}
        destructive
        onClose={() => {
          setDeleting(null);
          setDeletingCount(null);
        }}
      >
        <p className="mb-4 text-base">
          {deletingCount === 0
            ? "Are you sure? This cannot be undone."
            : `${deleting?.name} has ${deletingCount} transaction(s). Deleting keeps those transactions but marks their category as unknown. This cannot be undone.`}
        </p>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            className="flex-1"
            onClick={async () => {
              if (deleting) await deleteCategory(deleting.id, { force: true });
              setDeleting(null);
              setDeletingCount(null);
              void refresh();
            }}
          >
            Delete category
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setDeleting(null);
              setDeletingCount(null);
            }}
          >
            Cancel
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
