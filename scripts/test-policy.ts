import assert from "node:assert/strict";
import { evaluateRecoveryPolicy } from "../src/lib/policy-engine";
import { analyzeFailureTool } from "../src/lib/langchain/tools";

async function main() {
  const base = {
    paymentAmount: 1000,
    attempts: 0,
    customerLifetimeValue: 10000,
    successfulPayments: 9,
    failedPayments: 1,
  };

const retry = evaluateRecoveryPolicy({
  ...base,
  strategy: "retry_payment",
});
assert.equal(retry.allowed, true);

const blocked = evaluateRecoveryPolicy({
  ...base,
  strategy: "retry_payment",
  failureReason: "card_blocked",
});
assert.equal(blocked.allowed, false);

const limited = evaluateRecoveryPolicy({
  ...base,
  strategy: "retry_payment",
  attempts: 3,
  policy: { retryLimit: 3 },
});
assert.equal(limited.allowed, false);

const approval = evaluateRecoveryPolicy({
  ...base,
  strategy: "offer_discount",
  customerLifetimeValue: 1000000,
  discountPercentage: 8,
  policy: { highValueThreshold: 500000, humanApprovalThreshold: 500000 },
});
assert.equal(approval.allowed, true);
assert.equal(approval.requiresApproval, true);

const bankFailure = JSON.parse(await analyzeFailureTool.invoke({
  failureReason: "bank_error",
  failureCode: "bank_error",
  failureSource: "bank",
  failureStep: "authorization",
  attempts: 1,
  previousFailureReasons: [],
}));
assert.equal(bankFailure.category, "temporary");
assert.equal(bankFailure.retryable, true);

  console.log("Policy tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});