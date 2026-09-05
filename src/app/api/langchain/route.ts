import {
  runRecoveryTools,
} from "@/lib/langchain/run-tools";

import {
  NextRequest,
  NextResponse,
} from "next/server";

export async function POST(
  request: NextRequest
) {
  try {

    const body =
      await request.json();

    const result =
      await runRecoveryTools({
        failureReason: body.failureReason ??
          null,

        attempts: body.attempts ??
          1,

        lifetimeValue: body.lifetimeValue ??
          10000,

        monthlyValue: body.monthlyValue ??
          1000,

        successfulPayments: body.successfulPayments ??
          9,

        failedPayments: body.failedPayments ??
          1,

        previousFailureReasons: body.previousFailureReasons ??
          [
            "international_transaction_not_allowed",
          ],
        failureCode: null,
        failureSource: null,
        failureStep: null
      });

    return NextResponse.json({

      success: true,

      langchain: result,

    });

  } catch (error) {

    console.error(
      "LangChain test error:",
      error
    );

    return NextResponse.json(

      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "LangChain test failed",
      },

      {
        status: 500,
      }
    );
  }
}