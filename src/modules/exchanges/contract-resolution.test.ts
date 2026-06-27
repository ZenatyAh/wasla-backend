import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDeadlineResolutionPlan,
  deadlineResolutionNotificationCopy,
} from "./contract-resolution.js";

describe("buildDeadlineResolutionPlan", () => {
  it("Alt 1: full confirmed hours → COMPLETED", () => {
    const plan = buildDeadlineResolutionPlan({
      timeCredits: 5,
      completedHours: 5,
      lastSession: { status: "CONFIRMED" },
    });

    assert.equal(plan.status, "COMPLETED");
    assert.equal(plan.escrowStatus, "RELEASED");
    assert.equal(plan.providerCredits, 5);
    assert.equal(plan.refundCredits, 0);
    assert.equal(plan.fault, "NONE");
    assert.equal(plan.notificationType, "CONTRACT_AUTO_COMPLETED");
  });

  it("Alt 2 seeker fault: pending last session → partial settlement", () => {
    const plan = buildDeadlineResolutionPlan({
      timeCredits: 5,
      completedHours: 2,
      lastSession: { status: "PENDING_CONFIRMATION" },
    });

    assert.equal(plan.status, "DISPUTED");
    assert.equal(plan.escrowStatus, "RELEASED");
    assert.equal(plan.providerCredits, 2);
    assert.equal(plan.refundCredits, 3);
    assert.equal(plan.fault, "SEEKER");
    assert.equal(plan.notificationType, "CONTRACT_AUTO_DISPUTED");
  });

  it("Alt 2 provider fault: no sessions → full refund", () => {
    const plan = buildDeadlineResolutionPlan({
      timeCredits: 5,
      completedHours: 0,
      lastSession: null,
    });

    assert.equal(plan.status, "DISPUTED");
    assert.equal(plan.escrowStatus, "REFUNDED");
    assert.equal(plan.providerCredits, 0);
    assert.equal(plan.refundCredits, 5);
    assert.equal(plan.fault, "PROVIDER");
  });

  it("Alt 2 provider fault: confirmed last session but hours short → full refund", () => {
    const plan = buildDeadlineResolutionPlan({
      timeCredits: 5,
      completedHours: 2,
      lastSession: { status: "CONFIRMED" },
    });

    assert.equal(plan.status, "DISPUTED");
    assert.equal(plan.escrowStatus, "REFUNDED");
    assert.equal(plan.providerCredits, 0);
    assert.equal(plan.refundCredits, 5);
    assert.equal(plan.fault, "PROVIDER");
  });

  it("Alt 2 provider fault: rejected last session → full refund", () => {
    const plan = buildDeadlineResolutionPlan({
      timeCredits: 5,
      completedHours: 1,
      lastSession: { status: "REJECTED" },
    });

    assert.equal(plan.fault, "PROVIDER");
    assert.equal(plan.providerCredits, 0);
    assert.equal(plan.refundCredits, 5);
  });
});

describe("deadlineResolutionNotificationCopy", () => {
  it("returns success copy for completed plans", () => {
    const copy = deadlineResolutionNotificationCopy(
      buildDeadlineResolutionPlan({
        timeCredits: 5,
        completedHours: 5,
        lastSession: null,
      }),
    );
    assert.match(copy.title, /إكمال/);
  });

  it("returns seeker-fault copy for seeker disputes", () => {
    const copy = deadlineResolutionNotificationCopy(
      buildDeadlineResolutionPlan({
        timeCredits: 5,
        completedHours: 2,
        lastSession: { status: "PENDING_CONFIRMATION" },
      }),
    );
    assert.match(copy.body, /تأكيد/);
  });

  it("returns provider-fault copy for provider disputes", () => {
    const copy = deadlineResolutionNotificationCopy(
      buildDeadlineResolutionPlan({
        timeCredits: 5,
        completedHours: 0,
        lastSession: null,
      }),
    );
    assert.match(copy.body, /إرجاع جميع/);
  });
});
