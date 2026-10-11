/** Local date `YYYY-MM-DD` for today (never UTC — avoids off-by-one). */
export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** First and last day of the month containing `iso` as `YYYY-MM-DD` bounds. */
export function monthRange(iso: string): { from: string; to: string } {
  const [y, m] = iso.split("-").map(Number);
  // Day 0 of month index m = last day of month m-1 (Date months are 0-based).
  const last = new Date(y!, m!, 0).getDate();
  const mm = String(m).padStart(2, "0");
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(last).padStart(2, "0")}` };
}
