import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import { paymentIdSchema, publicError } from "@/lib/validation";
import { getRazorpayClient } from "@/lib/razorpay";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsedPaymentId = paymentIdSchema.safeParse(body.paymentId);

    if (!parsedPaymentId.success) {
      return NextResponse.json(
        {
          success: false,
          error: "paymentId is required",
        },
        { status: 400 }
      );
    }

    const paymentId = parsedPaymentId.data;

    await connectDB();

    const payment = await Payment.findOne({
      paymentId,
    });

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment not found",
        },
        { status: 404 }
      );
    }

    if (payment.status === "success") {
      return NextResponse.json(
        {
          success: false,
          error: "Payment is already successful",
        },
        { status: 400 }
      );
    }

    if (payment.recoveryStatus === "unrecoverable") {
      return NextResponse.json(
        {
          success: false,
          error: "Payment is marked unrecoverable",
        },
        { status: 400 }
      );
    }

    const amountInPaise = Math.round(
      payment.amount * 100
    );

    const order = await getRazorpayClient().orders.create({
      amount: amountInPaise,
      currency: payment.currency,
      receipt: `recovery_${payment.orderId}_${Date.now()}`,
      notes: {
        originalPaymentId: payment.paymentId,
        customerId: payment.customerId,
        recovery: "true",
      },
    });

    return NextResponse.json({
      success: true,

      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },

      payment: {
        paymentId: payment.paymentId,
        customerId: payment.customerId,
        amount: payment.amount,
      },
    });
  } catch (error) {
    console.error(
      "Recovery order error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: publicError(error, "Failed to create recovery order."),
      },
      { status: 500 }
    );
  }
}