import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";

import Payment from "@/models/Payment";
import RecoveryAttempt from "@/models/RecoveryAttempt";

import {
  runRecoveryEngine,
} from "@/lib/recovery-engine";
import { recoveryActionSchema, publicError } from "@/lib/validation";

export async function POST(
  request: Request,
) {
  try {
    await connectDB();

    const body =
      await request.json();

    const parsed = recoveryActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid recovery action." },
        { status: 400 }
      );
    }
    const { action, paymentId } = parsed.data;

    const payment =
      await Payment.findOne({
        paymentId,
      }).lean();

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Recovery case not found.",
        },
        {
          status: 404,
        }
      );
    }

    

    if (action === "execute") {
      const result =
        await runRecoveryEngine(
          paymentId
        );

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,

            error:
              result.message ??
              "Recovery engine could not process this payment.",
          },
          {
            status: 400,
          }
        );
      }

      const message =
        result.duplicate
          ? "This payment has already been analyzed and processed."
          : result.policy?.allowed
            ? `Recovery approved: ${result.policy.reason}`
            : `Recovery blocked by policy: ${
                result.policy?.reason ??
                "No reason given."
              }`;

      return NextResponse.json({
        success: true,

        message,

        paymentUrl:
          result.paymentUrl,

        razorpayPaymentLinkId:
          result.razorpayPaymentLinkId,

        strategy:
          result.recommendation?.strategy,

        policy:
          result.policy,
      });
    }

  

    if (action === "escalate") {
      await Payment.updateOne(
        {
          paymentId,
        },
        {
          $set: {
            recoveryStatus:
              "unrecoverable",

            recoveryAction:
              "escalated_to_human",
          },
        }
      );

      await RecoveryAttempt.updateOne(
        {
          paymentId,
        },
        {
          $set: {
            status: "failed",

            errorMessage:
              "Escalated to human review by merchant.",
          },
        }
      );

      return NextResponse.json({
        success: true,

        message:
          "Case escalated to human review.",
      });
    }

 

    if (action === "send_link") {
      const recoveryAttempt =
        await RecoveryAttempt.findOne({
          paymentId,
        }).lean();

      if (!recoveryAttempt) {
        return NextResponse.json(
          {
            success: false,

            error:
              "Recovery has not been analyzed yet. Execute recovery first.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        recoveryAttempt.status ===
        "success"
      ) {
        return NextResponse.json({
          success: true,

          message:
            "Payment has already been recovered.",

          recovered: true,
        });
      }

      if (
        !recoveryAttempt.paymentUrl
      ) {
        return NextResponse.json(
          {
            success: false,

            error:
              "No Razorpay Payment Link exists for this recovery case.",
          },
          {
            status: 400,
          }
        );
      }

      return NextResponse.json({
        success: true,

        message:
          "Razorpay Payment Link is ready.",

        paymentUrl:
          recoveryAttempt.paymentUrl,

        razorpayPaymentLinkId:
          recoveryAttempt.razorpayPaymentLinkId,

        suggestedMessage:
          recoveryAttempt.suggestedMessage,
      });
    }

    return NextResponse.json(
      {
        success: false,

        error:
          "Unknown action.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error(
      "Recovery case action error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error: publicError(error, "Action failed."),
      },
      {
        status: 500,
      }
    );
  }
}