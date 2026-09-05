import { callModel } from "@/lib/ai";

export type CallIntent =
  | "payment_problem"
  | "technical_problem"
  | "payment_method_problem"
  | "confused"
  | "wants_to_pay"
  | "pay_later"
  | "human_support"
  | "declined"
  | "other";

export type CallSentiment =
  | "positive"
  | "neutral"
  | "frustrated"
  | "negative";

export type CallResolution =
  | "payment_link_requested"
  | "human_escalation"
  | "follow_up_required"
  | "recovery_stopped"
  | "problem_resolved"
  | "customer_will_pay"
  | "no_resolution";

export interface CallAIResult {
  intent: CallIntent;
  problem: string;
  sentiment: CallSentiment;
  requestedHumanSupport: boolean;
  sendPaymentLink: boolean;
  stopRecovery: boolean;
  followUpRequired: boolean;
  response: string;
  resolution: CallResolution;
}

const VALID_INTENTS: CallIntent[] = [
  "payment_problem",
  "technical_problem",
  "payment_method_problem",
  "confused",
  "wants_to_pay",
  "pay_later",
  "human_support",
  "declined",
  "other",
];

const VALID_SENTIMENTS: CallSentiment[] = [
  "positive",
  "neutral",
  "frustrated",
  "negative",
];

const VALID_RESOLUTIONS: CallResolution[] = [
  "payment_link_requested",
  "human_escalation",
  "follow_up_required",
  "recovery_stopped",
  "problem_resolved",
  "customer_will_pay",
  "no_resolution",
];

function normalizeIntent(value: unknown): CallIntent {
  if (
    typeof value === "string" &&
    VALID_INTENTS.includes(value as CallIntent)
  ) {
    return value as CallIntent;
  }

  return "other";
}

function normalizeSentiment(
  value: unknown
): CallSentiment {
  if (
    typeof value === "string" &&
    VALID_SENTIMENTS.includes(
      value as CallSentiment
    )
  ) {
    return value as CallSentiment;
  }

  return "neutral";
}

function normalizeResolution(
  value: unknown
): CallResolution {
  if (
    typeof value === "string" &&
    VALID_RESOLUTIONS.includes(
      value as CallResolution
    )
  ) {
    return value as CallResolution;
  }

  return "no_resolution";
}

function normalizeBoolean(
  value: unknown
): boolean {
  return value === true;
}

function normalizeProblem(
  value: unknown
): string {
  if (
    typeof value === "string" &&
    value.trim()
  ) {
    return value.trim();
  }

  return "Customer reported an issue with the payment.";
}

function normalizeResponse(
  value: unknown
): string {
  if (
    typeof value === "string" &&
    value.trim()
  ) {
    return value.trim();
  }

  return "I understand. Could you tell me a little more about what happened?";
}

function extractJSON(raw: string): string {
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  if (
    cleaned.startsWith("{") &&
    cleaned.endsWith("}")
  ) {
    return cleaned;
  }

 
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start !== -1 && end !== -1 && end > start) {
    return cleaned.slice(start, end + 1);
  }

  throw new Error(
    "No valid JSON object found in AI response."
  );
}

