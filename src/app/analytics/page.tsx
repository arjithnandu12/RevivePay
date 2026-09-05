"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,

  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import AppShell from "@/components/layout/app-shell";

interface AnalyticsData {
  recoveryRateSeries: { date: string; rate: number }[];
  revenueRecoveredSeries: { date: string; amount: number }[];
  failedPaymentsSeries: { date: string; count: number }[];
  byFailureReason: { reason: string; recovered: number; rate: number }[];
  byCustomerSegment: { segment: string; recovered: number; rate: number }[];
  byStrategy: { strategy: string; recovered: number; rate: number }[];
}

function inr(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);

        const response = await fetch("/api/analytics");
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to fetch analytics");
        }

        setData(result);
      } catch (err) {
        console.error("Analytics fetch error:", err);
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

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
  
  if (error || !data) {
    return (
      <AppShell>
        <div className="mx-auto max-w-4xl px-8 py-8">
          <div className="rounded-lg border border-danger-border bg-danger-bg p-10 text-center">
            <h1 className="text-[16px] font-semibold text-danger">
              Failed to load analytics
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
          Analytics
        </h1>
        <p className="mt-0.5 text-[13px] text-text-secondary">
          Recovery performance across time, failure reasons, and strategies.
        </p>
      </header>

      <div className="px-8 py-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard title="Recovery Rate">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.recoveryRateSeries} margin={{ left: -20, right: 8 }}>
                <CartesianGrid stroke="#21262f" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#5c6370", fontSize: 10 }} axisLine={{ stroke: "#21262f" }} tickLine={false} />
                <YAxis tick={{ fill: "#5c6370", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} width={36} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v ?? 0}%`} />
                <Line type="monotone" dataKey="rate" stroke="#34b27a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Revenue Recovered">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.revenueRecoveredSeries} margin={{ left: -20, right: 8 }}>
                <CartesianGrid stroke="#21262f" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#5c6370", fontSize: 10 }} axisLine={{ stroke: "#21262f" }} tickLine={false} />
                <YAxis tick={{ fill: "#5c6370", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={inr} width={44} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => inr(typeof v === "number" ? v : 0)} />
                <Line type="monotone" dataKey="amount" stroke="#7b86e8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Failed Payments">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.failedPaymentsSeries} margin={{ left: -20, right: 8 }}>
                <CartesianGrid stroke="#21262f" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#5c6370", fontSize: 10 }} axisLine={{ stroke: "#21262f" }} tickLine={false} />
                <YAxis tick={{ fill: "#5c6370", fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="count" stroke="#e5573f" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <BreakdownCard
            title="Recovery by Failure Reason"
            rows={data.byFailureReason.map((r) => ({
              label: r.reason,
              recovered: r.recovered,
              rate: r.rate,
            }))}
          />
          <BreakdownCard
            title="Recovery by Customer Segment"
            rows={data.byCustomerSegment.map((r) => ({
              label: r.segment,
              recovered: r.recovered,
              rate: r.rate,
            }))}
          />
          <BreakdownCard
            title="AI Strategy Performance"
            rows={data.byStrategy.map((r) => ({
              label: r.strategy,
              recovered: r.recovered,
              rate: r.rate,
            }))}
          />
        </div>
      </div>
    </AppShell>
  );
}

const tooltipStyle = {
  background: "#0d1015",
  border: "1px solid #2c323c",
  borderRadius: 8,
  fontSize: 12,
};

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h2 className="mb-3 text-[13.5px] font-semibold text-text-primary">{title}</h2>
      {children}
    </div>
  );
}

function BreakdownCard({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; recovered: number; rate: number }[];
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h2 className="mb-4 text-[13.5px] font-semibold text-text-primary">{title}</h2>
      <div className="space-y-3.5">
        {rows.length === 0 ? (
          <p className="text-[12.5px] text-text-tertiary">No data yet.</p>
        ) : (
          rows.map((r) => (
            <div key={r.label}>
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="text-text-primary">{r.label}</span>
                <span className="font-num text-text-secondary">
                  {inr(r.recovered)} · {r.rate}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-success"
                  style={{ width: `${r.rate}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}