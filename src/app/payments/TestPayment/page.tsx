"use client";

import Script from "next/script";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  Link2,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

type Status = "idle" | "processing" | "success" | "failed" | "error";
type StageState = "pending" | "active" | "done" | "warn";
type PipelineStage = "failed" | "ai_analysis" | "policy_check" | "recovery_action" | "notified";

interface RecoveryRecommendation {
  strategy: string;
  reason: string;
  confidence?: number;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH";
  recoveryProbability?: number;
  recommendedDelayMinutes?: number;
  channel?: string;
}

interface RecoveryPolicyDecision {
  allowed: boolean;
  strategy: string;
  reason: string;
  riskLevel?: string;
  requiresApproval?: boolean;
}

interface RecoveryStatus {
  recommendation?: RecoveryRecommendation;
  policy?: RecoveryPolicyDecision;
  recoveryAttemptId?: string;
  paymentUrl?: string | null;
  attemptsUsed?: number;
  attemptsRemaining?: number;
  channel?: string;
  emailSent?: boolean;
  emailError?: string | null;
}

const RECOVERY_STATUS_ENDPOINT = (paymentId: string) =>
  `/api/payments/${encodeURIComponent(paymentId)}/recovery-status`;

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 15;

const STAGE_ORDER: PipelineStage[] = ["failed", "ai_analysis", "policy_check", "recovery_action", "notified"];

const STAGE_META: Record<PipelineStage, { label: string; color: string; Icon: typeof Sparkles }> = {
  failed: { label: "Payment failed", color: "#E5484D", Icon: XCircle },
  ai_analysis: { label: "AI analysis", color: "#8B7FE8", Icon: Sparkles },
  policy_check: { label: "Policy check", color: "#4FB8AE", Icon: ShieldCheck },
  recovery_action: { label: "Recovery action", color: "#E8B94A", Icon: Link2 },
  notified: { label: "Customer notified", color: "#5FBF77", Icon: Mail },
};

const STRATEGY_LABELS: Record<string, string> = {
  send_reminder: "Send a payment reminder",
  no_action: "No action — this failure can't be retried",
  manual_review: "Flagged for manual review",
  human_approval_required: "Held for approval before contacting the customer",
  call_customer: "Call the customer",
  contact_customer: "Contact the customer directly",
  retry_payment: "Customer-initiated retry allowed",
  offer_discount: "Offer an authorized recovery discount",
};

function humanizeStrategy(strategy: string) {
  return STRATEGY_LABELS[strategy] ?? strategy.replace(/_/g, " ");
}

function channelIcon(channel?: string) {
  if (channel === "sms") return MessageSquare;
  if (channel === "call") return Phone;
  return Mail;
}

