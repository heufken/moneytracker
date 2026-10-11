import { z } from "zod";

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(30, "Max 30 characters"),
  type: z.enum(["income", "expense"]),
  color: z.enum(["yellow", "blue", "green", "red", "purple", "pink", "orange", "teal"]),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
