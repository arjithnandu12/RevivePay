import {
  twilioClient,
  TWILIO_PHONE_NUMBER,
  getAppUrl,
} from "@/lib/twilio";

import { HydratedDocument } from "mongoose";

import { connectDB } from "@/lib/mongodb";

import RecoveryCommunication, {
  IRecoveryCommunication,
} from "@/models/RecoveryCommunication";

interface SendSMSInput {
  to: string;
  message: string;

  paymentId?: string;

  customerId?: string;

  recoveryAttemptId?: string;
}

export async function sendRecoverySMS({
  to,
  message,
  paymentId,
  customerId,
  recoveryAttemptId,
}: SendSMSInput) {

  if (!twilioClient) {
    throw new Error(
      "Twilio client is not configured."
    );
  }

  if (!TWILIO_PHONE_NUMBER) {
    throw new Error(
      "TWILIO_PHONE_NUMBER is not configured."
    );
  }

  if (!to) {
    throw new Error(
      "Customer phone number is required."
    );
  }

  if (!message.trim()) {
    throw new Error(
      "SMS message is required."
    );
  }

  

  let communication:
    | HydratedDocument<IRecoveryCommunication>
    | null = null;

 

  if (
    paymentId &&
    customerId
  ) {
    await connectDB();

    const created =
      await RecoveryCommunication.create({
        paymentId,

        customerId,

        recoveryAttemptId:
          recoveryAttemptId ?? undefined,

        channel: "sms",

        status: "pending",

        provider: "twilio",

        recipient: to,

        message,

        transcript: [],

        requestedHumanSupport:
          false,

        followUpRequired:
          false,

        paymentLinkSent:
          message.includes("http"),

        paymentLinkSentAt:
          message.includes("http")
            ? new Date()
            : null,
      });

   

    communication =
      Array.isArray(created)
        ? created[0] ?? null
        : created;
  }

 

  try {
    const sms =
      await twilioClient.messages.create({
        body: message,

        from: TWILIO_PHONE_NUMBER,

        to,

        statusCallback:
          `${getAppUrl().replace(
            /\/$/,
            ""
          )}/api/webhooks/twilio/sms/status` +
          (communication
            ? `?communicationId=${encodeURIComponent(
                communication._id.toString()
              )}`
            : ""),
      });

    
    if (communication) {
      communication.providerId =
        sms.sid;

      

      communication.status =
        "queued";

      await communication.save();
    }

    return {
      id: sms.sid,

      status: sms.status,

      communicationId:
        communication?._id.toString() ??
        undefined,
    };
  } catch (error) {
    

    if (communication) {
      communication.status =
        "failed";

      communication.failureReason =
        error instanceof Error
          ? error.message
          : "Failed to send SMS.";

      await communication.save();
    }

    throw error;
  }
}