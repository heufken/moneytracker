import { useState, type SyntheticEvent } from "react";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { cn } from "../../lib/utils";
import { newId, saveCategory } from "../../db/api";
import type { Category, CategoryColor } from "../../db/types";
import { categoryFormSchema, type CategoryFormValues } from "./schema";

const COLORS: CategoryColor[] = ["yellow", "blue", "green", "red", "purple", "pink", "orange", "teal"];

interface CategoryDialogProps {
  open: boolean;
  /** Existing category → rename/edit mode. */
  category?: Category | null;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY: CategoryFormValues = { name: "", type: "expense", color: "teal" };

export function CategoryDialog({ open, category, onClose, onSaved }: CategoryDialogProps) {
  const [values, setValues] = useState<CategoryFormValues>(() =>
    category ? { name: category.name, type: category.type, color: category.color } : { ...EMPTY },
  );
  const [error, setError] = useState<string | null>(null);


  async function handleSubmit(e: SyntheticEvent) {
    e.preventDefault();
    const parsed = categoryFormSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid");
      return;
    }
    await saveCategory({
      id: category?.id ?? newId("cat"),
      name: parsed.data.name,
      type: parsed.data.type,
      color: parsed.data.color,
    });
    onSaved();
  }

  return (
    <Dialog open={open} title={category ? "Edit category" : "Add category"} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="cat-name" className="mb-1 block text-xs font-semibold uppercase tracking-widest">
            Name
          </label>
          <input
            id="cat-name"
            type="text"
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            className="h-11 w-full rounded-none border-2 border-border bg-card px-3 text-base shadow-hard-sm focus:outline-3 focus:outline-ring focus:outline-offset-2"
            placeholder="e.g. Groceries"
          />
          {error ? (
            <p role="alert" className="mt-1 text-sm font-semibold">
              {error}
            </p>
          ) : null}
        </div>

        <fieldset>
          <legend className="mb-1 text-xs font-semibold uppercase tracking-widest">Type</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={values.type === t}
                onClick={() => setValues((v) => ({ ...v, type: t }))}
                className={cn(
                "h-11 rounded-sm border-2 border-border font-bold capitalize transition-colors duration-[140ms]",
                  values.type === t
                    ? t === "income"
                      ? "bg-income text-income-foreground shadow-hard"
                      : "bg-expense text-expense-foreground shadow-hard"
                    : "bg-card text-muted-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-xs font-semibold uppercase tracking-widest">Color</legend>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                aria-pressed={values.color === c}
                onClick={() => setValues((v) => ({ ...v, color: c }))}
                className={cn(
                  "size-11 rounded-pill border-2 border-border",
                  values.color === c && "shadow-hard",
                )}
                style={{ backgroundColor: `var(--${c}-400)` }}
              />
            ))}
          </div>
        </fieldset>

        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1">
            {category ? "Save changes" : "Add category"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
