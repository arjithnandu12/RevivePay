export type RecoveryAttemptStatus =
  | "pending"
  | "processing"
  | "failed"
  | "recovered"
  | "cancelled";

export interface RecoveryAttemptState {
  attemptNumber: number;
  status: RecoveryAttemptStatus;
  recoveredAmount: number;
}

export function countActiveAttempts(attempts: RecoveryAttemptState[]) {
  return attempts.filter((attempt) => attempt.status !== "cancelled").length;
}

export function nextAttemptNumber(attempts: RecoveryAttemptState[]) {
  return countActiveAttempts(attempts) + 1;
}

export function canCreateAttempt(attempts: RecoveryAttemptState[], maxAttempts: number) {
  return !attempts.some((attempt) => ["pending", "processing"].includes(attempt.status)) &&
    countActiveAttempts(attempts) < maxAttempts;
}

export function applyRecoverySuccess(
  attempts: RecoveryAttemptState[],
  successfulAttemptNumber: number
) {
  return attempts.map((attempt) => {
    if (attempt.attemptNumber === successfulAttemptNumber) {
      return { ...attempt, status: "recovered" as const };
    }
    if (["pending", "processing"].includes(attempt.status)) {
      return { ...attempt, status: "cancelled" as const };
    }
    return attempt;
  });
}

export function shouldScheduleRetryAfterFailure() {
  return false;
}

export function isDuplicateWebhook(
  knownEventIds: Set<string>,
  eventId: string
) {
  if (knownEventIds.has(eventId)) return true;
  knownEventIds.add(eventId);
  return false;
}