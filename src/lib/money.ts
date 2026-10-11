/** Integer minor units → display string, e.g. 25000 → "Rp 25.000". */
export function formatMoney(amount: number, currency = "IDR"): string {
  const symbol = currency === "IDR" ? "Rp" : currency;
  const sign = amount < 0 ? "-" : "";
  const grouped = Math.abs(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${symbol} ${grouped}`;
}

/** Parse user input like "25.000", "25000", "25,000" into minor units. Throws on garbage. */
export function parseMoney(input: string): number {
  const cleaned = input.replace(/[.,\s]/g, "");
  if (!/^\d+$/.test(cleaned)) throw new Error(`Invalid amount: ${input}`);
  return Number(cleaned);
}
