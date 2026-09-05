"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import AppShell from "@/components/layout/app-shell";

interface Payment {
  paymentId: string;
  customerId: string;
  customerName: string;
  amount: number;
  currency: string;
  status: "pending" | "success" | "failed";
  failureReason: string | null;
  attempts: number;
  razorpayPaymentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [filter, setFilter] = useState<
    "all" | "success" | "failed" | "pending"
  >("all");

  const [search, setSearch] = useState("");
  useEffect(() => {
    async function fetchPayments() {
      try {
        const response = await fetch(`/api/payments?page=${page}&limit=20&search=${encodeURIComponent(search)}`);
        if (!response.ok) {
          throw new Error("Failed to fetch payments");
        }

        const data = await response.json();

        setPayments(data.payments);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        console.error("Payments fetch error:", err);

        setError(
          err instanceof Error ? err.message : "Something went wrong"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchPayments();
  }, [page, search]);

  const filteredPayments =
    filter === "all"
      ? payments
      : payments.filter((payment) => payment.status === filter);

  const totalAmount = payments.reduce(
    (sum, payment) =>
      payment.status === "success" ? sum + payment.amount : sum,
    0
  );

  const failedCount = payments.filter((p) => p.status === "failed").length;
  const successCount = payments.filter((p) => p.status === "success").length;

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

  if (error) {
    return (
      <AppShell>
        <div className="flex min-h-screen items-center justify-center">
          <div className="rounded-lg border border-danger-border bg-danger-bg px-6 py-5 text-center">
            <p className="text-[13px] font-medium text-danger">
              Failed to load payments
            </p>
            <p className="mt-1 text-[12.5px] text-text-secondary">{error}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="border-b border-border px-8 py-5">
        <h1 className="text-[19px] font-semibold tracking-tight text-text-primary">
          Payments
        </h1>
        <p className="mt-0.5 text-[13px] text-text-secondary">
          Monitor all customer payments and payment failures.
        </p>
      </header>

      <div className="px-8 py-6">
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Payments" value={payments.length.toString()} />
          <StatCard title="Successful" value={successCount.toString()} tone="success" />
          <StatCard title="Failed" value={failedCount.toString()} tone="danger" />
          <StatCard
            title="Revenue"
            value={`₹${totalAmount.toLocaleString("en-IN")}`}
          />
        </div>

        <div className="mb-4 flex flex-wrap gap-2.5">
          <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
            All
          </FilterButton>
          <FilterButton active={filter === "success"} onClick={() => setFilter("success")}>
            Successful
          </FilterButton>
          <FilterButton active={filter === "failed"} onClick={() => setFilter("failed")}>
            Failed
          </FilterButton>
          <FilterButton active={filter === "pending"} onClick={() => setFilter("pending")}>
            Pending
          </FilterButton>
        <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-md border border-border bg-surface px-3 py-2">
          <Search size={14} className="text-text-tertiary" />
          <input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Search payment, customer or failure reason"
            className="w-full bg-transparent text-[13px] text-text-primary placeholder:text-text-tertiary outline-none"
          />
        </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-bg-elevated text-[11.5px] uppercase tracking-wide text-text-tertiary">
                  <th className="px-6 py-3.5 font-medium">Payment ID</th>
                  <th className="px-6 py-3.5 font-medium">Customer</th>
                  <th className="px-6 py-3.5 font-medium">Amount</th>
                  <th className="px-6 py-3.5 font-medium">Status</th>
                  <th className="px-6 py-3.5 font-medium">Failure Reason</th>
                  <th className="px-6 py-3.5 font-medium">Attempts</th>
                  <th className="px-6 py-3.5 font-medium">Date</th>
                </tr>
              </thead>

              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-14 text-center text-[13px] text-text-tertiary"
                    >
                      No payments found.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => (
                    <tr
                      key={payment.paymentId}
                      className="border-b border-border last:border-0 hover:bg-surface-hover"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/payments/${payment.paymentId}`}
                          className="font-num text-[13px] font-medium text-text-primary hover:text-agent"
                        >
                          {payment.paymentId}
                        </Link>
                        {payment.razorpayPaymentId && (
                          <p className="font-num mt-0.5 text-[11px] text-text-tertiary">
                            {payment.razorpayPaymentId}
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-[13px] font-medium text-text-primary">
                          {payment.customerName}
                        </p>
                        <p className="font-num mt-0.5 text-[11px] text-text-tertiary">
                          {payment.customerId}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-num text-[13px] font-semibold text-text-primary">
                          ₹{payment.amount.toLocaleString("en-IN")}
                        </p>
                        <p className="text-[11px] text-text-tertiary">
                          {payment.currency}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={payment.status} />
                      </td>

                      <td className="px-6 py-4">
                        {payment.failureReason ? (
                          <span className="text-[13px] text-text-secondary">
                            {formatFailureReason(payment.failureReason)}
                          </span>
                        ) : (
                          <span className="text-[13px] text-text-tertiary">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-num text-[13px] text-text-secondary">
                          {payment.attempts}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-[12.5px] text-text-tertiary">
                          {formatDate(payment.createdAt)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-[12px] text-text-tertiary">
            <span>Showing {payments.length} of {total} payments</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded border border-border px-2 py-1 disabled:opacity-40">Previous</button>
              <span className="px-2 py-1">Page {page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded border border-border px-2 py-1 disabled:opacity-40">Next</button>
            </div>
          </div>
        </div>
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
      <p className="text-[13px] text-text-secondary">{title}</p>
      <p
        className={`font-num mt-2.5 text-[24px] font-semibold ${
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

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
        active
          ? "bg-text-primary text-bg"
          : "border border-border bg-surface text-text-secondary hover:bg-surface-hover"
      }`}
    >
      {children}
    </button>
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

  const labels = {
    success: "SUCCESS",
    failed: "FAILED",
    pending: "PENDING",
  };

  return (
    <span
      className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
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
  });
}