"use client";

import Script from "next/script";
import { FormEvent, useState } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

export default function TestPayment() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [amount, setAmount] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);

  const handlePayment = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setMessage("");

   

    if (!name.trim()) {
      setMessage("Please enter your name.");
      return;
    }

    if (!email.trim()) {
      setMessage("Please enter your email.");
      return;
    }

    if (!mobile.trim()) {
      setMessage("Please enter your mobile number.");
      return;
    }

    if (!/^[0-9]{10}$/.test(mobile.trim())) {
      setMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      setMessage("Please enter a valid amount.");
      return;
    }

    try {
      setLoading(true);

   
      const response = await fetch(
        "/api/payments/create-order",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            amount: numericAmount,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to create order"
        );
      }

      console.log(
        "NEW RAZORPAY ORDER:",
        data.order.id
      );

      console.log(
        "NEW LOCAL PAYMENT:",
        data.payment.paymentId
      );

      console.log(
        "CUSTOMER:",
        data.customer
      );

    

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,

        amount: data.order.amount,
        currency: data.order.currency,

        name: "AI Revenue Recovery",
        description: "Test Payment",

       
        order_id: data.order.id,

        prefill: {
          name: name.trim(),
          email: email.trim(),
          contact: mobile.trim(),
        },

        notes: {
          customerId: data.customer.customerId,
          paymentId: data.payment.paymentId,
        },

    

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async function (response: any) {
          try {
            console.log("Payment successful!");
            console.log(
              "Razorpay response:",
              response
            );

            const verificationResponse =
              await fetch(
                "/api/payments/verify",
                {
                  method: "POST",
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                  body: JSON.stringify({
                    razorpay_payment_id:
                      response.razorpay_payment_id,

                    razorpay_order_id:
                      response.razorpay_order_id,

                    razorpay_signature:
                      response.razorpay_signature,

                    amount: numericAmount,

                 
                    customerId:
                      data.customer.customerId,
                  }),
                }
              );

            const verification =
              await verificationResponse.json();

            console.log(
              "Verification:",
              verification
            );

            if (!verification.success) {
              setMessage(
                "Payment completed but verification failed."
              );
              return;
            }

            setMessage(
              "✅ Payment successful and verified!"
            );
            setPaymentId(verification.payment?.paymentId ?? data.payment.paymentId);
          } catch (error) {
            console.error(
              "Verification error:",
              error
            );

            setMessage(
              "Payment succeeded but verification failed."
            );
          }
        },

       

        modal: {
          ondismiss: function () {
            console.log(
              " Razorpay checkout closed"
            );
          },
        },
      };

      const razorpay =
        new window.Razorpay(options);

    

      razorpay.on(
        "payment.failed",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function (response: any) {
          console.error(
            "Payment failed:",
            response
          );

          console.log(
            "Failure reason:",
            response.error?.description
          );

          setMessage(
            "❌ Payment failed. RecoverAI will process the recovery."
          );
        }
      );

      razorpay.open();
    } catch (error) {
      console.error(
        "Payment error:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />

      <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md">

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">
              Test Payment
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              AI Revenue Recovery
            </p>
          </div>

          <form
            onSubmit={handlePayment}
            className="space-y-5 rounded-2xl border border-gray-800 bg-gray-950 p-6"
          >

            <div>
              <label className="mb-2 block text-sm font-medium">
                Full Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="Enter your name"
                className="w-full rounded-lg border border-gray-700 bg-black px-4 py-3 text-white outline-none focus:border-gray-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="you@example.com"
                className="w-full rounded-lg border border-gray-700 bg-black px-4 py-3 text-white outline-none focus:border-gray-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Mobile Number
              </label>

              <input
                type="tel"
                value={mobile}
                onChange={(e) =>
                  setMobile(e.target.value.replace(/\D/g, ""))
                }
                placeholder="9876543210"
                maxLength={10}
                className="w-full rounded-lg border border-gray-700 bg-black px-4 py-3 text-white outline-none focus:border-gray-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Amount (₹)
              </label>

              <input
                type="number"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value)
                }
                placeholder="1000"
                min="1"
                step="1"
                className="w-full rounded-lg border border-gray-700 bg-black px-4 py-3 text-white outline-none focus:border-gray-400"
              />
            </div>

            {message && (
              <div className="rounded-lg border border-gray-800 bg-gray-900 p-3 text-sm text-gray-300">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-white px-6 py-3 font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Creating Order..."
                : amount
                ? `Pay ₹${amount}`
                : "Pay"}
            </button>
          </form>

          {paymentId && (
            <section className="mt-5 rounded-2xl border border-red-900 bg-gray-950 p-6">
              <h2 className="text-lg font-semibold text-white">Refund captured payment</h2>
              <p className="mt-1 text-xs text-gray-400">Refunding stops active recovery and promise-to-pay workflows.</p>
              <input
                value={refundReason}
                onChange={(event) => setRefundReason(event.target.value)}
                placeholder="Refund reason (optional)"
                className="mt-4 w-full rounded-lg border border-gray-700 bg-black px-4 py-3 text-white outline-none focus:border-red-400"
              />
              <button
                type="button"
                disabled={refundLoading}
                onClick={async () => {
                  setRefundLoading(true);
                  try {
                    const response = await fetch(`/api/payments/${paymentId}/refund`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ reason: refundReason }),
                    });
                    const result = await response.json();
                    setMessage(response.ok && result.success ? `Refund requested: ${result.refundId}` : result.error || "Refund failed.");
                  } catch (error) {
                    setMessage(error instanceof Error ? error.message : "Refund failed.");
                  } finally {
                    setRefundLoading(false);
                  }
                }}
                className="mt-3 w-full rounded-lg bg-red-500 px-6 py-3 font-semibold text-white transition hover:bg-red-400 disabled:opacity-50"
              >
                {refundLoading ? "Requesting refund..." : "Request refund"}
              </button>
            </section>
          )}

          <p className="mt-5 text-center text-xs text-gray-500">
            Every click creates a new Razorpay order
            and a new payment record.
          </p>

        </div>
      </main>
    </>
  );
}