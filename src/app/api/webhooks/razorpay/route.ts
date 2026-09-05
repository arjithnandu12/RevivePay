import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";

import Payment from "@/models/Payment";
import Customer from "@/models/Customer";
import RecoveryAttempt from "@/models/RecoveryAttempt";
import WebhookEvent from "@/models/webhookEvent";

import { runRecoveryEngine } from "@/lib/recovery-engine";
import { recordAuditEvent } from "@/lib/audit";
import PromiseToPay from "@/models/PromiseToPay";

type RazorpayPayment = {
  id: string;

  order_id?: string | null;

  payment_link_id?: string | null;

  amount?: number;

  currency?: string;

  notes?: Record<string, unknown> | null;

  error_code?: string | null;

  error_description?: string | null;

  error_reason?: string | null;

  error_source?: string | null;

  error_step?: string | null;
};

type RazorpayPaymentLink = {
  id?: string;

  notes?: Record<string, unknown> | null;
};

const MAX_RECOVERY_ATTEMPTS = 3;

function verifySignature(
  body: string,
  signature: string
): boolean {
  const secret =
    process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error(
      "RAZORPAY_WEBHOOK_SECRET is not configured."
    );
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  if (expected.length !== signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}

async function markWebhookProcessed(
  eventId: string,
  paymentId?: string
) {
  await WebhookEvent.updateOne(
    { eventId },
    {
      $set: {
        status: "processed",

        processedAt: new Date(),

        ...(paymentId
          ? {
              paymentId,
            }
          : {}),
      },

      $unset: {
        lastError: 1,
      },
    }
  );
}

async function markWebhookFailed(
  eventId: string,
  error: unknown
) {
  await WebhookEvent.updateOne(
    { eventId },
    {
      $set: {
        status: "failed",

        lastError:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
    }
  );
}

function getInternalPaymentId(
  notes?: Record<string, unknown> | null
): string | null {
  if (!notes) {
    return null;
  }

  const value =
    notes.paymentId ??
    notes.payment_id ??
    notes.recoveryPaymentId ??
    notes.recovery_payment_id;

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  return value.trim();
}

function isRecoveryPayment(
  payment?: RazorpayPayment | null,
  paymentLink?: RazorpayPaymentLink | null
): boolean {
  const paymentRecovery = String(
    payment?.notes?.recovery ?? ""
  ).toLowerCase();

  const linkRecovery = String(
    paymentLink?.notes?.recovery ?? ""
  ).toLowerCase();

  return (
    paymentRecovery === "true" ||
    linkRecovery === "true"
  );
}

async function findRecoveryAttempt({
  razorpayPayment,
  razorpayPaymentLink,
}: {
  razorpayPayment: RazorpayPayment;

  razorpayPaymentLink?:
    | RazorpayPaymentLink
    | null;
}) {
  const paymentLinkId =
    razorpayPaymentLink?.id ??
    razorpayPayment.payment_link_id ??
    null;

  const recoveryRazorpayPaymentId =
    razorpayPayment.id;

  const orderId =
    razorpayPayment.order_id ??
    null;

  const internalPaymentId =
    getInternalPaymentId(
      razorpayPayment.notes
    );

  const linkPaymentId =
    getInternalPaymentId(
      razorpayPaymentLink?.notes
    );

  const originalPaymentId =
    internalPaymentId ??
    linkPaymentId ??
    null;

  if (paymentLinkId) {
    const attempt =
      await RecoveryAttempt.findOne({
        razorpayPaymentLinkId:
          paymentLinkId,
      });

    if (attempt) {
      console.log(
        "RecoveryAttempt found by Payment Link ID:",
        {
          recoveryAttemptId:
            attempt._id.toString(),

          paymentLinkId,
        }
      );

      return attempt;
    }
  }

 

  const byRecoveryPaymentId =
    await RecoveryAttempt.findOne({
      recoveryRazorpayPaymentId,
    });

  if (byRecoveryPaymentId) {
    console.log(
      "RecoveryAttempt found by Razorpay Payment ID:",
      {
        recoveryAttemptId:
          byRecoveryPaymentId._id.toString(),

        recoveryRazorpayPaymentId,
      }
    );

    return byRecoveryPaymentId;
  }

  

  if (orderId) {
    const byOrder =
      await RecoveryAttempt.findOne({
        recoveryOrderId: orderId,
      });

    if (byOrder) {
      console.log(
        "RecoveryAttempt found by Razorpay Order ID:",
        {
          recoveryAttemptId:
            byOrder._id.toString(),

          orderId,
        }
      );

      return byOrder;
    }
  }

  if (originalPaymentId) {
    const activeAttempt =
      await RecoveryAttempt.findOne({
        paymentId:
          originalPaymentId,

        status: {
          $in: [
            "pending",
            "processing",
          ],
        },
      }).sort({
        createdAt: -1,
      });

    if (activeAttempt) {
      console.log(
        "ACTIVE RecoveryAttempt found:",
        {
          recoveryAttemptId:
            activeAttempt._id.toString(),

          paymentId:
            originalPaymentId,

          status:
            activeAttempt.status,

          createdAt:
            activeAttempt.get("createdAt"),
        }
      );

      return activeAttempt;
    }
  }

  if (originalPaymentId) {
    const latestAttempt =
      await RecoveryAttempt.findOne({
        paymentId:
          originalPaymentId,
      }).sort({
        createdAt: -1,
      });

    if (latestAttempt) {
      console.log(
        "Latest RecoveryAttempt found:",
        {
          recoveryAttemptId:
            latestAttempt._id.toString(),

          paymentId:
            originalPaymentId,

          status:
            latestAttempt.status,

          createdAt:
            latestAttempt.get("createdAt"),
        }
      );

      return latestAttempt;
    }
  }

  console.warn(
    "No RecoveryAttempt found",
    {
      paymentLinkId,

      recoveryRazorpayPaymentId,

      orderId,

      originalPaymentId,
    }
  );

  return null;
}

async function completeRecovery({
  eventId,
  event,
  razorpayPayment,
  razorpayPaymentLink,
}: {
  eventId: string;

  event: string;

  razorpayPayment: RazorpayPayment;

  razorpayPaymentLink?:
    | RazorpayPaymentLink
    | null;
}) {
  const recoveryRazorpayPaymentId =
    razorpayPayment.id;

  const paymentLinkId =
    razorpayPaymentLink?.id ??
    razorpayPayment.payment_link_id ??
    null;

  const orderId =
    razorpayPayment.order_id ??
    null;

  console.log(
    "CHECKING RECOVERY PAYMENT",
    {
      event,

      recoveryRazorpayPaymentId,

      paymentLinkId,

      orderId,

      notes:
        razorpayPayment.notes ??
        null,
    }
  );

  const recoveryAttempt =
    await findRecoveryAttempt({
      razorpayPayment,

      razorpayPaymentLink,
    });

  if (!recoveryAttempt) {
    console.log(
      "RecoveryAttempt not found. Ignoring."
    );

    await markWebhookProcessed(
      eventId
    );

    return {
      success: true,

      ignored: true,

      event,
    };
  }

  const originalPayment =
    await Payment.findOne({
      paymentId:
        recoveryAttempt.paymentId,
    }).lean();

  if (!originalPayment) {
    throw new Error(
      `Original payment ${recoveryAttempt.paymentId} not found.`
    );
  }

 

  if (
    originalPayment.recoveryStatus ===
    "RevivePay"
  ) {
    await markWebhookProcessed(
      eventId,

      originalPayment.paymentId
    );

    return {
      success: true,

      duplicate: true,

      RevivePay: true,

      paymentId:
        originalPayment.paymentId,
    };
  }

 

  const RevivePayAmount =
    typeof razorpayPayment.amount ===
    "number"
      ? razorpayPayment.amount / 100
      : originalPayment.amount;

  

  const session =
    await mongoose.startSession();

  let alreadyRevivePay = false;

  try {
    await session.withTransaction(
      async () => {
       

        const paymentToRecover =
          await Payment.findOneAndUpdate(
            {
              paymentId:
                originalPayment.paymentId,

              recoveryStatus: {
                $ne: "RevivePay",
              },
            },
            {
              $set: {
                recoveryStatus:
                  "RevivePay",

                recoveryAction:
                  recoveryAttempt.strategy,
              },
            },
            {
              session,

              returnDocument:
                "after",
            }
          );

        if (!paymentToRecover) {
          alreadyRevivePay = true;

          return;
        }

       

        const updatedAttempt =
          await RecoveryAttempt.findOneAndUpdate(
            {
              _id:
                recoveryAttempt._id,

              status: {
                $ne: "success",
              },
            },
            {
              $set: {
                status: "RevivePay",

                RevivePayAmount,

                completedAt: new Date(),

                razorpayOrderId: orderId,

                razorpayPaymentId: recoveryRazorpayPaymentId,

                recoveryRazorpayPaymentId,

                ...(paymentLinkId
                  ? {
                      razorpayPaymentLinkId:
                        paymentLinkId,
                    }
                  : {}),

                ...(orderId
                  ? {
                      recoveryOrderId:
                        orderId,
                    }
                  : {}),
              },

              $unset: {
                errorMessage: 1,
              },
            },
            {
              session,

              returnDocument:
                "after",
            }
          );

        if (!updatedAttempt) {
          const existingAttempt =
            await RecoveryAttempt.findById(
              recoveryAttempt._id
            )
              .session(session)
              .lean();

          if (
            existingAttempt?.status !==
            "success"
          ) {
            throw new Error(
              "Failed to mark RecoveryAttempt as successful."
            );
          }
        }

        await RecoveryAttempt.updateMany(
          {
            paymentId: originalPayment.paymentId,
            _id: { $ne: recoveryAttempt._id },
            status: { $in: ["pending", "processing"] },
          },
          {
            $set: {
              status: "cancelled",
              completedAt: new Date(),
              errorMessage: "Cancelled because another recovery attempt succeeded.",
            },
          },
          { session }
        );

        await PromiseToPay.updateMany(
          { paymentId: originalPayment.paymentId, status: "active" },
          { $set: { status: "fulfilled", fulfilledAt: new Date() } },
          { session }
        );

        await recordAuditEvent({
          paymentId: originalPayment.paymentId,
          recoveryAttemptId: recoveryAttempt._id.toString(),
          actor: "razorpay",
          layer: "razorpay",
          action: "recovery_payment_confirmed",
          reason: "Razorpay payment webhook verified.",
          metadata: {
            razorpayPaymentId: razorpayPayment.id,
            RevivePayAmount,
          },
        });

    

        const updatedCustomer =
          await Customer.findOneAndUpdate(
            {
              customerId:
                originalPayment.customerId,
            },
            {
              $inc: {
                successfulPayments: 1,

                lifetimeValue:
                  RevivePayAmount,
              },
            },
            {
              session,

              returnDocument:
                "after",
            }
          );

        if (!updatedCustomer) {
          throw new Error(
            `Customer ${originalPayment.customerId} not found.`
          );
        }

        console.log(
          "Customer recovery aggregate updated:",
          {
            customerId:
              updatedCustomer.customerId,

            successfulPayments:
              updatedCustomer.successfulPayments,

            lifetimeValue:
              updatedCustomer.lifetimeValue,
          }
        );
      }
    );
  } finally {
    await session.endSession();
  }

  if (alreadyRevivePay) {
    await markWebhookProcessed(
      eventId,

      originalPayment.paymentId
    );

    return {
      success: true,

      duplicate: true,

      RevivePay: true,

      paymentId:
        originalPayment.paymentId,
    };
  }

  await markWebhookProcessed(
    eventId,

    originalPayment.paymentId
  );

  console.log(
    "======================================"
  );

  console.log(
    "RECOVERY SUCCESSFULLY RECORDED"
  );

  console.log({
    internalPaymentId:
      originalPayment.paymentId,

    originalRazorpayPaymentId:
      originalPayment.razorpayPaymentId,

    recoveryRazorpayPaymentId,

    paymentLinkId,

    recoveryOrderId:
      orderId,

    RevivePayAmount,
  });

  console.log(
    "======================================"
  );

  return {
    success: true,

    eventId,

    RevivePay: true,

    paymentId:
      originalPayment.paymentId,

    recoveryAttemptId:
      recoveryAttempt._id.toString(),

    RevivePayAmount,

    recoveryRazorpayPaymentId,

    paymentLinkId,

    recoveryOrderId:
      orderId,
  };
}

async function handleFailedRecovery({
  eventId,
  razorpayPayment,
}: {
  eventId: string;

  razorpayPayment: RazorpayPayment;
}) {
  console.log(
    "THIS IS A RECOVERY PAYMENT FAILURE"
  );

  const internalPaymentId =
    getInternalPaymentId(
      razorpayPayment.notes
    );

  if (!internalPaymentId) {
    console.error(
      "Recovery payment has no original paymentId."
    );

    await markWebhookProcessed(
      eventId
    );

    return {
      success: true,

      recoveryPaymentFailed: true,

      ignored: true,

      reason:
        "Missing original paymentId in recovery notes.",
    };
  }

 

  const recoveryAttempt =
    await findRecoveryAttempt({
      razorpayPayment,

      razorpayPaymentLink: null,
    });

  if (!recoveryAttempt) {
    console.warn(
      "RecoveryAttempt not found",
      {
        internalPaymentId,

        recoveryRazorpayPaymentId:
          razorpayPayment.id,

        recoveryOrderId:
          razorpayPayment.order_id,
      }
    );

    await markWebhookProcessed(
      eventId,

      internalPaymentId
    );

    return {
      success: true,

      recoveryPaymentFailed: true,

      ignored: true,

      reason:
        "RecoveryAttempt not found.",
    };
  }

  const originalPayment =
    await Payment.findOne({
      paymentId:
        recoveryAttempt.paymentId,
    });

  if (!originalPayment) {
    throw new Error(
      `Original payment ${recoveryAttempt.paymentId} not found.`
    );
  }

 

  const failureReason =
    razorpayPayment.error_reason ??
    razorpayPayment.error_description ??
    razorpayPayment.error_code ??
    "payment_failed";

  const failureCode =
    razorpayPayment.error_code ??
    "UNKNOWN";

  const failureSource =
    razorpayPayment.error_source ??
    "UNKNOWN";

  const failureStep =
    razorpayPayment.error_step ??
    "UNKNOWN";

 

  const totalAttempts =
    await RecoveryAttempt.countDocuments({
      paymentId:
        recoveryAttempt.paymentId,
    });

  const currentAttemptNumber =
    totalAttempts;

  const nextAttemptNumber =
    totalAttempts + 1;

  console.log(
    "RECOVERY PAYMENT FAILED",
    {
      recoveryAttemptId:
        recoveryAttempt._id.toString(),

      currentAttemptNumber,

      originalPaymentId:
        recoveryAttempt.paymentId,

      recoveryRazorpayPaymentId:
        razorpayPayment.id,

      recoveryOrderId:
        razorpayPayment.order_id,

      failureReason,

      failureCode,

      failureSource,

      failureStep,

      totalAttempts,

      maxAttempts:
        MAX_RECOVERY_ATTEMPTS,
    }
  );

  const updatedAttempt =
    await RecoveryAttempt.findOneAndUpdate(
      {
        _id:
          recoveryAttempt._id,

        status: {
          $in: [
            "pending",
            "processing",
          ],
        },
      },
      {
        $set: {
          status: "failed",

          completedAt: new Date(),

          recoveryRazorpayPaymentId:
            razorpayPayment.id,

          ...(razorpayPayment.order_id
            ? {
                recoveryOrderId:
                  razorpayPayment.order_id,
              }
            : {}),

          errorMessage:
            `${failureReason} | code=${failureCode} | source=${failureSource} | step=${failureStep}`,
        },
      },
      {
        returnDocument:
          "after",
      }
    );

 

  if (!updatedAttempt) {
    console.log(
      "Recovery attempt was already processed."
    );

    console.log({
      recoveryAttemptId:
        recoveryAttempt._id.toString(),

      status:
        recoveryAttempt.status,
    });

   

    if (
      originalPayment.recoveryStatus ===
      "RevivePay"
    ) {
      await markWebhookProcessed(
        eventId,

        recoveryAttempt.paymentId
      );

      return {
        success: true,

        duplicate: true,

        RevivePay: true,

        recoveryPaymentFailed: true,

        paymentId:
          recoveryAttempt.paymentId,

        recoveryAttemptId:
          recoveryAttempt._id.toString(),
      };
    }

   

    const latestTotalAttempts =
      await RecoveryAttempt.countDocuments({
        paymentId:
          recoveryAttempt.paymentId,
      });

    if (
      latestTotalAttempts >=
      MAX_RECOVERY_ATTEMPTS
    ) {
      originalPayment.recoveryStatus =
        "unrecoverable";

      originalPayment.recoveryAction =
        "no_action";

      await originalPayment.save();

      await markWebhookProcessed(
        eventId,

        recoveryAttempt.paymentId
      );

      console.log(
        "MAXIMUM RECOVERY ATTEMPTS ALREADY REACHED"
      );

      return {
        success: true,

        duplicate: true,

        recoveryPaymentFailed: true,

        finalFailure: true,

        unrecoverable: true,

        paymentId:
          recoveryAttempt.paymentId,

        totalAttempts:
          latestTotalAttempts,

        maxAttempts:
          MAX_RECOVERY_ATTEMPTS,
      };
    }

   

    await markWebhookProcessed(
      eventId,

      recoveryAttempt.paymentId
    );

    return {
      success: true,

      duplicate: true,

      recoveryPaymentFailed: true,

      paymentId:
        recoveryAttempt.paymentId,

      recoveryAttemptId:
        recoveryAttempt._id.toString(),

      retryScheduled: false,
      message: "Recovery attempt failed. Case remains retryable after settlement; no automatic retry was started.",
    };
  }

  console.log(
    "RecoveryAttempt marked as failed",
    {
      recoveryAttemptId:
        updatedAttempt._id.toString(),

      currentAttemptNumber,

      totalAttempts,
    }
  );

  if (
    totalAttempts >=
    MAX_RECOVERY_ATTEMPTS
  ) {
    if (
      originalPayment.recoveryStatus !==
      "RevivePay"
    ) {
      originalPayment.recoveryStatus =
        "unrecoverable";

      originalPayment.recoveryAction =
        "no_action";

      await originalPayment.save();
    }

    await markWebhookProcessed(
      eventId,

      recoveryAttempt.paymentId
    );

    console.log(
      "MAXIMUM RECOVERY ATTEMPTS REACHED"
    );

    console.log({
      paymentId:
        recoveryAttempt.paymentId,

      attempts:
        totalAttempts,

      maxAttempts:
        MAX_RECOVERY_ATTEMPTS,

      recoveryStatus:
        "unrecoverable",
    });

    return {
      success: true,

      eventId,

      recoveryPaymentFailed: true,

      finalFailure: true,

      unrecoverable: true,

      paymentId:
        recoveryAttempt.paymentId,

      recoveryAttemptId:
        recoveryAttempt._id.toString(),

      failedAttemptNumber:
        currentAttemptNumber,

      totalAttempts,

      maxAttempts:
        MAX_RECOVERY_ATTEMPTS,

      failureReason,

      failureCode,

      failureSource,

      failureStep,
    };
  }

  if (
    originalPayment.recoveryStatus !==
    "RevivePay"
  ) {
    originalPayment.recoveryStatus =
      "pending";

    originalPayment.recoveryAction =
      "pending";

    await originalPayment.save();
  }

  await markWebhookProcessed(
    eventId,

    recoveryAttempt.paymentId
  );

  console.log(
    "======================================"
  );

  console.log(
    "RECOVERY FAILURE RECORDED"
  );

  console.log({
    recoveryAttemptId:
      recoveryAttempt._id.toString(),

    failedAttemptNumber:
      currentAttemptNumber,

    nextAttemptNumber:
      nextAttemptNumber,

    originalPaymentId:
      recoveryAttempt.paymentId,

    recoveryRazorpayPaymentId:
      razorpayPayment.id,

    recoveryOrderId:
      razorpayPayment.order_id,

    failureReason,

    failureCode,

    failureSource,

    failureStep,
  });

  console.log(
    "======================================"
  );

  return {
    success: true,

    eventId,

    recoveryPaymentFailed: true,

    paymentId:
      recoveryAttempt.paymentId,

    recoveryAttemptId:
      recoveryAttempt._id.toString(),

    failedAttemptNumber:
      currentAttemptNumber,

    nextAttemptNumber:
      nextAttemptNumber,

    totalAttempts,

    maxAttempts:
      MAX_RECOVERY_ATTEMPTS,

    attemptsRemaining:
      MAX_RECOVERY_ATTEMPTS -
      totalAttempts,

    recoveryRazorpayPaymentId:
      razorpayPayment.id,

    recoveryOrderId:
      razorpayPayment.order_id ??
      null,

    failureReason,

    failureCode,

    failureSource,

    failureStep,

    retryScheduled: false,

    message:
      "Recovery attempt failed. Retry remains available after settlement; no automatic retry was started.",
  };
}

export async function POST(
  request: NextRequest
) {
  let eventId: string | null = null;

  try {
    await connectDB();

  

    const body =
      await request.text();

    const signature =
      request.headers.get(
        "x-razorpay-signature"
      );

    eventId =
      request.headers.get(
        "x-razorpay-event-id"
      );

    if (!signature) {
      return NextResponse.json(
        {
          success: false,

          error: "Missing Razorpay signature. Configure Razorpay's webhook secret and send x-razorpay-signature.",
        },
        {
          status: 400,
        }
      );
    }

    if (!eventId) {
      return NextResponse.json(
        {
          success: false,

          error: "Missing Razorpay event ID. Include x-razorpay-event-id for webhook idempotency.",
        },
        {
          status: 400,
        }
      );
    }

    

    if (
      !verifySignature(
        body,
        signature
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          error: "Invalid Razorpay webhook signature. Check RAZORPAY_WEBHOOK_SECRET and the raw request body.",
        },
        {
          status: 400,
        }
      );
    }

   

    const payload =
      JSON.parse(body);

    const event =
      payload.event as string;

    const razorpayPayment =
      payload.payload?.payment
        ?.entity as
        | RazorpayPayment
        | undefined;

    const razorpayPaymentLink =
      payload.payload?.payment_link
        ?.entity as
        | RazorpayPaymentLink
        | undefined;

    const razorpayPaymentId =
      razorpayPayment?.id ??
      null;

    

    console.log(
      "RAZORPAY WEBHOOK"
    );

    console.log({
      event,

      eventId,

      razorpayPaymentId,

      paymentLinkId:
        razorpayPaymentLink?.id ??
        razorpayPayment?.payment_link_id ??
        null,

      orderId:
        razorpayPayment?.order_id ??
        null,

      paymentNotes:
        razorpayPayment?.notes ??
        null,

      linkNotes:
        razorpayPaymentLink?.notes ??
        null,
    });

    console.log(
      "======================================"
    );

    

    const existingEvent =
      await WebhookEvent.findOne({
        eventId,
      }).lean();

    if (existingEvent) {
      if (
        existingEvent.status ===
        "processed"
      ) {
        console.log(
          "DUPLICATE PROCESSED WEBHOOK",
          eventId
        );

        return NextResponse.json({
          success: true,

          duplicate: true,
        });
      }

      if (
        existingEvent.status ===
        "processing"
      ) {
        console.log(
          "⏳ WEBHOOK ALREADY PROCESSING",
          eventId
        );

        return NextResponse.json({
          success: true,

          processing: true,
        });
      }

    

      await WebhookEvent.updateOne(
        {
          eventId,
        },
        {
          $set: {
            status: "processing",

            processingStartedAt:
              new Date(),
          },

          $unset: {
            lastError: 1,
          },
        }
      );
    } else {
      try {
        await WebhookEvent.create({
          eventId,

          event,

          paymentId:
            razorpayPaymentId ??
            undefined,

          status: "processing",

          receivedAt:
            new Date(),

          processingStartedAt:
            new Date(),
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
          return NextResponse.json({
            success: true,

            duplicate: true,
          });
        }

        throw error;
      }
    }

   

    if (
      event ===
      "payment_link.paid"
    ) {
      if (
        !razorpayPaymentLink
      ) {
        throw new Error(
          "Razorpay payment link entity missing."
        );
      }

      const recovery =
        String(
          razorpayPaymentLink
            .notes?.recovery ??
            ""
        ).toLowerCase();

      if (
        recovery !==
        "true"
      ) {
        await markWebhookProcessed(
          eventId
        );

        return NextResponse.json({
          success: true,

          ignored: true,

          event,
        });
      }

      if (
        razorpayPayment
      ) {
        const result =
          await completeRecovery({
            eventId,

            event,

            razorpayPayment,

            razorpayPaymentLink,
          });

        return NextResponse.json(
          result
        );
      }

      await markWebhookProcessed(
        eventId
      );

      return NextResponse.json({
        success: true,

        event,

        paymentLinkPaid: true,
      });
    }

    

    if (
      event ===
      "payment.captured"
    ) {
      if (
        !razorpayPayment
      ) {
        throw new Error(
          "Razorpay payment entity missing."
        );
      }

      const recovery =
        isRecoveryPayment(
          razorpayPayment,
          razorpayPaymentLink
        );

      if (!recovery) {
        await markWebhookProcessed(
          eventId,

          razorpayPaymentId ??
            undefined
        );

        console.log(
          "Normal payment.captured ignored."
        );

        return NextResponse.json({
          success: true,

          ignored: true,

          event,
        });
      }

      console.log(
        "RECOVERY PAYMENT CAPTURED"
      );

      const result =
        await completeRecovery({
          eventId,

          event,

          razorpayPayment,

          razorpayPaymentLink,
        });

      return NextResponse.json(
        result
      );
    }

    if (event === "refund.processed" || event === "refund.created") {
      const refundPaymentId = payload.payload?.refund?.entity?.payment_id as string | undefined;
      if (refundPaymentId) {
        const recoveryAttempt = await RecoveryAttempt.findOne({ recoveryRazorpayPaymentId: refundPaymentId }).lean();
        const payment = await Payment.findOne(recoveryAttempt ? { paymentId: recoveryAttempt.paymentId } : { razorpayPaymentId: refundPaymentId });
        if (payment) {
          payment.recoveryStatus = "refunded";
          payment.recoveryAction = "refund_processed";
          await payment.save();
          await RecoveryAttempt.updateMany({ paymentId: payment.paymentId, status: { $in: ["pending", "processing"] } }, { $set: { status: "cancelled", completedAt: new Date(), errorMessage: "Recovery stopped because payment was refunded." } });
        }
      }
      await markWebhookProcessed(eventId, refundPaymentId);
      return NextResponse.json({ success: true, event, refunded: true });
    }

    

    if (
      event ===
      "payment.authorized"
    ) {
      await markWebhookProcessed(
        eventId,

        razorpayPaymentId ??
          undefined
      );

      console.log(
        "Payment authorized."
      );

      return NextResponse.json({
        success: true,

        event,

        authorized: true,
      });
    }

  

    if (
      event ===
      "payment.failed"
    ) {
      if (
        !razorpayPayment
      ) {
        throw new Error(
          "Razorpay payment entity missing."
        );
      }

    

      const recovery =
        isRecoveryPayment(
          razorpayPayment,
          razorpayPaymentLink
        );

      console.log(
        "PAYMENT FAILED",
        {
          paymentId:
            razorpayPayment.id,

          orderId:
            razorpayPayment.order_id ??
            null,

          amount:
            razorpayPayment.amount ??
            null,

          currency:
            razorpayPayment.currency ??
            null,

          failureReason:
            razorpayPayment.error_reason ??
            razorpayPayment.error_description ??
            razorpayPayment.error_code ??
            "payment_failed",

          failureCode:
            razorpayPayment.error_code ??
            null,

          failureSource:
            razorpayPayment.error_source ??
            null,

          failureStep:
            razorpayPayment.error_step ??
            null,

          recovery,

          notes:
            razorpayPayment.notes ??
            null,
        }
      );

      

      if (recovery) {
        const result =
          await handleFailedRecovery({
            eventId,

            razorpayPayment,
          });

        return NextResponse.json(
          result
        );
      }

    

      const orderId =
        razorpayPayment.order_id;

      if (!orderId) {
        throw new Error(
          "Razorpay order ID missing."
        );
      }

      const originalRazorpayPaymentId =
        razorpayPayment.id;

    

      const paymentWithSameRazorpayId =
        await Payment.findOne({
          razorpayPaymentId:
            originalRazorpayPaymentId,
        }).lean();

      if (
        paymentWithSameRazorpayId
      ) {
        await markWebhookProcessed(
          eventId,

          paymentWithSameRazorpayId.paymentId
        );

        console.log(
          "Original payment failure already processed:",
          originalRazorpayPaymentId
        );

        return NextResponse.json({
          success: true,

          duplicate: true,
        });
      }

    

      const existingPayment =
        await Payment.findOne({
          orderId,
        });

      if (!existingPayment) {
        throw new Error(
          `Local payment not found for order ${orderId}.`
        );
      }

      if (
        !existingPayment.customerId
      ) {
        throw new Error(
          `Payment ${orderId} has no customerId.`
        );
      }

      const failureReason =
        razorpayPayment.error_reason ??
        razorpayPayment.error_description ??
        razorpayPayment.error_code ??
        "payment_failed";

      const failureCode =
        razorpayPayment.error_code ??
        null;

      const failureSource =
        razorpayPayment.error_source ??
        null;

      const failureStep =
        razorpayPayment.error_step ??
        null;

      await WebhookEvent.updateOne(
        {
          eventId,
        },
        {
          $set: {
            paymentId:
              existingPayment.paymentId,
          },
        }
      );

      const updatedPayment =
        await Payment.findOneAndUpdate(
          {
            orderId,
          },
          {
            $set: {
              razorpayPaymentId:
                originalRazorpayPaymentId,

              status: "failed",

              failureReason,

              failureCode,

              failureSource,

              failureStep,

              ...(typeof razorpayPayment.amount ===
              "number"
                ? {
                    amount:
                      razorpayPayment.amount /
                      100,
                  }
                : {}),

              ...(razorpayPayment.currency
                ? {
                    currency:
                      razorpayPayment.currency,
                  }
                : {}),
            },

            $inc: {
              attempts: 1,
            },
          },
          {
            returnDocument:
              "after",
          }
        );

      if (!updatedPayment) {
        throw new Error(
          `Failed to update payment ${orderId}.`
        );
      }

      const updatedCustomer =
        await Customer.findOneAndUpdate(
          {
            customerId:
              updatedPayment.customerId,
          },
          {
            $inc: {
              failedPayments: 1,
            },
          },
          {
            returnDocument:
              "after",
          }
        );

      if (!updatedCustomer) {
        throw new Error(
          `Customer ${updatedPayment.customerId} not found.`
        );
      }

      console.log(
        "Starting Recover-AI..."
      );

      const recoveryResult =
        await runRecoveryEngine(
          updatedPayment.paymentId
        );

      console.log(
        "RECOVERY ENGINE RESULT"
      );

      console.log(
        JSON.stringify(
          recoveryResult,
          null,
          2
        )
      );

      await markWebhookProcessed(
        eventId,

        updatedPayment.paymentId
      );

      return NextResponse.json({
        success: true,

        eventId,

        paymentId:
          originalRazorpayPaymentId,

        recovery:
          recoveryResult,
      });
    }

    await markWebhookProcessed(
      eventId,

      razorpayPaymentId ??
        undefined
    );

    console.log(
      "Ignored Razorpay event:",
      event
    );

    return NextResponse.json({
      success: true,

      ignored: true,

      event,
    });
  } catch (error) {
    console.error(
      "Razorpay webhook error:",
      error
    );

    try {
      if (eventId) {
        await markWebhookFailed(
          eventId,
          error
        );
      }
    } catch (dbError) {
      console.error(
        "Failed to update webhook status:",
        dbError
      );
    }

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Webhook processing failed",
      },
      {
        status: 500,
      }
    );
  }
}