import { NextRequest } from "next/server";

import { connectDB } from "@/lib/mongodb";

import RecoveryCommunication from "@/models/RecoveryCommunication";

export async function POST(
  request: NextRequest
) {
  const formData =
    await request.formData();

  const communicationId =
    request.nextUrl.searchParams.get(
      "communicationId"
    );

  const messageStatus =
    String(
      formData.get(
        "MessageStatus"
      ) || ""
    ).toLowerCase();

  const messageSid =
    String(
      formData.get(
        "MessageSid"
      ) || ""
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

  if (messageSid) {
    communication.providerId =
      messageSid;
  }

  switch (messageStatus) {
    case "queued":
      communication.status =
        "queued";
      break;

    case "sending":
      communication.status =
        "initiated";
      break;

    case "sent":
      communication.status =
        "completed";
      break;

    case "delivered":
      communication.status =
        "completed";
      break;

    case "failed":
    case "undelivered":
      communication.status =
        "failed";

      communication.failureReason =
        String(
          formData.get(
            "ErrorMessage"
          ) ||
            "SMS delivery failed"
        );

      break;
  }

  await communication.save();

  return new Response(
    "OK",
    {
      status: 200,
    }
  );
}