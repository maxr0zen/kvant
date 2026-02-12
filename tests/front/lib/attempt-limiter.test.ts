import { describe, it, expect, beforeEach } from "vitest";
import {
  isAttemptLimitExceeded,
  recordFailedAttempt,
  getRemainingAttempts,
  getCooldownMinutesRemaining,
  resetAttempts,
} from "@/lib/utils/attempt-limiter";

describe("attempt-limiter", () => {
  beforeEach(() => {
    resetAttempts("task-1");
    resetAttempts("a1");
    resetAttempts("a2");
    resetAttempts("a3");
  });

  it("isAttemptLimitExceeded returns false when no record", () => {
    expect(isAttemptLimitExceeded("task-1")).toBe(false);
  });

  it("getRemainingAttempts returns 3 when no record", () => {
    expect(getRemainingAttempts("task-1")).toBe(3);
  });

  it("recordFailedAttempt increments and getRemainingAttempts decreases", () => {
    recordFailedAttempt("a1");
    expect(getRemainingAttempts("a1")).toBe(2);
    recordFailedAttempt("a1");
    recordFailedAttempt("a1");
    expect(getRemainingAttempts("a1")).toBe(0);
    expect(isAttemptLimitExceeded("a1")).toBe(true);
  });

  it("resetAttempts clears record", () => {
    recordFailedAttempt("a2");
    resetAttempts("a2");
    expect(getRemainingAttempts("a2")).toBe(3);
    expect(isAttemptLimitExceeded("a2")).toBe(false);
  });

  it("getCooldownMinutesRemaining returns 0 when no record", () => {
    expect(getCooldownMinutesRemaining("a3")).toBe(0);
  });
});
