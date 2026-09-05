/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  NextRequest,
  NextResponse,
} from "next/server";

import { connectDB } from "@/lib/mongodb";

import Customer from "@/models/Customer";
import Payment from "@/models/Payment";
import RecoveryAttempt from "@/models/RecoveryAttempt";
import RecoveryCommunication from "@/models/RecoveryCommunication";

import {
  analyzeCallResponse,
} from "@/lib/communications/call-ai";

const DEFAULT_MAX_TURNS = 6;

export async function POST(
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

    const { caseId } = await params;

    const body =
      await request.json();

    const communicationId =
      String(
        body.communicationId || ""
      ).trim();

    const customerMessage =
      String(
        body.message || ""
      ).trim();

    if (!communicationId) {
      return NextResponse.json(
        {
          error:
            "communicationId is required.",
        },
        { status: 400 }
      );
    }

    if (!customerMessage) {
      return NextResponse.json(
        {
          error:
            "Customer message is required.",
        },
        { status: 400 }
      );
    }

    const communication =
      await RecoveryCommunication.findById(
        communicationId
      );

    if (!communication) {
      return NextResponse.json(
        {
          error:
            "Communication not found.",
        },
        { status: 404 }
      );
    }

    if (
      communication.paymentId !==
      caseId
    ) {
      return NextResponse.json(
        {
          error:
            "Communication does not belong to this recovery case.",
        },
        { status: 400 }
      );
    }

    if (
      communication.channel !==
      "call"
    ) {
      return NextResponse.json(
        {
          error:
            "Communication is not a call.",
        },
        { status: 400 }
      );
    }

    if (
      communication.status ===
        "completed" ||
      communication.status ===
        "failed"
    ) {
      return NextResponse.json(
        {
          error:
            "This call has already ended.",
          ended: true,
        },
        { status: 400 }
      );
    }

    const customer =
      await Customer.findOne({
        customerId:
          communication.customerId,
      }).lean();

    const payment =
      await Payment.findOne({
        paymentId: caseId,
      }).lean();

    if (!customer || !payment) {
      return NextResponse.json(
        {
          error:
            "Customer or payment not found.",
        },
        { status: 404 }
      );
    }

    if (
      payment.recoveryStatus ===
      "recovered"
    ) {
      communication.status =
        "completed";

      communication.endedAt =
        new Date();

      communication.resolution =
        "problem_resolved";

      await communication.save();

      return NextResponse.json({
        success: true,

        ended: true,

        agentResponse:
          "Your payment has already been recovered. Thank you!",

        communicationId,
      });
    }

    const maxTurns =
      Number(
        communication.metadata
          ?.maxTurns
      ) || DEFAULT_MAX_TURNS;

    if (
      communication.turnCount >=
      maxTurns
    ) {
      communication.status =
        "completed";

      communication.followUpRequired =
        true;

      communication.resolution =
        "follow_up_required";

      communication.endedAt =
        new Date();

      await communication.save();

      return NextResponse.json({
        success: true,

        ended: true,

        agentResponse:
          "Thank you for explaining the issue. We have recorded the details and our team will follow up with you.",

        communicationId,

        transcript:
          communication.transcript,
      });
    }

    communication.transcript.push({
      speaker: "customer",
      text: customerMessage,
      timestamp: new Date(),
    });

    communication.turnCount =
      (communication.turnCount || 0) + 1;

    const conversation =
      communication.transcript.map(
        (item) => ({
          speaker: item.speaker,
          text: item.text,
        })
      );

    const aiResult =
      await analyzeCallResponse({
        customerName:
          customer.name ||
          "there",

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
      aiResult.problem;

    communication.customerIntent =
      aiResult.intent;

    communication.sentiment =
      aiResult.sentiment;

    communication.requestedHumanSupport =
      aiResult.requestedHumanSupport;

    communication.followUpRequired =
      aiResult.followUpRequired;

    communication.resolution =
      aiResult.resolution;

   

    communication.transcript.push({
      speaker: "agent",
      text: aiResult.response,
      timestamp: new Date(),
    });

  

    if (aiResult.stopRecovery) {
      communication.status =
        "completed";

      communication.resolution =
        "recovery_stopped";

      communication.followUpRequired =
        false;

      communication.endedAt =
        new Date();

      await communication.save();

      return NextResponse.json({
        success: true,

        ended: true,

        agentResponse:
          aiResult.response,

        analysis: aiResult,

        communicationId,

        transcript:
          communication.transcript,
      });
    }

   
    if (
      aiResult.requestedHumanSupport
    ) {
      communication.status =
        "completed";

      communication.requestedHumanSupport =
        true;

      communication.followUpRequired =
        true;

      communication.resolution =
        "human_escalation";

      communication.endedAt =
        new Date();

      await communication.save();

      return NextResponse.json({
        success: true,

        ended: true,

        agentResponse:
          aiResult.response,

        analysis: aiResult,

        communicationId,

        transcript:
          communication.transcript,
      });
    }

   

    if (
      aiResult.sendPaymentLink
    ) {
      const attempt =
        await RecoveryAttempt.findById(
          communication.recoveryAttemptId
        ).lean();

      if (attempt?.paymentUrl) {
        const smsMessage =
          `Here is your secure payment link for ${payment.amount} ${payment.currency}: ${attempt.paymentUrl}`;

       
        await RecoveryCommunication.create(
          {
            paymentId:
              communication.paymentId,

            customerId:
              communication.customerId,

            recoveryAttemptId:
              communication.recoveryAttemptId,

            channel: "sms",

            status: "completed",

            provider: "other",

            providerId:
              `SIM_SMS_${Date.now()}`,

            recipient:
              (customer as any).phone ??
              (customer as any)
                .phoneNumber ??
              null,

            message:
              smsMessage,

            transcript: [],

            requestedHumanSupport:
              false,

            followUpRequired:
              false,

            paymentLinkSent: true,

            paymentLinkSentAt:
              new Date(),

            metadata: {
              simulated: true,
              triggeredByCall:
                communicationId,
            },
          }
        );

        communication.paymentLinkSent =
          true;

        communication.paymentLinkSentAt =
          new Date();

        communication.resolution =
          "payment_link_requested";
      } else {
        communication.followUpRequired =
          true;

        communication.resolution =
          "follow_up_required";
      }
    }

    if (
      aiResult.followUpRequired
    ) {
      communication.followUpRequired =
        true;

      communication.resolution =
        "follow_up_required";
    }

    

    const reachedLimit =
      communication.turnCount >=
      maxTurns;

    if (reachedLimit) {
      communication.status =
        "completed";

      communication.followUpRequired =
        true;

      communication.resolution =
        "follow_up_required";

      communication.endedAt =
        new Date();
    } else {
      communication.status =
        "in_progress";
    }

    await communication.save();

    return NextResponse.json({
      success: true,

      ended:
        communication.status ===
        "completed",

      agentResponse:
        aiResult.response,

      analysis: aiResult,

      communicationId,

      paymentLinkSent:
        communication.paymentLinkSent,

      followUpRequired:
        communication.followUpRequired,

      humanSupport:
        communication.requestedHumanSupport,

      turnCount:
        communication.turnCount,

      maxTurns,

      transcript:
        communication.transcript,
    });
  } catch (error) {
    console.error(
      "Simulated call error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Simulated call failed.",
      },
      { status: 500 }
    );
  }
}