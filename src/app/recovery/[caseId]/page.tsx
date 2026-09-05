"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldAlert,
  ArrowRight,
  Phone,
  MessageSquare,
  Mail,
  UserRound,
  Brain,
  ExternalLink,
} from "lucide-react";

import AppShell from "@/components/layout/app-shell";
import {
  LayerTag,
  PriorityBadge,
  StatusBadge,
} from "@/components/ui/badges";

interface CaseSummary {
  id: string;
  paymentId: string;
  customer: string;
  customerId: string;
  amount: number;
  failureReason: string;
  strategy: string;
  priority:
    | "Low"
    | "Medium"
    | "High"
    | "Critical";
  attempts: number;
  maxAttempts: number;
  status:
    | "pending"
    | "scheduled"
    | "in_progress"
    | "escalated"
    | "success"
    | "refunded";
  nextRetryAt: string | null;
}

interface CustomerIntelligence {
  lifetimeValue: number;
  plan: string;
  successfulPayments: number;
  failedPayments: number;
  averagePayment: number;
  customerSince: string;
}

interface AiDecision {
  strategy: string;
  priority:
    | "Low"
    | "Medium"
    | "High"
    | "Critical";
  recoveryProbability: number;
  expectedRecovery: number;
  reason: string;
  suggestedMessage?: string | null;
  paymentUrl?: string | null;
  status?: string | null;
  RevivePayAmount?: number;
  emailSent?: boolean;
  selectedChannel?:
    | "email"
    | "sms"
    | "call"
    | null;
  communicationStatus?: string | null;
  communicationSummary?: CommunicationSummary;
  recommendedDelayMinutes?: number;
  channel?: "email" | "sms" | "call" | "none";
}

interface DecisionStep {
  step: string;
  layer:
    | "razorpay"
    | "agent"
    | "policy";
  done: boolean;
}

interface TimelineEvent {
  time: string;
  label: string;
  detail: string | null;
  state:
    | "success"
    | "pending"
    | "failure"
    | "blocked";
}

interface TranscriptItem {
  speaker: "agent" | "customer";
  text: string;
  timestamp?: string | Date;
}

interface Communication {
  id: string;
  recoveryAttemptId: string | null;

  channel:
    | "email"
    | "sms"
    | "call";

  provider: string;

  providerId: string | null;

  status: string;

  recipient: string | null;

  message: string | null;

  paymentLinkSent: boolean;

  customerIntent: string | null;

  problem: string | null;

  sentiment: string | null;

  requestedHumanSupport: boolean;

  followUpRequired: boolean;

  resolution: string | null;

  transcript: TranscriptItem[];

  startedAt: string | null;

  endedAt: string | null;

  failureReason: string | null;

  createdAt: string;

  updatedAt: string;
}

interface CommunicationSummary {
  total: number;
  emailCount: number;
  smsCount: number;
  callCount: number;
  latestChannel:
    | "email"
    | "sms"
    | "call"
    | null;
  latestStatus: string | null;
  paymentLinkSent: boolean;
  humanSupportRequested: boolean;
  followUpRequired: boolean;
}

interface PromiseToPay {
  id: string;
  channel: "email" | "sms" | "call";
  status: "active" | "fulfilled" | "broken" | "expired" | "cancelled";
  promisedAmount: number;
  dueAt: string;
  promisedAt: string;
  fulfilledAt: string | null;
  brokenAt: string | null;
  notes: string | null;
  customerIntent: string | null;
}

interface CaseDetail {
  case: CaseSummary;

  customerIntelligence: CustomerIntelligence;

  aiDecision: AiDecision;

  decisionTrace: DecisionStep[];

  timeline: TimelineEvent[];

  communications: Communication[];

  communicationSummary: CommunicationSummary;
  promises: PromiseToPay[];
}

type Action =
  | "execute"
  | "send_link"
  | "escalate";

