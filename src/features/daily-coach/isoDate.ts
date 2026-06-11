/**
 * Branded ISO date and date-time string types plus their parsers.
 *
 * The engines never deal with raw `string` for dates — they take an
 * `IsoDate` / `IsoDateTime` so that a date cannot silently flow where a
 * date-time is expected (or vice versa). Parsers validate strictly and
 * throw on bad input; callers are expected to validate user input before
 * passing it to the engines.
 */

/** "YYYY-MM-DD" — calendar date, no time, no timezone. */
export type IsoDate = string & { readonly __brand: "IsoDate" };

/** "YYYY-MM-DDTHH:MM:SS[Z]" — wall-clock instant with optional Z suffix. */
export type IsoDateTime = string & { readonly __brand: "IsoDateTime" };

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(Z?)$/;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const DAYS_IN_MONTH = (year: number, month: number): number => {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
};

function validateYmd(year: number, month: number, day: number): void {
  if (month < 1 || month > 12) {
    throw new Error(`Invalid ISO date: month ${month} out of range`);
  }
  const max = DAYS_IN_MONTH(year, month);
  if (day < 1 || day > max) {
    throw new Error(
      `Invalid ISO date: day ${day} out of range for month ${month} (year ${year})`,
    );
  }
}

/**
 * Parse and validate a "YYYY-MM-DD" string. Throws on bad input.
 * Use this at the boundary (e.g. when accepting user input); engines
 * assume the value is already branded.
 */
export const parseIsoDate = (raw: string): IsoDate => {
  const match = ISO_DATE_RE.exec(raw);
  if (!match) {
    throw new Error(`Invalid ISO date: "${raw}" — expected YYYY-MM-DD`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  validateYmd(year, month, day);
  return raw as IsoDate;
};

/**
 * Parse and validate an ISO date-time string ("YYYY-MM-DDTHH:MM:SS" or
 * "YYYY-MM-DDTHH:MM:SSZ"). Throws on bad input.
 */
export const parseIsoDateTime = (raw: string): IsoDateTime => {
  const match = ISO_DATETIME_RE.exec(raw);
  if (!match) {
    throw new Error(
      `Invalid ISO date-time: "${raw}" — expected YYYY-MM-DDTHH:MM:SS[Z]`,
    );
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  validateYmd(year, month, day);
  if (hour < 0 || hour > 23) {
    throw new Error(`Invalid ISO date-time: hour ${hour} out of range`);
  }
  if (minute < 0 || minute > 59) {
    throw new Error(`Invalid ISO date-time: minute ${minute} out of range`);
  }
  if (second < 0 || second > 59) {
    throw new Error(`Invalid ISO date-time: second ${second} out of range`);
  }
  return raw as IsoDateTime;
};

/**
 * Today's calendar date in the local timezone, as a branded `IsoDate`.
 * Used by callers that need a "now" without injecting a clock.
 *
 * NOTE: engines MUST NOT use this — they take `evaluationDate: IsoDate`
 * as an argument so the test fixtures can pin a frozen date.
 */
export const todayIso = (): IsoDate => {
  const d = new Date();
  const yyyy = d.getFullYear().toString().padStart(4, "0");
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}` as IsoDate;
};

/** Parse an `IsoDate` ("YYYY-MM-DD") into a UTC midnight Date. */
export const isoDateToUtc = (d: IsoDate): Date => {
  const [yyyy, mm, dd] = d.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(yyyy, mm - 1, dd));
};

/** Whole days from `from` to `to` (UTC, ignoring time-of-day). */
export const daysBetween = (from: IsoDate, to: IsoDate): number => {
  const a = isoDateToUtc(from).getTime();
  const b = isoDateToUtc(to).getTime();
  return Math.round((b - a) / 86_400_000);
};
