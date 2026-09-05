import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";

import Payment from "@/models/Payment";
import RecoveryAttempt from "@/models/RecoveryAttempt";
import { runRecoveryEngine } from "@/lib/recovery-engine";

import {
  startRecoveryCall,
} from "@/lib/communications/call-agent";

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

    const payment =
      await Payment.findOne({
        paymentId: caseId,
      }).lean();

    if (!payment) {
      return NextResponse.json(
        {
          error:
            "Payment not found.",
        },
        { status: 404 }
      );
    }

    if (
      payment.recoveryStatus ===
      "recovered"
    ) {
      return NextResponse.json(
        {
          error:
            "Payment already recovered.",
        },
        { status: 400 }
      );
    }

    let attempt =
      await RecoveryAttempt.findOne({
        paymentId: caseId,
      })
        .sort({
          createdAt: -1,
        })
        .lean();

    if (!attempt) {
      const recoveryResult = await runRecoveryEngine(caseId);
      attempt = await RecoveryAttempt.findOne({ paymentId: caseId }).sort({ attemptNumber: -1, createdAt: -1 }).lean();
      if (!attempt) {
        return NextResponse.json({ error: recoveryResult.message ?? "No recovery attempt exists." }, { status: 400 });
      }
    }

    const result =
      await startRecoveryCall({
        paymentId:
          payment.paymentId,

        customerId:
          payment.customerId,

        recoveryAttemptId:
          attempt._id.toString(),
      });

    return NextResponse.json(
      result
    );
  } catch (error) {
    console.error(
      "Start simulated call error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to start AI call.",
      },
      { status: 500 }
    );
  }
}