export type RecoveryChannel =
  | "email"
  | "sms"
  | "call";

interface ChannelInput {
  riskLevel:
    | "LOW"
    | "MEDIUM"
    | "HIGH";

  customerLifetimeValue: number;

  hasEmail: boolean;

  hasPhone: boolean;

  strategy: string;

  failureReason?: string | null;
}

export function selectRecoveryChannel(
  input: ChannelInput
): RecoveryChannel | null {
  const {
    riskLevel,
    hasEmail,
    hasPhone,
    strategy,
  } = input;

  if (
    strategy === "no_action" ||
    strategy === "awaiting_approval"
  ) {
    return null;
  }

  if (
    riskLevel === "HIGH" &&
    hasPhone
  ) {
    return "call";
  }

  if (
    riskLevel === "MEDIUM" &&
    hasPhone
  ) {
    return "sms";
  }

  if (hasEmail) {
    return "email";
  }

  if (hasPhone) {
    return "sms";
  }

  return null;
}