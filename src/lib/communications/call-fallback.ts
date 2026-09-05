import { connectDB } from "@/lib/mongodb";

import RecoveryCommunication from "@/models/RecoveryCommunication";
import RecoveryAttempt from "@/models/RecoveryAttempt";

import {
  sendRecoverySMS,
} from "@/lib/communications/sms";

export async function handleCallFallback(
  communicationId: string
) {
  await connectDB();

  const communication =
    await RecoveryCommunication.findById(
      communicationId
    );

  if (!communication) {
    return;
  }

  if (
    communication.channel !==
    "call"
  ) {
    return;
  }

  if (
    communication.status !==
    "no_answer"
  ) {
    return;
  }

  const existingFallback =
    await RecoveryCommunication.findOne({
      paymentId:
        communication.paymentId,

      recoveryAttemptId:
        communication.recoveryAttemptId,

      channel: "sms",

      "metadata.fallbackForCall":
        communication._id.toString(),
    });

  if (existingFallback) {
    return;
  }

  const attempt =
    await RecoveryAttempt.findById(
      communication.recoveryAttemptId
    ).lean();

  if (!attempt?.paymentUrl) {
    return;
  }

  if (!communication.recipient) {
    return;
  }

  const message =
    `We tried to reach you regarding your failed payment. You can securely complete your payment here: ${attempt.paymentUrl}`;

  const sms =
    await sendRecoverySMS({
      to: communication.recipient,

      message,
    });

  await RecoveryCommunication.create({
    paymentId:
      communication.paymentId,

    customerId:
      communication.customerId,

    recoveryAttemptId:
      communication.recoveryAttemptId,

    channel: "sms",

    status: "queued",

    provider: "twilio",

    providerId:
      sms.id,

    recipient:
      communication.recipient,

    message,

    transcript: [],

    requestedHumanSupport: false,

    followUpRequired: false,

    paymentLinkSent: true,

    paymentLinkSentAt:
      new Date(),

    metadata: {
      fallbackForCall:
        communication._id.toString(),
    },
  });
}