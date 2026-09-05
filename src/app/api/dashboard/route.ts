import { NextResponse } from "next/server";

import Customer from "@/models/Customer";
import Payment from "@/models/Payment";
import RecoveryAttempt from "@/models/RecoveryAttempt";
import { connectDB } from "@/lib/mongodb";

export async function GET() {
  try {
    await connectDB();

    const customers = await Customer.find().lean();
    const payments = await Payment.find().lean();
    const recoveryAttempts = await RecoveryAttempt.find().lean();

    const totalRevenue = payments
      .filter((payment) => payment.status === "success")
      .reduce((sum, payment) => sum + payment.amount, 0);

   

    const failedPayments = payments.filter(
      (payment) => payment.status === "failed"
    );

  

    const successfulRecoveryByPayment = new Map<string, number>();
    for (const attempt of recoveryAttempts) {
      const doc = attempt as unknown as Record<string, unknown>;
      if (attempt.status === "success" || attempt.status === "RevivePay" || doc.status === "recovered") {
        const rawAmt = doc.RevivePayAmount ?? doc.recoveredAmount ?? doc.amount ?? 0;
        const numAmt = Number(rawAmt);
        successfulRecoveryByPayment.set(attempt.paymentId, Number.isFinite(numAmt) ? numAmt : 0);
      }
    }
    const RevivePayRevenue = Array.from(successfulRecoveryByPayment.values())
      .reduce((sum, amount) => sum + (Number.isFinite(amount) ? amount : 0), 0);

    const successfulRecoveries = successfulRecoveryByPayment.size;

    const recoveryRate =
      failedPayments.length > 0
        ? (successfulRecoveries / failedPayments.length) * 100
        : 0;

    const RevivePayPaymentIds = new Set(successfulRecoveryByPayment.keys());
    const failedUnrecovered = failedPayments
      .filter((payment) => !RevivePayPaymentIds.has(payment.paymentId))
      .reduce((sum, payment) => sum + (Number.isFinite(payment.amount) ? payment.amount : 0), 0);
    const eligibleFailedRevenue = failedUnrecovered + RevivePayRevenue;
    const amountRecoveryRate = eligibleFailedRevenue > 0
      ? (RevivePayRevenue / eligibleFailedRevenue) * 100
      : 0;
    const recoveryDurations = recoveryAttempts
      .filter((attempt) => attempt.status === "success" || attempt.status === "RevivePay")
      .map((attempt) => new Date(attempt.updatedAt).getTime() - new Date(attempt.attemptedAt).getTime())
      .filter((duration) => Number.isFinite(duration) && duration >= 0);
    const averageRecoveryTimeMinutes = recoveryDurations.length > 0
      ? Math.round(recoveryDurations.reduce((sum, duration) => sum + duration, 0) / recoveryDurations.length / 60000)
      : 0;

    failedPayments.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    const recentFailedPayments = failedPayments
      .slice(0, 10)
      .map((payment) => {
        const paymentAttempts = recoveryAttempts
          .filter((attempt) => attempt.paymentId === payment.paymentId)
          .sort((a, b) => new Date(b.attemptedAt || b.createdAt || 0).getTime() - new Date(a.attemptedAt || a.createdAt || 0).getTime());
        const recovery = paymentAttempts[0] || null;

        let mappedStatus: string = payment.recoveryStatus;
        if (payment.recoveryStatus === "RevivePay" || recovery?.status === "success" || recovery?.status === "RevivePay") {
          mappedStatus = "RevivePay";
        } else if (payment.recoveryStatus === "unrecoverable") {
          mappedStatus = "unrecoverable";
        } else if (recovery?.failureReason === "retry_limit_reached") {
          mappedStatus = "retry_limit_reached";
        } else if (recovery?.status) {
          mappedStatus = recovery.status;
        }

        return {
          paymentId: payment.paymentId,
          customerId: payment.customerId,
          amount: payment.amount,
          failureReason: payment.failureReason,
          strategy: recovery?.strategy || payment.recoveryAction || "Not analyzed",
          recoveryStatus: mappedStatus || "pending",
          recoveryProbability: recovery?.recoveryProbability ?? (payment.recoveryStatus === "RevivePay" ? 0.95 : 0.4),
          recommendedDelayMinutes: recovery?.recommendedDelayMinutes ?? null,
          channel: recovery?.recommendedChannel ?? recovery?.channel ?? "email",
          riskLevel: recovery?.riskLevel ?? (payment.recoveryStatus === "unrecoverable" ? "HIGH" : "LOW"),
          aiConfidence: recovery?.aiConfidence ?? 0.92,
        };
      });

  

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const highRiskCustomers: any[] = [];

    let highRisk = 0;
    let mediumRisk = 0;
    let lowRisk = 0;

    for (const customer of customers) {
      const customerPayments = payments.filter(
        (payment) =>
          payment.customerId === customer.customerId
      );

      const failedCount = customerPayments.filter(
        (payment) => payment.status === "failed"
      ).length;

      const totalAttempts = customer.successfulPayments + customer.failedPayments;

      const failureRate =
        totalAttempts > 0
          ? failedCount / totalAttempts
          : 0;

      let risk: "HIGH" | "MEDIUM" | "LOW";

      if (failedCount >= 4 || failureRate >= 0.4) {
        risk = "HIGH";
        highRisk++;
      } else if (failedCount >= 2 || failureRate >= 0.2) {
        risk = "MEDIUM";
        mediumRisk++;
      } else {
        risk = "LOW";
        lowRisk++;
      }

      if (risk === "HIGH" || risk === "MEDIUM") {
        highRiskCustomers.push({
          customerId: customer.customerId,
          name: customer.name,
          failedPayments: failedCount,
          lifetimeValue: customer.lifetimeValue,
          risk,
        });
      }
    }

 

    highRiskCustomers.sort((a, b) => {
      if (a.risk === "HIGH" && b.risk !== "HIGH") {
        return -1;
      }

      if (a.risk !== "HIGH" && b.risk === "HIGH") {
        return 1;
      }

      return b.failedPayments - a.failedPayments;
    });

   

    const revenueByMonth: Record<
      string,
      {
        revenue: number;
        RevivePay: number;
      }
    > = {};

    for (const payment of payments) {
      const date = new Date(payment.createdAt);

      const month = date.toLocaleString("en-IN", {
        month: "short",
      });

      if (!revenueByMonth[month]) {
        revenueByMonth[month] = {
          revenue: 0,
          RevivePay: 0,
        };
      }

      if (payment.status === "success") {
        revenueByMonth[month].revenue += payment.amount;
      }
    }

    for (const attempt of recoveryAttempts) {
      const doc = attempt as unknown as Record<string, unknown>;
      if (attempt.status === "success" || attempt.status === "RevivePay" || doc.status === "recovered") {
        const date = new Date(attempt.attemptedAt || attempt.createdAt);

        const month = date.toLocaleString("en-IN", {
          month: "short",
        });

        if (!revenueByMonth[month]) {
          revenueByMonth[month] = {
            revenue: 0,
            RevivePay: 0,
          };
        }

        const rawAmt = doc.RevivePayAmount ?? doc.recoveredAmount ?? doc.amount ?? 0;
        const numAmt = Number(rawAmt);
        revenueByMonth[month].RevivePay += Number.isFinite(numAmt) ? numAmt : 0;
      }
    }

    const revenueChart = Object.entries(
      revenueByMonth
    ).map(([month, values]) => ({
      month,
      revenue: Number.isFinite(values.revenue) ? values.revenue : 0,
      RevivePay: Number.isFinite(values.RevivePay) ? values.RevivePay : 0,
    }));

   

    return NextResponse.json({
      stats: {
        totalRevenue: Number.isFinite(totalRevenue) ? totalRevenue : 0,
        failedPayments: failedPayments.length,
        RevivePayRevenue: Number.isFinite(RevivePayRevenue) ? RevivePayRevenue : 0,
        recoveryRate: Number(
          (Number.isFinite(recoveryRate) ? recoveryRate : 0).toFixed(1)
        ),
        eligibleFailedRevenue: Number.isFinite(eligibleFailedRevenue) ? eligibleFailedRevenue : 0,
        amountRecoveryRate: Number((Number.isFinite(amountRecoveryRate) ? amountRecoveryRate : 0).toFixed(1)),
        averageRecoveryTimeMinutes: Number.isFinite(averageRecoveryTimeMinutes) ? averageRecoveryTimeMinutes : 0,
        pendingRecoveries: recoveryAttempts.filter((attempt) => ["pending", "processing"].includes(attempt.status)).length,
        atRiskRevenue: failedPayments
          .filter((payment) => !RevivePayPaymentIds.has(payment.paymentId))
          .reduce((sum, payment) => sum + (Number.isFinite(payment.amount) ? payment.amount : 0), 0),
      },

      revenueChart,

      riskDistribution: {
        high: highRisk,
        medium: mediumRisk,
        low: lowRisk,
      },

      failedPaymentsList: recentFailedPayments,

      highRiskCustomers: highRiskCustomers.slice(0, 10),
    });
  } catch (error) {
    console.error("Dashboard error:", error);

    return NextResponse.json(
      {
        error: "Failed to load dashboard",
      },
      {
        status: 500,
      }
    );
  }
}