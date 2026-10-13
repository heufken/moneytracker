import { z } from "zod";
import { MAX_AMOUNT, parseMoneySafe } from "../../lib/money";

export const transactionFormSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => /^-?\d[\d.,\s]*$/.test(v), "Digits only")
    .refine((v) => {
      // parseMoneySafe never throws (a throwing refine escapes safeParse in zod v4)
      const parsed = parseMoneySafe(v);
      return parsed !== null && Math.abs(parsed) <= MAX_AMOUNT;
    }, "Amount must be over 0 and at most 9.999.999.999.999"),
  categoryId: z.string().min(1, "Pick a category"),
  walletId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  note: z.string().max(200, "Max 200 characters").optional(),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;
