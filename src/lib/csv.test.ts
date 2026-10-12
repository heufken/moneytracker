import { describe, expect, it } from "vitest";
import { csvEscape, toCsv } from "./csv";

describe("csvEscape", () => {
  it("passes plain values through", () => {
    expect(csvEscape("Food")).toBe("Food");
  });

  it("wraps and doubles quotes", () => {
    expect(csvEscape('Lunch "big"')).toBe('"Lunch ""big"""');
  });

  it("wraps commas and newlines", () => {
    expect(csvEscape("a,b")).toBe('"a,b"');
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
  });

  it("numbers stringify unwrapped", () => {
    expect(csvEscape(String(12500))).toBe("12500");
  });
});

describe("toCsv", () => {
  it("joins rows with CRLF per RFC 4180", () => {
    const csv = toCsv([
      ["id", "note"],
      ["txn-1", "hello, world"],
      ["txn-2", 'say "hi"'],
    ]);
    expect(csv).toBe('id,note\r\ntxn-1,"hello, world"\r\ntxn-2,"say ""hi"""');
  });

  it("handles numbers without float artifacts", () => {
    expect(toCsv([[1], [-250]])).toBe("1\r\n-250");
  });

  it("empty rows give empty string", () => {
    expect(toCsv([])).toBe("");
  });
});
