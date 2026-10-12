import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

interface DialogProps {
  open: boolean;
  title: string;
  /** Destructive dialogs get the red header band (DESIGN_SYSTEM §7). */
  destructive?: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** Modal card: 3px border, shadow-lg, focus trap, Escape closes, focus returns. */
export function Dialog({ open, title, destructive, onClose, children }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const node = ref.current;
    node?.querySelector<HTMLElement>("input, select, button")?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && node) {
        const focusables = node.querySelectorAll<HTMLElement>(
          "input, select, textarea, button, [href]",
        );
        if (focusables.length === 0) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="dialog-card w-full max-w-[420px] border-3 border-border bg-card shadow-hard-lg"
      >
        <div
          className={cn(
            "flex items-center justify-between border-b-2 border-border px-5 py-3",
            destructive ? "bg-destructive text-destructive-foreground" : null,
          )}
        >
          <h2 className="font-display text-lg font-bold uppercase tracking-wide">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex size-11 items-center justify-center border-2 border-border bg-card shadow-hard active:translate-x-[3px] active:translate-y-[3px] active:shadow-none max-md:hidden"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
