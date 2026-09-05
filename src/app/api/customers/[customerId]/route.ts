
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";
import Payment from "@/models/Payment";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    await connectDB();
    const { customerId } = await params;

    const customer = await Customer.findOne({ customerId }).lean();

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const payments = await Payment.find({ customerId })
      .sort({ createdAt: -1 })
      .lean();

    const currentPayment =
      payments.find((p) => p.status === "failed" || p.status === "pending") ??
      null;

    return NextResponse.json({
      customer: {
        customerId: customer.customerId,
        name: customer.name,
        email: customer.email,
        plan: customer.plan,
        monthlyValue: customer.monthlyValue,
        lifetimeValue: customer.lifetimeValue,
        successfulPayments: customer.successfulPayments,
        failedPayments: customer.failedPayments,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      },

      payments: payments.map((p) => ({
        paymentId: p.paymentId,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        failureReason: p.failureReason ?? null,
        attempts: p.attempts,
        createdAt: p.createdAt,
      })),

      currentPayment: currentPayment
        ? {
            paymentId: currentPayment.paymentId,
            amount: currentPayment.amount,
            currency: currentPayment.currency,
            status: currentPayment.status,
            failureReason: currentPayment.failureReason ?? null,
            attempts: currentPayment.attempts,
            createdAt: currentPayment.createdAt,
          }
        : null,
    });
  } catch (error) {
    console.error("GET /api/customers/[customerId] error:", error);

    return NextResponse.json(
      { error: "Failed to fetch customer" },
      { status: 500 }
    );
  }
}