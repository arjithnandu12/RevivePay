"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
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
  updatedAt: string;
}

interface Payment {
  paymentId: string;
  amount: number;
  currency: string;
  status: "pending" | "success" | "failed";
  failureReason: string | null;
  attempts: number;
  createdAt: string;
}

export default function CustomerDetailsPage() {
  const params = useParams();
  const customerId = params.customerId as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchCustomer() {
      try {
        setLoading(true);

        const response = await fetch(`/api/customers/${customerId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Customer not found");
        }

        setCustomer(data.customer);
        setPayments(data.payments || []);
        setCurrentPayment(data.currentPayment || null);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    if (customerId) {
      fetchCustomer();
    }
  }, [customerId]);

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
               Status:
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
             Loading ...
           </span>
         </div>
       </div>
     </AppShell>
   );
 }
 

  if (error || !customer) {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl px-8 py-8">
          <Link
            href="/customers"
            className="flex items-center gap-1.5 text-[12.5px] text-text-tertiary hover:text-text-secondary"
          >
            <ArrowLeft size={13} />
            Back to Customers
          </Link>

          <div className="mt-8 rounded-lg border border-danger-border bg-danger-bg p-10 text-center">
            <h1 className="text-[16px] font-semibold text-danger">
              Customer Not Found
            </h1>
            <p className="mt-2 text-[13px] text-text-secondary">{error}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-8 py-8">
        <Link
          href="/customers"
          className="flex items-center gap-1.5 text-[12.5px] text-text-tertiary hover:text-text-secondary"
        >
          <ArrowLeft size={13} />
          Back to Customers
        </Link>

        <div className="mt-4 rounded-lg border border-border bg-surface p-7">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
            <div>
              <p className="font-num text-[12.5px] text-text-tertiary">
                {customer.customerId}
              </p>
              <h1 className="mt-1 text-[24px] font-semibold text-text-primary">
                {customer.name}
              </h1>
              <p className="mt-1.5 text-[13px] text-text-secondary">
                {customer.email}
              </p>
            </div>

            <div className="rounded-md border border-border bg-bg-elevated px-4 py-2 text-[12.5px] font-semibold text-text-primary">
              {customer.plan}
            </div>
          </div>

          <div className="mt-6">
            <p className="text-[12.5px] text-text-secondary">Lifetime Value</p>
            <p className="font-num mt-1 text-[32px] font-semibold text-text-primary">
              ₹{customer.lifetimeValue.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            title="Successful Payments"
            value={customer.successfulPayments.toString()}
            tone="success"
          />
          <StatCard
            title="Failed Payments"
            value={customer.failedPayments.toString()}
            tone="danger"
          />
          <StatCard
            title="Current Payment"
            value={
              currentPayment
                ? `₹${currentPayment.amount.toLocaleString("en-IN")}`
                : "—"
            }
          />
        </div>

        <section className="mt-4 rounded-lg border border-agent-border bg-agent-bg p-6">
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-agent">
            AI Agent Context
          </p>
          <h2 className="mt-1 text-[15px] font-semibold text-text-primary">
            Customer Intelligence
          </h2>
          <p className="mt-1 text-[12.5px] text-text-secondary">
            This customer history is provided as context to the recovery agent.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <IntelligenceCard label="Plan" value={customer.plan} />
            <IntelligenceCard
              label="Lifetime Value"
              value={`₹${customer.lifetimeValue.toLocaleString("en-IN")}`}
              mono
            />
            <IntelligenceCard
              label="Success Rate"
              value={`${calculateSuccessRate(customer)}%`}
              mono
            />
            <IntelligenceCard
              label="Total Payments"
              value={(
                customer.successfulPayments + customer.failedPayments
              ).toString()}
              mono
            />
          </div>
        </section>

        <section className="mt-4 rounded-lg border border-border bg-surface">
          <div className="border-b border-border p-6">
            <h2 className="text-[14px] font-semibold text-text-primary">
              Payment History
            </h2>
            <p className="mt-1 text-[12.5px] text-text-tertiary">
              Complete payment activity for this customer.
            </p>
          </div>

          <div className="divide-y divide-border">
            {payments.length === 0 ? (
              <div className="p-10 text-center text-[13px] text-text-tertiary">
                No payment history found.
              </div>
            ) : (
              payments.map((payment) => (
                <Link
                  key={payment.paymentId}
                  href={`/payments/${payment.paymentId}`}
                  className="flex flex-col gap-4 p-6 transition hover:bg-surface-hover md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-num text-[16px] font-bold text-text-primary">
                      ₹{payment.amount.toLocaleString("en-IN")}
                    </p>
                    <p className="font-num mt-0.5 text-[11px] text-text-tertiary">
                      {payment.paymentId}
                    </p>
                  </div>

                  <StatusBadge status={payment.status} />

                  <div className="text-[12.5px] text-text-tertiary">
                    {formatDate(payment.createdAt)}
                  </div>

                  <ArrowRight size={14} className="text-text-tertiary" />
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="mt-4 rounded-lg border border-border bg-surface p-7">
          <h2 className="text-[14px] font-semibold text-text-primary">
            AI Context
          </h2>
          <p className="mt-1 text-[12.5px] text-text-tertiary">
            Information that will be passed to the AI recovery agent.
          </p>

          <div className="mt-4 rounded-md border border-border bg-bg-elevated p-5">
            <pre className="font-num overflow-x-auto text-[12px] leading-relaxed text-text-secondary">
{JSON.stringify(
  {
    customerId: customer.customerId,
    name: customer.name,
    plan: customer.plan,
    lifetimeValue: customer.lifetimeValue,
    monthlyValue: customer.monthlyValue,
    successfulPayments: customer.successfulPayments,
    failedPayments: customer.failedPayments,
    currentPayment: currentPayment
      ? {
          paymentId: currentPayment.paymentId,
          amount: currentPayment.amount,
          status: currentPayment.status,
          failureReason: currentPayment.failureReason,
          attempts: currentPayment.attempts,
        }
      : null,
    paymentHistory: payments.map((payment) => ({
      paymentId: payment.paymentId,
      amount: payment.amount,
      status: payment.status,
      failureReason: payment.failureReason,
      attempts: payment.attempts,
      createdAt: payment.createdAt,
    })),
  },
  null,
  2
)}
            </pre>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone?: "success" | "danger";
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <p className="text-[12.5px] text-text-secondary">{title}</p>
      <p
        className={`font-num mt-2 text-[22px] font-semibold ${
          tone === "success"
            ? "text-success"
            : tone === "danger"
              ? "text-danger"
              : "text-text-primary"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function IntelligenceCard({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-md border border-agent-border bg-bg-elevated/60 p-4">
      <p className="text-[11px] text-text-tertiary">{label}</p>
      <p
        className={`mt-1.5 text-[13px] font-semibold text-text-primary ${
          mono ? "font-num" : ""
        }`}
      >
        {value}
      </p>
    </div>
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
      className={`w-fit rounded-md border px-3 py-1 text-[11px] font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function calculateSuccessRate(customer: Customer) {
  const total = customer.successfulPayments + customer.failedPayments;
  if (total === 0) return 0;
  return Math.round((customer.successfulPayments / total) * 100);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}