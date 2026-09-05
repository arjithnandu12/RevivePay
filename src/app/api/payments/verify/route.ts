import { NextResponse } from "next/server";
import crypto from "crypto";

import { connectDB } from "@/lib/mongodb";

import Payment from "@/models/Payment";
import Customer from "@/models/Customer";
import RecoveryAttempt from "@/models/RecoveryAttempt";
import { paymentVerificationSchema, publicError } from "@/lib/validation";
import { getRazorpayClient } from "@/lib/razorpay";

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const parsed = paymentVerificationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing payment verification data",
        },
        {
          status: 400,
        }
      );
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

    const secret =
      process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Razorpay secret is not configured",
        },
        {
          status: 500,
        }
      );
    }

    const generatedSignature =
      crypto
        .createHmac(
          "sha256",
          secret
        )
        .update(
          `${razorpay_order_id}|${razorpay_payment_id}`
        )
        .digest("hex");

    const signaturesMatch = generatedSignature.length === razorpay_signature.length &&
      crypto.timingSafeEqual(Buffer.from(generatedSignature), Buffer.from(razorpay_signature));

    if (!signaturesMatch) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid payment signature",
        },
        {
          status: 400,
        }
      );
    }

    await connectDB();

    const razorpayOrder =
      await getRazorpayClient().orders.fetch(
        razorpay_order_id
      );

    const orderNotes =
      (
        razorpayOrder as {
          notes?: Record<
            string,
            string
          >;
        }
      ).notes ?? {};

    const isRecovery =
      orderNotes.recovery ===
      "true";

    const originalPaymentId =
      orderNotes.originalPaymentId;

    console.log(
      "Payment verification:",
      {
        razorpayOrderId:
          razorpay_order_id,

        razorpayPaymentId:
          razorpay_payment_id,

        isRecovery,

        originalPaymentId,
      }
    );

    if (
      isRecovery &&
      originalPaymentId
    ) {
      return await verifyRecoveryPayment(
        {
          originalPaymentId,

          razorpayOrderId:
            razorpay_order_id,

          razorpayPaymentId:
            razorpay_payment_id,
        }
      );
    }

    return await verifyInitialPayment(
      {
        razorpayOrderId:
          razorpay_order_id,

        razorpayPaymentId:
          razorpay_payment_id,
      }
    );
  } catch (error) {
    console.error(
      "Payment verification error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error: publicError(error, "Payment verification failed."),
      },
      {
        status: 500,
      }
    );
  }
}

async function verifyInitialPayment({
  razorpayOrderId,
  razorpayPaymentId,
}: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
}) {
  const payment =
    await Payment.findOne({
      orderId:
        razorpayOrderId,
    });

  if (!payment) {
    return NextResponse.json(
      {
        success: false,

        error:
          "Payment record not found",
      },
      {
        status: 404,
      }
    );
  }

  if (
    payment.status ===
    "success"
  ) {
    return NextResponse.json({
      success: true,

      message:
        "Payment already verified",

      payment: {
        paymentId:
          payment.paymentId,

        razorpayPaymentId:
          payment.razorpayPaymentId,

        orderId:
          payment.orderId,

        status:
          payment.status,
      },
    });
  }

  const updatedPayment =
    await Payment.findOneAndUpdate(
      {
        paymentId:
          payment.paymentId,

        status: {
          $ne: "success",
        },
      },
      {
        $set: {
          razorpayPaymentId:
            razorpayPaymentId,

          status:
            "success",

          attempts:
            Math.max(
              payment.attempts,
              1
            ),
        },
      },
      {
        returnDocument:
          "after",
      }
    );

  if (!updatedPayment) {
    return NextResponse.json({
      success: true,

      message:
        "Payment already verified",
    });
  }

  const customer =
    await Customer.findOneAndUpdate(
      {
        customerId:
          updatedPayment.customerId,
      },
      {
        $inc: {
          successfulPayments:
            1,

          lifetimeValue:
            updatedPayment.amount,
        },
      },
      {
        returnDocument:
          "after",
      }
    );

  console.log(
    "Initial payment successful:",
    razorpayPaymentId
  );

  return NextResponse.json({
    success: true,

    message:
      "Payment verified successfully",

    payment: {
      paymentId:
        updatedPayment.paymentId,

      razorpayPaymentId:
        updatedPayment.razorpayPaymentId,

      orderId:
        updatedPayment.orderId,

      customerId:
        updatedPayment.customerId,

      amount:
        updatedPayment.amount,

      status:
        updatedPayment.status,
    },

    customer: customer
      ? {
          successfulPayments:
            customer.successfulPayments,

          lifetimeValue:
            customer.lifetimeValue,
        }
      : null,
  });
}

