import mongoose, { Document, Model, Schema } from "mongoose";

export type AuditActor = "razorpay" | "ai_agent" | "policy_engine" | "system" | "merchant";
export type AuditLayer = "razorpay" | "agent" | "policy" | "system";

export interface IAuditEvent extends Document {
  eventId: string;
  paymentId?: string;
  recoveryAttemptId?: string;
  actor: AuditActor;
  layer: AuditLayer;
  action: string;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const AuditEventSchema = new Schema<IAuditEvent>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    paymentId: { type: String, index: true },
    recoveryAttemptId: { type: String, index: true },
    actor: { type: String, enum: ["razorpay", "ai_agent", "policy_engine", "system", "merchant"], required: true },
    layer: { type: String, enum: ["razorpay", "agent", "policy", "system"], required: true },
    action: { type: String, required: true, trim: true },
    reason: { type: String, default: null, trim: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const AuditEvent: Model<IAuditEvent> = mongoose.models.AuditEvent ?? mongoose.model<IAuditEvent>("AuditEvent", AuditEventSchema);

export default AuditEvent;