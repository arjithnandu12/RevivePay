import { NextRequest } from "next/server";

import { connectDB } from "@/lib/mongodb";

import RecoveryCommunication from "@/models/RecoveryCommunication";

import {
  handleCallFallback,
} from "@/lib/communications/call-fallback";

export async function POST(
  request: NextRequest
) {
  const formData =
    await request.formData();

  const communicationId =
    request.nextUrl.searchParams.get(
      "communicationId"
    );

  const callStatus =
    String(
      formData.get("CallStatus") ||
        ""
    ).toLowerCase();

  const durationValue =
    String(
      formData.get("CallDuration") ||
        ""
    );

  const callSid =
    String(
      formData.get("CallSid") ||
        ""
    );

  if (!communicationId) {
    return new Response(
      "Missing communicationId",
      {
        status: 400,
      }
    );
  }

  await connectDB();

  const communication =
    await RecoveryCommunication.findById(
      communicationId
    );

  if (!communication) {
    return new Response(
      "Communication not found",
      {
        status: 404,
      }
    );
  }

  if (callSid) {
    communication.providerId =
      callSid;
  }

  switch (callStatus) {
    case "initiated":
      communication.status =
        "initiated";
      break;

    case "ringing":
      communication.status =
        "ringing";
      break;

    case "in-progress":
      communication.status =
        "in_progress";
      break;

    case "answered":
      communication.status =
        "answered";
      break;

    case "completed":
      communication.status =
        "completed";

      communication.endedAt =
        new Date();

      if (durationValue) {
        const duration =
          Number(durationValue);

        if (
          Number.isFinite(duration)
        ) {
          communication.duration =
            duration;
        }
      }

      break;

    case "no-answer":
      communication.status =
        "no_answer";

      communication.endedAt =
        new Date();

      break;

    case "busy":
      communication.status =
        "busy";

      communication.endedAt =
        new Date();

      break;

    case "failed":
      communication.status =
        "failed";

      communication.failureReason =
        "Twilio call failed";

      communication.endedAt =
        new Date();

      break;

    default:
      break;
  }

  await communication.save();

 
  if (
    communication.status ===
      "no_answer" ||
    communication.status ===
      "busy"
  ) {
    try {
      await handleCallFallback(
        communication._id.toString()
      );
    } catch (error) {
      console.error(
        "Call fallback failed:",
        error
      );
    }
  }

  return new Response(
    "OK",
    {
      status: 200,
    }
  );
}