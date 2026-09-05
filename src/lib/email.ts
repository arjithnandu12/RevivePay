import { Resend } from "resend";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(apiKey);
}

interface RecoveryEmailParams {
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: string;
  paymentUrl: string;
  attemptNumber: number;
  suggestedMessage?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendRecoveryEmail({
  customerName,
  customerEmail,
  amount,
  currency,
  paymentUrl,
  attemptNumber,
  suggestedMessage,
}: RecoveryEmailParams) {

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not configured"
    );
  }

  if (!fromEmail) {
    throw new Error(
      "RESEND_FROM_EMAIL is not configured"
    );
  }

  if (!customerEmail) {
    throw new Error(
      "Customer email is missing"
    );
  }

  if (!paymentUrl) {
    throw new Error(
      "Recovery payment URL is missing"
    );
  }

  const safeCustomerName =
    escapeHtml(customerName || "Customer");

  const safeMessage = escapeHtml(
    suggestedMessage ||
      "We noticed that your recent payment was unsuccessful. You can securely complete your payment using the link below."
  );

  const formattedAmount =
    `${currency.toUpperCase()} ${amount.toFixed(2)}`;

  

  console.log(
    "Sending RecoverAI recovery email",
    {
      to: customerEmail,
      attemptNumber,
      amount: formattedAmount,
    }
  );

  const { data, error } =
    await getResendClient().emails.send({
      from: fromEmail,

      to: [customerEmail],

      subject:
        `Action required: Complete your payment - RecoverAI`,

      html: `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>
    Complete your payment
  </title>
</head>

<body
  style="
    margin: 0;
    padding: 0;
    background-color: #f4f4f5;
    font-family: Arial, Helvetica, sans-serif;
    color: #18181b;
  "
>

  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
      background-color: #f4f4f5;
      padding: 40px 16px;
    "
  >

    <tr>
      <td align="center">

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            max-width: 600px;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
          "
        >

          <!-- HEADER -->

          <tr>
            <td
              style="
                padding: 28px 32px;
                background-color: #111827;
                text-align: center;
              "
            >

              <div
                style="
                  font-size: 24px;
                  font-weight: bold;
                  color: #ffffff;
                "
              >
                RecoverAI
              </div>

              <div
                style="
                  margin-top: 6px;
                  font-size: 13px;
                  color: #d1d5db;
                "
              >
                Secure payment recovery
              </div>

            </td>
          </tr>

          <!-- CONTENT -->

          <tr>
            <td
              style="
                padding: 36px 32px;
              "
            >

              <h2
                style="
                  margin: 0 0 20px;
                  font-size: 24px;
                  color: #111827;
                "
              >
                Hi ${safeCustomerName},
              </h2>

              <p
                style="
                  margin: 0 0 20px;
                  font-size: 16px;
                  line-height: 1.7;
                  color: #4b5563;
                "
              >
                ${safeMessage}
              </p>

              <!-- PAYMENT SUMMARY -->

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  margin: 24px 0;
                  background-color: #f9fafb;
                  border: 1px solid #e5e7eb;
                  border-radius: 8px;
                "
              >

                <tr>

                  <td
                    style="
                      padding: 16px;
                      font-size: 14px;
                      color: #6b7280;
                    "
                  >
                    Amount
                  </td>

                  <td
                    align="right"
                    style="
                      padding: 16px;
                      font-size: 16px;
                      font-weight: bold;
                      color: #111827;
                    "
                  >
                    ${formattedAmount}
                  </td>

                </tr>

                <tr>

                  <td
                    style="
                      padding: 16px;
                      border-top: 1px solid #e5e7eb;
                      font-size: 14px;
                      color: #6b7280;
                    "
                  >
                    Recovery attempt
                  </td>

                  <td
                    align="right"
                    style="
                      padding: 16px;
                      border-top: 1px solid #e5e7eb;
                      font-size: 16px;
                      font-weight: bold;
                      color: #111827;
                    "
                  >
                    #${attemptNumber}
                  </td>

                </tr>

              </table>

              <!-- BUTTON -->

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
              >

                <tr>

                  <td align="center">

                    <a
                      href="${paymentUrl}"
                      target="_blank"
                      style="
                        display: inline-block;
                        padding: 14px 28px;
                        background-color: #2563eb;
                        color: #ffffff;
                        text-decoration: none;
                        font-size: 16px;
                        font-weight: bold;
                        border-radius: 8px;
                      "
                    >
                      Complete Payment
                    </a>

                  </td>

                </tr>

              </table>

              <p
                style="
                  margin: 24px 0 0;
                  font-size: 13px;
                  line-height: 1.6;
                  color: #6b7280;
                  text-align: center;
                "
              >
                This secure payment link is provided by
                RecoverAI to help complete your payment.
              </p>

              <p
                style="
                  margin: 24px 0 0;
                  font-size: 14px;
                  line-height: 1.6;
                  color: #4b5563;
                "
              >
                If you have already completed this payment,
                you can safely ignore this email.
              </p>

            </td>
          </tr>

          <!-- FOOTER -->

          <tr>

            <td
              style="
                padding: 24px 32px;
                background-color: #f9fafb;
                border-top: 1px solid #e5e7eb;
                text-align: center;
              "
            >

              <p
                style="
                  margin: 0;
                  font-size: 13px;
                  color: #6b7280;
                "
              >
                Thanks,<br />
                <strong>RecoverAI</strong>
              </p>

            </td>

          </tr>

        </table>

      </td>
    </tr>

  </table>

</body>
</html>
      `,
    });

  

  if (error) {
    console.error(
      "Resend email error:",
      error
    );

    throw new Error(
      error.message ||
        "Failed to send recovery email"
    );
  }

  console.log(
    "Recovery email sent successfully",
    {
      messageId: data?.id ?? null,
      to: customerEmail,
    }
  );

  return {
    success: true,
    messageId: data?.id ?? null,
  };
}