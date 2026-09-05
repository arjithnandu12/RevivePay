export type RecoveryStrategy =
  | "retry_payment"
  | "send_reminder"
  | "offer_discount"
  | "contact_customer"
  | "no_action";

export interface PolicyInput {
  strategy: RecoveryStrategy;
  paymentAmount: number;
  attempts: number;
  customerLifetimeValue: number;
  successfulPayments: number;
  failedPayments: number;
  failureReason?: string | null;
  discountPercentage?: number;
  policy?: {
    retryLimit?: number;
    highValueThreshold?: number;
    humanApprovalThreshold?: number;
  };
}

export interface PolicyResult {
  allowed: boolean;
  strategy: RecoveryStrategy;
  reason: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  requiresApproval: boolean;
}

export function evaluateRecoveryPolicy(input: PolicyInput): PolicyResult {
  const {
    strategy,
    paymentAmount,
    attempts,
    customerLifetimeValue,
    successfulPayments,
    failedPayments,
    failureReason,
    discountPercentage = 0,
    policy = {},
  } = input;

  const retryLimit = policy.retryLimit ?? 3;
  const highValueThreshold = policy.highValueThreshold ?? 500000;
  const humanApprovalThreshold = policy.humanApprovalThreshold ?? 500000;

  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    return { allowed: false, strategy, reason: "Invalid payment amount.", riskLevel: "HIGH", requiresApproval: true };
  }

  const totalPayments = successfulPayments + failedPayments;
  const successRate = totalPayments > 0 ? successfulPayments / totalPayments : 0;
  const riskLevel = successRate >= 0.9 && failedPayments <= 2
    ? "LOW"
    : successRate >= 0.7 ? "MEDIUM" : "HIGH";

  if (strategy === "retry_payment") {
    if (attempts >= retryLimit) {
      return { allowed: false, strategy, reason: "Maximum payment retry attempts reached.", riskLevel, requiresApproval: false };
    }

    const nonRetryableReasons = ["card_expired", "card_blocked", "invalid_card", "payment_cancelled", "fraud"];
    if (failureReason && nonRetryableReasons.includes(failureReason)) {
      return { allowed: false, strategy, reason: "This payment failure reason should not be automatically retried.", riskLevel, requiresApproval: false };
    }

    return { allowed: true, strategy, reason: "Payment can be retried within the allowed attempt limit.", riskLevel, requiresApproval: false };
  }

  if (strategy === "send_reminder") {
    return { allowed: true, strategy, reason: "Payment reminder can be sent to the customer.", riskLevel, requiresApproval: false };
  }

  if (strategy === "contact_customer") {
    return { allowed: true, strategy, reason: "Customer can be contacted regarding the failed payment.", riskLevel, requiresApproval: false };
  }

  if (strategy === "offer_discount") {
    const maxDiscount = 10;
    if (discountPercentage <= 0) {
      return { allowed: false, strategy, reason: "Discount percentage must be greater than zero.", riskLevel, requiresApproval: true };
    }
    if (discountPercentage > maxDiscount) {
      return { allowed: false, strategy, reason: `Discount exceeds the maximum allowed ${maxDiscount}% limit.`, riskLevel, requiresApproval: true };
    }
    if (customerLifetimeValue >= Math.max(highValueThreshold, humanApprovalThreshold) && discountPercentage > 5) {
      return { allowed: true, strategy, reason: "Discount is within policy but requires approval for a high-value customer.", riskLevel, requiresApproval: true };
    }
    return { allowed: true, strategy, reason: "Discount is within the allowed policy limits.", riskLevel, requiresApproval: false };
  }

  return { allowed: true, strategy: "no_action", reason: "No recovery action will be taken.", riskLevel, requiresApproval: false };
}