export default function RecoveryCaseDetailPage() {
  const params = useParams();

  const caseId = params.caseId as string;

  const [data, setData] =
    useState<CaseDetail | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [whyOpen, setWhyOpen] =
    useState(false);

  const [
    communicationOpen,
    setCommunicationOpen,
  ] = useState(true);

  const [confirmAction, setConfirmAction] =
    useState<Action | "call" | null>(
      null
    );

  const [actionLoading, setActionLoading] =
    useState(false);

  const [actionError, setActionError] =
    useState("");

  const [actionSuccess, setActionSuccess] =
    useState("");
    const [callOpen, setCallOpen] =
  useState(false);

const [callCommunicationId, setCallCommunicationId] =
  useState<string | null>(null);

const [callMessages, setCallMessages] =
  useState<
    {
      speaker: "agent" | "customer";
      text: string;
    }[]
  >([]);

const [callInput, setCallInput] =
  useState("");

const [callSending, setCallSending] =
  useState(false);

const [callEnded, setCallEnded] =
  useState(false);

const [promiseChannel, setPromiseChannel] = useState<PromiseToPay["channel"]>("call");
const [promiseDueAt, setPromiseDueAt] = useState("");
const [promiseAmount, setPromiseAmount] = useState("");
const [promiseNotes, setPromiseNotes] = useState("");
const [promiseSaving, setPromiseSaving] = useState(false);

  const fetchCase = useCallback(async function fetchCase() {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/recovery-cases/${caseId}`,
        {
          cache: "no-store",
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Recovery case not found"
        );
      }

      setData(result);
      setError("");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    if (caseId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchCase();
    }
  }, [caseId, fetchCase]);

  async function runAction(
    action: Action
  ) {
    try {
      setActionLoading(true);

      setActionError("");

      setActionSuccess("");

      const response = await fetch(
        `/api/recovery-cases/${caseId}/actions`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            action,
          }),
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Action failed"
        );
      }

      setActionSuccess(
        result.message ||
          "Action completed"
      );

      await fetchCase();
    } catch (err) {
      console.error(err);

      setActionError(
        err instanceof Error
          ? err.message
          : "Action failed"
      );
    } finally {
      setActionLoading(false);

      setConfirmAction(null);
    }
  }

  async function startAICall() {
  try {
    setActionLoading(true);

    setActionError("");
    setActionSuccess("");

    const response = await fetch(
      `/api/recovery-cases/${caseId}/call`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
      }
    );

    const result =
      await response.json();

    if (
      !response.ok ||
      !result.success
    ) {
      throw new Error(
        result.error ||
          "Failed to start AI call"
      );
    }

    setCallCommunicationId(
      result.communicationId
    );

    setCallMessages([
      {
        speaker: "agent",
        text: result.greeting,
      },
      {
        speaker: "agent",
        text: result.question,
      },
    ]);

    setCallInput("");
    setCallEnded(false);
    setCallOpen(true);

    setActionSuccess(
      "Simulated AI recovery call started."
    );

    await fetchCase();
  } catch (err) {
    console.error(err);

    setActionError(
      err instanceof Error
        ? err.message
        : "Failed to start AI call"
    );
  } finally {
    setActionLoading(false);
    setConfirmAction(null);
  }
}
async function sendCallMessage() {
  if (
    !callCommunicationId ||
    !callInput.trim() ||
    callSending ||
    callEnded
  ) {
    return;
  }

  const message =
    callInput.trim();

  setCallInput("");

  setCallMessages((messages) => [
    ...messages,
    {
      speaker: "customer",
      text: message,
    },
  ]);

  try {
    setCallSending(true);

    const response = await fetch(
      `/api/recovery-cases/${caseId}/call/simulate`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          communicationId:
            callCommunicationId,

          message,
        }),
      }
    );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
          "AI call failed"
      );
    }

    if (result.agentResponse) {
      setCallMessages(
        (messages) => [
          ...messages,
          {
            speaker: "agent",
            text:
              result.agentResponse,
          },
        ]
      );
    }

    if (result.ended) {
      setCallEnded(true);
    }

    await fetchCase();
  } catch (err) {
    console.error(err);

    setActionError(
      err instanceof Error
        ? err.message
        : "AI call failed"
    );
  } finally {
    setCallSending(false);
  }
}

async function createPromiseToPay() {
  if (!promiseDueAt || !promiseAmount) {
    setActionError("Due date and promised amount are required.");
    return;
  }
  try {
    setPromiseSaving(true);
    setActionError("");
    const response = await fetch(`/api/recovery-cases/${caseId}/promise-to-pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: promiseChannel, dueAt: new Date(promiseDueAt).toISOString(), promisedAmount: Number(promiseAmount), notes: promiseNotes || undefined }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || "Failed to create promise.");
    setActionSuccess("Promise to pay recorded.");
    setPromiseDueAt("");
    setPromiseAmount("");
    setPromiseNotes("");
    await fetchCase();
  } catch (err) {
    setActionError(err instanceof Error ? err.message : "Failed to create promise.");
  } finally {
    setPromiseSaving(false);
  }
}

