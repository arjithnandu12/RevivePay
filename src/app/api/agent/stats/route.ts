import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import RecoveryAttempt from "@/models/RecoveryAttempt";

const RETRY_LIMIT = 3;
const HIGH_VALUE_THRESHOLD = 500000;

export async function GET() {
  try {
    await connectDB();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [paymentsAnalyzedToday, recoveryActions, recoveredPayments, casesEscalated] =
      await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        RecoveryAttempt.countDocuments({ createdAt: { $gte: todayStart } } as any),
        RecoveryAttempt.countDocuments({}),
        Payment.find({ recoveryStatus: "recovered" }).select("amount").lean(),
        Payment.countDocuments({ recoveryStatus: "unrecoverable" }),
      ]);

    const revenueRecovered = recoveredPayments.reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
   
      active: true,
      metrics: {
        paymentsAnalyzedToday,
        recoveryActions,
        revenueRecovered,
        casesEscalated,
      },
      rules: {
        retryLimit: RETRY_LIMIT,
        highValueThreshold: HIGH_VALUE_THRESHOLD,
        humanApprovalThreshold: HIGH_VALUE_THRESHOLD,
        suspiciousPayments: "Manual review",
        automaticRetries: true,
      },
    });
  } catch (error) {
    console.error("GET /api/agent/stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent stats" },
      { status: 500 }
    );
  }
}