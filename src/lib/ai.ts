import OpenAI from "openai";

export interface AIContext {
  customer: {
    customerId: string;
    name: string;
    email: string;
    plan: string;
    monthlyValue: number;
    lifetimeValue: number;
    successfulPayments: number;
    failedPayments: number;
  };

  currentPayment: {
    paymentId: string;
    amount: number;
    currency: string;
    status: string;

    failureReason: string | null;
    failureCode: string | null;
    failureSource: string | null;
    failureStep: string | null;

    attempts: number;
  };

  paymentHistory: {
    paymentId: string;
    amount: number;
    currency: string;
    status: string;
    failureReason: string | null;
    attempts: number;
    createdAt: string;
  }[];
}

export interface AIRecommendation {
  strategy:
    | "retry_payment"
    | "send_reminder"
    | "offer_discount"
    | "contact_customer"
    | "no_action";

  reason: string;

  confidence: number;

  riskLevel:
    | "LOW"
    | "MEDIUM"
    | "HIGH";

  suggestedMessage: string;

  recoveryProbability: number;

  recommendedDelayMinutes: number;

  channel: "email" | "sms" | "call" | "none";
}

function getClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
  });
}

const MODEL =
  "inclusionai/ling-3.0-flash-fin:free";

export async function callModel(
  prompt: string
): Promise<string> {
  const response =
    await getClient().chat.completions.create({
      model: MODEL,

      messages: [
        {
          role: "system",
          content: `
You are a payment recovery decision assistant.

You MUST treat the data provided by the application as authoritative.

Never invent:
- payment attempts
- payment counts
- customer history
- customer behavior
- transaction amounts
- failure reasons
- dates
- payment methods
- previous transactions
- customer attributes

If a fact is not explicitly present in the supplied data,
DO NOT mention it.

Do not estimate or infer numerical customer history.

The application will separately enforce deterministic
payment safety policies. You are NOT authorized to
execute payments or override those policies.

Your job is only to recommend a recovery strategy,
explain the recommendation briefly, and generate a
customer-facing recovery message.
`,
        },

        {
          role: "user",
          content: prompt,
        },
      ],

      temperature: 0.1,
    });

  const message =
    response.choices[0]?.message;

  if (!message) {
    throw new Error(
      "No response received from OpenRouter."
    );
  }

  const content =
    message.content;

  if (!content) {
    throw new Error(
      "OpenRouter returned an empty response."
    );
  }

  return content;
}