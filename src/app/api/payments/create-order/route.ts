import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import Customer from "@/models/Customer";
import { createOrderSchema, publicError } from "@/lib/validation";
import { getRazorpayClient } from "@/lib/razorpay";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Name, email and valid amount are required.",
        },
        { status: 400 }
      );
    }

    const { name, email, amount } = parsed.data;

    await connectDB();

    

    let customer = await Customer.findOne({ email });

    if (!customer) {
      const customerId = `CUS_${Date.now()}`;

      customer = await Customer.create({
        customerId,
        name,
        email,

       
        plan: "Test Plan",
        monthlyValue: amount,
        lifetimeValue: 0,
        successfulPayments: 0,
        failedPayments: 0,
      });

      console.log(
        "New customer created:",
        customer.customerId
      );
    } else {
      console.log(
        "Existing customer:",
        customer.customerId
      );
    }

    const amountInPaise = Math.round(amount * 100);

    const order = await getRazorpayClient().orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        customerId: customer.customerId,
        email: customer.email,
      },
    });

    console.log(
      "Razorpay order created:",
      order.id
    );

   

    const payment = await Payment.create({
      paymentId: `pending_${order.id}`,

      orderId: order.id,

      customerId: customer.customerId,

      amount,

      currency: "INR",

      status: "pending",

      attempts: 0,

      recoveryStatus: "pending",
    });

    console.log(
      "Payment record created:",
      payment.paymentId
    );

    return NextResponse.json({
      success: true,

      customer: {
        customerId: customer.customerId,
        name: customer.name,
        email: customer.email,
      },

      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },

      payment: {
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        customerId: payment.customerId,
      },
    });
  } catch (error) {
    console.error(
      "Razorpay order creation error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: publicError(error, "Failed to create Razorpay order."),
      },
      { status: 500 }
    );
  }
}