import mongoose, { Document, Model, Schema } from "mongoose";

export type PromiseToPayChannel = "email" | "sms" | "call";
export type PromiseToPayStatus = "active" | "fulfilled" | "broken" | "expired" | "cancelled";

export interface IPromiseToPay extends Document {
  paymentId: string;
  customerId: string;
  recoveryAttemptId?: string | null;
  communicationId?: string | null;
  channel: PromiseToPayChannel;
  status: PromiseToPayStatus;
  promisedAmount: number;
  dueAt: Date;
  promisedAt: Date;
  fulfilledAt?: Date | null;
  brokenAt?: Date | null;
  notes?: string | null;
  customerIntent?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const PromiseToPaySchema = new Schema<IPromiseToPay>(
  {
    paymentId: { type: String, required: true, index: true },
    customerId: { type: String, required: true, index: true },
    recoveryAttemptId: { type: String, default: null, index: true },
    communicationId: { type: String, default: null, index: true },
    channel: { type: String, enum: ["email", "sms", "call"], required: true },
    status: { type: String, enum: ["active", "fulfilled", "broken", "expired", "cancelled"], default: "active", required: true, index: true },
    promisedAmount: { type: Number, required: true, min: 0 },
    dueAt: { type: Date, required: true, index: true },
    promisedAt: { type: Date, default: Date.now, required: true },
    fulfilledAt: { type: Date, default: null },
    brokenAt: { type: Date, default: null },
    notes: { type: String, default: null, trim: true, maxlength: 1000 },
    customerIntent: { type: String, default: null, trim: true },
  },
  { timestamps: true }
);

PromiseToPaySchema.index({ paymentId: 1, status: 1 });

const PromiseToPay: Model<IPromiseToPay> = mongoose.models.PromiseToPay ?? mongoose.model<IPromiseToPay>("PromiseToPay", PromiseToPaySchema);

export default PromiseToPay;