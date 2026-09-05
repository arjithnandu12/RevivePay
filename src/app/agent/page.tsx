"use client";

import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw, ArrowRight, CheckCircle2 } from "lucide-react";
import AppShell from "@/components/layout/app-shell";
import { LayerTag } from "@/components/ui/badges";

interface AgentStats {
  active: boolean;
  metrics: {
    paymentsAnalyzedToday: number;
    recoveryActions: number;
    revenueRevivePay: number;
    casesEscalated: number;
  };
  rules: {
    retryLimit: number;
    highValueThreshold: number;
    humanApprovalThreshold: number;
    suspiciousPayments: string;
    automaticRetries: boolean;
  };
}

const DECISION_STREAM = [
  { key: "detect", label: "Payment failed" },
  { key: "customer", label: "Analyze customer" },
  { key: "failure", label: "Analyze failure" },
  { key: "strategy", label: "Select strategy" },
  { key: "policy", label: "Validate policy" },
  { key: "execute", label: "Execute action" },
];

const STAGE_DETAIL: Record<string, { title: string; rows: { label: string; value: string }[] }> = {
  detect: {
    title: "Payment failed",
    rows: [
      { label: "Payment ID", value: "PAY_88213 (demo)" },
      { label: "Amount", value: "₹49,999" },
      { label: "Reason", value: "Card expired" },
    ],
  },
  customer: {
    title: "Analyze customer",
    rows: [
      { label: "Lifetime value", value: "₹4,20,000" },
      { label: "Plan", value: "Enterprise" },
      { label: "Prior failures", value: "2" },
    ],
  },
  failure: {
    title: "Analyze failure",
    rows: [
      { label: "Classification", value: "Recoverable" },
      { label: "Root cause", value: "Expired payment method" },
      { label: "Retry viable", value: "No — requires new method" },
    ],
  },
  strategy: {
    title: "Select strategy",
    rows: [
      { label: "Strategy", value: "Update payment method" },
      { label: "Confidence", value: "87%" },
      { label: "Alternative", value: "Retry (lower probability)" },
    ],
  },
  policy: {
    title: "Validate policy",
    rows: [
      { label: "High-value threshold", value: "₹1,00,000" },
      { label: "This payment", value: "Below threshold" },
      { label: "Approval needed", value: "No" },
    ],
  },
  execute: {
    title: "Execute action",
    rows: [
      { label: "Action", value: "Payment link sent" },
      { label: "Channel", value: "Email + SMS" },
      { label: "Status", value: "Delivered" },
    ],
  },
};

