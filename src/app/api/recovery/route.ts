import { NextResponse } from "next/server";

import {
  runRecoveryEngine,
} from "@/lib/recovery-engine";
import { paymentIdSchema, publicError } from "@/lib/validation";

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const parsedPaymentId = paymentIdSchema.safeParse(body.paymentId);

    if (!parsedPaymentId.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            "paymentId is required.",
        },
        {
          status: 400,
        }
      );
    }

    const paymentId = parsedPaymentId.data;

    const result =
      await runRecoveryEngine(
        paymentId
      );

    return NextResponse.json(
      result
    );
  } catch (error) {
    console.error(
      "Recovery API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error: publicError(error, "Recovery failed."),
      },
      {
        status: 500,
      }
    );
  }
}