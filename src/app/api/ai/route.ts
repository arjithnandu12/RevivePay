import { NextResponse } from "next/server";

import Payment from "@/models/Payment";
import Customer from "@/models/Customer";
import RecoveryAttempt from "@/models/RecoveryAttempt";

import { connectDB } from "@/lib/mongodb";

import {
  type AIContext,
} from "@/lib/ai";

import {
  analyzePaymentWithTools,
} from "@/lib/langchain/analyze-with-tools";

import {
  evaluateRecoveryPolicy,
} from "@/lib/policy-engine";

export async function POST(
  request: Request
) {

  try {

    await connectDB();

    const body =
      await request.json();

    const paymentId =
      body.paymentId;

    if (!paymentId) {

      return NextResponse.json(
        {
          success: false,
          error:
            "paymentId is required",
        },
        {
          status: 400,
        }
      );
    }

    const payment =
      await Payment.findOne({
        paymentId,
      }).lean();

    if (!payment) {

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment not found",
        },
        {
          status: 404,
        }
      );
    }

    const customer =
      await Customer.findOne({
        customerId:
          payment.customerId,
      }).lean();

    if (!customer) {

      return NextResponse.json(
        {
          success: false,
          error:
            "Customer not found",
        },
        {
          status: 404,
        }
      );
    }

    const paymentHistory =
      await Payment.find({
        customerId:
          customer.customerId,
      })
        .sort({
          createdAt: -1,
        })
        .lean();

    const recoveryAttemptsUsed = await RecoveryAttempt.countDocuments({
      paymentId,
      status: { $ne: "cancelled" },
    });

    const context: AIContext = {

      customer: {

        customerId:
          customer.customerId,

        name:
          customer.name,

        email:
          customer.email,

        plan:
          customer.plan,

        monthlyValue:
          customer.monthlyValue,

        lifetimeValue:
          customer.lifetimeValue,

        successfulPayments:
          customer.successfulPayments,

        failedPayments:
          customer.failedPayments,
      },

      currentPayment: {

        paymentId:
          payment.paymentId,

        amount:
          payment.amount,

        currency:
          payment.currency,

        status:
          payment.status,

        failureReason:
          payment.failureReason ??
          null,

        failureCode:
          payment.failureCode ??
          null,

        failureSource:
          payment.failureSource ??
          null,

        failureStep:
          payment.failureStep ??
          null,

        attempts:
          recoveryAttemptsUsed,
      },

      paymentHistory:
        paymentHistory.map(
          (item) => ({

            paymentId:
              item.paymentId,

            amount:
              item.amount,

            currency:
              item.currency,

            status:
              item.status,

            failureReason:
              item.failureReason ??
              null,

            attempts:
              item.attempts,

            createdAt:
              new Date(
                item.createdAt
              ).toISOString(),
          })
        ),
    };

    console.log(
      "Running LangChain + AI analysis..."
    );

    const analysis =
      await analyzePaymentWithTools(
        context
      );

    const recommendation =
      analysis.recommendation;

    recommendation.recoveryProbability = Math.min(1, Math.max(0,
      recommendation.recoveryProbability || (recommendation.confidence * (analysis.tools.verifiedFacts.failureCategory === "temporary" ? 1 : 0.55))
    ));
    recommendation.recommendedDelayMinutes = recommendation.recommendedDelayMinutes || 720;
    recommendation.channel = recommendation.channel || "email";

    const policy =
      evaluateRecoveryPolicy({

        strategy:
          recommendation.strategy,

        paymentAmount:
          payment.amount,

        attempts:
          payment.attempts,

        customerLifetimeValue:
          customer.lifetimeValue,

        successfulPayments:
          customer.successfulPayments,

        failedPayments:
          customer.failedPayments,

        failureReason:
          payment.failureReason,
      });

    return NextResponse.json({

      success: true,

      paymentId,

      recommendation,

      policy,

      langchain: {

        failureAnalysis:
          analysis.tools
            .failureAnalysis,

        customerAnalysis:
          analysis.tools
            .customerAnalysis,

        retrySafety:
          analysis.tools
            .retrySafety,

        strategyHint:
          analysis.tools
            .strategyHint,
      },

      context: {

        customerId:
          customer.customerId,

        customerName:
          customer.name,

        lifetimeValue:
          customer.lifetimeValue,

        paymentAmount:
          payment.amount,

        failureReason:
          payment.failureReason ??
          null,
      },

    });

  } catch (error) {

    console.error(
      "AI API error:",
      error
    );

    return NextResponse.json(

      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "AI analysis failed",
      },

      {
        status: 500,
      }
    );
  }
}