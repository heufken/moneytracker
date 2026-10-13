/** Upper bound for stored amounts: well past any real balance, below 2^53 so
 *  integer math never silently loses precision. */
export const MAX_AMOUNT = 9_999_999_999_999; // 9.999... trillion minor units

/** Integer minor units → display string, e.g. 25000 → "Rp 25.000".
 *  IDR keeps dot grouping by convention; other currencies use the user's
 *  locale grouping (comma for en, dot for de, etc.). */
export function formatMoney(amount: number, currency = "IDR"): string {
  const sign = amount < 0 ? "-" : "";
  const grouped =
    currency === "IDR"
      ? Math.abs(amount)
          .toString()
          .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
      : new Intl.NumberFormat().format(Math.abs(amount));
  return `${sign}${currency === "IDR" ? "Rp" : currency} ${grouped}`;
}

/** Parse user input like "-25.000", "25.000", "25000", "25,000" into minor
 *  units. Throws on garbage, 0 (nothing to record), and values past the safe cap. */
export function parseMoney(input: string): number {
  const negative = /^-/.test(input.trim());
  const cleaned = input.replace(/[.,\s-]/g, "");
  if (!/^\d+$/.test(cleaned)) throw new Error(`Invalid amount: ${input}`);
  const value = Number(cleaned) * (negative ? -1 : 1);
  if (value === 0) throw new Error("Amount cannot be zero");
  if (Math.abs(value) > MAX_AMOUNT) throw new Error("Amount is too large");
  return value;
}

/** Render-safe variant for previews: null instead of a throw. */
export function parseMoneySafe(input: string): number | null {
  try {
    return parseMoney(input);
  } catch {
    return null;
  }
}
