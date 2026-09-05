import Razorpay from "razorpay";

export function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured.");
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

interface CreatePaymentLinkInput {
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  paymentId: string;
  customerId: string;
}

interface PaymentLinkResult {
  id: string;
  url: string;
}

export async function createPaymentLink({
  amount,
  currency,
  customerName,
  customerEmail,
  paymentId,
  customerId,
}: CreatePaymentLinkInput): Promise<PaymentLinkResult> {
  if (!process.env.RAZORPAY_KEY_ID) {
    throw new Error(
      "RAZORPAY_KEY_ID is not configured."
    );
  }

  if (!process.env.RAZORPAY_KEY_SECRET) {
    throw new Error(
      "RAZORPAY_KEY_SECRET is not configured."
    );
  }

  if (!customerName?.trim()) {
    throw new Error(
      "Customer name is required."
    );
  }

  if (!customerEmail?.trim()) {
    throw new Error(
      "Customer email is required."
    );
  }

  if (!paymentId?.trim()) {
    throw new Error(
      "Payment ID is required."
    );
  }

  if (!customerId?.trim()) {
    throw new Error(
      "Customer ID is required."
    );
  }

  if (!currency?.trim()) {
    throw new Error(
      "Currency is required."
    );
  }

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "Payment Link amount must be greater than zero."
    );
  }

  const amountInSmallestUnit =
    Math.round(amount * 100);

  if (amountInSmallestUnit <= 0) {
    throw new Error(
      "Invalid Payment Link amount."
    );
  }

  try {
    const paymentLink =
      await getRazorpayClient().paymentLink.create({
        amount:
          amountInSmallestUnit,

        currency:
          currency.toUpperCase(),

        description:
          `RecoverAI payment recovery - ${paymentId}`,

        customer: {
          name:
            customerName.trim(),

          email:
            customerEmail.trim(),
        },

        notify: {
          email: false,
          sms: false,
        },

        reminder_enable: false,

        notes: {
          paymentId,
          customerId,
          recovery: "true",
        },
      });

    if (!paymentLink.id) {
      throw new Error(
        "Razorpay did not return a Payment Link ID."
      );
    }

    if (!paymentLink.short_url) {
      throw new Error(
        "Razorpay did not return a Payment Link URL."
      );
    }

    return {
      id: paymentLink.id,
      url: paymentLink.short_url,
    };
  } catch (error) {
    console.error(
      "Failed to create Razorpay Payment Link:",
      error
    );

    throw error;
  }
}