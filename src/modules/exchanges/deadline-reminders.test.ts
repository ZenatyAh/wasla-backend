import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { approachingDeadlineNotificationCopy } from "./deadline-reminders.js";

describe("approachingDeadlineNotificationCopy", () => {
  it("tells the provider they can propose an extension", () => {
    const copy = approachingDeadlineNotificationCopy("provider", "١‏/٧‏/٢٠٢٦");
    assert.match(copy.body, /اقتراح تمديد/);
  });

  it("tells the consumer they can approve or reject a proposed extension", () => {
    const copy = approachingDeadlineNotificationCopy("consumer", "١‏/٧‏/٢٠٢٦");
    assert.match(copy.body, /الموافقة أو الرفض/);
  });
});
