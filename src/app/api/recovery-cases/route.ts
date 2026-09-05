import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import Customer from "@/models/Customer";
import RecoveryAttempt from "@/models/RecoveryAttempt";

const MAX_ATTEMPTS = 3;

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? 1));
    const limit = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? 20)));
    const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
    const skip = (page - 1) * limit;
    const paymentQuery = search
      ? { status: "failed" as const, $or: [
          { paymentId: { $regex: search, $options: "i" } },
          { customerId: { $regex: search, $options: "i" } },
          { failureReason: { $regex: search, $options: "i" } },
        ] }
      : { status: "failed" as const };

    const [payments, total] = await Promise.all([
      Payment.find(paymentQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
      Payment.countDocuments(paymentQuery),
    ]);

    if (payments.length === 0) {
      return NextResponse.json({ cases: [] });
    }

    const customerIds = [...new Set(payments.map((p) => p.customerId))];
    const paymentIds = payments.map((p) => p.paymentId);

    const [customers, attempts] = await Promise.all([
      Customer.find({ customerId: { $in: customerIds } }).lean(),
      RecoveryAttempt.find({ paymentId: { $in: paymentIds } }).sort({ attemptNumber: -1 }).lean(),
    ]);

    const customerMap = new Map(customers.map((c) => [c.customerId, c]));
    const attemptMap = new Map(attempts.map((a) => [a.paymentId, a]));

    const cases = payments.map((payment) => {
      const customer = customerMap.get(payment.customerId);
      const attempt = attemptMap.get(payment.paymentId);
      const paymentAttempts = attempts.filter((item) => item.paymentId === payment.paymentId && item.status !== "cancelled");

      return {
        id: payment.paymentId,
        paymentId: payment.paymentId,
        customer: customer?.name ?? "Unknown customer",
        customerId: payment.customerId,
        amount: payment.amount,
        failureReason: payment.failureReason ?? "Unknown",
        strategy: attempt ? attempt.strategy.replace(/_/g, " ") : "Not yet analyzed",
        priority: derivePriority(attempt?.riskLevel, payment.amount),
        attempts: paymentAttempts.length,
        attemptsUsed: paymentAttempts.length,
        maxAttempts: MAX_ATTEMPTS,
        status: deriveStatus(payment.recoveryStatus, attempt?.status),
        createdAt: payment.createdAt,
      };
    });

    return NextResponse.json({ cases, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("GET /api/recovery-cases error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recovery cases" },
      { status: 500 }
    );
  }
}

function derivePriority(
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | undefined,
  amount: number
): "Low" | "Medium" | "High" | "Critical" {
  if (riskLevel === "HIGH" && amount >= 100000) return "Critical";
  if (riskLevel === "HIGH") return "High";
  if (riskLevel === "MEDIUM") return "Medium";
  if (riskLevel === "LOW") return "Low";
  return "Medium";
}

function deriveStatus(
  recoveryStatus: string,
  attemptStatus: string | undefined
): "pending" | "scheduled" | "in_progress" | "escalated" | "success" | "refunded" {
  if (recoveryStatus === "RevivePay") return "success";
  if (recoveryStatus === "refunded") return "refunded";
  if (recoveryStatus === "unrecoverable") return "escalated";
  if (recoveryStatus === "in_progress") {
    return attemptStatus === "pending" ? "scheduled" : "in_progress";
  }
  return "pending";
}