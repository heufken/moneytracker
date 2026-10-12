/** Per RFC 4180: quotes wrap, doubles escape, CRLF joins. */
export function csvEscape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map((cell) => csvEscape(String(cell))).join(",")).join("\r\n");
}
