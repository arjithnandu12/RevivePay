import { z } from "zod";

export const paymentIdSchema = z.string().trim().min(1).max(128);

export const createOrderSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320),
  amount: z.coerce.number().finite().positive().max(100000000),
});

export const paymentVerificationSchema = z.object({
  razorpay_order_id: z.string().trim().min(1).max(128),
  razorpay_payment_id: z.string().trim().min(1).max(128),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i),
});

export const recoveryActionSchema = z.object({
  paymentId: paymentIdSchema,
  action: z.enum(["execute", "escalate", "send_link"]),
});

export const settingsSchema = z.object({
  policy: z.object({
    retryLimit: z.coerce.number().int().min(0).max(20),
    highValueThreshold: z.coerce.number().finite().min(0),
    humanApprovalThreshold: z.coerce.number().finite().min(0),
    suspiciousPayments: z.enum(["manual_review", "auto_block"]),
    automaticRetries: z.boolean(),
  }).partial().optional(),
  notifications: z.object({
    emailOnEscalation: z.boolean(),
    emailOnRecovery: z.boolean(),
  }).partial().optional(),
}).refine((value) => value.policy || value.notifications, {
  message: "At least one settings group is required.",
});

export function publicError(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) return "Invalid request data.";
  return fallback;
}