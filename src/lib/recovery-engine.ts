import { connectDB } from "@/lib/mongodb";

import Payment from "@/models/Payment";
import Customer from "@/models/Customer";
import RecoveryAttempt from "@/models/RecoveryAttempt";
import Settings from "@/models/settings";
import { recordAuditEvent } from "@/lib/audit";

import { sendRecoveryEmail } from "./email";

import {
  type AIContext,
  type AIRecommendation,
} from "@/lib/ai";

import {
  analyzePaymentWithTools,
} from "@/lib/langchain/analyze-with-tools";

import {
  evaluateRecoveryPolicy,
  type PolicyResult,
} from "@/lib/policy-engine";

import {
  createPaymentLink,
} from "@/lib/razorpay";

import {
  selectRecoveryChannel,
  type RecoveryChannel,
} from "@/lib/communications/channel-router";

import {
  startRecoveryCall,
} from "@/lib/communications/call-agent";

import {
  sendRecoverySMS,
} from "@/lib/communications/sms";

const MAX_RECOVERY_ATTEMPTS = 3;

export interface RecoveryResult {
  success: boolean;

  paymentId: string;

  recommendation?: AIRecommendation;

  policy?: PolicyResult;

  recoveryAttemptId?: string;

  paymentUrl?: string;

  razorpayPaymentLinkId?: string;

  message?: string;

  duplicate?: boolean;

  attemptsUsed?: number;

  attemptsRemaining?: number;

  stopped?: boolean;

  emailSent?: boolean;

  emailError?: string;

  channel?: RecoveryChannel | null;

  channelError?: string;
}

