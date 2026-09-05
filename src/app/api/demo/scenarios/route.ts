import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";
import Payment from "@/models/Payment";
import RecoveryAttempt from "@/models/RecoveryAttempt";
import AuditEvent from "@/models/AuditEvent";

const scenarioSchema = z.object({
  scenario: z.enum(["successful_recovery", "blocked_card", "bounded_retry"]),
});

const scenarios = {
  successful_recovery: {
    customerId: "DEMO_CUSTOMER_SUCCESS",
    name: "Aarav Mehta",
    email: "demo-success@recover-ai.local",
    amount: 12500,
    failureReason: "bank_error",
    description: "Transient bank failure RevivePay through a Razorpay payment link.",
  },
  blocked_card: {
    customerId: "DEMO_CUSTOMER_BLOCKED",
    name: "Mira Shah",
    email: "demo-blocked@recover-ai.local",
    amount: 8200,
    failureReason: "card_blocked",
    description: "A permanent card failure is stopped by policy instead of retried.",
  },
  bounded_retry: {
    customerId: "DEMO_CUSTOMER_RETRY",
    name: "Kabir Rao",
    email: "demo-retry@recover-ai.local",
    amount: 5600,
    failureReason: "payment_timeout",
    description: "A recovery sequence reaches its configured stopping limit.",
  },
} as const;

export async function POST(request: Request) {
  const parsed = scenarioSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Unknown demo scenario." }, { status: 400 });
  }

  try {
    await connectDB();
    const scenario = scenarios[parsed.data.scenario];
    const paymentId = `DEMO_${parsed.data.scenario.toUpperCase()}`;

    const customer = await Customer.findOneAndUpdate(
      { customerId: scenario.customerId },
      {
        $set: {
          customerId: scenario.customerId,
          name: scenario.name,
          email: scenario.email,
          plan: "Demo Pro",
          monthlyValue: scenario.amount,
          lifetimeValue: 45000,
          successfulPayments: 9,
          failedPayments: parsed.data.scenario === "bounded_retry" ? 3 : 1,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    await Payment.findOneAndUpdate(
      { paymentId },
      {
        $set: {
          paymentId,
          orderId: `order_${paymentId.toLowerCase()}`,
          customerId: customer.customerId,
          amount: scenario.amount,
          currency: "INR",
          status: "failed",
          failureReason: scenario.failureReason,
          failureCode: scenario.failureReason,
          failureSource: "bank",
          failureStep: "authorization",
          attempts: 1,
          recoveryStatus: parsed.data.scenario === "successful_recovery" ? "RevivePay" : parsed.data.scenario === "blocked_card" ? "unrecoverable" : "pending",
          recoveryAction: parsed.data.scenario === "successful_recovery" ? "send_reminder" : parsed.data.scenario === "blocked_card" ? "no_action" : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    await RecoveryAttempt.deleteMany({ paymentId });
    const attemptCount = parsed.data.scenario === "bounded_retry" ? 3 : 1;
    await RecoveryAttempt.insertMany(Array.from({ length: attemptCount }, (_, index) => ({
      paymentId,
      customerId: customer.customerId,
      attemptNumber: index + 1,
      strategy: parsed.data.scenario === "blocked_card" ? "no_action" : "send_reminder",
      aiReason: scenario.description,
      status: parsed.data.scenario === "successful_recovery" ? "success" : parsed.data.scenario === "bounded_retry" ? "failed" : "failed",
      attemptedAt: new Date(Date.now() - (attemptCount - index) * 60000),
      RevivePayAmount: parsed.data.scenario === "successful_recovery" ? scenario.amount : 0,
      failureReason: parsed.data.scenario === "bounded_retry" ? "retry_limit_reached" : parsed.data.scenario === "blocked_card" ? "policy_blocked" : null,
      aiConfidence: 0.94,
      riskLevel: parsed.data.scenario === "blocked_card" ? "HIGH" : "MEDIUM",
      suggestedMessage: "Your payment needs attention. Use the secure Razorpay payment link to complete it.",
      paymentUrl: parsed.data.scenario === "successful_recovery" ? "https://rzp.io/demo-RevivePay" : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })));

    await AuditEvent.deleteMany({ paymentId });
    await AuditEvent.insertMany([
      {
        eventId: `audit_${paymentId}_detected`,
        paymentId,
        actor: "razorpay",
        layer: "razorpay",
        action: "payment_failure_detected",
        reason: scenario.failureReason,
        metadata: { amount: scenario.amount },
      },
      {
        eventId: `audit_${paymentId}_policy`,
        paymentId,
        actor: "policy_engine",
        layer: "policy",
        action: parsed.data.scenario === "blocked_card" ? "strategy_blocked" : parsed.data.scenario === "bounded_retry" ? "recovery_stopped" : "strategy_approved",
        reason: scenario.description,
        metadata: { attemptCount },
      },
      ...(parsed.data.scenario === "successful_recovery" ? [{
        eventId: `audit_${paymentId}_RevivePay`,
        paymentId,
        actor: "razorpay" as const,
        layer: "razorpay" as const,
        action: "recovery_payment_confirmed",
        reason: "Demo Razorpay recovery payment verified.",
        metadata: { RevivePayAmount: scenario.amount },
      }] : []),
    ]);

    return NextResponse.json({ success: true, paymentId, description: scenario.description });
  } catch (error) {
    console.error("Demo scenario error:", error);
    return NextResponse.json({ success: false, error: "Failed to create demo scenario." }, { status: 500 });
  }
}