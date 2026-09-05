"use client";

import Script from "next/script";
import { useState } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

export default function PayPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function createPayment() {
    if (!name || !email || !amount) {
      alert("Please fill all fields");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          amount: Number(amount),
        }),
      });

      const data = await response.json();

      console.log("Create order response:", data);

      if (!response.ok || !data.success) {
        alert(data.error || "Failed to create order");
        return;
      }

      console.log("Customer:", data.customer);
      console.log("Razorpay Order:", data.order);

      if (!window.Razorpay) {
        alert("Razorpay SDK is not loaded. Please refresh the page.");
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,

        amount: data.order.amount,
        currency: data.order.currency,

        name: "RevivePay",
        description: "Test Payment",

        order_id: data.order.id,

        prefill: {
          name: data.customer.name,
          email: data.customer.email,
        },

        notes: {
          customerId: data.customer.customerId,
        },

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async function (paymentResponse: any) {
          console.log("Razorpay response:", paymentResponse);

          try {
            const verifyResponse = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                amount: Number(amount),
                customerId: data.customer.customerId,
              }),
            });

            const verifyData = await verifyResponse.json();

            console.log("Verification response:", verifyData);

            if (!verifyResponse.ok || !verifyData.success) {
              alert(verifyData.error || "Payment verification failed");
              return;
            }

            alert("Payment successful and saved to MongoDB!");

            setName("");
            setEmail("");
            setAmount("");
          } catch (error) {
            console.error("Verification error:", error);
            alert("Payment verification failed");
          }
        },

        modal: {
          ondismiss: function () {
            console.log("Razorpay checkout closed");
          },
        },

        theme: {
          color: "#edeff2",
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on(
        "payment.failed",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function (response: any) {
          console.error("Payment failed:", response);
          alert(response.error?.description || "Payment failed");
        }
      );

      razorpay.open();
    } catch (error) {
      console.error("Payment error:", error);
      alert(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />

      <main className="flex min-h-screen items-center justify-center bg-bg p-8">
        <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8">
          <div className="mb-6 flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-text-primary">
              <span className="text-[13px] font-semibold text-bg">R</span>
            </div>
            <div>
              <p className="text-[13.5px] font-semibold text-text-primary">
                RevivePay
              </p>
              <p className="text-[10.5px] text-text-tertiary">
                Powered by Razorpay
              </p>
            </div>
          </div>

          <h1 className="text-[19px] font-semibold text-text-primary">
            Make Payment
          </h1>

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-[12.5px] font-medium text-text-secondary">
                Name
              </label>
              <input
                type="text"
                placeholder="Rahul"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-border bg-bg-elevated p-3 text-[13px] text-text-primary outline-none placeholder:text-text-tertiary focus:border-agent"
              />
            </div>

            <div>
              <label className="text-[12.5px] font-medium text-text-secondary">
                Email
              </label>
              <input
                type="email"
                placeholder="rahul@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-border bg-bg-elevated p-3 text-[13px] text-text-primary outline-none placeholder:text-text-tertiary focus:border-agent"
              />
            </div>

            <div>
              <label className="text-[12.5px] font-medium text-text-secondary">
                Amount
              </label>
              <input
                type="number"
                placeholder="999"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="font-num mt-1.5 w-full rounded-md border border-border bg-bg-elevated p-3 text-[13px] text-text-primary outline-none placeholder:text-text-tertiary focus:border-agent"
              />
            </div>

            <button
              onClick={createPayment}
              disabled={loading}
              className="w-full rounded-md bg-text-primary p-3 text-[13px] font-medium text-bg transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Opening Razorpay..." : `Pay ₹${amount || "0"}`}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}