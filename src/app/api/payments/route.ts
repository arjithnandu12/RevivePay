import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

import Payment from "@/models/Payment";
import Customer from "@/models/Customer";
import RecoveryAttempt from "@/models/RecoveryAttempt";
import { connectDB } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? 1));
    const limit = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? 20)));
    const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
    const query = search
      ? { $or: [
          { paymentId: { $regex: search, $options: "i" } },
          { customerId: { $regex: search, $options: "i" } },
          { status: { $regex: search, $options: "i" } },
          { failureReason: { $regex: search, $options: "i" } },
        ] }
      : {};

    const [payments, total] = await Promise.all([
      Payment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
      Payment.countDocuments(query),
    ]);

    const attempts = await RecoveryAttempt.find({
      paymentId: { $in: payments.map((payment) => payment.paymentId) },
      status: { $ne: "cancelled" },
    }).select("paymentId").lean();
    const attemptsByPayment = new Map<string, number>();
    for (const attempt of attempts) {
      attemptsByPayment.set(attempt.paymentId, (attemptsByPayment.get(attempt.paymentId) ?? 0) + 1);
    }

    const customers = await Customer.find()
      .select("customerId name email")
      .lean();

    const customerMap = new Map(
      customers.map((customer) => [
        customer.customerId,
        customer,
      ])
    );

    const formattedPayments = payments.map(
      (payment) => {
        const customer = customerMap.get(
          payment.customerId
        );

        return {
          paymentId: payment.paymentId,

          customerId: payment.customerId,

          customerName:
            customer?.name || "Unknown Customer",

          amount: payment.amount,

          currency: payment.currency,

          status: payment.status,

          failureReason:
            payment.failureReason || null,

          attempts: attemptsByPayment.get(payment.paymentId) ?? 0,

          razorpayPaymentId:
            payment.razorpayPaymentId || null,

          createdAt: payment.createdAt,

          updatedAt: payment.updatedAt,
        };
      }
    );

    return NextResponse.json({
      payments: formattedPayments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error(
      "Payments API error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to fetch payments",
      },
      {
        status: 500,
      }
    );
  }
}