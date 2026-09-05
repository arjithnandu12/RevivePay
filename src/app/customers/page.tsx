"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
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

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchCustomers() {
      try {
        setLoading(true);

        const params = new URLSearchParams({ page: String(page), limit: "20", search });
        const response = await fetch(`/api/customers?${params}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch customers");
        }

        setCustomers(data.customers || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchCustomers();
  }, [page, search]);

  const filteredCustomers = customers.filter((customer) => {
    const searchValue = search.toLowerCase();
    return (
      customer.name.toLowerCase().includes(searchValue) ||
      customer.email.toLowerCase().includes(searchValue) ||
      customer.customerId.toLowerCase().includes(searchValue)
    );
  });

  const totalCustomers = total;
  const totalLifetimeValue = customers.reduce(
    (sum, c) => sum + c.lifetimeValue,
    0
  );
  const totalSuccessful = customers.reduce(
    (sum, c) => sum + c.successfulPayments,
    0
  );
  const totalFailed = customers.reduce((sum, c) => sum + c.failedPayments, 0);

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
 

  if (error) {
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl px-8 py-8">
          <div className="rounded-lg border border-danger-border bg-danger-bg p-10 text-center">
            <h1 className="text-[16px] font-semibold text-danger">
              Failed to load customers
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
          Customers
        </h1>
        <p className="mt-0.5 text-[13px] text-text-secondary">
          Customer intelligence and payment history.
        </p>
      </header>

      <div className="px-8 py-6">
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Customers" value={totalCustomers.toString()} />
          <StatCard
            title="Lifetime Value"
            value={`₹${totalLifetimeValue.toLocaleString("en-IN")}`}
          />
          <StatCard
            title="Successful Payments"
            value={totalSuccessful.toString()}
            tone="success"
          />
          <StatCard
            title="Failed Payments"
            value={totalFailed.toString()}
            tone="danger"
          />
        </div>

        <div className="mb-4">
          <div className="flex w-full items-center gap-2 rounded-md border border-border bg-surface px-3 py-2.5 md:max-w-md">
            <Search size={14} className="text-text-tertiary" />
            <input
              type="text"
              placeholder="Search by name, email or customer ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-[13px] text-text-primary placeholder:text-text-tertiary outline-none"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-bg-elevated text-[11.5px] uppercase tracking-wide text-text-tertiary">
                  <th className="px-6 py-3.5 font-medium">Customer</th>
                  <th className="px-6 py-3.5 font-medium">Plan</th>
                  <th className="px-6 py-3.5 font-medium">Lifetime Value</th>
                  <th className="px-6 py-3.5 font-medium">Successful</th>
                  <th className="px-6 py-3.5 font-medium">Failed</th>
                  <th className="px-6 py-3.5 font-medium">Success Rate</th>
                  <th className="px-6 py-3.5 font-medium">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-14 text-center text-[13px] text-text-tertiary"
                    >
                      {search
                        ? "No customers match your search."
                        : "No customers found."}
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => {
                    const totalPayments =
                      customer.successfulPayments + customer.failedPayments;
                    const successRate =
                      totalPayments > 0
                        ? Math.round(
                            (customer.successfulPayments / totalPayments) * 100
                          )
                        : 0;

                    return (
                      <tr
                        key={customer.customerId}
                        className="border-b border-border last:border-0 hover:bg-surface-hover"
                      >
                        <td className="px-6 py-4">
                          <Link href={`/customers/${customer.customerId}`}>
                            <p className="text-[13px] font-semibold text-text-primary hover:text-agent">
                              {customer.name}
                            </p>
                            <p className="font-num mt-0.5 text-[11px] text-text-tertiary">
                              {customer.customerId}
                            </p>
                            <p className="mt-0.5 text-[12px] text-text-secondary">
                              {customer.email}
                            </p>
                          </Link>
                        </td>

                        <td className="px-6 py-4">
                          <span className="rounded-md border border-border bg-bg-elevated px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                            {customer.plan}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-num text-[13px] font-semibold text-text-primary">
                            ₹{customer.lifetimeValue.toLocaleString("en-IN")}
                          </p>
                          <p className="font-num mt-0.5 text-[11px] text-text-tertiary">
                            ₹{customer.monthlyValue.toLocaleString("en-IN")}/month
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-num text-[13px] font-semibold text-success">
                            {customer.successfulPayments}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`font-num text-[13px] ${
                              customer.failedPayments > 0
                                ? "font-semibold text-danger"
                                : "text-text-tertiary"
                            }`}
                          >
                            {customer.failedPayments}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-border">
                              <div
                                className="h-full rounded-full bg-success"
                                style={{ width: `${successRate}%` }}
                              />
                            </div>
                            <span className="font-num text-[11.5px] text-text-secondary">
                              {successRate}%
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <Link
                            href={`/customers/${customer.customerId}`}
                            className="rounded-md border border-border bg-bg-elevated px-3.5 py-1.5 text-[12.5px] font-medium text-text-primary hover:bg-surface-hover"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[12px] text-text-tertiary">
          <span>Showing {filteredCustomers.length} of {total} customers</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded border border-border px-2 py-1 disabled:opacity-40">Previous</button>
            <span className="px-2 py-1">Page {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded border border-border px-2 py-1 disabled:opacity-40">Next</button>
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