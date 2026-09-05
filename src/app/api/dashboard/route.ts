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
      if (attempt.status === "success" || attempt.status === "recovered") {
        successfulRecoveryByPayment.set(attempt.paymentId, attempt.recoveredAmount);
      }
    }
    const recoveredRevenue = Array.from(successfulRecoveryByPayment.values())
      .reduce((sum, amount) => sum + amount, 0);

    const successfulRecoveries = successfulRecoveryByPayment.size;

    const recoveryRate =
      failedPayments.length > 0
        ? (successfulRecoveries / failedPayments.length) * 100
        : 0;

    const recoveredPaymentIds = new Set(successfulRecoveryByPayment.keys());
    const eligibleFailedRevenue = failedPayments
      .filter((payment) => !recoveredPaymentIds.has(payment.paymentId))
      .reduce((sum, payment) => sum + payment.amount, 0) + recoveredRevenue;
    const amountRecoveryRate = eligibleFailedRevenue > 0
      ? (recoveredRevenue / eligibleFailedRevenue) * 100
      : 0;
    const recoveryDurations = recoveryAttempts
      .filter((attempt) => attempt.status === "success" || attempt.status === "recovered")
      .map((attempt) => new Date(attempt.updatedAt).getTime() - new Date(attempt.attemptedAt).getTime())
      .filter((duration) => Number.isFinite(duration) && duration >= 0);
    const averageRecoveryTimeMinutes = recoveryDurations.length > 0
      ? Math.round(recoveryDurations.reduce((sum, duration) => sum + duration, 0) / recoveryDurations.length / 60000)
      : 0;

    const recentFailedPayments = failedPayments
      .slice(-10)
      .reverse()
      .map((payment) => {
        const recovery = recoveryAttempts.find(
          (attempt) =>
            attempt.paymentId === payment.paymentId
        );

        return {
          paymentId: payment.paymentId,
          customerId: payment.customerId,
          amount: payment.amount,
          failureReason: payment.failureReason,
          strategy: recovery?.strategy || "Not analyzed",
          recoveryStatus: recovery?.status || "pending",
          recoveryProbability: recovery?.recoveryProbability ?? null,
          recommendedDelayMinutes: recovery?.recommendedDelayMinutes ?? null,
          channel: recovery?.recommendedChannel ?? null,
          riskLevel: recovery?.riskLevel ?? null,
          aiConfidence: recovery?.aiConfidence ?? null,
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
        recovered: number;
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
          recovered: 0,
        };
      }

      if (payment.status === "success") {
        revenueByMonth[month].revenue += payment.amount;
      }
    }

    for (const attempt of recoveryAttempts) {
      if (attempt.status === "success" || attempt.status === "recovered") {
        const date = new Date(attempt.attemptedAt);

        const month = date.toLocaleString("en-IN", {
          month: "short",
        });

        if (!revenueByMonth[month]) {
          revenueByMonth[month] = {
            revenue: 0,
            recovered: 0,
          };
        }

        revenueByMonth[month].recovered +=
          attempt.recoveredAmount;
      }
    }

    const revenueChart = Object.entries(
      revenueByMonth
    ).map(([month, values]) => ({
      month,
      revenue: values.revenue,
      recovered: values.recovered,
    }));

   

    return NextResponse.json({
      stats: {
        totalRevenue,
        failedPayments: failedPayments.length,
        recoveredRevenue,
        recoveryRate: Number(
          recoveryRate.toFixed(1)
        ),
        eligibleFailedRevenue,
        amountRecoveryRate: Number(amountRecoveryRate.toFixed(1)),
        averageRecoveryTimeMinutes,
        pendingRecoveries: recoveryAttempts.filter((attempt) => ["pending", "processing"].includes(attempt.status)).length,
        atRiskRevenue: failedPayments
          .filter((payment) => !recoveredPaymentIds.has(payment.paymentId))
          .reduce((sum, payment) => sum + payment.amount, 0),
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