import { NextResponse } from "next/server";

import Payment from "@/models/Payment";
import RecoveryAttempt from "@/models/RecoveryAttempt";
import Customer from "@/models/Customer";
import { connectDB } from "@/lib/mongodb";

interface RouteParams {
  params: Promise<{
    paymentId: string;
  }>;
}

export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    await connectDB();

    const { paymentId } = await params;

    
    const payment = await Payment.findOne({
      paymentId,
    }).lean();

    if (!payment) {
      return NextResponse.json(
        {
          error: "Payment not found",
        },
        {
          status: 404,
        }
      );
    }

    const recoveryAttempts = await RecoveryAttempt.countDocuments({
      paymentId,
      status: { $ne: "cancelled" },
    });

   
    const customer = await Customer.findOne({
      customerId: payment.customerId,
    })
      .select(
        "customerId name email plan monthlyValue lifetimeValue successfulPayments failedPayments createdAt"
      )
      .lean();

    return NextResponse.json({
      payment: {
        paymentId: payment.paymentId,

        customerId: payment.customerId,

        customer: customer
          ? {
              customerId: customer.customerId,
              name: customer.name,
              email: customer.email,
              plan: customer.plan,
              monthlyValue: customer.monthlyValue,
              lifetimeValue: customer.lifetimeValue,
              successfulPayments:
                customer.successfulPayments,
              failedPayments:
                customer.failedPayments,
              createdAt: customer.createdAt,
            }
          : null,

        amount: payment.amount,

        currency: payment.currency,

        status: payment.status,

        failureReason:
          payment.failureReason || null,

        attempts: recoveryAttempts,

        razorpayPaymentId:
          payment.razorpayPaymentId || null,

        createdAt: payment.createdAt,

        updatedAt: payment.updatedAt,
      },
    });
  } catch (error) {
    console.error(
      "Payment details API error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to fetch payment",
      },
      {
        status: 500,
      }
    );
  }
}