import { NextRequest } from "next/server";

import VoiceResponse from "twilio/lib/twiml/VoiceResponse";

import { connectDB } from "@/lib/mongodb";

import Customer from "@/models/Customer";
import Payment from "@/models/Payment";
import RecoveryCommunication from "@/models/RecoveryCommunication";
import RecoveryAttempt from "@/models/RecoveryAttempt";

import {
  analyzeCallResponse,
} from "@/lib/communications/call-ai";

import {
  sendRecoverySMS,
} from "@/lib/communications/sms";

const DEFAULT_MAX_TURNS = 6;

export async function POST(
  request: NextRequest
) {
  const formData =
    await request.formData();

  const speech =
    String(
      formData.get("SpeechResult") ||
        ""
    ).trim();

  const communicationId =
    request.nextUrl.searchParams.get(
      "communicationId"
    );

  const response =
    new VoiceResponse();

  if (!communicationId) {
    response.say(
      {
        voice: "alice",
        language: "en-IN",
      },
      "I am sorry, there was a problem with your recovery case."
    );

    response.hangup();

    return twiml(response);
  }

  if (!speech) {
    response.say(
      {
        voice: "alice",
        language: "en-IN",
      },
      "I am sorry, I could not understand your response."
    );

    response.hangup();

    return twiml(response);
  }

  await connectDB();

  const communication =
    await RecoveryCommunication.findById(
      communicationId
    );

  if (!communication) {
    response.say(
      {
        voice: "alice",
        language: "en-IN",
      },
      "I am sorry, there was a problem with your recovery case."
    );

    response.hangup();

    return twiml(response);
  }

  const customer =
    await Customer.findOne({
      customerId:
        communication.customerId,
    }).lean();

  const payment =
    await Payment.findOne({
      paymentId:
        communication.paymentId,
    }).lean();

  if (!customer || !payment) {
    response.say(
      {
        voice: "alice",
        language: "en-IN",
      },
      "I am sorry, your payment information could not be found."
    );

    response.hangup();

    return twiml(response);
  }

  if (
    payment.recoveryStatus ===
    "recovered"
  ) {
    response.say(
      {
        voice: "alice",
        language: "en-IN",
      },
      "It looks like your payment has already been recovered. Thank you."
    );

    response.hangup();

    return twiml(response);
  }

 
  communication.transcript.push({
    speaker: "customer",

    text: speech,

    timestamp: new Date(),
  });

  communication.turnCount =
    (communication.turnCount || 0) + 1;

  await communication.save();

  const conversation =
    communication.transcript.map(
      (item) => ({
        speaker: item.speaker,

        text: item.text,
      })
    );

  const customerName =
    customer.name || "there";

  const result =
    await analyzeCallResponse({
      customerName,

      paymentAmount:
        payment.amount,

      currency:
        payment.currency,

      failureReason:
        payment.failureReason ??
        null,

      conversation,
    });

  communication.customerProblem =
    result.problem;

  communication.customerIntent =
    result.intent;

  communication.sentiment =
    result.sentiment;

  communication.requestedHumanSupport =
    result.requestedHumanSupport;

  communication.followUpRequired =
    result.followUpRequired;

  communication.resolution =
    result.resolution;

  communication.transcript.push({
    speaker: "agent",

    text: result.response,

    timestamp: new Date(),
  });

  await communication.save();

  response.say(
    {
      voice: "alice",
      language: "en-IN",
    },
    result.response
  );

 

  if (
    result.requestedHumanSupport
  ) {
    communication.followUpRequired =
      true;

    communication.resolution =
      "human_escalation";

    communication.requestedHumanSupport =
      true;

    await communication.save();

    response.say(
      {
        voice: "alice",
        language: "en-IN",
      },
      "I have recorded your request. A member of our support team will follow up with you."
    );

    response.hangup();

    return twiml(response);
  }

 

  if (result.stopRecovery) {
    communication.resolution =
      "recovery_stopped";

    communication.followUpRequired =
      false;

    await communication.save();

    response.say(
      {
        voice: "alice",
        language: "en-IN",
      },
      "Understood. We will not contact you further about this payment."
    );

    response.hangup();

    return twiml(response);
  }

 

  if (
    result.sendPaymentLink
  ) {
    const attempt =
      await RecoveryAttempt.findOne({
        _id:
          communication.recoveryAttemptId,
      }).lean();

    const recoveryPaymentUrl =
      attempt?.paymentUrl;

    const customerPhone =
      communication.recipient;

    if (
      recoveryPaymentUrl &&
      customerPhone &&
      !communication.paymentLinkSent
    ) {
      try {
        await sendRecoverySMS({
          to: customerPhone,

          message:
            `Here is your secure payment link for ${payment.amount} ${payment.currency}: ${recoveryPaymentUrl}`,
        });

        communication.paymentLinkSent =
          true;

        communication.paymentLinkSentAt =
          new Date();

        communication.resolution =
          "payment_link_requested";

        await communication.save();

        response.say(
          {
            voice: "alice",
            language: "en-IN",
          },
          "I have sent the secure payment link to your phone by SMS."
        );
      } catch (error) {
        console.error(
          "Failed to send payment link SMS:",
          error
        );

        communication.followUpRequired =
          true;

        communication.resolution =
          "follow_up_required";

        await communication.save();

        response.say(
          {
            voice: "alice",
            language: "en-IN",
          },
          "I was unable to send the payment link right now. Our support team can help you."
        );
      }
    }
  }

 

  if (
    result.followUpRequired &&
    !result.requestedHumanSupport
  ) {
    communication.followUpRequired =
      true;

    communication.resolution =
      "follow_up_required";

    await communication.save();
  }

 

  const maxTurns =
    Number(
      communication.metadata?.maxTurns
    ) ||
    DEFAULT_MAX_TURNS;

  if (
    communication.turnCount >=
    maxTurns
  ) {
    communication.followUpRequired =
      true;

    communication.resolution =
      "follow_up_required";

    await communication.save();

    response.say(
      {
        voice: "alice",
        language: "en-IN",
      },
      "Thank you for explaining the issue. We have recorded the details and our team will follow up with you."
    );

    response.hangup();

    return twiml(response);
  }

  response.say(
    {
      voice: "alice",
      language: "en-IN",
    },
    "Is there anything else you would like us to know about the payment issue?"
  );

 
  const gather =
    response.gather({
      input: ["speech"],

      action:
        `/api/webhooks/twilio/voice/gather` +
        `?communicationId=${communication._id}`,

      method: "POST",

      speechTimeout: "auto",

      language: "en-IN",

      timeout: 8,
    });

  gather.say(
    {
      voice: "alice",
      language: "en-IN",
    },
    "Please tell me."
  );

  response.say(
    {
      voice: "alice",
      language: "en-IN",
    },
    "Thank you. We will follow up with you if needed."
  );

  response.hangup();

  return twiml(response);
}

function twiml(
  response: VoiceResponse
) {
  return new Response(
    response.toString(),
    {
      headers: {
        "Content-Type":
          "text/xml",
      },
    }
  );
}