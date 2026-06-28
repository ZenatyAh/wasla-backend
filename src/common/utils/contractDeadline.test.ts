import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import {
  contractEndDateDaysAhead,
  isDateOnlyContractEnd,
  parseContractEndDate,
} from "./contractDeadline.js";
import {
  createExchangeSchema,
  deadlineExtensionSchema,
} from "../../modules/exchanges/exchanges.schema.js";

describe("contractDeadline", () => {
  it("parseContractEndDate sets 23:59:59.999 in Asia/Jerusalem", () => {
    const parsed = parseContractEndDate("2026-06-29");
    const zoned = toZonedTime(parsed, "Asia/Jerusalem");

    assert.equal(format(zoned, "yyyy-MM-dd HH:mm:ss.SSS"), "2026-06-29 23:59:59.999");
  });

  it("isDateOnlyContractEnd accepts YYYY-MM-DD only", () => {
    assert.equal(isDateOnlyContractEnd("2026-06-29"), true);
    assert.equal(isDateOnlyContractEnd("2026-06-29T00:00:00.000Z"), false);
    assert.equal(isDateOnlyContractEnd("29/06/2026"), false);
  });

  it("parseContractEndDate rejects non date-only input", () => {
    assert.throws(
      () => parseContractEndDate("2026-06-29T00:00:00.000Z"),
      /YYYY-MM-DD/,
    );
  });

  it("contractEndDateDaysAhead returns YYYY-MM-DD", () => {
    const value = contractEndDateDaysAhead(7);
    assert.match(value, /^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("exchange contract end date schema", () => {
  it("accepts YYYY-MM-DD and normalizes to end of day", () => {
    const contractEndDate = contractEndDateDaysAhead(7);
    const parsed = createExchangeSchema.parse({
      postId: 1,
      providerId: 2,
      duration: 3,
      contractEndDate,
    });

    assert.equal(
      parsed.contractEndDate.getTime(),
      parseContractEndDate(contractEndDate).getTime(),
    );
  });

  it("rejects ISO date-time strings", () => {
    assert.throws(
      () =>
        createExchangeSchema.parse({
          postId: 1,
          providerId: 2,
          duration: 3,
          contractEndDate: "2026-06-29T00:00:00.000Z",
        }),
      /YYYY-MM-DD/,
    );
  });

  it("rejects past calendar dates", () => {
    assert.throws(
      () =>
        createExchangeSchema.parse({
          postId: 1,
          providerId: 2,
          duration: 3,
          contractEndDate: "2020-01-01",
        }),
      /must be in the future/,
    );
  });

  it("deadlineExtensionSchema accepts YYYY-MM-DD proposedEndDate", () => {
    const proposedEndDate = contractEndDateDaysAhead(14);
    const parsed = deadlineExtensionSchema.parse({ proposedEndDate });

    assert.equal(
      parsed.proposedEndDate.getTime(),
      parseContractEndDate(proposedEndDate).getTime(),
    );
  });
});
