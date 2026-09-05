import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import RecoveryAttempt from "@/models/RecoveryAttempt";
import RecoveryCommunication from "@/models/RecoveryCommunication";
import PromiseToPay from "@/models/PromiseToPay";
import { recordAuditEvent } from "@/lib/audit";

const createSchema = z.object({
  channel: z.enum(["email", "sms", "call"]),
  dueAt: z.coerce.date(),
  promisedAmount: z.coerce.number().finite().positive(),
  notes: z.string().trim().max(1000).optional(),
  customerIntent: z.string().trim().max(120).optional(),
  communicationId: z.string().trim().optional(),
});

const updateSchema = z.object({
  status: z.enum(["active", "fulfilled", "broken", "expired", "cancelled"]),
  notes: z.string().trim().max(1000).optional(),
});

type Context = { params: Promise<{ caseId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    await connectDB();
    const { caseId } = await params;
    const promises = await PromiseToPay.find({ paymentId: caseId }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, promises });
  } catch (error) {
    console.error("Promise-to-pay GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to load promise-to-pay records." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    await connectDB();
    const { caseId } = await params;
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid promise-to-pay details." }, { status: 400 });

    const payment = await Payment.findOne({ paymentId: caseId }).lean();
    if (!payment) return NextResponse.json({ success: false, error: "Recovery case not found." }, { status: 404 });
    if (["RevivePay", "refunded"].includes(payment.recoveryStatus)) return NextResponse.json({ success: false, error: "This payment cannot accept a new promise after recovery or refund." }, { status: 409 });
    if (parsed.data.dueAt.getTime() <= Date.now()) return NextResponse.json({ success: false, error: "Promise due date must be in the future." }, { status: 400 });

    await PromiseToPay.updateMany({ paymentId: caseId, status: "active" }, { $set: { status: "cancelled", brokenAt: new Date() } });
    const attempt = await RecoveryAttempt.findOne({ paymentId: caseId }).sort({ attemptNumber: -1 }).lean();
    const communication = parsed.data.communicationId ? await RecoveryCommunication.findOne({ _id: parsed.data.communicationId, paymentId: caseId }).lean() : null;
    const promise = await PromiseToPay.create({
      paymentId: caseId,
      customerId: payment.customerId,
      recoveryAttemptId: attempt?._id.toString() ?? null,
      communicationId: communication?._id.toString() ?? null,
      ...parsed.data,
      promisedAt: new Date(),
      status: "active",
    });
    await recordAuditEvent({ paymentId: caseId, recoveryAttemptId: attempt?._id.toString(), actor: "merchant", layer: "system", action: "promise_to_pay_created", reason: `Customer promised payment through ${parsed.data.channel}.`, metadata: { promiseId: promise._id.toString(), dueAt: parsed.data.dueAt.toISOString(), promisedAmount: parsed.data.promisedAmount } });
    return NextResponse.json({ success: true, promise }, { status: 201 });
  } catch (error) {
    console.error("Promise-to-pay POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to create promise-to-pay record." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    await connectDB();
    const { caseId } = await params;
    const promiseId = new URL(request.url).searchParams.get("promiseId");
    const parsed = updateSchema.safeParse(await request.json());
    if (!promiseId || !parsed.success) return NextResponse.json({ success: false, error: "Promise ID and valid status are required." }, { status: 400 });
    const now = new Date();
    const update: Record<string, unknown> = { status: parsed.data.status, ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}) };
    if (parsed.data.status === "fulfilled") update.fulfilledAt = now;
    if (["broken", "expired", "cancelled"].includes(parsed.data.status)) update.brokenAt = now;
    const promise = await PromiseToPay.findOneAndUpdate({ _id: promiseId, paymentId: caseId }, { $set: update }, { new: true, runValidators: true }).lean();
    if (!promise) return NextResponse.json({ success: false, error: "Promise-to-pay record not found." }, { status: 404 });
    await recordAuditEvent({ paymentId: caseId, recoveryAttemptId: promise.recoveryAttemptId ?? undefined, actor: "merchant", layer: "system", action: `promise_to_pay_${parsed.data.status}`, reason: parsed.data.notes ?? `Promise marked ${parsed.data.status}.`, metadata: { promiseId } });
    return NextResponse.json({ success: true, promise });
  } catch (error) {
    console.error("Promise-to-pay PATCH error:", error);
    return NextResponse.json({ success: false, error: "Failed to update promise-to-pay record." }, { status: 500 });
  }
}