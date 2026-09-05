type Tone = "success" | "danger" | "warning" | "agent" | "policy" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-success-bg text-success border-success-border",
  danger: "bg-danger-bg text-danger border-danger-border",
  warning: "bg-warning-bg text-warning border-warning-border",
  agent: "bg-agent-bg text-agent border-agent-border",
  policy: "bg-policy-bg text-policy border-policy-border",
  neutral: "bg-surface text-text-secondary border-border",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11.5px] font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({
  status,
}: {
  status: "pending" | "success" | "failed" | "scheduled" | "escalated" | "in_progress" | "refunded";
}) {
  const map: Record<string, { tone: Tone; label: string }> = {
    pending: { tone: "warning", label: "Recovery Pending" },
    scheduled: { tone: "policy", label: "Scheduled" },
    in_progress: { tone: "agent", label: "AI Recovery In Progress" },
    escalated: { tone: "danger", label: "Escalated" },
    success: { tone: "success", label: "RevivePay" },
    RevivePay: { tone: "success", label: "RevivePay" },
    recovered: { tone: "success", label: "RevivePay" },
    unrecoverable: { tone: "danger", label: "Blocked by Policy" },
    retry_limit_reached: { tone: "danger", label: "Retry Limit Reached" },
    failed: { tone: "danger", label: "Failed" },
    refunded: { tone: "warning", label: "Refunded · Recovery stopped" },
  };
  const conf = map[status] ?? { tone: "neutral", label: status };
  return <Badge tone={conf.tone}>{conf.label}</Badge>;
}

export function PriorityBadge({
  priority,
}: {
  priority: "Low" | "Medium" | "High" | "Critical";
}) {
  const tone: Tone =
    priority === "Critical"
      ? "danger"
      : priority === "High"
        ? "warning"
        : priority === "Medium"
          ? "policy"
          : "neutral";
  return <Badge tone={tone}>{priority}</Badge>;
}

export function LayerTag({
  layer,
}: {
  layer: "razorpay" | "agent" | "policy";
}) {
  const conf = {
    razorpay: { tone: "neutral" as Tone, label: "Razorpay" },
    agent: { tone: "agent" as Tone, label: "AI Agent" },
    policy: { tone: "policy" as Tone, label: "Policy Engine" },
  }[layer];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-wide ${
        layer === "agent"
          ? "text-agent"
          : layer === "policy"
            ? "text-policy"
            : "text-text-tertiary"
      }`}
    >
      <span
        className={`h-1 w-1 rounded-full ${
          layer === "agent"
            ? "bg-agent"
            : layer === "policy"
              ? "bg-policy"
              : "bg-text-tertiary"
        }`}
      />
      {conf.label}
    </span>
  );
}