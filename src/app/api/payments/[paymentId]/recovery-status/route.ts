import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import Customer from "@/models/Customer";
import RecoveryAttempt from "@/models/RecoveryAttempt";
import { runRecoveryEngine } from "@/lib/recovery-engine";

interface RouteParams {
  params: Promise<{ paymentId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    await connectDB();
    const { paymentId } = await params;

    const payment = await Payment.findOne({ paymentId }).lean();
    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Payment not found" },
        { status: 404 }
      );
    }

    const attempt = await RecoveryAttempt.findOne({ paymentId })
      .sort({ createdAt: -1 })
      .lean();

    if (!attempt) {
      return NextResponse.json({ success: true, recovery: null });
    }

    return NextResponse.json({
      success: true,
      recovery: {
        recommendation: {
          strategy: attempt.strategy,
          reason: attempt.aiReason,
          confidence: attempt.aiConfidence ?? 0.9,
          riskLevel: attempt.riskLevel ?? "LOW",
          recoveryProbability: attempt.recoveryProbability ?? 0.85,
          recommendedDelayMinutes: attempt.recommendedDelayMinutes ?? 720,
          channel: attempt.channel || attempt.recommendedChannel || "email",
        },
        policy: {
          allowed: attempt.status !== "cancelled" && attempt.strategy !== "no_action",
          strategy: attempt.strategy,
          reason: attempt.aiReason,
          riskLevel: attempt.riskLevel ?? "LOW",
          requiresApproval: attempt.strategy === "awaiting_approval",
        },
        recoveryAttemptId: attempt._id.toString(),
        paymentUrl: attempt.paymentUrl,
        attemptsUsed: attempt.attemptNumber,
        attemptsRemaining: Math.max(0, 3 - attempt.attemptNumber),
        channel: attempt.channel || attempt.recommendedChannel || "email",
        emailSent: attempt.emailSent,
        emailError: attempt.emailError ?? null,
      },
    });
  } catch (error) {
    console.error("GET recovery-status error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch recovery status" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    await connectDB();
    const { paymentId } = await params;
    const body = await request.json().catch(() => ({}));

    const payment = await Payment.findOne({ paymentId });
    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Payment not found" },
        { status: 404 }
      );
    }

    const failureReason = body.failureReason || "bank_error";
    const failureCode = body.failureCode || failureReason;
    const failureSource = body.failureSource || "bank";
    const failureStep = body.failureStep || "authorization";

    await Payment.updateOne(
      { paymentId },
      {
        $set: {
          status: "failed",
          failureReason,
          failureCode,
          failureSource,
          failureStep,
          ...(body.razorpayPaymentId
            ? { razorpayPaymentId: body.razorpayPaymentId }
            : {}),
        },
        $inc: { attempts: 1 },
      }
    );

    if (payment.customerId) {
      await Customer.updateOne(
        { customerId: payment.customerId },
        { $inc: { failedPayments: 1 } }
      );
    }

    const recoveryResult = await runRecoveryEngine(paymentId);

    return NextResponse.json({
      success: true,
      recovery: recoveryResult,
    });
  } catch (error) {
    console.error("POST recovery-status error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to run recovery",
      },
      { status: 500 }
    );
  }
}
