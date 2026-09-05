import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const analyzeFailureTool =
  tool(
    async ({
      failureReason,
      failureCode,
      failureSource,
      failureStep,
      attempts,
      previousFailureReasons,
    }) => {
      const normalizedReason =
        failureReason
          ?.toLowerCase()
          .trim() ?? "";

      const normalizedCode =
        failureCode
          ?.toLowerCase()
          .trim() ?? "";

      const normalizedSource =
        failureSource
          ?.toLowerCase()
          .trim() ?? "";

      const normalizedStep =
        failureStep
          ?.toLowerCase()
          .trim() ?? "";

      const permanentFailures = [
        "international_transaction_not_allowed",
        "card_declined",
        "card_not_supported",
        "authentication_failed",
        "invalid_card",
        "expired_card",
        "payment_method_not_available",
        "card_blocked",
        "fraud",
      ];

      const temporaryFailures = [
        "network_error",
        "gateway_error",
        "timeout",
        "processing_error",
        "service_unavailable",
        "insufficient_funds",
        
        "bank_error",
        "bank_timeout",
        "temporary_bank_error",
      ];

     

      if (
        permanentFailures.includes(
          normalizedReason
        )
      ) {
        return JSON.stringify({
          category: "permanent",
          retryable: false,
          source:
            failureSource ??
            "current_payment",
          failureReason,
          failureCode,
          failureStep,
          recommendation:
            "The current payment failure is classified as permanent. Do not automatically retry.",
        });
      }

      if (
        temporaryFailures.includes(
          normalizedReason
        )
      ) {
        return JSON.stringify({
          category: "temporary",
          retryable:
            attempts < 3,
          source:
            failureSource ??
            "current_payment",
          failureReason,
          failureCode,
          failureStep,
          recommendation:
            attempts < 3
              ? "The current failure appears temporary. A controlled recovery action may be appropriate."
              : "The retry threshold has been reached. Do not retry automatically.",
        });
      }

      if (
        normalizedSource ===
          "bank" &&
        [
          "payment_authorization",
          "authorization",
          "payment authorization",
        ].includes(normalizedStep)
      ) {
        return JSON.stringify({
          category: "temporary",
          retryable:
            attempts < 3,
          source:
            failureSource,
          failureReason,
          failureCode,
          failureStep,
          recommendation:
            attempts < 3
              ? "The bank rejected the payment during authorization. Avoid a blind immediate retry and encourage another payment attempt or payment method."
              : "The bank rejected the payment and the retry threshold has been reached. Do not retry automatically.",
        });
      }

      if (
        normalizedCode ===
          "bad_request_error" &&
        normalizedSource ===
          "bank"
      ) {
        return JSON.stringify({
          category: "temporary",
          retryable:
            attempts < 3,
          source:
            failureSource,
          failureReason,
          failureCode,
          failureStep,
          recommendation:
            attempts < 3
              ? "A bank-side payment failure was detected. Use controlled recovery rather than repeated blind retries."
              : "The retry threshold has been reached. Do not retry automatically.",
        });
      }

      for (
        const previousReason of
          previousFailureReasons
      ) {
        if (!previousReason) {
          continue;
        }

        const normalizedPrevious =
          previousReason
            .toLowerCase()
            .trim();

        if (
          permanentFailures.includes(
            normalizedPrevious
          )
        ) {
          return JSON.stringify({
            category: "unknown",
            retryable: false,
            source:
              "payment_history",
            failureReason,
            failureCode,
            failureStep,
            recommendation:
              "The current failure is not confidently classified. Historical failures are not sufficient to override the current payment failure. Avoid a blind retry.",
          });
        }

        if (
          temporaryFailures.includes(
            normalizedPrevious
          )
        ) {
          return JSON.stringify({
            category: "unknown",
            retryable: false,
            source:
              "payment_history",
            failureReason,
            failureCode,
            failureStep,
            recommendation:
              "The current failure is not confidently classified. Historical failures provide context but should not determine the current recovery action.",
          });
        }
      }

      return JSON.stringify({
        category: "unknown",
        retryable: false,
        source:
          failureSource ??
          "unknown",
        failureReason,
        failureCode,
        failureStep,
        recommendation:
          "The current payment failure could not be confidently classified. Avoid a blind retry.",
      });
    },
    {
      name:
        "analyze_payment_failure",

      description:
        "Deterministically analyzes the current Razorpay payment failure. The current payment always takes priority over historical failures.",

      schema: z.object({
        failureReason:
          z.string().nullable(),

        failureCode:
          z.string().nullable(),

        failureSource:
          z.string().nullable(),

        failureStep:
          z.string().nullable(),

        attempts:
          z.number(),

        previousFailureReasons:
          z.array(
            z.string().nullable()
          ),
      }),
    }
  );

