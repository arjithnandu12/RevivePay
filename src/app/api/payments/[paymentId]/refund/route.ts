import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import RecoveryAttempt from "@/models/RecoveryAttempt";
import PromiseToPay from "@/models/PromiseToPay";
import { getRazorpayClient } from "@/lib/razorpay";
import { recordAuditEvent } from "@/lib/audit";

const schema = z.object({ reason: z.string().trim().max(500).optional() });

export async function POST(request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  try {
    await connectDB();
    const { paymentId } = await params;
    const body = schema.safeParse(await request.json().catch(() => ({})));
    if (!body.success) return NextResponse.json({ success: false, error: "Invalid refund request." }, { status: 400 });
    const payment = await Payment.findOne({ paymentId });
    if (!payment) return NextResponse.json({ success: false, error: "Payment not found." }, { status: 404 });
    if (payment.recoveryStatus === "refunded") return NextResponse.json({ success: true, message: "Payment already refunded." });
    const successfulRecovery = payment.razorpayPaymentId ? null : await RecoveryAttempt.findOne({ paymentId, status: "recovered", recoveryRazorpayPaymentId: { $ne: null } }).sort({ completedAt: -1 }).lean();
    const providerPaymentId = payment.razorpayPaymentId ?? successfulRecovery?.recoveryRazorpayPaymentId;
    if (!providerPaymentId) return NextResponse.json({ success: false, error: "No captured Razorpay payment is available to refund." }, { status: 400 });
    if (payment.status !== "success" && payment.recoveryStatus !== "recovered") return NextResponse.json({ success: false, error: "Only captured or recovered payments can be refunded." }, { status: 400 });

    const refund = await getRazorpayClient().payments.refund(providerPaymentId, { amount: Math.round(payment.amount * 100), notes: { internalPaymentId: paymentId, reason: body.data.reason ?? "merchant_requested" } });
    payment.recoveryStatus = "refunded";
    payment.recoveryAction = "refund_requested";
    await payment.save();
    await RecoveryAttempt.updateMany({ paymentId, status: { $in: ["pending", "processing"] } }, { $set: { status: "cancelled", completedAt: new Date(), errorMessage: "Recovery stopped because payment was refunded." } });
    await PromiseToPay.updateMany({ paymentId, status: "active" }, { $set: { status: "cancelled", brokenAt: new Date(), notes: "Cancelled because payment was refunded." } });
    await recordAuditEvent({ paymentId, actor: "merchant", layer: "razorpay", action: "refund_requested", reason: body.data.reason ?? "Merchant requested refund.", metadata: { refundId: refund.id, amount: payment.amount } });
    return NextResponse.json({ success: true, refundId: refund.id, recoveryStatus: payment.recoveryStatus });
  } catch (error) {
    console.error("Refund error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Refund failed." }, { status: 500 });
  }
}