import { connectDB } from "@/lib/mongodb";

import Customer from "@/models/Customer";
import Payment from "@/models/Payment";
import RecoveryAttempt from "@/models/RecoveryAttempt";
import RecoveryCommunication from "@/models/RecoveryCommunication";

interface StartRecoveryCallInput {
  paymentId: string;
  customerId: string;
  recoveryAttemptId: string;
}

export async function startRecoveryCall(
  input: StartRecoveryCallInput
) {
  await connectDB();

  const {
    paymentId,
    customerId,
    recoveryAttemptId,
  } = input;

  const existingCall =
    await RecoveryCommunication.findOne({
      paymentId,
      recoveryAttemptId,
      channel: "call",
      status: {
        $in: [
          "pending",
          "initiated",
          "ringing",
          "answered",
          "in_progress",
        ],
      },
    }).sort({
      createdAt: -1,
    });

  if (existingCall) {
    return {
      success: true,
      simulated: true,
      message: "AI call is already in progress.",
      communicationId:
        existingCall._id.toString(),
      callId:
        existingCall.providerId ?? null,
    };
  }

  const customer =
    await Customer.findOne({
      customerId,
    }).lean();

  const payment =
    await Payment.findOne({
      paymentId,
    }).lean();

  const attempt =
    await RecoveryAttempt.findById(
      recoveryAttemptId
    ).lean();

  if (!customer) {
    throw new Error("Customer not found.");
  }

  if (!payment) {
    throw new Error("Payment not found.");
  }

  if (!attempt) {
    throw new Error("Recovery attempt not found.");
  }

  if (payment.recoveryStatus === "recovered") {
    throw new Error(
      "Payment has already been recovered."
    );
  }

  const amount = payment.amount;
  const currency =
    payment.currency || "INR";

  const greeting =
    `Hello ${customer.name}. This is RecoverAI calling regarding your recent payment of ${amount} ${currency}. Your payment could not be completed.`;

  const question =
    "Could you please tell me what problem you faced while making the payment?";

  const callId =
    `SIM_CALL_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;

  const communication =
    await RecoveryCommunication.create({
      paymentId,
      customerId,
      recoveryAttemptId,

      channel: "call",

      status: "in_progress",

      provider: "other",

      providerId: callId,

      recipient:
        customer.phone ?? null,

      message: greeting,

      transcript: [
        {
          speaker: "agent",
          text: greeting,
          timestamp: new Date(),
        },
        {
          speaker: "agent",
          text: question,
          timestamp: new Date(),
        },
      ],

      requestedHumanSupport: false,

      followUpRequired: false,

      paymentLinkSent: false,

      duration: 0,

      startedAt: new Date(),

      endedAt: null,

      failureReason: null,

      turnCount: 0,

      metadata: {
        simulated: true,
        maxTurns: 6,
        paymentUrl:
          attempt.paymentUrl ?? null,
      },
    });

  return {
    success: true,

    simulated: true,

    message:
      "Simulated AI recovery call started.",

    communicationId:
      communication._id.toString(),

    callId,

    greeting,

    question,

    customerName:
      customer.name,

    customerPhone:
      customer.phone ?? null,
  };
}