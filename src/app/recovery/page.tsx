"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import AppShell from "@/components/layout/app-shell";
import { PriorityBadge, StatusBadge } from "@/components/ui/badges";

interface RecoveryCase {
  id: string;
  paymentId: string;
  customer: string;
  customerId: string;
  amount: number;
  failureReason: string;
  strategy: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  attempts: number;
  maxAttempts: number;
  status: "pending" | "scheduled" | "in_progress" | "escalated" | "success" | "refunded";
  createdAt: string;
}

const PRIORITIES = ["All priorities", "Critical", "High", "Medium", "Low"];
const STATUSES = ["All statuses", "pending", "scheduled", "in_progress", "escalated", "success", "refunded"];

export default function RecoveryCasesPage() {
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("All reasons");
  const [priority, setPriority] = useState("All priorities");
  const [status, setStatus] = useState("All statuses");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [dateRange, setDateRange] = useState("All dates");
  const [now] = useState(() => Date.now());

  useEffect(() => {
    async function fetchCases() {
      try {
        setLoading(true);

        const response = await fetch(`/api/recovery-cases?page=${page}&limit=20&search=${encodeURIComponent(search)}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch recovery cases");
        }

        setCases(data.cases || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        console.error("Recovery cases fetch error:", err);
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchCases();
  }, [page, search]);

  const failureReasons = useMemo(
    () => ["All reasons", ...Array.from(new Set(cases.map((c) => c.failureReason)))],
    [cases]
  );

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      const s = search.toLowerCase();
      const matchesSearch =
        !s ||
        c.customer.toLowerCase().includes(s) ||
        c.paymentId.toLowerCase().includes(s) ||
        c.id.toLowerCase().includes(s);
      const matchesReason = reason === "All reasons" || c.failureReason === reason;
      const matchesPriority = priority === "All priorities" || c.priority === priority;
      const matchesStatus = status === "All statuses" || c.status === status;
      const age = now - new Date(c.createdAt).getTime();
      const matchesDate = dateRange === "All dates"
        || (dateRange === "Last 7 days" && age <= 7 * 86400000)
        || (dateRange === "Last 30 days" && age <= 30 * 86400000);
      return matchesSearch && matchesReason && matchesPriority && matchesStatus && matchesDate;
    });
  }, [cases, search, reason, priority, status, dateRange, now]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[500px] items-center justify-center">
          <p className="text-[13px] text-text-tertiary">
            Loading recovery cases...
          </p>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl px-8 py-8">
          <div className="rounded-lg border border-danger-border bg-danger-bg p-10 text-center">
            <h1 className="text-[16px] font-semibold text-danger">
              Failed to load recovery cases
            </h1>
            <p className="mt-2 text-[13px] text-text-secondary">{error}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="border-b border-border px-8 py-5">
        <h1 className="text-[19px] font-semibold tracking-tight text-text-primary">
          Recovery Cases
        </h1>
        <p className="mt-0.5 text-[13px] text-text-secondary">
          Every failed payment your agent is actively recovering.
        </p>
      </header>

      <div className="px-8 py-6">
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-md border border-border bg-surface px-3 py-2">
            <Search size={14} className="text-text-tertiary" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer, payment ID, or case ID"
              className="w-full bg-transparent text-[13px] text-text-primary placeholder:text-text-tertiary outline-none"
            />
          </div>

          <FilterSelect value={reason} onChange={setReason} options={failureReasons} />
          <FilterSelect value={priority} onChange={setPriority} options={PRIORITIES} />
          <FilterSelect
            value={status}
            onChange={setStatus}
            options={STATUSES}
            labels={{
              pending: "Pending",
              scheduled: "Scheduled",
              in_progress: "In Progress",
              escalated: "Escalated",
              success: "RevivePay",
            }}
          />

          <select
            value={dateRange}
            onChange={(event) => setDateRange(event.target.value)}
            aria-label="Recovery date range"
            className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-text-secondary outline-none hover:bg-surface-hover"
          >
            <option>All dates</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-bg-elevated text-[11.5px] uppercase tracking-wide text-text-tertiary">
                <th className="px-5 py-3 font-medium">Payment</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Failure Reason</th>
                <th className="px-5 py-3 font-medium">AI Strategy</th>
                <th className="px-5 py-3 font-medium">Priority</th>
                <th className="px-5 py-3 font-medium">Attempts</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center text-[13px] text-text-tertiary">
                    {cases.length === 0
                      ? "No recovery cases yet."
                      : "No recovery cases match your filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border last:border-0 hover:bg-surface-hover"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/recovery/${c.id}`}
                        className="font-num text-[13px] font-medium text-text-primary hover:text-agent"
                      >
                        {c.paymentId}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-[13px] text-text-primary">{c.customer}</p>
                      <p className="font-num mt-0.5 text-[11.5px] text-text-tertiary">
                        {c.customerId}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-num text-[13px] font-medium text-text-primary">
                        ₹{(c.amount ?? 0).toLocaleString("en-IN")}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[13px] text-text-secondary">
                      {c.failureReason}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-md border border-border bg-bg-elevated px-2 py-1 text-[11.5px] text-text-secondary">
                        {c.strategy}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <PriorityBadge priority={c.priority} />
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-num text-[13px] text-text-secondary">
                        {c.attempts}/{c.maxAttempts}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-4 text-[12.5px] text-text-tertiary">
                      {c.createdAt}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[12px] text-text-tertiary">
          <div className="flex items-center justify-between">
            <span>Showing {filtered.length} of {total} cases</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded border border-border px-2 py-1 disabled:opacity-40">Previous</button>
              <span className="px-2 py-1">Page {page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded border border-border px-2 py-1 disabled:opacity-40">Next</button>
            </div>
          </div>
        </p>
      </div>
    </AppShell>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  labels,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  labels?: Record<string, string>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-text-secondary outline-none hover:bg-surface-hover"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {labels?.[o] ?? o}
        </option>
      ))}
    </select>
  );
}