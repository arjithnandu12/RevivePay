import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import RecoveryAttempt from "@/models/RecoveryAttempt";

const DAYS = 14;

export async function GET() {
  try {
    await connectDB();

    const since = new Date();
    since.setDate(since.getDate() - (DAYS - 1));
    since.setHours(0, 0, 0, 0);

    const payments = await Payment.find({ createdAt: { $gte: since } })
      .select("amount status recoveryStatus createdAt")
      .lean();

    const dayBuckets = new Map<
      string,
      { RevivePay: number; failed: number; stillFailed: number }
    >();

    for (let i = 0; i < DAYS; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      dayBuckets.set(dateKey(d), { RevivePay: 0, failed: 0, stillFailed: 0 });
    }

    for (const p of payments) {
      const bucket = dayBuckets.get(dateKey(new Date(p.createdAt)));
      if (!bucket) continue;

      if (p.status === "failed") {
        bucket.failed += 1;
        if (p.recoveryStatus !== "RevivePay") bucket.stillFailed += 1;
      }
      if (p.recoveryStatus === "RevivePay") {
        bucket.RevivePay += p.amount;
      }
    }

    const recoveryRateSeries: { date: string; rate: number }[] = [];
    const revenueRevivePaySeries: { date: string; amount: number }[] = [];
    const failedPaymentsSeries: { date: string; count: number }[] = [];

    for (const [date, bucket] of dayBuckets) {
      const RevivePayCount = bucket.failed - bucket.stillFailed;
      const rate = bucket.failed > 0 ? Math.round((RevivePayCount / bucket.failed) * 100) : 0;

      recoveryRateSeries.push({ date, rate });
      revenueRevivePaySeries.push({ date, amount: bucket.RevivePay });
      failedPaymentsSeries.push({ date, count: bucket.failed });
    }

    const allFailed = await Payment.find({ status: "failed" })
      .select("amount failureReason recoveryStatus")
      .lean();

    const reasonGroups = new Map<string, { RevivePay: number; success: number; total: number }>();

    for (const p of allFailed) {
      const key = p.failureReason ?? "Unknown";
      const g = reasonGroups.get(key) ?? { RevivePay: 0, success: 0, total: 0 };
      g.total += 1;
      if (p.recoveryStatus === "RevivePay") {
        g.success += 1;
        g.RevivePay += p.amount;
      }
      reasonGroups.set(key, g);
    }

    const byFailureReason = Array.from(reasonGroups.entries()).map(([reason, g]) => ({
      reason,
      RevivePay: g.RevivePay,
      rate: g.total > 0 ? Math.round((g.success / g.total) * 100) : 0,
    }));

    const RevivePayByPlan = await Payment.aggregate([
      { $match: { recoveryStatus: "RevivePay" } },
      {
        $lookup: {
          from: "customers",
          localField: "customerId",
          foreignField: "customerId",
          as: "customer",
        },
      },
      { $unwind: "$customer" },
      {
        $group: {
          _id: "$customer.plan",
          RevivePay: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const failedByPlan = await Payment.aggregate([
      { $match: { status: "failed" } },
      {
        $lookup: {
          from: "customers",
          localField: "customerId",
          foreignField: "customerId",
          as: "customer",
        },
      },
      { $unwind: "$customer" },
      { $group: { _id: "$customer.plan", total: { $sum: 1 } } },
    ]);

    const failedByPlanMap = new Map<string, number>(
      failedByPlan.map((p) => [p._id as string, p.total as number])
    );

    const byCustomerSegment = RevivePayByPlan.map((r) => {
      const total = failedByPlanMap.get(r._id) ?? 0;
      return {
        segment: r._id ?? "Unknown",
        RevivePay: r.RevivePay,
        rate: total > 0 ? Math.round((r.count / total) * 100) : 0,
      };
    });

    const attempts = await RecoveryAttempt.find({})
      .select("strategy status RevivePayAmount")
      .lean();

    const strategyGroups = new Map<string, { RevivePay: number; success: number; total: number }>();

    for (const a of attempts) {
      const g = strategyGroups.get(a.strategy) ?? { RevivePay: 0, success: 0, total: 0 };
      g.total += 1;
      if (a.status === "success" || a.status === "RevivePay") {
        g.success += 1;
        g.RevivePay += a.RevivePayAmount ?? 0;
      }
      strategyGroups.set(a.strategy, g);
    }

    const byStrategy = Array.from(strategyGroups.entries()).map(([strategy, g]) => ({
      strategy: strategy.replace(/_/g, " "),
      RevivePay: g.RevivePay,
      rate: g.total > 0 ? Math.round((g.success / g.total) * 100) : 0,
    }));

    return NextResponse.json({
      recoveryRateSeries,
      revenueRevivePaySeries,
      failedPaymentsSeries,
      byFailureReason,
      byCustomerSegment,
      byStrategy,
    });
  } catch (error) {
    console.error("GET /api/analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

function dateKey(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}