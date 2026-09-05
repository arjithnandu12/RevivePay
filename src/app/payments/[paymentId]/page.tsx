"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ShieldCheck, ShieldX } from "lucide-react";
import AppShell from "@/components/layout/app-shell";

interface Customer {
  customerId: string;
  name: string;
  email: string;
  plan: string;
  monthlyValue: number;
  lifetimeValue: number;
  successfulPayments: number;
  failedPayments: number;
  createdAt: string;
}

interface Payment {
  paymentId: string;
  customerId: string;
  customer: Customer | null;
  amount: number;
  currency: string;
  status: "pending" | "success" | "failed";
  failureReason: string | null;
  attempts: number;
  razorpayPaymentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function PaymentDetailsPage() {
  const params = useParams();
  const paymentId = params.paymentId as string;

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [aiLoading, setAiLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    async function fetchPayment() {
      try {
        setLoading(true);

        const response = await fetch(`/api/payments/${paymentId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Payment not found");
        }

        setPayment(data.payment);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    if (paymentId) {
      fetchPayment();
    }
  }, [paymentId]);

  async function analyzeWithAI() {
    try {
      if (!payment) {
        setAiError("Payment data is not available");
        return;
      }

      setAiLoading(true);
      setAiError("");
      setAiResult(null);

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.paymentId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI analysis failed");
      }

      setAiResult(data);
    } catch (err) {
      console.error(err);
      setAiError(err instanceof Error ? err.message : "AI analysis failed");
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) {
  return (
    <AppShell>
      <div className="flex min-h-[500px] items-center justify-center">
        <div
          className="
            relative box-border w-[12em] overflow-hidden rounded-[4px]
            border-[0.1em] border-[#333]
            bg-[#1a1a1a]
            p-[1.5em_1em]
            font-mono text-[1em] text-[#00ff00]
            shadow-[0_4px_8px_rgba(0,0,0,0.2)]
          "
        >
          <div
            className="
              absolute inset-x-0 top-0 box-border h-[1.5em]
              rounded-t-[4px]
              bg-[#333]
              px-[0.4em]
            "
          >
            <div className="float-right">
              <span className="ml-[0.4em] inline-block h-[0.6em] w-[0.6em] rounded-full bg-[#e33]" />
              <span className="ml-[0.4em] inline-block h-[0.6em] w-[0.6em] rounded-full bg-[#ee0]" />
              <span className="ml-[0.4em] inline-block h-[0.6em] w-[0.6em] rounded-full bg-[#0b0]" />
            </div>

            <div className="float-left leading-[1.5em] text-[#eee]">
              Terminal
            </div>
          </div>

          <span
            className="
              mt-[1.5em] inline-block
              overflow-hidden whitespace-nowrap
              border-r-[0.2em] border-r-green-500
              animate-type-delete animate-blink-cursor
            "
          >
            Loading settings...
          </span>
        </div>
      </div>
    </AppShell>
  );
}

  if (error || !payment) {
    return (
      <AppShell>
        <div className="mx-auto max-w-4xl px-8 py-8">
          <Link
            href="/payments"
            className="flex items-center gap-1.5 text-[12.5px] text-text-tertiary hover:text-text-secondary"
          >
            <ArrowLeft size={13} />
            Back to Payments
          </Link>

          <div className="mt-8 rounded-lg border border-danger-border bg-danger-bg p-10 text-center">
            <h1 className="text-[16px] font-semibold text-danger">
              Payment Not Found
            </h1>
            <p className="mt-2 text-[13px] text-text-secondary">
              {error || "We couldn't find this payment."}
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-8 py-8">
        <Link
          href="/payments"
          className="flex items-center gap-1.5 text-[12.5px] text-text-tertiary hover:text-text-secondary"
        >
          <ArrowLeft size={13} />
          Back to Payments
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-[12.5px] text-text-tertiary">Payment</p>
            <h1 className="font-num mt-1 text-[24px] font-semibold text-text-primary">
              {payment.paymentId}
            </h1>
          </div>
          <StatusBadge status={payment.status} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-surface p-5">
            <p className="text-[12.5px] text-text-secondary">Amount</p>
            <p className="font-num mt-2 text-[24px] font-semibold text-text-primary">
              ₹{payment.amount.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-[11px] text-text-tertiary">
              {payment.currency}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface p-5">
            <p className="text-[12.5px] text-text-secondary">Attempts</p>
            <p className="font-num mt-2 text-[24px] font-semibold text-text-primary">
              {payment.attempts}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface p-5">
            <p className="text-[12.5px] text-text-secondary">Payment Date</p>
            <p className="mt-2 text-[15px] font-semibold text-text-primary">
              {formatDate(payment.createdAt)}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-border bg-surface p-6">
            <h2 className="text-[14px] font-semibold text-text-primary">
              Payment Information
            </h2>

            <div className="mt-5 space-y-4">
              <InfoRow label="Payment ID" value={payment.paymentId} mono />
              <InfoRow label="Customer ID" value={payment.customerId} mono />
              <InfoRow
                label="Razorpay Payment ID"
                value={payment.razorpayPaymentId || "Not available"}
                mono
              />
              <InfoRow
                label="Amount"
                value={`₹${payment.amount.toLocaleString("en-IN")}`}
                mono
              />
              <InfoRow label="Currency" value={payment.currency} mono />
              <InfoRow label="Attempts" value={payment.attempts.toString()} mono />
              <InfoRow label="Created" value={formatDate(payment.createdAt)} mono />
              <InfoRow
                label="Last Updated"
                value={formatDate(payment.updatedAt)}
                mono
              />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface p-6">
            <h2 className="text-[14px] font-semibold text-text-primary">
              Payment Status
            </h2>

            {payment.status === "failed" ? (
              <div className="mt-5">
                <div className="rounded-lg border border-danger-border bg-danger-bg p-5">
                  <p className="text-[12.5px] font-medium text-danger">
                    Payment Failed
                  </p>
                  <p className="mt-2 text-[15px] font-semibold text-text-primary">
                    {formatFailureReason(payment.failureReason || "Unknown reason")}
                  </p>
                  <p className="mt-2 text-[12.5px] text-text-secondary">
                    This payment can be analyzed by the recovery agent to
                    determine the best recovery strategy.
                  </p>
                </div>

                <button
                  onClick={analyzeWithAI}
                  disabled={aiLoading}
                  className="mt-4 w-full rounded-lg bg-text-primary px-5 py-3 text-[13px] font-medium text-bg transition hover:opacity-90 disabled:opacity-50"
                >
                  {aiLoading ? "Analyzing..." : "Analyze with AI"}
                </button>

                {aiError && (
                  <div className="mt-4 rounded-lg border border-danger-border bg-danger-bg p-4">
                    <p className="text-[13px] font-medium text-danger">
                      AI Analysis Failed
                    </p>
                    <p className="mt-1 text-[12.5px] text-text-secondary">
                      {aiError}
                    </p>
                  </div>
                )}

                {aiResult && (
                  <div className="mt-4 rounded-lg border border-agent-border bg-agent-bg p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-tertiary">
                          Recovery Agent
                        </p>
                        <h3 className="mt-1 text-[15px] font-bold text-text-primary">
                          AI Recommendation
                        </h3>
                      </div>

                      <RiskBadge risk={aiResult.recommendation.riskLevel} />
                    </div>

                    <div className="mt-4 rounded-md border border-border bg-bg-elevated p-4">
                      <p className="text-[10.5px] font-medium uppercase tracking-wide text-text-tertiary">
                        Recommended Strategy
                      </p>
                      <p className="mt-1.5 text-[16px] font-bold text-text-primary">
                        {aiResult.recommendation.strategy
                          .replaceAll("_", " ")
                          .toUpperCase()}
                      </p>
                    </div>

                    <div className="mt-3 rounded-md border border-border bg-bg-elevated p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[12.5px] font-medium text-text-secondary">
                          AI Confidence
                        </p>
                        <p className="font-num text-[13px] font-bold text-text-primary">
                          {Math.round(aiResult.recommendation.confidence * 100)}%
                        </p>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full bg-agent"
                          style={{
                            width: `${aiResult.recommendation.confidence * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-tertiary">
                        Why AI Recommended This
                      </p>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-text-secondary">
                        {aiResult.recommendation.reason}
                      </p>
                    </div>

                    <div className="mt-4">
                      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-tertiary">
                        Suggested Customer Message
                      </p>
                      <div className="mt-1.5 rounded-md border border-border bg-bg-elevated p-3.5">
                        <p className="text-[12.5px] leading-relaxed text-text-secondary">
                          {aiResult.recommendation.suggestedMessage}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-border pt-4">
                      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-tertiary">
                        Policy Engine
                      </p>
                      <div className="mt-2.5 flex items-center justify-between">
                        <span
                          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-bold ${
                            aiResult.policy.allowed
                              ? "border-success-border bg-success-bg text-success"
                              : "border-danger-border bg-danger-bg text-danger"
                          }`}
                        >
                          {aiResult.policy.allowed ? (
                            <ShieldCheck size={12} />
                          ) : (
                            <ShieldX size={12} />
                          )}
                          {aiResult.policy.allowed ? "ACTION ALLOWED" : "ACTION BLOCKED"}
                        </span>

                        {aiResult.policy.requiresApproval && (
                          <span className="text-[11px] font-medium text-warning">
                            Requires Approval
                          </span>
                        )}
                      </div>
                      <p className="mt-2.5 text-[12.5px] text-text-secondary">
                        {aiResult.policy.reason}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : payment.status === "success" ? (
              <div className="mt-5 rounded-lg border border-success-border bg-success-bg p-5">
                <p className="text-[13px] font-semibold text-success">
                  Payment Successful
                </p>
                <p className="mt-2 text-[12.5px] text-text-secondary">
                  This payment was successfully processed.
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-warning-border bg-warning-bg p-5">
                <p className="text-[13px] font-semibold text-warning">
                  Payment Pending
                </p>
                <p className="mt-2 text-[12.5px] text-text-secondary">
                  This payment is still being processed.
                </p>
              </div>
            )}
          </section>
        </div>

        {payment.customer && (
          <section className="mt-4 rounded-lg border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-semibold text-text-primary">
                  Customer Information
                </h2>
                <p className="mt-1 text-[12.5px] text-text-tertiary">
                  Customer history and payment behavior
                </p>
              </div>
              <div className="rounded-md border border-border bg-bg-elevated px-3.5 py-1.5 text-[12.5px] font-medium text-text-primary">
                {payment.customer.plan}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <CustomerStat label="Customer" value={payment.customer.name} />
              <CustomerStat label="Email" value={payment.customer.email} />
              <CustomerStat
                label="Lifetime Value"
                value={`₹${payment.customer.lifetimeValue.toLocaleString("en-IN")}`}
                mono
              />
              <CustomerStat
                label="Monthly Value"
                value={`₹${payment.customer.monthlyValue.toLocaleString("en-IN")}`}
                mono
              />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-md border border-success-border bg-success-bg p-4">
                <p className="text-[12.5px] text-text-secondary">
                  Successful Payments
                </p>
                <p className="font-num mt-1.5 text-[20px] font-semibold text-success">
                  {payment.customer.successfulPayments}
                </p>
              </div>

              <div className="rounded-md border border-danger-border bg-danger-bg p-4">
                <p className="text-[12.5px] text-text-secondary">
                  Failed Payments
                </p>
                <p className="font-num mt-1.5 text-[20px] font-semibold text-danger">
                  {payment.customer.failedPayments}
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function StatusBadge({
  status,
}: {
  status: "pending" | "success" | "failed";
}) {
  const styles = {
    success: "bg-success-bg text-success border-success-border",
    failed: "bg-danger-bg text-danger border-danger-border",
    pending: "bg-warning-bg text-warning border-warning-border",
  };

  const labels = { success: "SUCCESS", failed: "FAILED", pending: "PENDING" };

  return (
    <span
      className={`rounded-md border px-3 py-1.5 text-[12px] font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function RiskBadge({ risk }: { risk: "LOW" | "MEDIUM" | "HIGH" }) {
  const styles = {
    LOW: "bg-success-bg text-success border-success-border",
    MEDIUM: "bg-warning-bg text-warning border-warning-border",
    HIGH: "bg-danger-bg text-danger border-danger-border",
  };
  return (
    <span
      className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold ${styles[risk]}`}
    >
      {risk} RISK
    </span>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-border pb-4 last:border-0 last:pb-0">
      <p className="text-[10.5px] uppercase tracking-wide text-text-tertiary">
        {label}
      </p>
      <p
        className={`break-all text-[13px] font-medium text-text-primary ${
          mono ? "font-num" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function CustomerStat({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-bg-elevated p-4">
      <p className="text-[11px] text-text-tertiary">{label}</p>
      <p
        className={`mt-2 break-all text-[13px] font-semibold text-text-primary ${
          mono ? "font-num" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function formatFailureReason(reason: string) {
  return reason
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}