async function verifyRecoveryPayment({
  originalPaymentId,
  razorpayOrderId,
  razorpayPaymentId,
}: {
  originalPaymentId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
}) {

  const payment =
    await Payment.findOne({
      paymentId:
        originalPaymentId,
    });

  if (!payment) {
    return NextResponse.json(
      {
        success: false,

        error:
          "Original payment not found",
      },
      {
        status: 404,
      }
    );
  }

  const recoveryAttempt =
    await RecoveryAttempt.findOne({
      paymentId:
        originalPaymentId,
    });

  if (!recoveryAttempt) {
    return NextResponse.json(
      {
        success: false,

        error:
          "Recovery attempt not found",
      },
      {
        status: 404,
      }
    );
  }

  if (
    payment.recoveryStatus ===
    "recovered"
  ) {
    return NextResponse.json({
      success: true,

      message:
        "Recovery payment already processed",

      paymentId:
        originalPaymentId,

      recoveryPaymentId:
        recoveryAttempt
          .recoveryRazorpayPaymentId,
    });
  }

  const updatedAttempt =
    await RecoveryAttempt.findOneAndUpdate(
      {
        paymentId:
          originalPaymentId,

        status: {
          $ne: "success",
        },
      },
      {
        $set: {
          status:
            "success",

          recoveredAmount:
            payment.amount,

          recoveryOrderId:
            razorpayOrderId,

          recoveryRazorpayPaymentId:
            razorpayPaymentId,
        },

        $unset: {
          errorMessage: 1,
        },
      },
      {
        returnDocument:
          "after",
      }
    );

  if (!updatedAttempt) {
    const currentAttempt =
      await RecoveryAttempt.findOne({
        paymentId:
          originalPaymentId,
      }).lean();

    return NextResponse.json({
      success: true,

      message:
        "Recovery payment already processed",

      paymentId:
        originalPaymentId,

      recoveryPaymentId:
        currentAttempt
          ?.recoveryRazorpayPaymentId ??
        razorpayPaymentId,
    });
  }

  const updatedPayment =
    await Payment.findOneAndUpdate(
      {
        paymentId:
          originalPaymentId,

        recoveryStatus: {
          $ne: "recovered",
        },
      },
      {
        $set: {
          recoveryStatus:
            "recovered",

          recoveryAction:
            "payment_recovered",
        },
      },
      {
        returnDocument:
          "after",
      }
    );

  if (!updatedPayment) {
    return NextResponse.json({
      success: true,

      message:
        "Recovery payment already processed",

      paymentId:
        originalPaymentId,
    });
  }

  const customer =
    await Customer.findOneAndUpdate(
      {
        customerId:
          updatedPayment.customerId,
      },
      {
        $inc: {
          successfulPayments:
            1,

          lifetimeValue:
            updatedPayment.amount,
        },
      },
      {
        returnDocument:
          "after",
      }
    );

  console.log(
    "RECOVERY SUCCESS:",
    {
      originalPaymentId,

      originalPaymentStatus:
        updatedPayment.status,

      recoveryStatus:
        updatedPayment.recoveryStatus,

      recoveryOrderId:
        razorpayOrderId,

      recoveryPaymentId:
        razorpayPaymentId,

      amount:
        updatedPayment.amount,
    }
  );

  return NextResponse.json({
    success: true,

    message:
      "Payment successfully recovered",

    recovery: {
      originalPaymentId,

      recoveryOrderId:
        razorpayOrderId,

      recoveryPaymentId:
        razorpayPaymentId,

      recoveredAmount:
        updatedPayment.amount,
    },

    payment: {
      paymentId:
        updatedPayment.paymentId,

      status:
        updatedPayment.status,

      recoveryStatus:
        updatedPayment.recoveryStatus,
    },

    customer: customer
      ? {
          successfulPayments:
            customer.successfulPayments,

          lifetimeValue:
            customer.lifetimeValue,
        }
      : null,
  });
}