export default function TestPayment() {
  const router = useRouter();

  const [name, setName] = useState("Aarav Mehta");
  const [email, setEmail] = useState("aarav@example.com");
  const [mobile, setMobile] = useState("9900001001");
  const [amount, setAmount] = useState("4999");

  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const [paymentId, setPaymentId] = useState<string | null>(null);

  const [refundReason, setRefundReason] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundMessage, setRefundMessage] = useState("");

  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  const [recoveryStatus, setRecoveryStatus] = useState<RecoveryStatus | null>(null);
  const [recoveryTimedOut, setRecoveryTimedOut] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollAttemptsRef = useRef(0);

  const isLoading = status === "processing";

  const stopPolling = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const startRecoveryPolling = useCallback(
    (paymentIdForPoll: string) => {
      stopPolling();
      pollAttemptsRef.current = 0;
      setRecoveryTimedOut(false);

      const poll = async () => {
        pollAttemptsRef.current += 1;

        try {
          const response = await fetch(RECOVERY_STATUS_ENDPOINT(paymentIdForPoll));
          if (response.ok) {
            const data = await response.json();
            const nextStatus: RecoveryStatus | null = data?.recovery ?? data ?? null;

            if (nextStatus && (nextStatus.recommendation || nextStatus.recoveryAttemptId)) {
              setRecoveryStatus(nextStatus);
              if (nextStatus.recoveryAttemptId && (nextStatus.emailSent !== undefined || nextStatus.channel)) {
                return;
              }
            }
          }
        } catch {
        }

        if (pollAttemptsRef.current < POLL_MAX_ATTEMPTS) {
          pollTimeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        } else {
          setRecoveryTimedOut((current) => current || pollAttemptsRef.current >= POLL_MAX_ATTEMPTS);
        }
      };

      poll();
    },
    [stopPolling]
  );

  const goBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard");
    }
  };

  const getErrorMessage = async (response: Response, fallback: string) => {
    try {
      const data = await response.json();
      return data?.error || data?.message || fallback;
    } catch {
      return fallback;
    }
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
    }
  };

  const handlePayment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setMessage("");
    setRefundMessage("");
    setPaymentId(null);
    stopPolling();
    setRecoveryStatus(null);
    setRecoveryTimedOut(false);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMobile = mobile.trim();
    const numericAmount = Number(amount);

    if (!trimmedName) {
      setStatus("error");
      setMessage("Enter your full name.");
      return;
    }

    if (!trimmedEmail) {
      setStatus("error");
      setMessage("Enter your email address.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }

    if (!trimmedMobile) {
      setStatus("error");
      setMessage("Enter your mobile number.");
      return;
    }

    if (!/^[0-9]{10}$/.test(trimmedMobile)) {
      setStatus("error");
      setMessage("Enter a valid 10-digit mobile number.");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setStatus("error");
      setMessage("Enter a valid payment amount.");
      return;
    }

    if (!razorpayLoaded || !window.Razorpay) {
      setStatus("error");
      setMessage("The payment gateway is still loading. Wait a moment and try again.");
      return;
    }

    try {
      setStatus("processing");
      setMessage("Creating your secure payment...");

      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedMobile,
          mobile: trimmedMobile,
          amount: numericAmount,
        }),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Unable to create payment order."));
      }

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("The server returned an invalid response. Try again.");
      }

      if (!data?.success || !data?.order?.id || !data?.payment?.paymentId || !data?.customer?.customerId) {
        throw new Error(data?.error || "Payment order could not be created. Try again.");
      }

      setPaymentId(data.payment.paymentId);
      setMessage("Opening secure Razorpay checkout...");

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "RevivePay",
        description: "Secure Recovery Test",
        order_id: data.order.id,
        prefill: { name: trimmedName, email: trimmedEmail, contact: trimmedMobile },
        notes: { customerId: data.customer.customerId, paymentId: data.payment.paymentId },
        theme: { color: "#0B0B0D" },

        handler: async function (razorpayResponse: {
          razorpay_payment_id?: string;
          razorpay_order_id?: string;
          razorpay_signature?: string;
        }) {
          try {
            setMessage("Payment completed. Verifying securely...");

            if (
              !razorpayResponse?.razorpay_payment_id ||
              !razorpayResponse?.razorpay_order_id ||
              !razorpayResponse?.razorpay_signature
            ) {
              throw new Error("Razorpay returned an incomplete payment response.");
            }

            const verificationResponse = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                razorpay_order_id: razorpayResponse.razorpay_order_id,
                razorpay_signature: razorpayResponse.razorpay_signature,
                amount: numericAmount,
                customerId: data.customer.customerId,
              }),
            });

            if (!verificationResponse.ok) {
              throw new Error(await getErrorMessage(verificationResponse, "Payment verification failed."));
            }

            const verification = await verificationResponse.json();

            if (!verification?.success) {
              throw new Error(verification?.error || "Payment verification failed.");
            }

            setStatus("success");
            setMessage("Payment successful and securely verified.");
            setPaymentId(verification?.payment?.paymentId ?? data.payment.paymentId);
          } catch (error) {
            setStatus("error");
            setMessage(
              error instanceof Error
                ? `Payment completed, but verification failed: ${error.message}`
                : "Payment completed, but verification failed. Check your payment status."
            );
          }
        },

        modal: {
          ondismiss: function () {
            setMessage("Payment window closed. If you experienced a problem, try simulating a failure below.");
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      razorpay.on("payment.failed", async function (failureResponse: any) {
        setStatus("failed");
        setMessage("Payment failed. RevivePay recovery engine is analyzing root cause...");

        try {
          const failRes = await fetch(RECOVERY_STATUS_ENDPOINT(data.payment.paymentId), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              failureReason:
                failureResponse?.error?.reason ||
                failureResponse?.error?.description ||
                "bank_error",
              failureCode: failureResponse?.error?.code || "bank_error",
              failureSource: failureResponse?.error?.source || "bank",
              failureStep: failureResponse?.error?.step || "authorization",
              razorpayPaymentId: failureResponse?.error?.metadata?.payment_id || null,
            }),
          });

          if (failRes.ok) {
            const failData = await failRes.json();
            if (failData?.recovery) {
              setRecoveryStatus(failData.recovery);
              setMessage("Payment failed. RevivePay has executed recovery workflow below.");
            }
          }
        } catch (err) {
          console.error("Failed to report payment failure to server:", err);
        }

        startRecoveryPolling(data.payment.paymentId);
      });

      razorpay.on("checkout.error", function () {
        setStatus("error");
        setMessage("Razorpay checkout encountered an error. Try again or simulate failure.");
      });

      razorpay.open();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong while starting the payment.");
    }
  };

  const handleSimulateFailure = async () => {
    setMessage("");
    setRefundMessage("");
    setPaymentId(null);
    stopPolling();
    setRecoveryStatus(null);
    setRecoveryTimedOut(false);

    const trimmedName = name.trim() || "Aarav Mehta";
    const trimmedEmail = email.trim() || "aarav@example.com";
    const trimmedMobile = mobile.trim() || "9900001001";
    const numericAmount = Number(amount) > 0 ? Number(amount) : 4999;

    if (!name) setName(trimmedName);
    if (!email) setEmail(trimmedEmail);
    if (!mobile) setMobile(trimmedMobile);
    if (!amount) setAmount(numericAmount.toString());

    try {
      setStatus("processing");
      setMessage("Creating payment order and simulating bank authorization failure...");

      const createRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedMobile,
          mobile: trimmedMobile,
          amount: numericAmount,
        }),
      });

      if (!createRes.ok) {
        throw new Error(await getErrorMessage(createRes, "Unable to create test payment order."));
      }

      const createData = await createRes.json();
      if (!createData?.success || !createData?.payment?.paymentId) {
        throw new Error(createData?.error || "Failed to create payment record.");
      }

      const createdPaymentId = createData.payment.paymentId;
      setPaymentId(createdPaymentId);
      setStatus("failed");
      setMessage("Bank authorization failed. RevivePay AI agent is running tools, policy checks, and generating recovery links...");

      const failRes = await fetch(RECOVERY_STATUS_ENDPOINT(createdPaymentId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          failureReason: "bank_error",
          failureCode: "bad_request_error",
          failureSource: "bank",
          failureStep: "payment_authorization",
        }),
      });

      if (failRes.ok) {
        const failData = await failRes.json();
        if (failData?.recovery) {
          setRecoveryStatus(failData.recovery);
          setMessage("Payment failed (Bank Error). RevivePay autonomous agent completed recovery pipeline below.");
        }
      }

      startRecoveryPolling(createdPaymentId);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to simulate payment failure.");
    }
  };

  const handleRefund = async () => {
    if (!paymentId) {
      setRefundMessage("No verified payment is available for refund.");
      return;
    }

    try {
      setRefundLoading(true);
      setRefundMessage("");

      const response = await fetch(`/api/payments/${paymentId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: refundReason.trim() }),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Refund request failed."));
      }

      const result = await response.json();
      if (!result?.success) {
        throw new Error(result?.error || "Refund request failed.");
      }

      setRefundMessage(`Refund requested successfully. Refund ID: ${result.refundId}`);
    } catch (error) {
      setRefundMessage(error instanceof Error ? error.message : "Refund request failed.");
    } finally {
      setRefundLoading(false);
    }
  };

  const getStageState = (stage: PipelineStage): StageState => {
    if (status !== "failed") return "pending";

    switch (stage) {
      case "failed":
        return "done";
      case "ai_analysis":
        return recoveryStatus?.recommendation ? "done" : "active";
      case "policy_check":
        if (!recoveryStatus?.recommendation) return "pending";
        return recoveryStatus?.policy ? "done" : "active";
      case "recovery_action":
        if (!recoveryStatus?.policy) return "pending";
        return recoveryStatus?.recoveryAttemptId ? "done" : "active";
      case "notified":
        if (!recoveryStatus?.recoveryAttemptId) return "pending";
        if (recoveryStatus.emailSent) return "done";
        if (recoveryStatus.emailError) return "warn";
        return "done";
      default:
        return "pending";
    }
  };

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setRazorpayLoaded(true)}
        onError={() => {
          setRazorpayLoaded(false);
          setStatus("error");
          setMessage("Couldn't load Razorpay checkout SDK. Check your internet connection.");
        }}
      />

      <main className="min-h-screen bg-[#0B0B0D] text-[#F2F1ED]">
        <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
          <button
            type="button"
            onClick={goBack}
            className="mb-8 inline-flex items-center gap-2 text-sm text-[#8B8D93] transition hover:text-[#F2F1ED]"
          >
            <ArrowLeft size={17} />
            Back to Dashboard
          </button>

          <div className="mb-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#2A2B2F] bg-[#16171A]">
              <CreditCard size={22} className="text-[#F2F1ED]" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Test Payment & Live Recovery</h1>
            <p className="mt-2 max-w-lg text-sm leading-6 text-[#8B8D93]">
              Experience real Razorpay checkout or simulate payment failure to observe RevivePay&apos;s autonomous AI recovery workflow in real time.
            </p>
          </div>

          <div className="mb-5 flex items-center justify-between rounded-xl border border-[#2A2B2F] bg-[#16171A] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className={`h-2.5 w-2.5 rounded-full ${razorpayLoaded ? "bg-[#5FBF77]" : "bg-[#E8B94A]"}`} />
              <div>
                <p className="text-sm font-medium">Razorpay Checkout SDK</p>
                <p className="text-xs text-[#8B8D93]">
                  {razorpayLoaded ? "Ready for live / test payments" : "Loading payment gateway SDK..."}
                </p>
              </div>
            </div>
            <ShieldCheck size={18} className="text-[#8B8D93]" />
          </div>

          <form
            onSubmit={handlePayment}
            className="rounded-2xl border border-[#2A2B2F] bg-[#16171A] p-5 shadow-2xl sm:p-7"
          >
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Payment Details</h2>
              <p className="mt-1 text-sm text-[#8B8D93]">Enter customer information to initiate a payment or trigger recovery.</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#D7D8DB]">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aarav Mehta"
                  disabled={isLoading}
                  autoComplete="name"
                  className="w-full rounded-xl border border-[#2A2B2F] bg-[#0B0B0D] px-4 py-3 text-sm text-[#F2F1ED] outline-none transition placeholder:text-[#5B5D63] focus:border-[#8B8D93] disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#D7D8DB]">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="aarav@example.com"
                  disabled={isLoading}
                  autoComplete="email"
                  className="w-full rounded-xl border border-[#2A2B2F] bg-[#0B0B0D] px-4 py-3 text-sm text-[#F2F1ED] outline-none transition placeholder:text-[#5B5D63] focus:border-[#8B8D93] disabled:cursor-not-allowed disabled:opacity-60"
                />
                <p className="mt-1.5 text-xs text-[#5B5D63]">Used by RevivePay to send automated payment recovery links.</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#D7D8DB]">Mobile Number</label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                  placeholder="9900001001"
                  maxLength={10}
                  disabled={isLoading}
                  autoComplete="tel"
                  className="w-full rounded-xl border border-[#2A2B2F] bg-[#0B0B0D] px-4 py-3 text-sm text-[#F2F1ED] outline-none transition placeholder:text-[#5B5D63] focus:border-[#8B8D93] disabled:cursor-not-allowed disabled:opacity-60"
                />
                <p className="mt-1.5 text-xs text-[#5B5D63]">Used for high-risk SMS and AI voice call recovery channels.</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#D7D8DB]">Amount (INR)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B8D93]">₹</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="4999"
                    min="1"
                    step="1"
                    disabled={isLoading}
                    className="w-full rounded-xl border border-[#2A2B2F] bg-[#0B0B0D] py-3 pl-9 pr-4 text-sm text-[#F2F1ED] outline-none transition placeholder:text-[#5B5D63] focus:border-[#8B8D93] disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            {message && (
              <div
                className={`mt-5 flex items-start gap-3 rounded-xl border p-4 ${
                  status === "success"
                    ? "border-[#5FBF77]/30 bg-[#5FBF77]/10"
                    : status === "failed"
                    ? "border-[#E5484D]/30 bg-[#E5484D]/10"
                    : status === "error"
                    ? "border-[#E8B94A]/30 bg-[#E8B94A]/10"
                    : "border-[#2A2B2F] bg-[#0B0B0D]"
                }`}
              >
                {status === "success" ? (
                  <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-[#5FBF77]" />
                ) : status === "failed" ? (
                  <XCircle size={19} className="mt-0.5 shrink-0 text-[#E5484D]" />
                ) : (
                  <ShieldCheck size={19} className="mt-0.5 shrink-0 text-[#8B8D93]" />
                )}
                <p className="text-sm leading-5 text-[#D7D8DB]">{message}</p>
              </div>
            )}

            <div className="mt-6 space-y-3">
              <button
                type="submit"
                disabled={isLoading || !razorpayLoaded}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F2F1ED] px-6 py-3.5 text-sm font-semibold text-[#0B0B0D] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Opening Checkout...
                  </>
                ) : !razorpayLoaded ? (
                  "Loading payment gateway..."
                ) : (
                  <>
                    <CreditCard size={17} />
                    {amount ? `Pay ₹${Number(amount).toLocaleString("en-IN")}` : "Pay now"}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSimulateFailure}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E5484D]/40 bg-[#E5484D]/10 px-4 py-3 text-xs font-semibold text-[#E5484D] transition hover:bg-[#E5484D]/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <AlertTriangle size={15} />
                Simulate Payment Failure (Live Workflow Demo)
              </button>
            </div>
          </form>

          {status === "failed" && (
            <section className="mt-6 animate-[fadeIn_0.4s_ease-out] rounded-2xl border border-[#2A2B2F] bg-[#16171A] p-5 sm:p-7">
              <div className="mb-6 flex items-center justify-between border-b border-[#2A2B2F] pb-4">
                <div>
                  <h2 className="text-base font-semibold text-[#F2F1ED]">Autonomous Recovery Pipeline</h2>
                  <p className="mt-0.5 text-xs text-[#8B8D93]">Live orchestration from root-cause analysis to payment link dispatch</p>
                </div>
                {!recoveryTimedOut && (
                  <span className="flex items-center gap-1.5 rounded-full border border-[#5FBF77]/30 bg-[#5FBF77]/10 px-2.5 py-1 text-xs font-medium text-[#5FBF77]">
                    <Loader2 size={12} className="animate-spin" />
                    Live Agent
                  </span>
                )}
              </div>

              <div>
                {STAGE_ORDER.map((stage, index) => {
                  const meta = STAGE_META[stage];
                  const state = getStageState(stage);
                  const isLast = index === STAGE_ORDER.length - 1;

                  const lineColor = state === "pending" ? "#2A2B2F" : meta.color;
                  const nodeBorder = state === "pending" ? "#2A2B2F" : meta.color;

                  return (
                    <div key={stage} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2"
                          style={{ borderColor: nodeBorder }}
                        >
                          {state === "active" ? (
                            <Loader2 size={16} className="animate-spin" style={{ color: meta.color }} />
                          ) : state === "done" ? (
                            <CheckCircle2 size={17} style={{ color: meta.color }} />
                          ) : state === "warn" ? (
                            <AlertTriangle size={16} style={{ color: "#E8B94A" }} />
                          ) : (
                            <meta.Icon size={16} className="text-[#5B5D63]" />
                          )}
                        </div>
                        {!isLast && <div className="mt-1 w-px flex-1" style={{ background: lineColor }} />}
                      </div>

                      <div className="flex-1 pb-8">
                        <p
                          className="pt-1.5 text-sm font-medium"
                          style={{ color: state === "pending" ? "#5B5D63" : "#F2F1ED" }}
                        >
                          {meta.label}
                        </p>

                        {stage === "failed" && (
                          <p className="mt-1 text-xs text-[#E5484D]">
                            Payment failed due to transient bank authorization error. Recover-AI was notified.
                          </p>
                        )}

                        {stage === "ai_analysis" && state === "done" && recoveryStatus?.recommendation && (
                          <div className="mt-2 space-y-2 rounded-xl border border-[#2A2B2F] bg-[#0B0B0D] p-3 text-xs text-[#8B8D93]">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[#F2F1ED]">
                                {humanizeStrategy(recoveryStatus.recommendation.strategy)}
                              </span>
                              <span className="rounded bg-[#8B7FE8]/20 px-2 py-0.5 text-[11px] font-medium text-[#8B7FE8]">
                                AI Confidence {Math.round((recoveryStatus.recommendation.confidence ?? 0.9) * 100)}%
                              </span>
                            </div>
                            <p className="leading-relaxed text-[#D7D8DB]">{recoveryStatus.recommendation.reason}</p>
                            <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-[#8B8D93]">
                              <span>Risk: <strong className="text-[#F2F1ED]">{recoveryStatus.recommendation.riskLevel ?? "LOW"}</strong></span>
                              <span>Probability: <strong className="text-[#F2F1ED]">{Math.round((recoveryStatus.recommendation.recoveryProbability ?? 0.85) * 100)}%</strong></span>
                              <span>Channel: <strong className="text-[#F2F1ED] capitalize">{recoveryStatus.recommendation.channel ?? "email"}</strong></span>
                            </div>
                          </div>
                        )}

                        {stage === "policy_check" && state === "done" && recoveryStatus?.policy && (
                          <div className="mt-2 space-y-1.5 rounded-xl border border-[#2A2B2F] bg-[#0B0B0D] p-3 text-xs text-[#8B8D93]">
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                                  recoveryStatus.policy.allowed
                                    ? "bg-[#5FBF77]/20 text-[#5FBF77]"
                                    : "bg-[#E5484D]/20 text-[#E5484D]"
                                }`}
                              >
                                {recoveryStatus.policy.allowed ? "Policy Approved" : "Policy Blocked"}
                              </span>
                            </div>
                            <p className="leading-relaxed text-[#D7D8DB]">{recoveryStatus.policy.reason}</p>
                          </div>
                        )}

                        {stage === "recovery_action" && state === "done" && (
                          <div className="mt-2 space-y-2 text-sm text-[#8B8D93]">
                            <div className="flex items-center gap-2 text-xs">
                              {(() => {
                                const ChannelIcon = channelIcon(recoveryStatus?.channel);
                                return <ChannelIcon size={14} className="text-[#E8B94A]" />;
                              })()}
                              <span className="font-medium text-[#F2F1ED] capitalize">
                                Channel: {recoveryStatus?.channel ?? "email"}
                              </span>
                              <span className="text-[#5B5D63]">·</span>
                              <span>Attempt {recoveryStatus?.attemptsUsed ?? 1} of 3</span>
                            </div>

                            {recoveryStatus?.paymentUrl && (
                              <div className="flex items-center gap-2 rounded-xl border border-[#2A2B2F] bg-[#0B0B0D] px-3.5 py-2.5">
                                <p className="flex-1 truncate font-mono text-xs text-[#D7D8DB]">
                                  {recoveryStatus.paymentUrl}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => copyLink(recoveryStatus.paymentUrl as string)}
                                  className="flex items-center gap-1 rounded-lg border border-[#2A2B2F] px-2 py-1 text-xs text-[#8B8D93] transition hover:text-[#F2F1ED]"
                                  aria-label="Copy recovery link"
                                >
                                  {linkCopied ? (
                                    <>
                                      <CheckCircle2 size={13} className="text-[#5FBF77]" />
                                      <span className="text-[#5FBF77]">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={13} />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                                <a
                                  href={recoveryStatus.paymentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1 rounded-lg bg-[#F2F1ED] px-2.5 py-1 text-xs font-semibold text-[#0B0B0D] transition hover:bg-white"
                                  aria-label="Open recovery link"
                                >
                                  <span>Pay Link</span>
                                  <ExternalLink size={12} />
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        {stage === "notified" && state === "done" && (
                          <div className="mt-2 text-xs text-[#8B8D93]">
                            {recoveryStatus?.emailSent ? (
                              <p className="text-[#5FBF77]">Recovery notification and payment link dispatched to {email || "the customer"}.</p>
                            ) : (
                              <p className="text-[#D7D8DB]">Recovery link ready. Customer communication queued for {email || "the customer"}.</p>
                            )}
                          </div>
                        )}

                        {stage === "notified" && state === "warn" && (
                          <div className="mt-2 rounded-lg border border-[#E8B94A]/30 bg-[#E8B94A]/10 p-3 text-xs leading-5 text-[#E8B94A]">
                            Payment link created successfully. (Email dispatch note: {recoveryStatus?.emailError}). Share link above directly.
                          </div>
                        )}

                        {stage === "notified" && state === "active" && (
                          <p className="mt-2 text-xs text-[#8B8D93]">Dispatching customer notification...</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {recoveryTimedOut && !recoveryStatus?.recoveryAttemptId && (
                <div className="flex items-start gap-2.5 rounded-lg border border-[#2A2B2F] bg-[#0B0B0D] p-3 text-xs leading-5 text-[#8B8D93]">
                  <Clock size={14} className="mt-0.5 shrink-0" />
                  <span>
                    Checking background recovery workers — visit the Recovery tab to view the active case.
                  </span>
                </div>
              )}
            </section>
          )}

          {paymentId && status === "success" && (
            <section className="mt-6 rounded-2xl border border-[#E5484D]/30 bg-[#16171A] p-5 sm:p-7">
              <div className="mb-5">
                <div className="flex items-center gap-2">
                  <RotateCcw size={18} className="text-[#E5484D]" />
                  <h2 className="font-semibold">Refund this payment</h2>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#8B8D93]">
                  A refund stops any active recovery or promise-to-pay workflow and cancels future retries.
                </p>
              </div>

              <input
                value={refundReason}
                onChange={(event) => setRefundReason(event.target.value)}
                placeholder="Refund reason (optional)"
                disabled={refundLoading}
                className="w-full rounded-xl border border-[#2A2B2F] bg-[#0B0B0D] px-4 py-3 text-sm text-[#F2F1ED] outline-none transition placeholder:text-[#5B5D63] focus:border-[#E5484D] disabled:opacity-60"
              />

              <button
                type="button"
                disabled={refundLoading}
                onClick={handleRefund}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#E5484D] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#c53d42] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {refundLoading ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Requesting refund...
                  </>
                ) : (
                  <>
                    <RotateCcw size={17} />
                    Request refund
                  </>
                )}
              </button>

              {refundMessage && (
                <div className="mt-4 rounded-xl border border-[#2A2B2F] bg-[#0B0B0D] p-4 text-sm text-[#D7D8DB]">
                  {refundMessage}
                </div>
              )}
            </section>
          )}

          <div className="mt-8 text-center">
            <p className="text-xs text-[#5B5D63]">Every transaction integrates with Razorpay hosted checkout and Recover-AI.</p>
            <p className="mt-1 text-xs text-[#3F4145]">Buildathon Test Sandbox · Recover-AI</p>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
          }
        }
      `}</style>
    </>
  );
}