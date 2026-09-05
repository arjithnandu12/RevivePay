import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";

import Payment from "@/models/Payment";
import Customer from "@/models/Customer";
import RecoveryAttempt from "@/models/RecoveryAttempt";
import WebhookEvent from "@/models/webhookEvent";
import RecoveryCommunication from "@/models/RecoveryCommunication";
import AuditEvent from "@/models/AuditEvent";
import PromiseToPay from "@/models/PromiseToPay";

const MAX_ATTEMPTS = 3;

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      caseId: string;
    }>;
  }
) {
  try {
    await connectDB();

    const { caseId: paymentId } = await params;

    const payment = await Payment.findOne({
      paymentId,
    }).lean();

    if (!payment) {
      return NextResponse.json(
        {
          error: "Recovery case not found",
        },
        {
          status: 404,
        }
      );
    }

    const [
      customer,
      attempt,
      successfulPayments,
      webhookEvents,
      recoveryAttempts,
      communications,
      auditEvents,
      promises,
    ] = await Promise.all([
      Customer.findOne({
        customerId: payment.customerId,
      }).lean(),

      RecoveryAttempt.findOne({
        paymentId,
      })
        .sort({
          createdAt: -1,
        })
        .lean(),

      Payment.find({
        customerId: payment.customerId,
        status: "success",
      }).lean(),

      WebhookEvent.find({
        paymentId,
      })
        .sort({
          receivedAt: 1,
        })
        .lean(),

      RecoveryAttempt.find({
        paymentId,
      })
        .sort({
          createdAt: 1,
        })
        .lean(),

      RecoveryCommunication.find({
        paymentId,
      })
        .sort({
          createdAt: 1,
        })
        .lean(),

      AuditEvent.find({ paymentId })
        .sort({ createdAt: 1 })
        .lean(),

      PromiseToPay.find({ paymentId })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    if (!customer) {
      return NextResponse.json(
        {
          error: "Customer not found for this case",
        },
        {
          status: 404,
        }
      );
    }

    const averagePayment =
      successfulPayments.length > 0
        ? Math.round(
            successfulPayments.reduce(
              (sum, p) => sum + p.amount,
              0
            ) / successfulPayments.length
          )
        : payment.amount;

    const priority = derivePriority(
      attempt?.riskLevel,
      payment.amount
    );

    const status = deriveStatus(
      payment.recoveryStatus,
      attempt?.status
    );

    const latestCommunication =
      communications.length > 0
        ? communications[
            communications.length - 1
          ]
        : null;

    const communicationSummary = {
      total: communications.length,

      emailCount: communications.filter(
        (communication) =>
          communication.channel === "email"
      ).length,

      smsCount: communications.filter(
        (communication) =>
          communication.channel === "sms"
      ).length,

      callCount: communications.filter(
        (communication) =>
          communication.channel === "call"
      ).length,

      latestChannel:
        latestCommunication?.channel ??
        null,

      latestStatus:
        latestCommunication?.status ??
        null,

      paymentLinkSent:
        communications.some(
          (communication) =>
            communication.paymentLinkSent ===
            true
        ),

      humanSupportRequested:
        communications.some(
          (communication) =>
            communication.requestedHumanSupport ===
            true
        ),

      followUpRequired:
        communications.some(
          (communication) =>
            communication.followUpRequired ===
            true
        ),
    };

    const decisionTrace = [
      {
        step: "Payment failure detected",

        layer: "razorpay" as const,

        done: true,
      },

      {
        step: "Failure reason classified",

        layer: "agent" as const,

        done: !!attempt,
      },

      {
        step: "Customer history retrieved",

        layer: "agent" as const,

        done: !!attempt,
      },

      {
        step: "Customer value calculated",

        layer: "agent" as const,

        done: !!attempt,
      },

      {
        step: "Recovery strategy generated",

        layer: "agent" as const,

        done: !!attempt,
      },

      {
        step: "Recovery channel selected",

        layer: "agent" as const,

        done:
          communications.length > 0 ||
          !!attempt,
      },

      {
        step: "Policy engine validation",

        layer: "policy" as const,

        done: !!attempt,
      },

      {
        step: "Recovery action approved",

        layer: "policy" as const,

        done:
          payment.recoveryStatus ===
            "in_progress" ||
          payment.recoveryStatus ===
            "RevivePay",
      },

      {
        step: "Payment link created",

        layer: "razorpay" as const,

        done: !!attempt?.paymentUrl,
      },

      {
        step: "Recovery communication sent",

        layer: "agent" as const,

        done: communications.length > 0,
      },
    ];

    type TimelineState =
      | "success"
      | "pending"
      | "failure"
      | "blocked";

    const timeline: {
      time: string;
      label: string;
      detail: string | null;
      state: TimelineState;
    }[] = [];

    for (const event of webhookEvents) {
      timeline.push({
        time: new Date(
          event.receivedAt
        ).toISOString(),

        label: formatEventLabel(
          event.event
        ),

        detail: event.lastError ?? null,

        state:
          event.status === "failed"
            ? "failure"
            : event.status ===
                "processing"
              ? "pending"
              : "success",
      });
    }

    for (const event of auditEvents) {
      timeline.push({
        time: new Date(event.createdAt).toISOString(),
        label: formatEventLabel(event.action),
        detail: event.reason ?? event.actor,
        state: event.action.includes("blocked") || event.action.includes("stopped")
          ? "blocked"
          : "success",
      });
    }

    for (
      let i = 0;
      i < recoveryAttempts.length;
      i++
    ) {
      const recovery =
        recoveryAttempts[i];

      const attemptNumber = i + 1;

      timeline.push({
        time: new Date(
          recovery.attemptedAt
        ).toISOString(),

        label:
          `Recovery attempt #${attemptNumber}: ${recovery.strategy.replace(
            /_/g,
            " "
          )}`,

        detail:
          recovery.status === "failed"
            ? recovery.failureReason ??
              recovery.errorMessage ??
              "Recovery attempt failed"
            : recovery.status === "success" || recovery.status === "RevivePay"
              ? `RevivePay ₹${recovery.RevivePayAmount.toLocaleString(
                  "en-IN"
                )}`
              : null,

        state:
          recovery.status === "failed"
            ? "failure"
            : recovery.status === "success" || recovery.status === "RevivePay"
              ? "success"
              : "pending",
      });

      if (recovery.paymentUrl) {
        timeline.push({
          time: new Date(
            recovery.updatedAt
          ).toISOString(),

          label:
            `Payment link created for attempt #${attemptNumber}`,

          detail:
            recovery.razorpayPaymentLinkId ??
            null,

          state: "success",
        });
      }

      if (recovery.emailSent) {
        timeline.push({
          time: recovery.emailSentAt
            ? new Date(
                recovery.emailSentAt
              ).toISOString()
            : new Date(
                recovery.updatedAt
              ).toISOString(),

          label:
            `Recovery email sent for attempt #${attemptNumber}`,

          detail:
            recovery.emailMessageId ??
            null,

          state: "success",
        });
      } else if (recovery.emailError) {
        timeline.push({
          time: new Date(
            recovery.updatedAt
          ).toISOString(),

          label:
            `Recovery email failed for attempt #${attemptNumber}`,

          detail: recovery.emailError,

          state: "failure",
        });
      }
    }

    for (const communication of communications) {
      const channelLabel =
        communication.channel === "call"
          ? "AI recovery call"
          : communication.channel ===
              "sms"
            ? "Recovery SMS"
            : "Recovery email";

      const status =
        communication.status;

      let state: TimelineState =
        "pending";

      if (
        status === "completed" ||
        status === "queued"
      ) {
        state = "success";
      }

      if (status === "failed") {
        state = "failure";
      }

      let detail: string | null = null;

      if (
        communication.channel ===
        "call"
      ) {
        if (
          communication.customerIntent
        ) {
          detail =
            `Intent: ${formatValue(
              communication.customerIntent
            )}`;
        }

        if (
          communication.paymentLinkSent
        ) {
          detail =
            detail
              ? `${detail} · Payment link sent`
              : "Payment link sent";
        }

        if (
          communication.requestedHumanSupport
        ) {
          detail =
            detail
              ? `${detail} · Human support requested`
              : "Human support requested";
        }
      } else if (
        communication.recipient
      ) {
        detail =
          communication.recipient;
      }

      timeline.push({
        time: new Date(
          communication.createdAt
        ).toISOString(),

        label: channelLabel,

        detail,

        state,
      });

      if (
        communication.channel ===
          "call" &&
        communication.endedAt
      ) {
        timeline.push({
          time: new Date(
            communication.endedAt
          ).toISOString(),

          label: "AI recovery call ended",

          detail:
            communication.resolution
              ? formatValue(
                  communication.resolution
                )
              : null,

          state:
            communication.status ===
            "failed"
              ? "failure"
              : "success",
        });
      }
    }

    timeline.sort(
      (a, b) =>
        new Date(a.time).getTime() -
        new Date(b.time).getTime()
    );

    const recoveryAttemptsUsed =
      recoveryAttempts.length;

    const communicationHistory =
      communications.map(
        (communication) => ({
          id:
            communication._id.toString(),

          recoveryAttemptId:
            communication.recoveryAttemptId
              ? communication.recoveryAttemptId.toString()
              : null,

          channel:
            communication.channel,

          provider:
            communication.provider,

          providerId:
            communication.providerId ??
            null,

          status:
            communication.status,

          recipient:
            communication.recipient ??
            null,

          message:
            communication.message ??
            null,

          paymentLinkSent:
            communication.paymentLinkSent ??
            false,

          customerIntent:
            communication.customerIntent ??
            null,

          problem:
            (communication as { problem?: string | null })
              .problem ??
            null,

          sentiment:
            communication.sentiment ??
            null,

          requestedHumanSupport:
            communication.requestedHumanSupport ??
            false,

          followUpRequired:
            communication.followUpRequired ??
            false,

          resolution:
            communication.resolution ??
            null,

          transcript:
            Array.isArray(
              communication.transcript
            )
              ? communication.transcript.map(
                  (item) => ({
                    speaker:
                      item.speaker,

                    text:
                      item.text,

                    timestamp:
                      item.timestamp,
                  })
                )
              : [],

          startedAt:
            communication.startedAt ??
            null,

          endedAt:
            communication.endedAt ??
            null,

          failureReason:
            communication.failureReason ??
            null,

          createdAt:
            communication.createdAt,

          updatedAt:
            communication.updatedAt,
        })
      );

    return NextResponse.json({
      case: {
        id: payment.paymentId,

        paymentId: payment.paymentId,

        customer: customer.name,

        customerId: customer.customerId,

        amount: payment.amount,

        failureReason:
          payment.failureReason ??
          "Unknown",

        strategy: attempt
          ? attempt.strategy.replace(
              /_/g,
              " "
            )
          : "Not yet analyzed",

        priority,

        attempts:
          recoveryAttemptsUsed,

        maxAttempts: MAX_ATTEMPTS,

        status,

        nextRetryAt: null,
      },

      customerIntelligence: {
        lifetimeValue:
          customer.lifetimeValue,

        plan: customer.plan,

        successfulPayments:
          customer.successfulPayments,

        failedPayments:
          customer.failedPayments,

        averagePayment,

        customerSince:
          new Date(
            customer.createdAt
          ).toLocaleDateString(
            "en-IN",
            {
              month: "short",
              year: "numeric",
            }
          ),
      },

      aiDecision: {
        strategy: attempt
          ? attempt.strategy.replace(
              /_/g,
              " "
            )
          : "Not yet analyzed",

        priority,

        recoveryProbability:
          attempt?.recoveryProbability != null
            ? attempt.recoveryProbability
            : 0,

        recommendedDelayMinutes: attempt?.recommendedDelayMinutes ?? 0,
        channel: attempt?.recommendedChannel ?? null,

        expectedRecovery:
          payment.amount,

        reason:
          attempt?.aiReason ??
          "This payment hasn't been analyzed by the AI agent yet. Run Execute Recovery to trigger analysis.",

        suggestedMessage:
          attempt?.suggestedMessage ??
          null,

        paymentUrl:
          attempt?.paymentUrl ?? null,

        status:
          attempt?.status ?? null,

        RevivePayAmount:
          attempt?.RevivePayAmount ?? 0,

        emailSent:
          attempt?.emailSent ?? false,

        emailSentAt:
          attempt?.emailSentAt ?? null,

        emailMessageId:
          attempt?.emailMessageId ?? null,

        emailError:
          attempt?.emailError ?? null,

        recoveryAttemptId:
          attempt?._id?.toString() ??
          null,

        recoveryAttemptsUsed,

        recoveryAttemptsRemaining:
          Math.max(
            0,
            MAX_ATTEMPTS -
              recoveryAttemptsUsed
          ),

        selectedChannel:
          latestCommunication?.channel ??
          null,

        communicationStatus:
          latestCommunication?.status ??
          null,

        communicationSummary,
      },

      recoveryAttempts:
        recoveryAttempts.map(
          (recovery, index) => ({
            id:
              recovery._id.toString(),

            attemptNumber:
              index + 1,

            strategy:
              recovery.strategy,

            status:
              recovery.status,

            paymentUrl:
              recovery.paymentUrl ??
              null,

            razorpayPaymentLinkId:
              recovery.razorpayPaymentLinkId ??
              null,

            recoveryOrderId:
              recovery.recoveryOrderId ??
              null,

            recoveryRazorpayPaymentId:
              recovery.recoveryRazorpayPaymentId ??
              null,

            RevivePayAmount:
              recovery.RevivePayAmount,

            emailSent:
              recovery.emailSent ??
              false,

            emailSentAt:
              recovery.emailSentAt ??
              null,

            emailMessageId:
              recovery.emailMessageId ??
              null,

            emailError:
              recovery.emailError ??
              null,

            attemptedAt:
              recovery.attemptedAt,

            failureReason:
              recovery.failureReason ??
              null,

            errorMessage:
              recovery.errorMessage ??
              null,
          })
        ),

      communications:
        communicationHistory,

      promises: promises.map((promise) => ({
        id: promise._id.toString(),
        channel: promise.channel,
        status: promise.status,
        promisedAmount: promise.promisedAmount,
        dueAt: promise.dueAt,
        promisedAt: promise.promisedAt,
        fulfilledAt: promise.fulfilledAt ?? null,
        brokenAt: promise.brokenAt ?? null,
        notes: promise.notes ?? null,
        customerIntent: promise.customerIntent ?? null,
      })),

      communicationSummary,

      decisionTrace,

      timeline,
    });
  } catch (error) {
    console.error(
      "GET /api/recovery-cases/[caseId] error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to fetch recovery case",
      },
      {
        status: 500,
      }
    );
  }
}

function derivePriority(
  riskLevel:
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | undefined,

  amount: number
):
  | "Low"
  | "Medium"
  | "High"
  | "Critical" {
  if (
    riskLevel === "HIGH" &&
    amount >= 100000
  ) {
    return "Critical";
  }

  if (riskLevel === "HIGH") {
    return "High";
  }

  if (riskLevel === "MEDIUM") {
    return "Medium";
  }

  if (riskLevel === "LOW") {
    return "Low";
  }

  return "Medium";
}

function deriveStatus(
  recoveryStatus: string,

  attemptStatus:
    | string
    | undefined
):
  | "pending"
  | "scheduled"
  | "in_progress"
  | "escalated"
  | "success" {
  if (
    recoveryStatus ===
    "RevivePay"
  ) {
    return "success";
  }

  if (
    recoveryStatus ===
    "unrecoverable"
  ) {
    return "escalated";
  }

  if (
    recoveryStatus ===
    "in_progress"
  ) {
    return attemptStatus ===
      "pending"
      ? "scheduled"
      : "in_progress";
  }

  return "pending";
}

function formatEventLabel(
  event: string
): string {
  return event
    .replace(/[._]/g, " ")
    .replace(
      /\b\w/g,
      (c) => c.toUpperCase()
    );
}

function formatValue(
  value: string
): string {
  return value
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (c) => c.toUpperCase()
    );
}