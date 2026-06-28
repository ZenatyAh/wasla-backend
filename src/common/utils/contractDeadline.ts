import { fromZonedTime } from "date-fns-tz";

export const DATE_ONLY_CONTRACT_END = /^\d{4}-\d{2}-\d{2}$/;

const contractDeadlineTimezone = () =>
  process.env.CONTRACT_DEADLINE_TIMEZONE?.trim() || "Asia/Jerusalem";

export function isDateOnlyContractEnd(raw: unknown): raw is string {
  return typeof raw === "string" && DATE_ONLY_CONTRACT_END.test(raw);
}

/** YYYY-MM-DD → 23:59:59.999 in the configured contract deadline timezone. */
export function parseContractEndDate(raw: string): Date {
  if (!isDateOnlyContractEnd(raw)) {
    throw new Error("Contract end date must be YYYY-MM-DD");
  }

  return fromZonedTime(
    `${raw} 23:59:59.999`,
    contractDeadlineTimezone(),
  );
}

/** Builds a YYYY-MM-DD string N calendar days from today (server local date). */
export function contractEndDateDaysAhead(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