export async function analyzeCallResponse(
  input: {
    customerName: string;
    paymentAmount: number;
    currency: string;
    failureReason: string | null;
    conversation: {
      speaker: "agent" | "customer";
      text: string;
    }[];
  }
): Promise<CallAIResult> {
  const prompt = `
You are RecoverAI, an AI payment recovery customer-support agent.

You are having a short conversation with a customer about a failed payment.

CUSTOMER:
${input.customerName}

PAYMENT:
${input.paymentAmount} ${input.currency}

KNOWN FAILURE:
${input.failureReason ?? "Unknown"}

CONVERSATION:
${input.conversation
  .map(
    (item) =>
      `${item.speaker.toUpperCase()}: ${item.text}`
  )
  .join("\n")}

Analyze the customer's LATEST message and decide what RecoverAI should do next.

IMPORTANT CLASSIFICATION RULES:

intent MUST be exactly one of:

"payment_problem"
"technical_problem"
"payment_method_problem"
"confused"
"wants_to_pay"
"pay_later"
"human_support"
"declined"
"other"

sentiment MUST be exactly one of:

"positive"
"neutral"
"frustrated"
"negative"

IMPORTANT:
"confused" is an INTENT.
"confused" is NEVER a sentiment.

If the customer sounds confused:
- intent = "confused"
- sentiment = "neutral" unless they clearly sound frustrated or negative.

CUSTOMER WANTS TO PAY:
If the customer wants to pay:
- intent = "wants_to_pay"
- sendPaymentLink = true
- resolution = "customer_will_pay"

CUSTOMER REQUESTS PAYMENT LINK:
If the customer explicitly asks for a payment link:
- intent = "wants_to_pay"
- sendPaymentLink = true
- resolution = "payment_link_requested"

CUSTOMER WANTS TO PAY LATER:
- intent = "pay_later"
- followUpRequired = true
- resolution = "follow_up_required"

CUSTOMER REQUESTS HUMAN:
- intent = "human_support"
- requestedHumanSupport = true
- followUpRequired = true
- resolution = "human_escalation"

CUSTOMER REFUSES:
If the customer clearly says they do not want further recovery:
- intent = "declined"
- stopRecovery = true
- resolution = "recovery_stopped"

PAYMENT PROBLEM:
If they describe a payment problem:
- identify the problem
- ask ONE useful follow-up question
- do not repeatedly ask the same question

CONVERSATION:
- Remember previous messages.
- Do not restart the conversation.
- Do not introduce yourself again.
- Respond directly to the latest customer message.
- Be empathetic.
- Sound natural when spoken aloud.
- Maximum 40 words.
- Maximum 2 sentences.

PAYMENT LINK:
If the customer asks to pay, do not claim that payment succeeded.
The system will send the payment link separately.

SECURITY:
Never ask for:
- card number
- CVV
- OTP
- UPI PIN
- bank password
- banking credentials

Never claim payment was successful unless the system explicitly says it was RevivePay.

Return ONLY valid JSON.

{
  "intent": "other",
  "problem": "",
  "sentiment": "neutral",
  "requestedHumanSupport": false,
  "sendPaymentLink": false,
  "stopRecovery": false,
  "followUpRequired": false,
  "response": "",
  "resolution": "no_resolution"
}
`;

  const raw = await callModel(prompt);

  try {
    const jsonText = extractJSON(raw);

    const parsed = JSON.parse(jsonText);

    const intent = normalizeIntent(
      parsed.intent
    );

    const sentiment =
      normalizeSentiment(parsed.sentiment);

    const sendPaymentLink =
      normalizeBoolean(
        parsed.sendPaymentLink
      );

    const requestedHumanSupport =
      normalizeBoolean(
        parsed.requestedHumanSupport
      );

    const stopRecovery =
      normalizeBoolean(
        parsed.stopRecovery
      );

    const followUpRequired =
      normalizeBoolean(
        parsed.followUpRequired
      );

    let resolution =
      normalizeResolution(
        parsed.resolution
      );

   
    if (requestedHumanSupport) {
      resolution =
        "human_escalation";
    } else if (stopRecovery) {
      resolution =
        "recovery_stopped";
    } else if (sendPaymentLink) {
      resolution =
        parsed.resolution ===
        "payment_link_requested"
          ? "payment_link_requested"
          : "customer_will_pay";
    } else if (followUpRequired) {
      resolution =
        "follow_up_required";
    }

    return {
      intent,

      problem:
        normalizeProblem(
          parsed.problem
        ),

      sentiment,

      requestedHumanSupport,

      sendPaymentLink,

      stopRecovery,

      followUpRequired,

      response:
        normalizeResponse(
          parsed.response
        ),

      resolution,
    };
  } catch (error) {
    console.error(
      "Invalid call AI response:",
      raw,
      error
    );

    throw new Error(
      "Invalid AI response from call agent."
    );
  }
}