export default function AgentPage() {
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [simIndex, setSimIndex] = useState(-1); 
  const [inspecting, setInspecting] = useState("detect");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);

        const response = await fetch("/api/agent/stats");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch agent stats");
        }

        setStats(data);
      } catch (err) {
        console.error("Agent stats fetch error:", err);
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  function runSimulation() {
    if (timer.current) clearTimeout(timer.current);
    setSimIndex(0);
  }

  function reset() {
    if (timer.current) clearTimeout(timer.current);
    setSimIndex(-1);
  }

  useEffect(() => {
    if (simIndex >= 0 && simIndex < DECISION_STREAM.length - 1) {
      timer.current = setTimeout(() => setSimIndex((i) => i + 1), 900);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [simIndex]);

  const simRunning = simIndex >= 0 && simIndex < DECISION_STREAM.length - 1;
  const simDone = simIndex === DECISION_STREAM.length - 1;

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
 

  if (error || !stats) {
    return (
      <AppShell>
        <div className="mx-auto max-w-4xl px-8 py-8">
          <div className="rounded-lg border border-danger-border bg-danger-bg p-10 text-center">
            <h1 className="text-[16px] font-semibold text-danger">
              Failed to load agent status
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
        <div className="flex items-center gap-3">
          <h1 className="text-[19px] font-semibold tracking-tight text-text-primary">
            Recovery Agent
          </h1>
          <span
            className={`flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11.5px] font-medium ${
              stats.active
                ? "border-success-border bg-success-bg text-success"
                : "border-border bg-surface text-text-tertiary"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                stats.active ? "live-dot bg-success" : "bg-text-tertiary"
              }`}
            />
            {stats.active ? "Agent Active" : "Agent Paused"}
          </span>
        </div>
        <p className="mt-1 max-w-xl text-[13px] text-text-secondary">
          Autonomously monitors failed payments and selects the safest
          recovery strategy. Every action still passes through the policy
          engine before Razorpay executes it.
        </p>
      </header>

      <div className="px-8 py-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Payments analyzed today"
            value={(stats.metrics.paymentsAnalyzedToday ?? 0).toLocaleString("en-IN")}
          />
          <Metric
            label="Recovery actions"
            value={(stats.metrics.recoveryActions ?? 0).toLocaleString("en-IN")}
          />
          <Metric
            label="Revenue RevivePay"
            value={`₹${(stats.metrics.revenueRevivePay ?? 0).toLocaleString("en-IN")}`}
          />
          <Metric
            label="Cases escalated"
            value={(stats.metrics.casesEscalated ?? 0).toLocaleString("en-IN")}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 rounded-lg border border-border bg-surface px-6 py-4 text-[12.5px]">
          <LayerTag layer="agent" />
          <span className="text-text-tertiary">reasons, then hands off to</span>
          <ArrowRight size={13} className="text-text-tertiary" />
          <LayerTag layer="policy" />
          <span className="text-text-tertiary">which alone can authorize</span>
          <ArrowRight size={13} className="text-text-tertiary" />
          <LayerTag layer="razorpay" />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-lg border border-border bg-surface p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[13.5px] font-semibold text-text-primary">
                  Agent Decision Stream
                </h2>
                <p className="mt-0.5 text-[12px] text-text-tertiary">
                  Demo walkthrough — click a stage to inspect it, or run the
                  full sequence.
                </p>
              </div>
              {!simRunning ? (
                <button
                  onClick={runSimulation}
                  className="flex items-center gap-2 rounded-md bg-text-primary px-3.5 py-2 text-[12.5px] font-medium text-bg hover:opacity-90"
                >
                  <Play size={12} fill="currentColor" />
                  Run Recovery Simulation
                </button>
              ) : (
                <button
                  onClick={reset}
                  className="flex items-center gap-2 rounded-md border border-border px-3.5 py-2 text-[12.5px] font-medium text-text-secondary hover:bg-surface-hover"
                >
                  <RotateCcw size={12} />
                  Reset
                </button>
              )}
            </div>

            <div className="mt-6 flex flex-col">
              {DECISION_STREAM.map((stage, i) => {
                const active = simIndex === i;
                const complete = simIndex > i || simDone;
                return (
                  <div key={stage.key}>
                    <button
                      onClick={() => setInspecting(stage.key)}
                      className={`flex w-full items-center justify-between rounded-md border px-4 py-2.5 text-left transition-colors ${
                        inspecting === stage.key
                          ? "border-agent-border bg-agent-bg"
                          : "border-border bg-bg-elevated hover:bg-surface-hover"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            active
                              ? "live-dot bg-agent"
                              : complete
                                ? "bg-success"
                                : "bg-text-tertiary"
                          }`}
                        />
                        <span className="text-[13px] font-medium text-text-primary">
                          {stage.label}
                        </span>
                      </span>
                      {complete && !active && (
                        <CheckCircle2 size={14} className="text-success" />
                      )}
                    </button>
                    {i < DECISION_STREAM.length - 1 && (
                      <div className="my-1 ml-6 h-3 w-px bg-border" />
                    )}
                  </div>
                );
              })}
            </div>

            {simDone && (
              <div className="rise-in mt-5 rounded-md border border-success-border bg-success-bg px-4 py-3 text-center">
                <p className="text-[13px] text-text-secondary">Simulation complete</p>
                <p className="font-num count-flash mt-1 text-[22px] font-semibold text-success">
                  ₹49,999 RevivePay (demo)
                </p>
              </div>
            )}

            <div className="mt-5 rounded-md border border-border bg-bg-elevated p-4">
              <p className="text-[12px] font-medium text-text-tertiary">
                {STAGE_DETAIL[inspecting].title}
              </p>
              <dl className="mt-3 space-y-2">
                {STAGE_DETAIL[inspecting].rows.map((r) => (
                  <div key={r.label} className="flex items-center justify-between">
                    <dt className="text-[12.5px] text-text-tertiary">{r.label}</dt>
                    <dd className="font-num text-[12.5px] text-text-primary">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-5">
            <h2 className="text-[13.5px] font-semibold text-text-primary">
              Decision Rules
            </h2>
            <p className="mt-0.5 text-[12px] text-text-tertiary">
              Fixed limits the agent cannot override.
            </p>
            <dl className="mt-4 space-y-3.5">
              <Row label="Retry limit" value={stats.rules.retryLimit.toString()} />
              <Row
                label="High-value threshold"
                value={`₹${(stats.rules.highValueThreshold ?? 0).toLocaleString("en-IN")}`}
              />
              <Row
                label="Human approval threshold"
                value={`₹${(stats.rules.humanApprovalThreshold ?? 0).toLocaleString("en-IN")}`}
              />
              <Row label="Suspicious payments" value={stats.rules.suspiciousPayments} />
              <Row
                label="Automatic retries"
                value={stats.rules.automaticRetries ? "Enabled" : "Disabled"}
                success={stats.rules.automaticRetries}
              />
            </dl>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <p className="text-[12.5px] text-text-secondary">{label}</p>
      <p className="font-num mt-2 text-[22px] font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function Row({ label, value, success }: { label: string; value: string; success?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-[12.5px] text-text-tertiary">{label}</dt>
      <dd className={`font-num text-[12.5px] ${success ? "text-success" : "text-text-primary"}`}>
        {value}
      </dd>
    </div>
  );
}