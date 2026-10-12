import { z } from "zod";

// Mirrors db/types.ts shapes. Import validates against these before any write.
const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["income", "expense"]),
  color: z.enum([
    "yellow",
    "blue",
    "green",
    "red",
    "purple",
    "pink",
    "orange",
    "teal",
  ]),
});

const walletSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  // Money stays integer, may be negative (overdraft).
  initialBalance: z.number().int(),
});

const transactionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["income", "expense"]),
  // Money stays integer: reject floats and non-integers outright.
  amount: z.number().int().positive(),
  categoryId: z.string().min(1),
  walletId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  note: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const backupDataSchema = z.object({
  categories: z.array(categorySchema),
  transactions: z.array(transactionSchema),
  settings: z.array(z.object({ key: z.string().min(1), value: z.string() })),
  // Optional so pre-wallet export files (v1, no wallets) still import.
  wallets: z.array(walletSchema).optional(),
});

export const backupFileSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  data: backupDataSchema,
});

export type BackupFile = z.infer<typeof backupFileSchema>;

/** Parse unknown JSON into a BackupFile, or a user-safe error message. */
export function parseBackupFile(text: string): { ok: true; file: BackupFile } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "Not valid JSON." };
  }
  const result = backupFileSchema.safeParse(json);
  if (!result.success) {
    const first = result.error.issues[0];
    return {
      ok: false,
      error: `Invalid backup file: ${first?.path.join(".") || "root"} ${first?.message ?? "failed validation"}.`,
    };
  }
  return { ok: true, file: result.data };
}
