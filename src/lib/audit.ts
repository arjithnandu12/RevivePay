import AuditEvent, { AuditActor, AuditLayer } from "@/models/AuditEvent";

interface AuditInput {
  paymentId?: string;
  recoveryAttemptId?: string;
  actor: AuditActor;
  layer: AuditLayer;
  action: string;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}

export async function recordAuditEvent(input: AuditInput) {
  try {
    return await AuditEvent.create({
      ...input,
      eventId: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    });
  } catch (error) {
    console.error("Audit event write failed:", error);
    return null;
  }
}