export const calculateCustomerValueTool =
  tool(
    async ({
      lifetimeValue,
      monthlyValue,
      successfulPayments,
      failedPayments,
    }) => {
      let segment:
        | "high_value"
        | "medium_value"
        | "low_value";

      if (
        lifetimeValue >= 10000
      ) {
        segment =
          "high_value";
      } else if (
        lifetimeValue >= 3000
      ) {
        segment =
          "medium_value";
      } else {
        segment =
          "low_value";
      }

      const total =
        successfulPayments +
        failedPayments;

      const successRate =
        total === 0
          ? 0
          : successfulPayments /
            total;

      return JSON.stringify({
        segment,

        lifetimeValue,

        monthlyValue,

        successfulPayments,

        failedPayments,

        paymentSuccessRate:
          Number(
            successRate.toFixed(2)
          ),
      });
    },
    {
      name:
        "calculate_customer_value",

      description:
        "Analyzes customer lifetime value and payment history strength.",

      schema: z.object({
        lifetimeValue:
          z.number(),

        monthlyValue:
          z.number(),

        successfulPayments:
          z.number(),

        failedPayments:
          z.number(),
      }),
    }
  );

export const checkRetrySafetyTool =
  tool(
    async ({
      attempts,
      failureCategory,
    }) => {
      if (
        failureCategory ===
        "permanent"
      ) {
        return JSON.stringify({
          allowed: false,
          reason:
            "Permanent payment failure. Do not retry.",
        });
      }

      if (
        attempts >= 3
      ) {
        return JSON.stringify({
          allowed: false,
          reason:
            "Maximum safe retry threshold reached.",
        });
      }

      if (
        failureCategory ===
        "temporary"
      ) {
        return JSON.stringify({
          allowed: true,
          reason:
            "Temporary failure with limited attempts.",
        });
      }

      return JSON.stringify({
        allowed: false,
        reason:
          "Unknown failure category.",
      });
    },
    {
      name:
        "check_retry_safety",

      description:
        "Determines whether another payment retry is safe.",

      schema: z.object({
        attempts:
          z.number(),

        failureCategory:
          z.enum([
            "temporary",
            "permanent",
            "unknown",
          ]),
      }),
    }
  );

export const suggestRecoveryStrategyTool =
  tool(
    async ({
      failureCategory,
      attempts,
      lifetimeValue,
    }) => {

      if (
        failureCategory ===
        "permanent"
      ) {
        return JSON.stringify({
          strategy:
            lifetimeValue >= 10000
              ? "contact_customer"
              : "send_reminder",

          reason:
            lifetimeValue >= 10000
              ? "Permanent failure detected for a high-value customer. Personal customer contact is more appropriate than another payment retry."
              : "Permanent failure detected. The customer should be reminded to update their payment method.",
        });
      }

      if (
        failureCategory ===
          "temporary" &&
        attempts < 3
      ) {
        return JSON.stringify({
          strategy:
            "send_reminder",

          reason:
            "Temporary failure with limited attempts. Create a customer-initiated payment recovery opportunity instead of blindly retrying the payment.",
        });
      }

      if (
        attempts >= 3
      ) {
        return JSON.stringify({
          strategy:
            "contact_customer",

          reason:
            "Multiple payment attempts have already occurred. Avoid further automatic retries and escalate the recovery interaction.",
        });
      }

      return JSON.stringify({
        strategy:
          "no_action",

        reason:
          "The failure could not be confidently classified. Recovery should proceed conservatively.",
      });
    },
    {
      name:
        "suggest_recovery_strategy",

      description:
        "Suggests a conservative customer recovery strategy based on failure category, attempt count, and customer value.",

      schema: z.object({
        failureCategory:
          z.enum([
            "temporary",
            "permanent",
            "unknown",
          ]),

        attempts:
          z.number(),

        lifetimeValue:
          z.number(),
      }),
    }
  );

export const recoveryTools = [
  analyzeFailureTool,
  calculateCustomerValueTool,
  checkRetrySafetyTool,
  suggestRecoveryStrategyTool,
];