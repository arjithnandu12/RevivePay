"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Bell,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Users,
  IndianRupee,
  ShieldAlert,
  BrainCircuit,
} from "lucide-react";
import Link from "next/link";
import AppShell from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badges";

interface DashboardData {
  stats: {
    totalRevenue: number;
    failedPayments: number;
    RevivePayRevenue: number;
    recoveryRate: number;
    eligibleFailedRevenue?: number;
    amountRecoveryRate?: number;
    averageRecoveryTimeMinutes?: number;
    totalPayments?: number;
    pendingRecoveries?: number;
    atRiskRevenue?: number;
  };

  revenueChart: {
    month: string;
    revenue: number;
    RevivePay: number;
  }[];

  riskDistribution: {
    high: number;
    medium: number;
    low: number;
  };

  failedPaymentsList: {
    paymentId: string;
    customerId: string;
    amount: number;
    failureReason?: string | null;
    strategy: string;
    recoveryStatus: string;
    attempts?: number;
    riskLevel?: "HIGH" | "MEDIUM" | "LOW";
    aiConfidence?: number;
    suggestedMessage?: string;
    recoveryProbability?: number;
    recommendedDelayMinutes?: number;
    channel?: string;
  }[];

  highRiskCustomers: {
    customerId: string;
    name: string;
    failedPayments: number;
    lifetimeValue: number;
    risk: "HIGH" | "MEDIUM" | "LOW";
    email?: string;
    plan?: string;
  }[];
}

