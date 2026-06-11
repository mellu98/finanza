/**
 * Test plan for `isoDate.ts` — branded ISO date / date-time strings and
 * their parsers. Used everywhere a date flows through the engines so
 * that "YYYY-MM-DD" vs "YYYY-MM-DDTHH:MM:SSZ" never get confused.
 */
import { describe, expect, it } from "vitest";
import { parseIsoDate, parseIsoDateTime, todayIso } from "./isoDate";

describe("parseIsoDate()", () => {
  it("accepts a valid YYYY-MM-DD string and returns a branded IsoDate", () => {
    const d = parseIsoDate("2024-06-15");
    expect(d).toBe("2024-06-15");
  });

  it("accepts leap-day (2024-02-29)", () => {
    const d = parseIsoDate("2024-02-29");
    expect(d).toBe("2024-02-29");
  });

  it("rejects non-leap-year Feb 29 (2023-02-29)", () => {
    expect(() => parseIsoDate("2023-02-29")).toThrow();
  });

  it("rejects invalid month (2024-13-01)", () => {
    expect(() => parseIsoDate("2024-13-01")).toThrow();
  });

  it("rejects invalid day (2024-04-31)", () => {
    expect(() => parseIsoDate("2024-04-31")).toThrow();
  });

  it("rejects month=00 (2024-00-15)", () => {
    expect(() => parseIsoDate("2024-00-15")).toThrow();
  });

  it("rejects day=00 (2024-06-00)", () => {
    expect(() => parseIsoDate("2024-06-00")).toThrow();
  });

  it("rejects the empty string", () => {
    expect(() => parseIsoDate("")).toThrow();
  });

  it("rejects non-date strings", () => {
    expect(() => parseIsoDate("hello")).toThrow();
  });

  it("rejects date-time strings (the date parser is strict)", () => {
    expect(() => parseIsoDate("2024-06-15T00:00:00Z")).toThrow();
  });

  it("rejects wrong separator (2024/06/15)", () => {
    expect(() => parseIsoDate("2024/06/15")).toThrow();
  });

  it("rejects single-digit month or day (2024-6-15)", () => {
    expect(() => parseIsoDate("2024-6-15")).toThrow();
  });
});

describe("parseIsoDateTime()", () => {
  it("accepts a valid YYYY-MM-DDTHH:MM:SSZ string", () => {
    const dt = parseIsoDateTime("2024-06-15T12:30:45Z");
    expect(dt).toBe("2024-06-15T12:30:45Z");
  });

  it("accepts an ISO datetime without the Z suffix", () => {
    const dt = parseIsoDateTime("2024-06-15T12:30:45");
    expect(dt).toBe("2024-06-15T12:30:45");
  });

  it("rejects a bare YYYY-MM-DD string", () => {
    expect(() => parseIsoDateTime("2024-06-15")).toThrow();
  });

  it("rejects the empty string", () => {
    expect(() => parseIsoDateTime("")).toThrow();
  });

  it("rejects malformed times (2024-06-15T25:00:00Z)", () => {
    expect(() => parseIsoDateTime("2024-06-15T25:00:00Z")).toThrow();
  });

  it("rejects malformed minutes (2024-06-15T12:60:00Z)", () => {
    expect(() => parseIsoDateTime("2024-06-15T12:60:00Z")).toThrow();
  });
});

describe("todayIso()", () => {
  it("returns a string parseable by parseIsoDate()", () => {
    const t = todayIso();
    const parsed = parseIsoDate(t);
    expect(parsed).toBe(t);
  });

  it("matches the YYYY-MM-DD shape", () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
