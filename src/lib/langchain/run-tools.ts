import {
  analyzeFailureTool,
  calculateCustomerValueTool,
  checkRetrySafetyTool,
  suggestRecoveryStrategyTool,
} from "./tools";

export interface ToolContext {
  failureReason: string | null;
  failureCode: string | null;
  failureSource: string | null;
  failureStep: string | null;

  attempts: number;

  lifetimeValue: number;
  monthlyValue: number;

  successfulPayments: number;
  failedPayments: number;

  previousFailureReasons: (string | null)[];
}

export interface LangChainAnalysis {
  failureAnalysis: Record<string, unknown>;

  customerAnalysis: Record<string, unknown>;

  retrySafety: Record<string, unknown>;

  strategyHint: Record<string, unknown>;

  verifiedFacts: {
    attempts: number;
    successfulPayments: number;
    failedPayments: number;
    lifetimeValue: number;
    monthlyValue: number;

    failureReason: string | null;
    failureCode: string | null;
    failureSource: string | null;
    failureStep: string | null;

    failureCategory:
      | "temporary"
      | "permanent"
      | "unknown";

    retryAllowed: boolean;
  };
}

function parseToolResult(
  result: unknown
): Record<string, unknown> {
  if (typeof result !== "string") {
    throw new Error(
      "LangChain tool returned an invalid result."
    );
  }

  try {
    return JSON.parse(result);
  } catch {
    throw new Error(
      `LangChain tool returned invalid JSON: ${result}`
    );
  }
}

export async function runRecoveryTools(
  context: ToolContext
): Promise<LangChainAnalysis> {
  console.log(
    "Running LangChain tools..."
  );

  

  const failureReason =
    context.failureReason?.trim() ||
    "payment_failed";

  const failureCode =
    context.failureCode?.trim() ||
    "UNKNOWN";

  const failureSource =
    context.failureSource?.trim() ||
    "razorpay";

  const failureStep =
    context.failureStep?.trim() ||
    "payment";

  const previousFailureReasons =
    context.previousFailureReasons.filter(
      (
        reason
      ): reason is string =>
        typeof reason === "string" &&
        reason.trim().length > 0
    );

  const failureResult =
    await analyzeFailureTool.invoke({
      failureReason,

      failureCode,

      failureSource,

      failureStep,

      attempts:
        context.attempts,

      previousFailureReasons,
    });

  const failureAnalysis =
    parseToolResult(
      failureResult
    );

  const customerResult =
    await calculateCustomerValueTool.invoke({
      lifetimeValue:
        context.lifetimeValue,

      monthlyValue:
        context.monthlyValue,

      successfulPayments:
        context.successfulPayments,

      failedPayments:
        context.failedPayments,
    });

  const customerAnalysis =
    parseToolResult(
      customerResult
    );

  const categoryValue =
    failureAnalysis.category;

  if (
    categoryValue !== "temporary" &&
    categoryValue !== "permanent" &&
    categoryValue !== "unknown"
  ) {
    throw new Error(
      "Invalid failure category returned by failure analysis tool."
    );
  }

  const category:
    | "temporary"
    | "permanent"
    | "unknown" =
    categoryValue;

  

  const retryResult =
    await checkRetrySafetyTool.invoke({
      attempts:
        context.attempts,

      failureCategory:
        category,
    });

  const retrySafety =
    parseToolResult(
      retryResult
    );

  const strategyResult =
    await suggestRecoveryStrategyTool.invoke({
      failureCategory:
        category,

      attempts:
        context.attempts,

      lifetimeValue:
        context.lifetimeValue,
    });

  const strategyHint =
    parseToolResult(
      strategyResult
    );

  const retryAllowed =
    retrySafety.allowed === true;

  const verifiedFacts = {
    attempts:
      context.attempts,

    successfulPayments:
      context.successfulPayments,

    failedPayments:
      context.failedPayments,

    lifetimeValue:
      context.lifetimeValue,

    monthlyValue:
      context.monthlyValue,

    failureReason:
      context.failureReason,

    failureCode:
      context.failureCode,

    failureSource:
      context.failureSource,

    failureStep:
      context.failureStep,

    failureCategory:
      category,

    retryAllowed,
  };

  console.log(
    "Verified AI facts:",
    JSON.stringify(
      verifiedFacts,
      null,
      2
    )
  );

  return {
    failureAnalysis,

    customerAnalysis,

    retrySafety,

    strategyHint,

    verifiedFacts,
  };
}