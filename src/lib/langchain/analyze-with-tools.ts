import {
  AIContext,
  AIRecommendation,
  callModel,
} from "@/lib/ai";

import {
  runRecoveryTools,
  LangChainAnalysis,
} from "./run-tools";
import { z } from "zod";

export interface AnalysisWithTools {
  tools: LangChainAnalysis;
  recommendation: AIRecommendation;
}

function cleanJSON(
  content: string
): string {
  return content
    .replace(
      /^```json\s*/i,
      ""
    )
    .replace(
      /^```\s*/i,
      ""
    )
    .replace(
      /\s*```$/i,
      ""
    )
    .trim();
}

function validateRecommendation(
  data: unknown
): AIRecommendation {
  const schema = z.object({
    strategy: z.enum(["retry_payment", "send_reminder", "offer_discount", "contact_customer", "no_action"]),
    reason: z.string().trim().min(1).max(500),
    confidence: z.coerce.number().min(0).max(1),
    riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
    suggestedMessage: z.string().trim().min(1).max(1000),
    recoveryProbability: z.coerce.number().min(0).max(1).optional(),
    recommendedDelayMinutes: z.coerce.number().int().min(0).max(10080).optional(),
    channel: z.enum(["email", "sms", "call", "none"]).optional(),
  });
  const result = schema.parse(data);
  return {
    ...result,
    recoveryProbability: result.recoveryProbability ?? result.confidence,
    recommendedDelayMinutes: result.recommendedDelayMinutes ?? 0,
    channel: result.channel ?? (result.strategy === "no_action" ? "none" : "email"),
  };
}

export function parseAIRecommendationResponse(content: string): AIRecommendation {
  const parsed = JSON.parse(cleanJSON(content));
  return validateRecommendation(parsed);
}

export async function analyzePaymentWithTools(
  context: AIContext
): Promise<AnalysisWithTools> {
 

  const previousFailureReasons =
    context.paymentHistory
      .filter(
        (payment) =>
          payment.paymentId !==
          context.currentPayment.paymentId
      )
      .map(
        (payment) =>
          payment.failureReason
      );

  const tools =
    await runRecoveryTools({
      failureReason:
        context.currentPayment
          .failureReason,

      failureCode:
        context.currentPayment
          .failureCode,

      failureSource:
        context.currentPayment
          .failureSource,

      failureStep:
        context.currentPayment
          .failureStep,

      attempts:
        context.currentPayment
          .attempts,

      lifetimeValue:
        context.customer
          .lifetimeValue,

      monthlyValue:
        context.customer
          .monthlyValue,

      successfulPayments:
        context.customer
          .successfulPayments,

      failedPayments:
        context.customer
          .failedPayments,

      previousFailureReasons,
    });

  console.log(
    "LangChain analysis:",
    JSON.stringify(
      tools,
      null,
      2
    )
  );

  const prompt = `
You are an AI payment recovery decision assistant.

Recommend ONE recovery strategy for the CURRENT failed payment.

You do NOT execute payments.
You do NOT change payment status.
You do NOT override deterministic policy.
You do NOT invent facts.

The database and deterministic tools are authoritative.

CUSTOMER:
${JSON.stringify(
  context.customer,
  null,
  2
)}

CURRENT PAYMENT:
${JSON.stringify(
  context.currentPayment,
  null,
  2
)}

VERIFIED FACTS:
${JSON.stringify(
  tools.verifiedFacts,
  null,
  2
)}

DETERMINISTIC TOOL ANALYSIS:
${JSON.stringify(
  tools,
  null,
  2
)}

RULES:

1. The CURRENT payment is the primary source of truth.

2. Historical failures are contextual only.

3. Never recommend retry_payment when retryAllowed is false.

4. Never recommend retry_payment for a permanent failure.

5. Never recommend retry_payment when attempts >= 3.

6. For temporary failures with retryAllowed=true, prefer send_reminder.

7. RecoverAI creates customer-initiated payment recovery surfaces. It does not blindly charge customers.

8. Unknown failures must result in no_action.

9. Fraud-related failures must be handled conservatively.

10. Do not invent payment attempts.

11. Do not invent customer attributes.

12. Do not assume payment recovery occurred.

13. Do not claim an email, SMS, WhatsApp message, or phone call was sent.

14. suggestedMessage is only message content.

15. Do not offer discounts unless there is a strong recovery reason.

16. The deterministic policy engine has final authority.

17. Return recoveryProbability as a number from 0 to 1, recommendedDelayMinutes as a whole number, and channel as email, sms, call, or none.

AVAILABLE STRATEGIES:

retry_payment
send_reminder
offer_discount
contact_customer
no_action

CUSTOMER MESSAGE:

The suggestedMessage must be concise and professional.

Do not mention:
- AI
- internal tools
- policy
- internal systems

Do not claim:
- payment succeeded
- payment was RevivePay
- a message was already sent
- a discount exists unless strategy is offer_discount

OUTPUT:

Return ONLY valid JSON.

{
  "strategy": "retry_payment | send_reminder | offer_discount | contact_customer | no_action",
  "reason": "short explanation",
  "confidence": 0.0,
  "riskLevel": "LOW | MEDIUM | HIGH",
  "suggestedMessage": "customer-facing message"
}

Confidence must be between 0 and 1.

Do not include markdown.
Do not include code fences.
Do not include additional fields.
`;

  console.log(
    "Calling model..."
  );

  const rawResponse =
    await callModel(prompt);

  console.log(
    "Model response:",
    rawResponse
  );

  

  try {
    const recommendation = parseAIRecommendationResponse(rawResponse);

   

    if (
      !tools.verifiedFacts
        .retryAllowed &&
      recommendation.strategy ===
        "retry_payment"
    ) {
      recommendation.strategy =
        "send_reminder";

      recommendation.reason =
        "Automatic retry is not allowed by deterministic safety checks. A customer-initiated recovery action is recommended instead.";

      recommendation.riskLevel =
        "MEDIUM";
    }

    if (
      tools.verifiedFacts
        .failureCategory ===
        "permanent" &&
      recommendation.strategy ===
        "retry_payment"
    ) {
      recommendation.strategy =
        "send_reminder";

      recommendation.reason =
        "The current failure is classified as permanent, so an automatic retry is not recommended.";

      recommendation.riskLevel =
        "HIGH";
    }

    if (
      tools.verifiedFacts
        .failureCategory ===
        "unknown"
    ) {
      recommendation.strategy =
        "no_action";

      recommendation.reason =
        "The payment failure could not be confidently classified, so no automatic recovery action is recommended.";

      recommendation.riskLevel =
        "HIGH";
    }

    return {
      tools,
      recommendation,
    };
  } catch (error) {
    console.error(
      "AI JSON parsing error:",
      error
    );

    console.error(
      "Raw model response:",
      rawResponse
    );

    throw new Error(
      "AI returned invalid JSON."
    );
  }
}