export async function runRecoveryEngine(
  paymentId: string
): Promise<RecoveryResult> {
  await connectDB();

  const settings = await Settings.findOne({ key: "global" }).lean();
  const maxRecoveryAttempts = settings?.policy.retryLimit ?? MAX_RECOVERY_ATTEMPTS;

  console.log(
    "======================================"
  );

  console.log(
    "RECOVER-AI ENGINE STARTED"
  );

  console.log(
    "Payment:",
    paymentId
  );

  console.log(
    "======================================"
  );

  const payment =
    await Payment.findOne({
      paymentId,
    }).lean();

  if (!payment) {
    throw new Error(
      `Payment ${paymentId} not found.`
    );
  }

  if (
    payment.status !== "failed"
  ) {
    return {
      success: false,

      paymentId,

      message:
        "Recovery engine only processes failed payments.",
    };
  }

  if (
    payment.recoveryStatus ===
    "recovered"
  ) {
    return {
      success: true,

      paymentId,

      message:
        "Payment has already been recovered.",

      duplicate: true,
    };
  }

  const attemptsUsed =
    await RecoveryAttempt.countDocuments({
      paymentId,
      status: { $ne: "cancelled" },
    });

  console.log(
    "Recovery attempts used:",
    attemptsUsed
  );

  if (
    attemptsUsed >=
    maxRecoveryAttempts
  ) {
    await Payment.updateOne(
      { paymentId },
      {
        $set: {
          recoveryStatus:
            "unrecoverable",

          recoveryAction:
            "no_action",
        },
      }
    );

    return {
      success: true,

      paymentId,

      attemptsUsed,

      attemptsRemaining: 0,

      stopped: true,

      message:
        `Maximum recovery attempts (${maxRecoveryAttempts}) reached.`,
    };
  }

  const activeRecovery =
    await RecoveryAttempt.findOne({
      paymentId,

      status: {
        $in: [
          "pending",
          "processing",
        ],
      },
    })
      .sort({
        createdAt: -1,
      })
      .lean();

  if (activeRecovery) {
    return {
      success: true,

      paymentId,

      recoveryAttemptId:
        activeRecovery._id.toString(),

      paymentUrl:
        activeRecovery.paymentUrl ??
        undefined,

      razorpayPaymentLinkId:
        activeRecovery.razorpayPaymentLinkId ??
        undefined,

      attemptsUsed,

      attemptsRemaining:
        Math.max(
          0,
          maxRecoveryAttempts -
            attemptsUsed
        ),

      emailSent:
        activeRecovery.emailSent,

      emailError:
        activeRecovery.emailError ??
        undefined,

      message:
        "Recovery attempt already in progress.",

      duplicate: true,
    };
  }

  if (!payment.customerId) {
    throw new Error(
      `Payment ${paymentId} has no customerId.`
    );
  }

  const customer =
    await Customer.findOne({
      customerId:
        payment.customerId,
    }).lean();

  if (!customer) {
    throw new Error(
      `Customer ${payment.customerId} not found.`
    );
  }

  const customerPhone =
    (
      customer as typeof customer & {
        phone?: string;
        phoneNumber?: string;
      }
    ).phone ||
    (
      customer as typeof customer & {
        phone?: string;
        phoneNumber?: string;
      }
    ).phoneNumber ||
    null;

  const hasEmail =
    Boolean(customer.email);

  const hasPhone =
    Boolean(customerPhone);

  const paymentHistory =
    await Payment.find({
      customerId:
        payment.customerId,
    })
      .sort({
        createdAt: -1,
      })
      .limit(100)
      .lean();

  const context: AIContext = {
    customer: {
      customerId:
        customer.customerId,

      name:
        customer.name,

      email:
        customer.email,

      plan:
        customer.plan,

      monthlyValue:
        customer.monthlyValue,

      lifetimeValue:
        customer.lifetimeValue,

      successfulPayments:
        customer.successfulPayments,

      failedPayments:
        customer.failedPayments,
    },

    currentPayment: {
      paymentId:
        payment.paymentId,

      amount:
        payment.amount,

      currency:
        payment.currency,

      status:
        payment.status,

      failureReason:
        payment.failureReason ??
        null,

      failureCode:
        payment.failureCode ??
        null,

      failureSource:
        payment.failureSource ??
        null,

      failureStep:
        payment.failureStep ??
        null,

      attempts: attemptsUsed,
    },

    paymentHistory:
      paymentHistory.map((p) => ({
        paymentId:
          p.paymentId,

        amount:
          p.amount,

        currency:
          p.currency,

        status:
          p.status,

        failureReason:
          p.failureReason ??
          null,

        attempts:
          p.attempts,

        createdAt:
          p.createdAt.toISOString(),
      })),
  };

  console.log(
    "Running AI recovery analysis..."
  );

  const analysis =
    await analyzePaymentWithTools(
      context
    );

  const recommendation =
    analysis.recommendation;

  const selectedChannel = selectRecoveryChannel({
    riskLevel: recommendation.riskLevel,
    customerLifetimeValue: customer.lifetimeValue,
    hasEmail,
    hasPhone,
    strategy: recommendation.strategy,
    failureReason: payment.failureReason,
  });

  recommendation.channel = selectedChannel ?? "none";
  recommendation.recoveryProbability = Math.min(1, Math.max(0,
    recommendation.recoveryProbability || (
      recommendation.confidence *
      (analysis.tools.verifiedFacts.failureCategory === "temporary" ? 1 : 0.55)
    )
  ));
  if (!recommendation.recommendedDelayMinutes) {
    recommendation.recommendedDelayMinutes = selectedChannel === "call" ? 120 : selectedChannel === "sms" ? 240 : 720;
  }

  await recordAuditEvent({
    paymentId,
    actor: "ai_agent",
    layer: "agent",
    action: "strategy_recommended",
    reason: recommendation.reason,
    metadata: {
      strategy: recommendation.strategy,
      confidence: recommendation.confidence,
      riskLevel: recommendation.riskLevel,
    },
  });

  console.log(
    "AI Recommendation:",
    JSON.stringify(
      recommendation,
      null,
      2
    )
  );

  const policy =
    evaluateRecoveryPolicy({
      strategy:
        recommendation.strategy,

      paymentAmount:
        payment.amount,

      attempts:
        attemptsUsed,

      customerLifetimeValue:
        customer.lifetimeValue,

      successfulPayments:
        customer.successfulPayments,

      failedPayments:
        customer.failedPayments,

      failureReason:
        payment.failureReason,

      policy: settings?.policy,
    });

  await recordAuditEvent({
    paymentId,
    actor: "policy_engine",
    layer: "policy",
    action: policy.allowed ? "strategy_approved" : "strategy_blocked",
    reason: policy.reason,
    metadata: {
      strategy: recommendation.strategy,
      riskLevel: policy.riskLevel,
      requiresApproval: policy.requiresApproval,
    },
  });

  console.log(
    "Policy Decision:",
    JSON.stringify(
      policy,
      null,
      2
    )
  );

  let finalStrategy =
    "no_action";

  if (!policy.allowed) {
    finalStrategy =
      "no_action";
  } else if (
    policy.requiresApproval
  ) {
    finalStrategy =
      "awaiting_approval";
  } else {
    finalStrategy =
      recommendation.strategy;
  }

  if (
    !analysis.tools.verifiedFacts
      .retryAllowed &&
    finalStrategy ===
      "retry_payment"
  ) {
    finalStrategy =
      "send_reminder";
  }

  if (
    analysis.tools.verifiedFacts
      .failureCategory ===
    "unknown"
  ) {
    finalStrategy =
      "no_action";
  }

  console.log(
    "Final Strategy:",
    finalStrategy
  );

  if (
    finalStrategy ===
      "no_action" ||
    !policy.allowed
  ) {
    await Payment.updateOne(
      { paymentId },
      {
        $set: {
          recoveryStatus:
            "unrecoverable",

          recoveryAction:
            "no_action",
        },
      }
    );

    await recordAuditEvent({
      paymentId,
      actor: "system",
      layer: "system",
      action: "recovery_stopped",
      reason: policy.reason,
      metadata: { attemptsUsed, maxRecoveryAttempts },
    });

    return {
      success: true,

      paymentId,

      recommendation,

      policy,

      attemptsUsed,

      attemptsRemaining:
        Math.max(
          0,
          maxRecoveryAttempts -
            attemptsUsed
        ),

      stopped: true,

      channel: null,

      message:
        "Recovery policy does not allow another recovery attempt.",
    };
  }

  const channel =
    selectRecoveryChannel({
      riskLevel:
        policy.riskLevel,

      customerLifetimeValue:
        customer.lifetimeValue,

      hasEmail,

      hasPhone,

      strategy:
        finalStrategy,

      failureReason:
        payment.failureReason,
    });

  if (!channel) {
    await Payment.updateOne(
      { paymentId },
      {
        $set: {
          recoveryStatus:
            "unrecoverable",

          recoveryAction:
            "no_action",
        },
      }
    );

    return {
      success: true,

      paymentId,

      recommendation,

      policy,

      attemptsUsed,

      attemptsRemaining:
        Math.max(
          0,
          maxRecoveryAttempts -
            attemptsUsed
        ),

      stopped: true,

      channel: null,

      message:
        "No valid recovery communication channel is available.",
    };
  }

  console.log(
    "Selected recovery channel:",
    channel
  );

  const currentAttemptNumber =
    attemptsUsed + 1;

  if (
    currentAttemptNumber >
    maxRecoveryAttempts
  ) {
    await Payment.updateOne(
      { paymentId },
      {
        $set: {
          recoveryStatus:
            "unrecoverable",

          recoveryAction:
            "no_action",
        },
      }
    );

    return {
      success: true,

      paymentId,

      attemptsUsed,

      attemptsRemaining: 0,

      stopped: true,

      channel,

      message:
        "Maximum recovery attempts reached.",
    };
  }

  const attemptsRemaining =
    maxRecoveryAttempts -
    currentAttemptNumber;

  const shouldCreatePaymentLink =
    finalStrategy ===
      "send_reminder" ||
    finalStrategy ===
      "retry_payment" ||
    (
      finalStrategy ===
        "contact_customer" &&
      (
        channel === "call" ||
        channel === "sms"
      )
    );

  let recoveryAttempt;

  try {
    recoveryAttempt =
      await RecoveryAttempt.create({
        paymentId:
          payment.paymentId,

        customerId:
          customer.customerId,

        strategy:
          finalStrategy,

        aiReason:
          recommendation.reason,

        status:
          shouldCreatePaymentLink
            ? "pending"
            : "processing",

        attemptedAt:
          new Date(),

        recoveredAmount:
          0,

        attemptNumber: currentAttemptNumber,

        failureReason:
          payment.failureReason ??
          null,

        aiConfidence:
          recommendation.confidence,

        recoveryProbability: recommendation.recoveryProbability,
        recommendedDelayMinutes: recommendation.recommendedDelayMinutes,
        recommendedChannel: recommendation.channel,

        riskLevel:
          policy.riskLevel,

        suggestedMessage:
          recommendation.suggestedMessage,

        paymentUrl:
          null,

        razorpayPaymentLinkId:
          null,

        recoveryOrderId:
          null,

        recoveryRazorpayPaymentId:
          null,

        razorpayOrderId: null,

        razorpayPaymentId: null,

        completedAt: null,

        emailSent:
          false,

        emailSentAt:
          null,

        emailMessageId:
          null,

        emailError:
          null,
      });
  } catch (error: unknown) {
    if (
      typeof error ===
        "object" &&
      error !== null &&
      "code" in error &&
      (
        error as {
          code?: number;
        }
      ).code === 11000
    ) {
      const existing =
        await RecoveryAttempt.findOne({
          paymentId,

          status: {
            $in: [
              "pending",
              "processing",
            ],
          },
        })
          .sort({
            createdAt: -1,
          })
          .lean();

      if (existing) {
        return {
          success: true,

          paymentId,

          recoveryAttemptId:
            existing._id.toString(),

          paymentUrl:
            existing.paymentUrl ??
            undefined,

          razorpayPaymentLinkId:
            existing.razorpayPaymentLinkId ??
            undefined,

          attemptsUsed,

          attemptsRemaining:
            Math.max(
              0,
              maxRecoveryAttempts -
                attemptsUsed
            ),

          emailSent:
            existing.emailSent,

          emailError:
            existing.emailError ??
            undefined,

          channel,

          message:
            "Recovery attempt already exists.",

          duplicate: true,
        };
      }
    }

    throw error;
  }

  console.log(
    `Recovery attempt #${currentAttemptNumber} created`
  );

  await recordAuditEvent({
    paymentId,
    recoveryAttemptId: recoveryAttempt._id.toString(),
    actor: "system",
    layer: "system",
    action: "recovery_attempt_created",
    reason: `Attempt ${currentAttemptNumber} of ${maxRecoveryAttempts}`,
    metadata: { strategy: finalStrategy, channel },
  });

  let paymentUrl:
    | string
    | undefined;

  let razorpayPaymentLinkId:
    | string
    | undefined;

  if (shouldCreatePaymentLink) {
    try {
      const paymentLink =
        await createPaymentLink({
          amount:
            payment.amount,

          currency:
            payment.currency,

          customerName:
            customer.name,

          customerEmail:
            customer.email,

          paymentId:
            payment.paymentId,

          customerId:
            customer.customerId,
        });

      paymentUrl =
        paymentLink.url;

      razorpayPaymentLinkId =
        paymentLink.id;

      const updatedRecovery =
        await RecoveryAttempt.findOneAndUpdate(
          {
            _id:
              recoveryAttempt._id,
          },
          {
            $set: {
              paymentUrl,

              razorpayPaymentLinkId,

              status:
                "processing",
            },
          },
          {
            returnDocument:
              "after",

            runValidators:
              true,
          }
        );

      if (!updatedRecovery) {
        throw new Error(
          "RecoveryAttempt disappeared while saving Payment Link."
        );
      }

      console.log(
        "Razorpay Payment Link created:",
        paymentUrl
      );
    } catch (error) {
      console.error(
        "Failed to create Razorpay Payment Link:",
        error
      );

      await RecoveryAttempt.updateOne(
        {
          _id:
            recoveryAttempt._id,
        },
        {
          $set: {
            status:
              "failed",

            errorMessage:
              error instanceof Error
                ? error.message
                : "Failed to create Razorpay Payment Link.",
          },
        }
      );

      if (
        currentAttemptNumber >=
              maxRecoveryAttempts
      ) {
        await Payment.updateOne(
          { paymentId },
          {
            $set: {
              recoveryStatus:
                "unrecoverable",

              recoveryAction:
                finalStrategy,
            },
          }
        );
      } else {
        await Payment.updateOne(
          { paymentId },
          {
            $set: {
              recoveryStatus:
                "pending",

              recoveryAction:
                finalStrategy,
            },
          }
        );
      }

      throw error;
    }
  }

  let emailSent = false;

  let emailError:
    | string
    | undefined;

  let channelError:
    | string
    | undefined;

  if (channel === "email") {
    try {
      if (!customer.email) {
        throw new Error(
          "Customer does not have an email address."
        );
      }

      if (!paymentUrl) {
        throw new Error(
          "Payment link is required for email recovery."
        );
      }

      const emailResult =
        await sendRecoveryEmail({
          customerName:
            customer.name,

          customerEmail:
            customer.email,

          amount:
            payment.amount,

          currency:
            payment.currency,

          paymentUrl,

          attemptNumber:
            currentAttemptNumber,

          suggestedMessage:
            recommendation.suggestedMessage,
        });

      emailSent = true;

      await RecoveryAttempt.updateOne(
        {
          _id:
            recoveryAttempt._id,
        },
        {
          $set: {
            emailSent: true,

            emailSentAt:
              new Date(),

            emailMessageId:
              emailResult.messageId,

            emailError:
              null,
          },
        }
      );

      console.log(
        "Recovery email sent:",
        emailResult.messageId
      );
    } catch (error) {
      emailError =
        error instanceof Error
          ? error.message
          : "Failed to send recovery email.";

      console.error(
        "Recovery email failed:",
        emailError
      );

      await RecoveryAttempt.updateOne(
        {
          _id:
            recoveryAttempt._id,
        },
        {
          $set: {
            emailSent: false,

            emailError,
          },
        }
      );
    }
  }

  if (channel === "sms") {
    try {
      if (!customerPhone) {
        throw new Error(
          "Customer does not have a phone number."
        );
      }

      if (!paymentUrl) {
        throw new Error(
          "Payment link is required for SMS recovery."
        );
      }

      await sendRecoverySMS({
        to: customerPhone,

        message:
          recommendation.suggestedMessage
            ? `${recommendation.suggestedMessage} Secure payment link: ${paymentUrl}`
            : `Your payment could not be completed. You can securely complete it here: ${paymentUrl}`,

        paymentId:
          payment.paymentId,

        customerId:
          customer.customerId,

        recoveryAttemptId:
          recoveryAttempt._id.toString(),
      });

      console.log(
        "Recovery SMS sent."
      );
    } catch (error) {
      channelError =
        error instanceof Error
          ? error.message
          : "Failed to send recovery SMS.";

      console.error(
        "Recovery SMS failed:",
        channelError
      );
    }
  }

  if (channel === "call") {
    try {
      if (!customerPhone) {
        throw new Error(
          "Customer does not have a phone number."
        );
      }

      await startRecoveryCall({
        paymentId:
          payment.paymentId,

        customerId:
          customer.customerId,

        recoveryAttemptId:
          recoveryAttempt._id.toString(),
      });

      console.log(
        "Recovered AI call initiated."
      );
    } catch (error) {
      channelError =
        error instanceof Error
          ? error.message
          : "Failed to initiate recovery call.";

      console.error(
        "Recovery call failed:",
        channelError
      );
    }
  }

  await Payment.updateOne(
    { paymentId },
    {
      $set: {
        recoveryStatus:
          "in_progress",

        recoveryAction:
          finalStrategy,
      },
    }
  );

  const savedRecovery =
    await RecoveryAttempt.findById(
      recoveryAttempt._id
    ).lean();

  let message =
    `Recovery attempt #${currentAttemptNumber} created.`;

  if (channel === "email") {
    message =
      emailSent
        ? `Recovery attempt #${currentAttemptNumber} created and email sent.`
        : emailError
        ? `Recovery attempt #${currentAttemptNumber} created, but email could not be sent.`
        : message;
  }

  if (channel === "sms") {
    message =
      channelError
        ? `Recovery attempt #${currentAttemptNumber} created, but SMS could not be sent.`
        : `Recovery attempt #${currentAttemptNumber} created and SMS sent.`;
  }

  if (channel === "call") {
    message =
      channelError
        ? `Recovery attempt #${currentAttemptNumber} created, but the AI call could not be started.`
        : `Recovery attempt #${currentAttemptNumber} created and AI recovery call initiated.`;
  }

  console.log(
    "======================================"
  );

  console.log({
    recoveryAttemptId:
      recoveryAttempt._id.toString(),

    paymentId,

    attemptsUsed:
      currentAttemptNumber,

    attemptsRemaining,

    channel,

    paymentUrl:
      savedRecovery?.paymentUrl ??
      paymentUrl,

    razorpayPaymentLinkId:
      savedRecovery?.razorpayPaymentLinkId ??
      razorpayPaymentLinkId,

    emailSent:
      savedRecovery?.emailSent ??
      emailSent,

    emailError:
      savedRecovery?.emailError ??
      emailError,

    channelError,
  });

  console.log(
    "======================================"
  );

  return {
    success: true,

    paymentId,

    recommendation,

    policy,

    recoveryAttemptId:
      recoveryAttempt._id.toString(),

    paymentUrl:
      savedRecovery?.paymentUrl ??
      paymentUrl,

    razorpayPaymentLinkId:
      savedRecovery?.razorpayPaymentLinkId ??
      razorpayPaymentLinkId,

    attemptsUsed:
      currentAttemptNumber,

    attemptsRemaining,

    emailSent:
      savedRecovery?.emailSent ??
      emailSent,

    emailError:
      savedRecovery?.emailError ??
      emailError,

    channel,

    channelError,

    message,
  };
}