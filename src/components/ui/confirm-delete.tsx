import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";

interface ConfirmDeleteDialogProps {
  open: boolean;
  /** e.g. "transaction" */
  subject: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteDialog({ open, subject, onCancel, onConfirm }: ConfirmDeleteDialogProps) {
  return (
    <Dialog open={open} title={`Delete ${subject}`} destructive onClose={onCancel}>
      <p className="mb-4 text-base">
        Are you sure? This cannot be undone.
      </p>
      <div className="flex gap-2">
        <Button variant="destructive" className="flex-1" onClick={onConfirm}>
          {`Delete ${subject}`}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Dialog>
  );
}