const RISK_COLORS: Record<string, string> = {
  High: "#e5573f",
  Medium: "#d8a13a",
  Low: "#34b27a",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [selectedPayment, setSelectedPayment] =
    useState<DashboardData["failedPaymentsList"][number] | null>(null);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [activeProof, setActiveProof] = useState<{
    paymentId: string;
    scenario: string;
    label: string;
    description: string;
  } | null>(null);
  const [period, setPeriod] = useState("This month");
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  async function runDemoScenario(scenario: string) {
    setDemoLoading(scenario);
    try {
      const response = await fetch("/api/demo/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      const resData = await response.json();
      if (resData?.paymentId) {
        const scenarioLabel =
          scenario === "successful_recovery"
            ? "Successful recovery"
            : scenario === "blocked_card"
            ? "Blocked by policy"
            : "Bounded retry";
        setActiveProof({
          paymentId: resData.paymentId,
          scenario,
          label: scenarioLabel,
          description: resData.description,
        });
      }
      await fetchDashboard(true);
    } catch (err) {
      console.error("Scenario error:", err);
    } finally {
      setDemoLoading(null);
    }
  }

  async function fetchDashboard(showRefresh = false) {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      setError(false);

      const response = await fetch("/api/dashboard", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard");
      }

      const result = await response.json();

      setData(result);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchDashboard();
  }, []);

  const riskData = useMemo(() => {
    if (!data) return [];

    return [
      {
        name: "High",
        value: data.riskDistribution.high,
      },
      {
        name: "Medium",
        value: data.riskDistribution.medium,
      },
      {
        name: "Low",
        value: data.riskDistribution.low,
      },
    ];
  }, [data]);

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
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="rounded-lg border border-danger-border bg-danger-bg px-6 py-5 text-center">
            <AlertTriangle
              size={20}
              className="mx-auto mb-2 text-danger"
            />

            <p className="text-[13px] font-medium text-danger">
              Failed to load dashboard
            </p>

            <p className="mt-1 text-[12.5px] text-text-secondary">
              Check the dashboard API and try again.
            </p>

            <button
              onClick={() => fetchDashboard()}
              className="mt-4 rounded-md bg-text-primary px-3.5 py-1.5 text-[12px] font-medium text-bg"
            >
              Try again
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="flex flex-col gap-4 border-b border-border px-8 py-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[19px] font-semibold tracking-tight text-text-primary">
              Overview
            </h1>

            <span className="flex items-center gap-1 rounded-full border border-success-border bg-success-bg px-2 py-0.5 text-[10px] font-medium text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              AI ACTIVE
            </span>
          </div>

          <p className="mt-0.5 text-[13px] text-text-secondary">
            Payment recovery intelligence for your account.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            aria-label="Dashboard period"
            className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-[13px] text-text-secondary outline-none hover:bg-surface-hover"
          >
            <option>This month</option>
            <option>Last 30 days</option>
            <option>All time</option>
          </select>

          <button
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            aria-label="Refresh dashboard"
            className="rounded-md border border-border bg-surface p-2 text-text-secondary hover:bg-surface-hover disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={refreshing ? "animate-spin" : ""}
            />
          </button>

          <button
            onClick={() => setNotificationsOpen((value) => !value)}
            aria-label="Notifications"
            className="relative rounded-md border border-border bg-surface p-2 text-text-secondary hover:bg-surface-hover"
          >
            <Bell size={15} />

            {data.stats.failedPayments > 0 && (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-danger ring-2 ring-bg" />
            )}
          </button>
          {notificationsOpen && (
            <div className="absolute right-8 top-16 z-20 w-72 rounded-lg border border-border bg-surface p-4 shadow-lg">
              <p className="text-[13px] font-semibold text-text-primary">Notifications</p>
              <p className="mt-2 text-[12px] text-text-secondary">
                {data.stats.failedPayments > 0 ? `${data.stats.failedPayments} failed payments need attention.` : "No payment alerts."}
              </p>
            </div>
          )}
        </div>
      </header>

      <div className="px-8 py-6">
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-bg-elevated">
              <BrainCircuit size={18} className="text-text-primary" />
            </div>

            <div>
              <p className="text-[13px] font-semibold text-text-primary">
                Recover-AI is monitoring payments
              </p>

              <p className="text-[12px] text-text-tertiary">
                Failed payments are analyzed automatically using payment
                history, customer value and recovery policies.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11.5px] text-success">
            <CheckCircle2 size={13} />
            System operational
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-agent/30 bg-agent/5 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[13px] font-semibold text-text-primary">Run a recovery proof</p>
              <p className="mt-0.5 text-[12px] text-text-tertiary">Load deterministic scenarios for the live demo and audit trail.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ["successful_recovery", "Successful recovery"],
                ["blocked_card", "Blocked by policy"],
                ["bounded_retry", "Bounded retry"],
              ].map(([scenario, label]) => (
                <button
                  key={scenario}
                  onClick={() => runDemoScenario(scenario)}
                  disabled={demoLoading !== null}
                  className={`rounded-md border px-3 py-2 text-[12px] font-medium transition disabled:opacity-50 ${
                    activeProof?.scenario === scenario
                      ? "border-agent bg-agent/15 text-text-primary ring-1 ring-agent/50"
                      : "border-border bg-surface text-text-secondary hover:bg-surface-hover"
                  }`}
                >
                  {demoLoading === scenario ? "Loading..." : label}
                </button>
              ))}
            </div>
          </div>

          {activeProof && (
            <div className="mt-3.5 flex flex-col gap-2.5 rounded-lg border border-agent/40 bg-surface p-3 text-xs md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-success animate-pulse" />
                <span className="font-semibold text-text-primary">Live Proof Active:</span>
                <span className="font-mono font-medium text-agent">{activeProof.paymentId}</span>
                <span className="text-text-tertiary">·</span>
                <span className="text-text-secondary">{activeProof.description}</span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/recovery/${activeProof.paymentId}`}
                  className="rounded border border-border bg-bg-elevated px-2.5 py-1 text-[11.5px] font-medium text-text-primary hover:bg-surface-hover transition"
                >
                  View in Recovery →
                </Link>
                <button
                  type="button"
                  onClick={() => setActiveProof(null)}
                  className="text-text-tertiary hover:text-text-primary text-[11px]"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Revenue"
            value={`₹${(data.stats.totalRevenue ?? 0).toLocaleString("en-IN")}`}
            icon={<IndianRupee size={15} />}
          />

          <StatCard
            title="Failed Payments"
            value={(data.stats.failedPayments ?? 0).toString()}
            icon={<AlertTriangle size={15} />}
            tone="danger"
          />

          <StatCard
            title="RevivePay Revenue"
            value={`₹${(data.stats.RevivePayRevenue ?? 0).toLocaleString(
              "en-IN"
            )}`}
            icon={<CheckCircle2 size={15} />}
            tone="success"
          />

          <StatCard
            title="Recovery Rate"
            value={`${data.stats.recoveryRate}%`}
            icon={<ShieldAlert size={15} />}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <MiniStat
            icon={<Users size={15} />}
            title="Customers at risk"
            value={(
              data.riskDistribution.high +
              data.riskDistribution.medium
            ).toString()}
          />

          <MiniStat
            icon={<Clock3 size={15} />}
            title="Pending recoveries"
            value={(data.stats.pendingRecoveries ?? 0).toString()}
          />

          <MiniStat
            icon={<IndianRupee size={15} />}
            title="Revenue at risk"
            value={`₹${(
              data.stats.atRiskRevenue ?? 0
            ).toLocaleString("en-IN")}`}
          />

          <MiniStat
            icon={<ShieldAlert size={15} />}
            title="Amount recovery rate"
            value={`${data.stats.amountRecoveryRate ?? 0}%`}
          />

          <MiniStat
            icon={<Clock3 size={15} />}
            title="Avg. recovery time"
            value={`${data.stats.averageRecoveryTimeMinutes ?? 0} min`}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-semibold text-text-primary">
                  Revenue Recovery
                </h2>

                <p className="mt-0.5 text-[12px] text-text-tertiary">
                  Revenue generated vs revenue RevivePay
                </p>
              </div>

              <div className="hidden items-center gap-4 text-[12px] text-text-secondary sm:flex">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-text-primary" />
                  Revenue
                </span>

                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-success" />
                  RevivePay
                </span>
              </div>
            </div>

            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.revenueChart}
                  margin={{
                    left: -12,
                    right: 8,
                  }}
                >
                  <CartesianGrid
                    stroke="#21262f"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="month"
                    tick={{
                      fill: "#5c6370",
                      fontSize: 11,
                    }}
                    axisLine={{
                      stroke: "#21262f",
                    }}
                    tickLine={false}
                  />

                  <YAxis
                    tick={{
                      fill: "#5c6370",
                      fontSize: 11,
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />

                  <Tooltip
                    contentStyle={{
                      background: "#0d1015",
                      border: "1px solid #2c323c",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{
                      color: "#9aa1ad",
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#edeff2"
                    strokeWidth={2}
                    dot={false}
                    name="Revenue"
                  />

                  <Line
                    type="monotone"
                    dataKey="RevivePay"
                    stroke="#34b27a"
                    strokeWidth={2}
                    dot={false}
                    name="RevivePay"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-6">
            <div className="mb-5">
              <h2 className="text-[14px] font-semibold text-text-primary">
                AI Risk Distribution
              </h2>

              <p className="mt-0.5 text-[12px] text-text-tertiary">
                Recovery risk identified by Recover-AI
              </p>
            </div>

            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={64}
                    outerRadius={96}
                    paddingAngle={2}
                    stroke="#0a0c10"
                    strokeWidth={2}
                  >
                    {riskData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={RISK_COLORS[entry.name]}
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    contentStyle={{
                      background: "#0d1015",
                      border: "1px solid #2c323c",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-center gap-6 text-[12.5px] text-text-secondary">
              {(["High", "Medium", "Low"] as const).map((risk) => (
                <span
                  key={risk}
                  className="flex items-center gap-1.5"
                >
                  <span
                    className="h-2 w-2 rounded-sm"
                    style={{
                      background: RISK_COLORS[risk],
                    }}
                  />

                  {risk}:{" "}
                  <span className="font-num text-text-primary">
                    {data.riskDistribution[
                      risk.toLowerCase() as
                        | "high"
                        | "medium"
                        | "low"
                    ]}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <section className="mt-4 rounded-lg border border-border bg-surface p-6">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-[14px] font-semibold text-text-primary">
                Failed Payments
              </h2>

              <p className="mt-0.5 text-[12.5px] text-text-tertiary">
                Payments automatically analyzed by Recover-AI
              </p>
            </div>

            <span className="rounded-md border border-border bg-bg-elevated px-2.5 py-1 text-[11.5px] text-text-secondary">
              {data.failedPaymentsList.length} failed
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border text-[11.5px] uppercase tracking-wide text-text-tertiary">
                  <th className="pb-3 font-medium">
                    Customer
                  </th>

                  <th className="pb-3 font-medium">
                    Amount
                  </th>

                  <th className="pb-3 font-medium">
                    Reason
                  </th>

                  <th className="pb-3 font-medium">
                    AI Strategy
                  </th>

                  <th className="pb-3 font-medium">
                    Recovery Probability
                  </th>

                  <th className="pb-3 font-medium">
                    Risk
                  </th>

                  <th className="pb-3 font-medium">
                    Status
                  </th>

                  <th className="pb-3 font-medium">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.failedPaymentsList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-10 text-center text-[13px] text-text-tertiary"
                    >
                      No failed payments right now.
                    </td>
                  </tr>
                ) : (
                  data.failedPaymentsList.map((payment) => (
                    <tr
                      key={payment.paymentId}
                      className={`border-b border-border last:border-0 transition ${
                        activeProof?.paymentId === payment.paymentId
                          ? "bg-agent/10 hover:bg-agent/15 ring-1 ring-inset ring-agent/40"
                          : "hover:bg-surface-hover"
                      }`}
                    >
                      <td className="py-4">
                        <div className="text-[13px] font-medium text-text-primary">
                          {payment.customerId}
                        </div>

                        <div className="font-num mt-0.5 flex items-center gap-1.5 text-[11.5px] text-text-tertiary">
                          <span>{payment.paymentId}</span>
                          {activeProof?.paymentId === payment.paymentId && (
                            <span className="rounded bg-agent/20 px-1.5 py-0.5 text-[10px] font-semibold text-agent">
                              LIVE PROOF
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4">
                        <span className="font-num text-[13px] font-medium text-text-primary">
                          ₹
                          {(payment.amount ?? 0).toLocaleString(
                            "en-IN"
                          )}
                        </span>
                      </td>

                      <td className="max-w-[220px] py-4 text-[12px] text-text-secondary">
                        {payment.failureReason || "Unknown"}
                      </td>

                      <td className="py-4">
                        <span className="rounded-md border border-border bg-bg-elevated px-2 py-1 text-[11.5px] text-text-secondary">
                          {formatStrategy(payment.strategy)}
                        </span>
                      </td>

                      <td className="py-4 font-num text-[13px] text-success">
                        {payment.recoveryProbability != null ? `${Math.round(payment.recoveryProbability * 100)}%` : "—"}
                      </td>

                      <td className="py-4">
                        {payment.riskLevel ? (
                          <RiskBadge risk={payment.riskLevel} />
                        ) : (
                          <span className="text-[12px] text-text-tertiary">
                            —
                          </span>
                        )}
                      </td>

                      <td className="py-4">
                        <StatusBadge
                          status={payment.recoveryStatus}
                        />
                      </td>

                      <td className="py-4">
                        <button
                          onClick={() =>
                            setSelectedPayment(payment)
                          }
                          className="flex items-center gap-1 rounded-md bg-text-primary px-3.5 py-1.5 text-[12.5px] font-medium text-bg hover:opacity-90"
                        >
                          View
                          <ArrowRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-4 rounded-lg border border-border bg-surface p-6">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-[14px] font-semibold text-text-primary">
                Customers Requiring Attention
              </h2>

              <Badge tone="danger">
                {data.highRiskCustomers.length}
              </Badge>
            </div>

            <p className="mt-0.5 text-[12.5px] text-text-tertiary">
              Customers ranked by payment recovery risk and value.
            </p>
          </div>

          <div className="space-y-2.5">
            {data.highRiskCustomers.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-text-tertiary">
                No customers require attention right now.
              </p>
            ) : (
              data.highRiskCustomers.map((customer) => (
                <div
                  key={customer.customerId}
                  className="flex flex-col gap-4 rounded-md border border-border bg-bg-elevated p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-text-primary">
                        {customer.name}
                      </p>

                      <RiskBadge risk={customer.risk} />
                    </div>

                    <p className="font-num mt-0.5 text-[11.5px] text-text-tertiary">
                      {customer.customerId}
                    </p>

                    {customer.email && (
                      <p className="mt-1 text-[11.5px] text-text-tertiary">
                        {customer.email}
                      </p>
                    )}
                  </div>

                  <div className="text-[12.5px] text-text-secondary">
                    Failed Payments:{" "}
                    <span className="font-num font-semibold text-text-primary">
                      {customer.failedPayments}
                    </span>
                  </div>

                  <div className="text-[12.5px] text-text-secondary">
                    LTV:{" "}
                    <span className="font-num font-semibold text-text-primary">
                      ₹
                      {(customer.lifetimeValue ?? 0).toLocaleString(
                        "en-IN"
                      )}
                    </span>
                  </div>

                  {customer.plan && (
                    <div className="text-[12.5px] text-text-secondary">
                      Plan:{" "}
                      <span className="font-medium text-text-primary">
                        {customer.plan}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      const payment =
                        data.failedPaymentsList.find(
                          (p) =>
                            p.customerId ===
                            customer.customerId
                        );

                      if (payment) {
                        setSelectedPayment(payment);
                      }
                    }}
                    className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-[12px] text-text-secondary hover:bg-surface-hover"
                  >
                    Review
                    <ArrowRight size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {selectedPayment && (
        <PaymentModal
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
        />
      )}
    </AppShell>
  );
}

function StatCard({
  title,
  value,
  tone,
  icon,
}: {
  title: string;
  value: string;
  tone?: "success" | "danger";
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-text-secondary">
          {title}
        </p>

        <span
          className={`text-text-tertiary ${
            tone === "success"
              ? "text-success"
              : tone === "danger"
              ? "text-danger"
              : ""
          }`}
        >
          {icon}
        </span>
      </div>

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

function MiniStat({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-bg-elevated text-text-secondary">
        {icon}
      </div>

      <div>
        <p className="text-[11.5px] text-text-tertiary">
          {title}
        </p>

        <p className="font-num mt-0.5 text-[15px] font-semibold text-text-primary">
          {value}
        </p>
      </div>
    </div>
  );
}

function RiskBadge({
  risk,
}: {
  risk: "HIGH" | "MEDIUM" | "LOW";
}) {
  const tone =
    risk === "HIGH"
      ? "danger"
      : risk === "MEDIUM"
      ? "warning"
      : "success";

  return <Badge tone={tone}>{risk}</Badge>;
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized = status.toLowerCase();

  if (
    normalized === "RevivePay" ||
    normalized === "success"
  ) {
    return <Badge tone="success">RevivePay</Badge>;
  }

  if (
    normalized === "unrecoverable" ||
    normalized === "failed"
  ) {
    return <Badge tone="danger">UNRECOVERABLE</Badge>;
  }

  if (
    normalized === "in_progress" ||
    normalized === "pending"
  ) {
    return <Badge tone="warning">
      {normalized === "pending"
        ? "PENDING"
        : "IN PROGRESS"}
    </Badge>;
  }

  return (
    <span className="text-[12px] text-text-secondary">
      {formatStrategy(status)}
    </span>
  );
}

function formatStrategy(strategy: string) {
  return strategy
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
}

function PaymentModal({
  payment,
  onClose,
}: {
  payment: DashboardData["failedPaymentsList"][number];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-text-tertiary">
              Recovery case
            </p>

            <h2 className="mt-1 text-[17px] font-semibold text-text-primary">
              {payment.customerId}
            </h2>

            <p className="font-num mt-0.5 text-[11.5px] text-text-tertiary">
              {payment.paymentId}
            </p>
          </div>

          {payment.riskLevel && (
            <RiskBadge risk={payment.riskLevel} />
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Detail
            label="Amount"
            value={`₹${(payment.amount ?? 0).toLocaleString(
              "en-IN"
            )}`}
          />

          <Detail
            label="Attempts"
            value={(payment.attempts ?? 1).toString()}
          />

          <Detail
            label="AI Strategy"
            value={formatStrategy(payment.strategy)}
          />

          <Detail
            label="Recovery Status"
            value={formatStrategy(
              payment.recoveryStatus
            )}
          />

          <Detail
            label="Failure Reason"
            value={
              payment.failureReason || "Unknown"
            }
          />

          <Detail
            label="AI Confidence"
            value={
              payment.aiConfidence != null
                ? `${Math.round(
                    payment.aiConfidence * 100
                  )}%`
                : "—"
            }
          />
        </div>

        {payment.suggestedMessage && (
          <div className="mt-4 rounded-lg border border-border bg-bg-elevated p-4">
            <div className="mb-2 flex items-center gap-2">
              <BrainCircuit
                size={14}
                className="text-text-secondary"
              />

              <p className="text-[12px] font-semibold text-text-primary">
                AI Suggested Message
              </p>
            </div>

            <p className="text-[12.5px] leading-5 text-text-secondary">
              {payment.suggestedMessage}
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-3.5 py-1.5 text-[12.5px] text-text-secondary hover:bg-surface-hover"
          >
            Close
          </button>

          <Link
            href={`/recovery/${payment.paymentId}`}
            onClick={onClose}
            className="rounded-md bg-text-primary px-3.5 py-1.5 text-[12.5px] font-medium text-bg hover:opacity-90"
          >
            Review Recovery
          </Link>
        </div>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-bg-elevated p-3">
      <p className="text-[10.5px] uppercase tracking-wide text-text-tertiary">
        {label}
      </p>

      <p className="mt-1 break-words text-[12.5px] font-medium text-text-primary">
        {value}
      </p>
    </div>
  );
}