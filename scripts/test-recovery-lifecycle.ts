import assert from "node:assert/strict";
import { analyzeFailureTool } from "../src/lib/langchain/tools";
import { callModel } from "../src/lib/ai";
import { parseAIRecommendationResponse } from "../src/lib/langchain/analyze-with-tools";
import { createPaymentLink } from "../src/lib/razorpay";
import { sendRecoveryEmail } from "../src/lib/email";
import { evaluateRecoveryPolicy } from "../src/lib/policy-engine";
import {
  applyRecoverySuccess,
  canCreateAttempt,
  countActiveAttempts,
  isDuplicateWebhook,
  nextAttemptNumber,
  shouldScheduleRetryAfterFailure,
  RecoveryAttemptState,
} from "../src/lib/recovery-lifecycle";

function attempt(status: RecoveryAttemptState["status"], number: number): RecoveryAttemptState {
  return { attemptNumber: number, status, recoveredAmount: status === "recovered" ? 1000 : 0 };
}

async function main() {
  const initial: RecoveryAttemptState[] = [];
  assert.equal(countActiveAttempts(initial), 0, "1. failed payment starts with no recovery attempts");
  assert.equal(nextAttemptNumber(initial), 1, "2. first recovery attempt is numbered one");
  assert.equal(canCreateAttempt(initial, 3), true, "3. payment link may be created");

  const first = [attempt("processing", 1)];
  assert.equal(canCreateAttempt(first, 3), false, "4. active attempt prevents a concurrent second attempt");
  assert.equal(shouldScheduleRetryAfterFailure(), false, "5. failed webhook does not immediately schedule a retry");

  const second = [attempt("failed", 1), attempt("processing", 2)];
  assert.equal(nextAttemptNumber(second), 3, "6. next attempt uses recovery count, not Payment.attempts");

  const recovered = applyRecoverySuccess(second, 2);
  assert.equal(recovered[1].status, "recovered", "7. payment capture recovers the matching attempt");
  assert.equal(recovered[0].status, "failed", "8. earlier attempt remains failed");

  const withSpeculativeThird = [attempt("failed", 1), attempt("recovered", 2), attempt("processing", 3)];
  assert.equal(applyRecoverySuccess(withSpeculativeThird, 2)[2].status, "cancelled", "9. late success cancels later active attempts");

  const events = new Set<string>();
  assert.equal(isDuplicateWebhook(events, "evt_1"), false, "10. first webhook is accepted");
  assert.equal(isDuplicateWebhook(events, "evt_1"), true, "11. duplicate webhook is ignored");
  assert.equal(isDuplicateWebhook(events, "evt_1"), true, "12. third delivery is ignored");

  const threeFailed = [attempt("failed", 1), attempt("failed", 2), attempt("failed", 3)];
  assert.equal(canCreateAttempt(threeFailed, 3), false, "13. third failed attempt reaches the limit");
  assert.equal(nextAttemptNumber(threeFailed), 4, "14. fourth attempt is identifiable but blocked");

  const refund = applyRecoverySuccess([attempt("recovered", 1)], 1);
  assert.equal(refund[0].status, "recovered", "15. refund processing does not erase recovery history");
  assert.equal(refund[0].recoveredAmount, 1000, "16. recovered amount remains auditable for refund reconciliation");

  const unknown = JSON.parse(await analyzeFailureTool.invoke({ failureReason: "unknown_provider_error", failureCode: "unknown_provider_error", failureSource: "provider", failureStep: "authorization", attempts: 1, previousFailureReasons: [] }));
  assert.equal(unknown.category, "unknown", "17. unknown failure is conservative");
  assert.equal(unknown.retryable, false, "18. unknown failure cannot be blindly retried");

  const permanent = JSON.parse(await analyzeFailureTool.invoke({ failureReason: "card_blocked", failureCode: "card_blocked", failureSource: "bank", failureStep: "authorization", attempts: 1, previousFailureReasons: [] }));
  assert.equal(permanent.category, "permanent", "19. non-retryable failure is permanent");
  assert.equal(permanent.retryable, false, "20. permanent failure is blocked");

  const policy = evaluateRecoveryPolicy({ strategy: "retry_payment", paymentAmount: 1000, attempts: 3, customerLifetimeValue: 10000, successfulPayments: 9, failedPayments: 1, failureReason: "payment_timeout", policy: { retryLimit: 3 } });
  assert.equal(policy.allowed, false, "21. policy blocks the fourth attempt");
  assert.equal(canCreateAttempt([], 0), false, "22. zero retry limit blocks creation");
  assert.equal(applyRecoverySuccess([attempt("pending", 1), attempt("processing", 2)], 2)[0].status, "cancelled", "23. pending attempt is cancelled after another succeeds");
  assert.equal(countActiveAttempts([attempt("cancelled", 1), attempt("failed", 2)]), 1, "24. cancelled attempts do not inflate the count");
  assert.equal(applyRecoverySuccess([attempt("failed", 2)], 2)[0].status, "recovered", "25. matching recovery payment is the source of truth");

  assert.throws(() => parseAIRecommendationResponse("not-json"), "26. malformed AI JSON is rejected");
  assert.throws(() => parseAIRecommendationResponse(JSON.stringify({ strategy: "retry_payment" })), "27. incomplete AI response is rejected");

  const originalOpenRouterKey = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  await assert.rejects(() => callModel("test"), "28. unavailable AI provider fails closed");
  process.env.OPENROUTER_API_KEY = originalOpenRouterKey;

  const originalRazorpayId = process.env.RAZORPAY_KEY_ID;
  const originalRazorpaySecret = process.env.RAZORPAY_KEY_SECRET;
  delete process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_SECRET;
  await assert.rejects(() => createPaymentLink({ amount: 100, currency: "INR", customerName: "Test", customerEmail: "test@example.com", paymentId: "PAY_TEST", customerId: "CUS_TEST" }), "29. payment-link provider failure is surfaced");
  process.env.RAZORPAY_KEY_ID = originalRazorpayId;
  process.env.RAZORPAY_KEY_SECRET = originalRazorpaySecret;

  const originalResendKey = process.env.RESEND_API_KEY;
  const originalFromEmail = process.env.RESEND_FROM_EMAIL;
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  await assert.rejects(() => sendRecoveryEmail({ customerName: "Test", customerEmail: "test@example.com", amount: 100, currency: "INR", paymentUrl: "https://rzp.io/test", attemptNumber: 1 }), "30. email provider failure is surfaced");
  process.env.RESEND_API_KEY = originalResendKey;
  process.env.RESEND_FROM_EMAIL = originalFromEmail;

  console.log("Recovery lifecycle tests passed: 30 cases.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});