async function updatePromise(promiseId: string, status: PromiseToPay["status"]) {
  try {
    setPromiseSaving(true);
    const response = await fetch(`/api/recovery-cases/${caseId}/promise-to-pay?promiseId=${encodeURIComponent(promiseId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || "Failed to update promise.");
    await fetchCase();
  } catch (err) {
    setActionError(err instanceof Error ? err.message : "Failed to update promise.");
  } finally {
    setPromiseSaving(false);
  }
}

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[500px] items-center justify-center">
          <p className="text-[13px] text-text-tertiary">
            Loading recovery case...
          </p>
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <div className="mx-auto max-w-4xl px-8 py-8">
          <Link
            href="/recovery"
            className="flex items-center gap-1.5 text-[12.5px] text-text-tertiary hover:text-text-secondary"
          >
            <ArrowLeft size={13} />

            Back to Recovery Cases
          </Link>

          <div className="mt-8 rounded-lg border border-danger-border bg-danger-bg p-10 text-center">
            <h1 className="text-[16px] font-semibold text-danger">
              Recovery Case Not Found
            </h1>

            <p className="mt-2 text-[13px] text-text-secondary">
              {error ||
                "We couldn't find this recovery case."}
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  const {
    case: recCase,
    customerIntelligence,
    aiDecision,
    decisionTrace,
    timeline,
    communications,
    communicationSummary,
    promises,
  } = data;

  return (
    <AppShell>

      <header className="border-b border-border px-8 py-5">
        <Link
          href="/recovery"
          className="flex items-center gap-1.5 text-[12.5px] text-text-tertiary hover:text-text-secondary"
        >
          <ArrowLeft size={13} />

          Back to Recovery Cases
        </Link>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[19px] font-semibold tracking-tight text-text-primary">
                Recovery Case #
                {recCase.id}
              </h1>

              <StatusBadge
                status={recCase.status}
              />
            </div>

            <p className="mt-1 text-[13px] text-text-secondary">
              {recCase.customer} ·{" "}
              <span className="font-num">
                ₹
                {(recCase.amount ?? 0).toLocaleString(
                  "en-IN"
                )}
              </span>{" "}
              · {recCase.failureReason}
            </p>
          </div>
        </div>
      </header>

      <div className="px-8 py-6">

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

          <div className="rounded-lg border border-border bg-surface p-5">
            <LayerTag layer="razorpay" />

            <h2 className="mt-2 text-[13.5px] font-semibold text-text-primary">
              Payment Information
            </h2>

            <dl className="mt-4 space-y-3.5">
              <Row
                label="Amount"
                value={`₹${(recCase.amount ?? 0).toLocaleString(
                  "en-IN"
                )}`}
                mono
              />

              <Row
                label="Payment ID"
                value={recCase.paymentId}
                mono
              />

              <Row
                label="Failure reason"
                value={
                  recCase.failureReason
                }
              />

              <Row
                label="Attempts"
                value={`${recCase.attempts} / ${recCase.maxAttempts}`}
                mono
              />

              <Row
                label="Next retry"
                value={
                  recCase.nextRetryAt
                    ? formatDate(
                        recCase.nextRetryAt
                      )
                    : "—"
                }
                mono
              />
            </dl>
          </div>

          <div className="rounded-lg border border-border bg-surface p-5">
            <LayerTag layer="agent" />

            <h2 className="mt-2 text-[13.5px] font-semibold text-text-primary">
              Customer Intelligence
            </h2>

            <dl className="mt-4 space-y-3.5">
              <Row
                label="Customer LTV"
                value={`₹${(customerIntelligence.lifetimeValue ?? 0).toLocaleString(
                  "en-IN"
                )}`}
                mono
              />

              <Row
                label="Plan"
                value={
                  customerIntelligence.plan
                }
              />

              <Row
                label="Successful payments"
                value={customerIntelligence.successfulPayments.toString()}
                mono
              />

              <Row
                label="Failed payments"
                value={customerIntelligence.failedPayments.toString()}
                mono
              />

              <Row
                label="Average payment"
                value={`₹${(customerIntelligence.averagePayment ?? 0).toLocaleString(
                  "en-IN"
                )}`}
                mono
              />

              <Row
                label="Customer since"
                value={
                  customerIntelligence.customerSince
                }
                mono
              />
            </dl>
          </div>

          <div className="rounded-lg border border-agent-border bg-agent-bg p-5">
            <LayerTag layer="agent" />

            <h2 className="mt-2 text-[13.5px] font-semibold text-text-primary">
              &ldquo;
              {aiDecision.strategy.toUpperCase()}
              &rdquo;
            </h2>

            <div className="mt-3 flex items-center gap-2">
              <PriorityBadge
                priority={
                  aiDecision.priority
                }
              />
            </div>

            <dl className="mt-4 space-y-3.5">
              <Row
                label="Recovery probability"
                value={`${Math.round((aiDecision.recoveryProbability ?? 0) * 100)}% likely to recover`}
                mono
              />

              <Row
                label="Recommended recovery time"
                value={formatDelay(aiDecision.recommendedDelayMinutes ?? 0)}
              />

              <Row
                label="Recommended channel"
                value={aiDecision.channel ?? aiDecision.selectedChannel ?? "Not selected"}
              />

              <Row
                label="Expected recovery"
                value={`₹${(aiDecision.expectedRecovery ?? 0).toLocaleString(
                  "en-IN"
                )}`}
                mono
              />

              <Row
                label="Selected channel"
                value={
                  aiDecision.selectedChannel
                    ? formatChannel(
                        aiDecision.selectedChannel
                      )
                    : "Not selected"
                }
              />
            </dl>

            <button
              onClick={() =>
                setWhyOpen((v) => !v)
              }
              className="mt-4 flex w-full items-center justify-between rounded-md border border-agent-border bg-bg-elevated/40 px-3 py-2 text-left text-[12.5px] font-medium text-text-primary"
            >
              Why did AI choose this?

              <ChevronDown
                size={14}
                className={`transition-transform ${
                  whyOpen
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>

            {whyOpen && (
              <p className="rise-in mt-2.5 text-[12.5px] leading-relaxed text-text-secondary">
                {aiDecision.reason}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <MessageSquare
                  size={15}
                  className="text-text-secondary"
                />

                <h2 className="text-[13.5px] font-semibold text-text-primary">
                  Recovery Communications
                </h2>
              </div>

              <p className="mt-0.5 text-[12px] text-text-tertiary">
                Every email, SMS and AI call
                used by Recover-AI.
              </p>
            </div>

            <button
              onClick={() =>
                setCommunicationOpen(
                  (v) => !v
                )
              }
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[12px] text-text-secondary hover:bg-surface-hover"
            >
              {communicationOpen
                ? "Hide"
                : "Show"}

              <ChevronDown
                size={13}
                className={`transition-transform ${
                  communicationOpen
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
            <CommunicationStat
              icon={<Mail size={14} />}
              label="Email"
              value={
                communicationSummary.emailCount
              }
            />

            <CommunicationStat
              icon={
                <MessageSquare size={14} />
              }
              label="SMS"
              value={
                communicationSummary.smsCount
              }
            />

            <CommunicationStat
              icon={<Phone size={14} />}
              label="Calls"
              value={
                communicationSummary.callCount
              }
            />

            <CommunicationStat
              icon={<ExternalLink size={14} />}
              label="Link sent"
              value={
                communicationSummary.paymentLinkSent
                  ? "Yes"
                  : "No"
              }
            />

            <CommunicationStat
              icon={<UserRound size={14} />}
              label="Human"
              value={
                communicationSummary.humanSupportRequested
                  ? "Requested"
                  : "No"
              }
            />
          </div>

          {communicationOpen && (
            <div className="mt-5 space-y-3">
              {communications.length ===
              0 ? (
                <div className="rounded-md border border-dashed border-border px-4 py-8 text-center">
                  <p className="text-[12.5px] text-text-tertiary">
                    No customer communications
                    yet.
                  </p>
                </div>
              ) : (
                communications.map(
                  (communication) => (
                    <CommunicationCard
                      key={
                        communication.id
                      }
                      communication={
                        communication
                      }
                    />
                  )
                )
              )}
            </div>
          )}
        </div>

        <section className="mt-4 rounded-lg border border-agent-border bg-agent-bg p-5">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-[13.5px] font-semibold text-text-primary">Promise to Pay</h2>
              <p className="mt-0.5 text-[12px] text-text-tertiary">Track commitments made through email, SMS, or the AI call.</p>
            </div>
            <span className="text-[11px] text-text-tertiary">{promises.filter((promise) => promise.status === "active").length} active promise(s)</span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-4">
            <select value={promiseChannel} onChange={(event) => setPromiseChannel(event.target.value as PromiseToPay["channel"])} className="rounded-md border border-border bg-surface px-3 py-2 text-[12.5px] text-text-primary outline-none">
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="call">AI call</option>
            </select>
            <input type="number" min="1" value={promiseAmount} onChange={(event) => setPromiseAmount(event.target.value)} placeholder="Promised amount" className="rounded-md border border-border bg-surface px-3 py-2 text-[12.5px] text-text-primary outline-none" />
            <input type="datetime-local" value={promiseDueAt} onChange={(event) => setPromiseDueAt(event.target.value)} className="rounded-md border border-border bg-surface px-3 py-2 text-[12.5px] text-text-primary outline-none" />
            <button onClick={createPromiseToPay} disabled={promiseSaving} className="rounded-md bg-text-primary px-3 py-2 text-[12.5px] font-medium text-bg disabled:opacity-50">{promiseSaving ? "Saving..." : "Record promise"}</button>
          </div>
          <input value={promiseNotes} onChange={(event) => setPromiseNotes(event.target.value)} placeholder="Notes or customer commitment" className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-[12.5px] text-text-primary outline-none" />

          <div className="mt-4 space-y-2">
            {promises.length === 0 ? <p className="rounded-md border border-dashed border-border px-4 py-5 text-center text-[12px] text-text-tertiary">No promise recorded yet.</p> : promises.map((promise) => (
              <div key={promise.id} className="flex flex-col gap-3 rounded-md border border-border bg-surface p-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[12.5px] font-medium text-text-primary">{promise.channel.toUpperCase()} · ₹{(promise.promisedAmount ?? 0).toLocaleString("en-IN")}</p>
                  <p className="mt-1 text-[11.5px] text-text-tertiary">Due {formatDateTime(promise.dueAt)}{promise.notes ? ` · ${promise.notes}` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${promise.status === "active" ? "border-warning-border bg-warning-bg text-warning" : promise.status === "fulfilled" ? "border-success-border bg-success-bg text-success" : "border-border text-text-tertiary"}`}>{promise.status.toUpperCase()}</span>
                  {promise.status === "active" && <>
                    <button onClick={() => updatePromise(promise.id, "fulfilled")} disabled={promiseSaving} className="rounded border border-success-border px-2 py-1 text-[11px] text-success disabled:opacity-50">Fulfilled</button>
                    <button onClick={() => updatePromise(promise.id, "broken")} disabled={promiseSaving} className="rounded border border-danger-border px-2 py-1 text-[11px] text-danger disabled:opacity-50">Broken</button>
                  </>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-surface p-5 lg:col-span-2">
            <h2 className="text-[13.5px] font-semibold text-text-primary">
              AI Decision Trace
            </h2>

            <p className="mt-0.5 text-[12px] text-text-tertiary">
              Every step the agent took to
              reach this recommendation.
            </p>

            <ol className="mt-4 space-y-0">
              {decisionTrace.map(
                (step, i) => (
                  <li
                    key={step.step}
                    className="flex items-start gap-3 py-2"
                  >
                    <div className="flex flex-col items-center">
                      <span className="font-num flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border-strong bg-bg-elevated text-[10px] text-text-secondary">
                        {i + 1}
                      </span>

                      {i <
                        decisionTrace.length -
                          1 && (
                        <span
                          className="mt-1 w-px flex-1 bg-border"
                          style={{
                            minHeight: 14,
                          }}
                        />
                      )}
                    </div>

                    <div className="flex flex-1 items-center justify-between pb-1">
                      <span className="text-[13px] text-text-primary">
                        {step.step}
                      </span>

                      <LayerTag
                        layer={
                          step.layer
                        }
                      />
                    </div>
                  </li>
                )
              )}
            </ol>

            <div className="mt-5 flex flex-wrap items-center gap-2 rounded-md border border-border bg-bg-elevated px-4 py-3 text-[11.5px]">
              <span className="text-text-secondary">
                AI Recommendation
              </span>

              <ArrowRight
                size={12}
                className="text-text-tertiary"
              />

              <span className="text-policy">
                Deterministic Policy Engine
              </span>

              <ArrowRight
                size={12}
                className="text-text-tertiary"
              />

              <span className="text-success">
                Channel Selection
              </span>

              <ArrowRight
                size={12}
                className="text-text-tertiary"
              />

              <span className="text-text-secondary">
                Customer
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-5">
            <h2 className="text-[13.5px] font-semibold text-text-primary">
              Recovery Timeline
            </h2>

            {timeline.length === 0 ? (
              <p className="mt-4 text-[12.5px] text-text-tertiary">
                No timeline events yet.
              </p>
            ) : (
              <ol className="mt-4 space-y-4">
                {timeline.map(
                  (t, i) => (
                    <li
                      key={`${t.time}-${t.label}-${i}`}
                      className="flex gap-3"
                    >
                      <TimelineIcon
                        state={t.state}
                      />

                      <div>
                        <p className="text-[12.5px] font-medium text-text-primary">
                          {t.label}
                        </p>

                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          <span className="font-num text-[11px] text-text-tertiary">
                            {formatDateTime(
                              t.time
                            )}
                          </span>

                          {t.detail && (
                            <>
                              <span className="text-[11px] text-text-tertiary">
                                ·
                              </span>

                              <span className="text-[11px] text-text-secondary">
                                {t.detail}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                )}
              </ol>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[13.5px] font-semibold text-text-primary">
                Recommended Action
              </h2>

              <p className="mt-0.5 text-[13px] text-text-secondary">
                {aiDecision.strategy}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">

              <button
                onClick={() =>
                  setConfirmAction("call")
                }
                disabled={
                  actionLoading ||
                  recCase.status ===
                    "success" ||
                  recCase.status ===
                    "escalated"
                }
                className="flex items-center gap-1.5 rounded-md border border-agent-border bg-agent-bg px-4 py-2 text-[13px] font-medium text-text-primary hover:brightness-105 disabled:opacity-50"
              >
                <Phone size={14} />

                Start AI Call
              </button>

              <button
                onClick={() =>
                  setConfirmAction(
                    "execute"
                  )
                }
                disabled={actionLoading}
                className="rounded-md bg-text-primary px-4 py-2 text-[13px] font-medium text-bg hover:opacity-90 disabled:opacity-50"
              >
                Execute Recovery
              </button>

              <button
                onClick={() =>
                  setConfirmAction(
                    "send_link"
                  )
                }
                disabled={actionLoading}
                className="rounded-md border border-border bg-bg-elevated px-4 py-2 text-[13px] font-medium text-text-primary hover:bg-surface-hover disabled:opacity-50"
              >
                Send Payment Link
              </button>

              <button
                onClick={() =>
                  setConfirmAction(
                    "escalate"
                  )
                }
                disabled={actionLoading}
                className="rounded-md border border-danger-border bg-danger-bg px-4 py-2 text-[13px] font-medium text-danger hover:brightness-110 disabled:opacity-50"
              >
                Escalate to Human
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-md border border-warning-border bg-warning-bg px-3 py-2.5">
            <ShieldAlert
              size={14}
              className="mt-0.5 shrink-0 text-warning"
            />

            <p className="text-[12px] leading-relaxed text-text-secondary">
              AI recommendations are
              validated by deterministic
              recovery policies before
              execution. Customer calls never
              request card numbers, CVV, OTP,
              UPI PIN or banking credentials.
            </p>
          </div>

          {actionSuccess && (
            <div className="mt-3 rounded-md border border-success-border bg-success-bg px-3 py-2.5 text-[12.5px] text-success">
              {actionSuccess}
            </div>
          )}

          {actionError && (
            <div className="mt-3 rounded-md border border-danger-border bg-danger-bg px-3 py-2.5 text-[12.5px] text-danger">
              {actionError}
            </div>
          )}
        </div>
      </div>
      {callOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
    <div className="flex h-[650px] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border-strong bg-bg-elevated shadow-2xl">
      

      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-agent-border bg-agent-bg">
              <Phone
                size={17}
                className="text-agent"
              />
            </div>

            <div>
              <p className="text-[13.5px] font-semibold text-text-primary">
                RecoverAI
              </p>

              <p className="text-[11px] text-text-tertiary">
                {callEnded
                  ? "Call ended"
                  : "AI recovery call"}
              </p>
            </div>
          </div>

          {!callEnded && (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-success" />

              <span className="text-[11px] text-success">
                Live
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
        {callMessages.map(
          (message, index) => (
            <div
              key={index}
              className={`flex ${
                message.speaker ===
                "agent"
                  ? "justify-start"
                  : "justify-end"
              }`}
            >
              <div
                className={`max-w-[82%] rounded-lg px-3.5 py-2.5 ${
                  message.speaker ===
                  "agent"
                    ? "border border-agent-border bg-agent-bg"
                    : "border border-border bg-surface"
                }`}
              >
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                  {message.speaker ===
                  "agent"
                    ? "RecoverAI"
                    : "Customer"}
                </p>

                <p className="text-[12.5px] leading-relaxed text-text-primary">
                  {message.text}
                </p>
              </div>
            </div>
          )
        )}

        {callSending && (
          <div className="flex justify-start">
            <div className="rounded-lg border border-agent-border bg-agent-bg px-3.5 py-2.5">
              <p className="text-[11px] text-text-tertiary">
                RecoverAI is thinking...
              </p>
            </div>
          </div>
        )}
      </div>

      {!callEnded ? (
        <div className="border-t border-border p-4">
          <div className="flex gap-2">
            <input
              value={callInput}
              onChange={(event) =>
                setCallInput(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  sendCallMessage();
                }
              }}
              disabled={callSending}
              placeholder="Type customer's response..."
              className="flex-1 rounded-md border border-border bg-surface px-3 py-2.5 text-[12.5px] text-text-primary outline-none placeholder:text-text-tertiary focus:border-agent-border"
            />

            <button
              onClick={
                sendCallMessage
              }
              disabled={
                callSending ||
                !callInput.trim()
              }
              className="rounded-md bg-text-primary px-4 py-2 text-[12.5px] font-medium text-bg disabled:opacity-40"
            >
              Send
            </button>
          </div>

          <p className="mt-2 text-[10.5px] text-text-tertiary">
            Simulated call — type what the customer
            would say.
          </p>
        </div>
      ) : (
        <div className="border-t border-border p-4">
          <div className="rounded-md border border-success-border bg-success-bg px-3 py-2.5 text-[12px] text-success">
            AI call completed. The full conversation
            has been saved to the recovery case.
          </div>

          <button
            onClick={() =>
              setCallOpen(false)
            }
            className="mt-3 w-full rounded-md bg-text-primary px-4 py-2 text-[12.5px] font-medium text-bg"
          >
            Close Call
          </button>
        </div>
      )}
    </div>
  </div>
)}

      {confirmAction && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-border-strong bg-bg-elevated p-5">
            <h3 className="text-[14px] font-semibold text-text-primary">
              {confirmAction ===
              "call"
                ? "Start AI recovery call"
                : "Confirm financial action"}
            </h3>

            <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
              {confirmAction ===
                "execute" &&
                `This will execute the recovery action for ${recCase.paymentId} (₹${(recCase.amount ?? 0).toLocaleString(
                  "en-IN"
                )}) via Razorpay.`}

              {confirmAction ===
                "send_link" &&
                `This will send a new payment link to ${recCase.customer} for ₹${(recCase.amount ?? 0).toLocaleString(
                  "en-IN"
                )}.`}

              {confirmAction ===
                "escalate" &&
                `This will route ${recCase.paymentId} to a human agent for manual review.`}

              {confirmAction ===
                "call" &&
                `Recover-AI will call ${recCase.customer}, explain the failed payment, understand the problem, and help the customer recover the payment. The AI will not ask for card numbers, OTP, CVV, UPI PIN or banking credentials.`}
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() =>
                  setConfirmAction(null)
                }
                disabled={actionLoading}
                className="rounded-md border border-border px-3.5 py-1.5 text-[13px] text-text-secondary hover:bg-surface-hover disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  if (
                    confirmAction ===
                    "call"
                  ) {
                    startAICall();
                  } else {
                    runAction(
                      confirmAction
                    );
                  }
                }}
                disabled={actionLoading}
                className="rounded-md bg-text-primary px-3.5 py-1.5 text-[13px] font-medium text-bg hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading
                  ? "Starting..."
                  : confirmAction ===
                      "call"
                    ? "Start Call"
                    : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function CommunicationCard({
  communication,
}: {
  communication: Communication;
}) {
  const isCall =
    communication.channel ===
    "call";

  const isSms =
    communication.channel ===
    "sms";

  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <CommunicationIcon
            channel={
              communication.channel
            }
          />

          <div>
            <p className="text-[13px] font-semibold text-text-primary">
              {isCall
                ? "AI Recovery Call"
                : isSms
                  ? "Recovery SMS"
                  : "Recovery Email"}
            </p>

            <p className="mt-0.5 text-[11px] text-text-tertiary">
              {formatDateTime(
                communication.createdAt
              )}
            </p>
          </div>
        </div>

        <StatusPill
          status={
            communication.status
          }
        />
      </div>

      {communication.recipient && (
        <div className="mt-3 flex items-center gap-2 text-[11.5px] text-text-secondary">
          <span className="text-text-tertiary">
            Recipient:
          </span>

          <span className="font-num">
            {communication.recipient}
          </span>
        </div>
      )}

      {communication.message && (
        <div className="mt-3 rounded-md border border-border bg-surface px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
            Message
          </p>

          <p className="mt-1 text-[12.5px] leading-relaxed text-text-secondary">
            {communication.message}
          </p>
        </div>
      )}

      {isCall && (
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <InfoChip
            label="Intent"
            value={
              communication.customerIntent
                ? formatChannel(
                    communication.customerIntent
                  )
                : "—"
            }
          />

          <InfoChip
            label="Sentiment"
            value={
              communication.sentiment
                ? formatChannel(
                    communication.sentiment
                  )
                : "—"
            }
          />

          <InfoChip
            label="Payment link"
            value={
              communication.paymentLinkSent
                ? "Sent"
                : "Not sent"
            }
          />

          <InfoChip
            label="Human support"
            value={
              communication.requestedHumanSupport
                ? "Requested"
                : "No"
            }
          />
        </div>
      )}

      {isCall &&
        communication.problem && (
          <div className="mt-3 rounded-md border border-border bg-surface px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
              Problem detected
            </p>

            <p className="mt-1 text-[12.5px] leading-relaxed text-text-secondary">
              {communication.problem}
            </p>
          </div>
        )}

      {communication.resolution && (
        <div className="mt-3 flex items-center gap-2 text-[12px] text-text-secondary">
          <Brain
            size={13}
            className="text-agent"
          />

          <span>
            Resolution:
          </span>

          <span className="font-medium text-text-primary">
            {formatChannel(
              communication.resolution
            )}
          </span>
        </div>
      )}

      {isCall &&
        communication.transcript
          .length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <Phone
                size={13}
                className="text-text-tertiary"
              />

              <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
                Call Transcript
              </p>
            </div>

            <div className="mt-2 space-y-2 rounded-md border border-border bg-surface p-3">
              {communication.transcript.map(
                (item, index) => (
                  <div
                    key={`${communication.id}-${index}`}
                    className={`flex ${
                      item.speaker ===
                      "agent"
                        ? "justify-start"
                        : "justify-end"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-md px-3 py-2 ${
                        item.speaker ===
                        "agent"
                          ? "border border-agent-border bg-agent-bg"
                          : "border border-border bg-bg-elevated"
                      }`}
                    >
                      <div className="mb-0.5 flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                          {item.speaker ===
                          "agent"
                            ? "Recover-AI"
                            : "Customer"}
                        </span>
                      </div>

                      <p className="text-[12px] leading-relaxed text-text-secondary">
                        {item.text}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

      {communication.failureReason && (
        <div className="mt-3 rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-[12px] text-danger">
          {communication.failureReason}
        </div>
      )}
    </div>
  );
}

function CommunicationIcon({
  channel,
}: {
  channel:
    | "email"
    | "sms"
    | "call";
}) {
  if (channel === "call") {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-md border border-agent-border bg-agent-bg">
        <Phone
          size={15}
          className="text-agent"
        />
      </div>
    );
  }

  if (channel === "sms") {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-bg-elevated">
        <MessageSquare
          size={15}
          className="text-text-secondary"
        />
      </div>
    );
  }

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-bg-elevated">
      <Mail
        size={15}
        className="text-text-secondary"
      />
    </div>
  );
}

function CommunicationStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md border border-border bg-bg-elevated px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-text-tertiary">
        {icon}

        <span className="text-[10.5px]">
          {label}
        </span>
      </div>

      <p className="mt-1 text-[13px] font-semibold text-text-primary">
        {value}
      </p>
    </div>
  );
}

function InfoChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-bg-elevated px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-text-tertiary">
        {label}
      </p>

      <p className="mt-0.5 truncate text-[12px] font-medium text-text-primary">
        {value}
      </p>
    </div>
  );
}

function StatusPill({
  status,
}: {
  status: string;
}) {
  const normalized =
    status.toLowerCase();

  let className =
    "border-border bg-bg-elevated text-text-secondary";

  if (
    normalized === "completed" ||
    normalized === "queued"
  ) {
    className =
      "border-success-border bg-success-bg text-success";
  }

  if (
    normalized === "failed"
  ) {
    className =
      "border-danger-border bg-danger-bg text-danger";
  }

  if (
    normalized === "in_progress" ||
    normalized === "ringing" ||
    normalized === "initiated"
  ) {
    className =
      "border-warning-border bg-warning-bg text-warning";
  }

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${className}`}
    >
      {formatChannel(status)}
    </span>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[12.5px] text-text-tertiary">
        {label}
      </dt>

      <dd
        className={`text-right text-[13px] text-text-primary ${
          mono ? "font-num" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function TimelineIcon({
  state,
}: {
  state:
    | "success"
    | "pending"
    | "failure"
    | "blocked";
}) {
  if (state === "failure") {
    return (
      <XCircle
        size={16}
        className="mt-0.5 shrink-0 text-danger"
      />
    );
  }

  if (state === "pending") {
    return (
      <Clock
        size={16}
        className="mt-0.5 shrink-0 text-warning"
      />
    );
  }

  if (state === "blocked") {
    return (
      <ShieldAlert
        size={16}
        className="mt-0.5 shrink-0 text-text-tertiary"
      />
    );
  }

  return (
    <CheckCircle2
      size={16}
      className="mt-0.5 shrink-0 text-success"
    />
  );
}

function formatChannel(
  value: string
): string {
  return value
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (c) => c.toUpperCase()
    );
}

function formatDate(date: string) {
  return new Date(
    date
  ).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function formatDateTime(
  date: string
) {
  return new Date(
    date
  ).toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function formatDelay(minutes: number) {
  if (minutes <= 0) return "Now";
  if (minutes < 60) return `${minutes} minutes from now`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `In ${hours} hours` : `In ${Math.round(hours / 24)} days`;
}