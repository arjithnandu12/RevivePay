import { NextRequest } from "next/server";

import VoiceResponse from "twilio/lib/twiml/VoiceResponse";

import { connectDB } from "@/lib/mongodb";

import Customer from "@/models/Customer";
import Payment from "@/models/Payment";
import RecoveryCommunication from "@/models/RecoveryCommunication";

export async function POST(
  request: NextRequest
) {
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
      "We are sorry. There was a problem connecting your recovery call."
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
      "We are sorry. We could not find your recovery information."
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
      "We are sorry. We could not retrieve your payment information."
    );

    response.hangup();

    return twiml(response);
  }

  const amount =
    payment.amount;

  const currency =
    payment.currency || "INR";

  const greeting =
    `Hello ${customer.name}. This is RecoverAI calling regarding your recent payment of ${amount} ${currency}. Your payment could not be completed.`;

  const question =
    "Could you please tell me what problem you faced while making the payment?";

  communication.status =
    "in_progress";

  communication.startedAt =
    communication.startedAt ??
    new Date();

  communication.turnCount = 0;

  communication.transcript.push({
    speaker: "agent",
    text: greeting,
    timestamp: new Date(),
  });

  communication.transcript.push({
    speaker: "agent",
    text: question,
    timestamp: new Date(),
  });

  await communication.save();

  response.say(
    {
      voice: "alice",
      language: "en-IN",
    },
    greeting
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
    question
  );

  response.say(
    {
      voice: "alice",
      language: "en-IN",
    },
    "I did not hear a response. We will try to contact you again later. Thank you."
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