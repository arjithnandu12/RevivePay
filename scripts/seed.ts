// import dotenv from "dotenv";

// dotenv.config({ path: ".env.local" });
// import mongoose from "mongoose";

// import AuditEvent from "../src/models/AuditEvent";
// import Customer from "../src/models/Customer";
// import Payment from "../src/models/Payment";
// import RecoveryAttempt from "../src/models/RecoveryAttempt";
// import RecoveryCommunication from "../src/models/RecoveryCommunication";
// import Settings from "../src/models/settings";
// import Subscription from "../src/models/Subscription";
// import WebhookEvent from "../src/models/webhookEvent";

// const DAYS = 30;
// const NOW = new Date();

// function daysAgo(days: number, hours = 12) {
//   const date = new Date(NOW);
//   date.setDate(date.getDate() - days);
//   date.setHours(hours, 0, 0, 0);
//   return date;
// }

// function id(prefix: string, number: number) {
//   return `${prefix}_${String(number).padStart(4, "0")}`;
// }

// const customers = Array.from({ length: 36 }, (_, index) => {
//   const number = index + 1;
//   const plans = [
//     ["Starter", 2500],
//     ["Pro", 10000],
//     ["Business", 25000],
//     ["Enterprise", 75000],
//   ] as const;
//   const [plan, monthlyValue] = plans[index % plans.length];

//   return {
//     customerId: id("CUS", number),
//     name: ["Aarav Mehta", "Mira Shah", "Kabir Rao", "Ananya Iyer", "Rohan Kapoor", "Neha Verma"][index % 6] + ` ${number}`,
//     email: `customer${number}@Recovered.demo`.toLowerCase(),
//     plan,
//     monthlyValue,
//     lifetimeValue: monthlyValue * (5 + (index % 18)),
//     successfulPayments: 5 + (index % 15),
//     failedPayments: index % 6,
//     phone: `+91990000${String(1000 + number)}`,
//   };
// });

// const specialCustomers = [
//   { customerId: "CUS_RECOVERED", name: "Arjith Mandula", email: "arjith.recovered@Recovered.demo", plan: "Enterprise", monthlyValue: 27999, lifetimeValue: 320000, successfulPayments: 12, failedPayments: 2, phone: "+919900009001" },
//   { customerId: "CUS_BLOCKED", name: "Priya Nair", email: "priya.blocked@Recovered.demo", plan: "Pro", monthlyValue: 12000, lifetimeValue: 144000, successfulPayments: 10, failedPayments: 3, phone: "+919900009002" },
//   { customerId: "CUS_RETRY", name: "Vikram Singh", email: "vikram.retry@Recovered.demo", plan: "Business", monthlyValue: 18000, lifetimeValue: 216000, successfulPayments: 11, failedPayments: 4, phone: "+919900009003" },
//   { customerId: "CUS_PENDING", name: "Sneha Kapoor", email: "sneha.pending@Recovered.demo", plan: "Pro", monthlyValue: 15000, lifetimeValue: 90000, successfulPayments: 6, failedPayments: 2, phone: "+919900009004" },
//   { customerId: "CUS_UNANALYZED", name: "Karan Malhotra", email: "karan.unanalyzed@Recovered.demo", plan: "Starter", monthlyValue: 5000, lifetimeValue: 25000, successfulPayments: 5, failedPayments: 1, phone: "+919900009005" },
// ];

// const allCustomers = [...customers, ...specialCustomers];
// const payments: Array<Record<string, unknown>> = [];

// for (let index = 0; index < 72; index += 1) {
//   const customer = customers[index % customers.length];
//   const number = index + 1;
//   const status = index % 5 === 0 ? "pending" : index % 3 === 0 ? "failed" : "success";
//   const failureReasons = ["bank_error", "insufficient_funds", "payment_timeout", "gateway_error", "authentication_failed"];
//   const failureReason = status === "failed" ? failureReasons[index % failureReasons.length] : null;

//   payments.push({
//     paymentId: id("PAY", number),
//     orderId: `order_seed_${String(number).padStart(5, "0")}`,
//     customerId: customer.customerId,
//     amount: customer.monthlyValue,
//     currency: "INR",
//     status,
//     failureReason,
//     failureCode: failureReason,
//     failureSource: status === "failed" ? "bank" : null,
//     failureStep: status === "failed" ? "authorization" : null,
//     attempts: 1,
//     razorpayPaymentId: status === "success" ? `pay_seed_${number}` : null,
//     recoveryStatus: "pending",
//     recoveryAction: null,
//     createdAt: daysAgo(number % DAYS, 8 + (index % 8)),
//   });
// }

// const specialPayments = [
//   { paymentId: "PAY_RECOVERED", orderId: "order_seed_recovered", customerId: "CUS_RECOVERED", amount: 27999, failureReason: "bank_error", failureCode: "bank_error", failureSource: "bank", failureStep: "authorization", recoveryStatus: "recovered", recoveryAction: "send_reminder", createdAt: daysAgo(3, 10) },
//   { paymentId: "PAY_BLOCKED", orderId: "order_seed_blocked", customerId: "CUS_BLOCKED", amount: 12000, failureReason: "card_blocked", failureCode: "card_blocked", failureSource: "bank", failureStep: "authorization", recoveryStatus: "unrecoverable", recoveryAction: "no_action", createdAt: daysAgo(8, 11) },
//   { paymentId: "PAY_BOUNDED_RETRY", orderId: "order_seed_bounded", customerId: "CUS_RETRY", amount: 18000, failureReason: "payment_timeout", failureCode: "payment_timeout", failureSource: "gateway", failureStep: "authorization", recoveryStatus: "unrecoverable", recoveryAction: "no_action", createdAt: daysAgo(12, 12) },
//   { paymentId: "PAY_PENDING", orderId: "order_seed_pending", customerId: "CUS_PENDING", amount: 15000, failureReason: "gateway_error", failureCode: "gateway_error", failureSource: "gateway", failureStep: "authorization", recoveryStatus: "in_progress", recoveryAction: "send_reminder", createdAt: daysAgo(1, 14) },
//   { paymentId: "PAY_UNANALYZED", orderId: "order_seed_unanalyzed", customerId: "CUS_UNANALYZED", amount: 5000, failureReason: "unknown_provider_error", failureCode: "unknown_provider_error", failureSource: "provider", failureStep: "authorization", recoveryStatus: "pending", recoveryAction: null, createdAt: daysAgo(5, 9) },
// ].map((payment) => ({ ...payment, currency: "INR", status: "failed", attempts: 1, razorpayPaymentId: null }));

// payments.push(...specialPayments);
// const recoveryAttempts: Array<Record<string, unknown>> = [];

// function addAttempt(input: {
//   paymentId: string;
//   customerId: string;
//   amount: number;
//   attemptNumber: number;
//   status: "failed" | "recovered" | "pending" | "processing" | "cancelled";
//   strategy: string;
//   reason: string;
//   attemptedAt: Date;
//   failureReason?: string | null;
//   paymentUrl?: string | null;
//   recoveryOrderId?: string | null;
// }) {
//   recoveryAttempts.push({
//     paymentId: input.paymentId,
//     customerId: input.customerId,
//     attemptNumber: input.attemptNumber,
//     strategy: input.strategy,
//     aiReason: input.reason,
//     status: input.status,
//     attemptedAt: input.attemptedAt,
//     completedAt: input.status === "pending" || input.status === "processing" ? null : new Date(input.attemptedAt.getTime() + 25 * 60000),
//     recoveredAmount: input.status === "recovered" ? input.amount : 0,
//     failureReason: input.failureReason ?? null,
//     aiConfidence: 0.92,
//     riskLevel: input.status === "failed" && input.failureReason === "policy_blocked" ? "HIGH" : "MEDIUM",
//     suggestedMessage: "Your payment needs attention. Complete it securely using the payment link.",
//     paymentUrl: input.paymentUrl ?? null,
//     razorpayPaymentLinkId: input.paymentUrl ? `plink_seed_${input.paymentId}_${input.attemptNumber}` : null,
//     recoveryOrderId: input.recoveryOrderId ?? null,
//     recoveryRazorpayPaymentId: input.status === "recovered" ? `pay_recovery_${input.paymentId}` : null,
//     razorpayOrderId: input.recoveryOrderId ?? null,
//     razorpayPaymentId: input.status === "recovered" ? `pay_recovery_${input.paymentId}` : null,
//     channel: "email",
//     channelReason: "Email is available and the recovery policy allows a customer-initiated payment link.",
//     emailSent: input.status !== "pending",
//     emailSentAt: input.status !== "pending" ? input.attemptedAt : null,
//     emailMessageId: input.status !== "pending" ? `email_seed_${input.paymentId}_${input.attemptNumber}` : null,
//     emailError: null,
//   });
// }

// addAttempt({ paymentId: "PAY_RECOVERED", customerId: "CUS_RECOVERED", amount: 27999, attemptNumber: 1, status: "failed", strategy: "send_reminder", reason: "The first payment link was not completed.", failureReason: "customer_unresponsive", attemptedAt: daysAgo(3, 10), paymentUrl: "https://rzp.io/seed-recovered-1", recoveryOrderId: "order_seed_recovery_1" });
// addAttempt({ paymentId: "PAY_RECOVERED", customerId: "CUS_RECOVERED", amount: 27999, attemptNumber: 2, status: "recovered", strategy: "send_reminder", reason: "The customer has a strong payment history and a payment-link reminder is appropriate.", attemptedAt: daysAgo(2, 10), paymentUrl: "https://rzp.io/seed-recovered-2", recoveryOrderId: "order_seed_recovery_2" });
// addAttempt({ paymentId: "PAY_BLOCKED", customerId: "CUS_BLOCKED", amount: 12000, attemptNumber: 1, status: "failed", strategy: "no_action", reason: "Card-blocked failures are permanent and must not be blindly retried.", failureReason: "policy_blocked", attemptedAt: daysAgo(8, 12) });

// for (let attemptNumber = 1; attemptNumber <= 3; attemptNumber += 1) {
//   addAttempt({ paymentId: "PAY_BOUNDED_RETRY", customerId: "CUS_RETRY", amount: 18000, attemptNumber, status: "failed", strategy: "send_reminder", reason: `Recovery attempt ${attemptNumber} failed and the configured maximum is three attempts.`, failureReason: attemptNumber === 3 ? "retry_limit_reached" : "payment_timeout", attemptedAt: daysAgo(13 - attemptNumber * 2, 10) });
// }

// addAttempt({ paymentId: "PAY_PENDING", customerId: "CUS_PENDING", amount: 15000, attemptNumber: 1, status: "processing", strategy: "send_reminder", reason: "A temporary gateway error is eligible for customer-initiated recovery.", attemptedAt: daysAgo(1, 14), paymentUrl: "https://rzp.io/seed-pending", recoveryOrderId: "order_seed_pending_recovery" });

// for (const payment of payments.filter((item) => item.status === "failed").slice(0, 10)) {
//   const paymentId = String(payment.paymentId);
//   if (recoveryAttempts.some((attempt) => attempt.paymentId === paymentId)) continue;
//   addAttempt({ paymentId, customerId: String(payment.customerId), amount: Number(payment.amount), attemptNumber: 1, status: "failed", strategy: payment.failureReason === "authentication_failed" ? "no_action" : "send_reminder", reason: "Seeded recovery case for testing list views and AI analysis.", failureReason: payment.failureReason === "authentication_failed" ? "policy_blocked" : "customer_unresponsive", attemptedAt: new Date(String(payment.createdAt)) });
// }

// function auditEvents() {
//   return recoveryAttempts.flatMap((attempt) => {
//     const paymentId = String(attempt.paymentId);
//     const attemptNumber = Number(attempt.attemptNumber);
//     const createdAt = new Date(String(attempt.attemptedAt));
//     return [
//       { eventId: `audit_${paymentId}_${attemptNumber}_ai`, paymentId, actor: "ai_agent", layer: "agent", action: "strategy_recommended", reason: String(attempt.aiReason), metadata: { strategy: attempt.strategy, confidence: attempt.aiConfidence }, createdAt },
//       { eventId: `audit_${paymentId}_${attemptNumber}_policy`, paymentId, actor: "policy_engine", layer: "policy", action: attempt.status === "failed" && attempt.failureReason === "policy_blocked" ? "strategy_blocked" : "strategy_approved", reason: String(attempt.aiReason), metadata: { attemptNumber }, createdAt: new Date(createdAt.getTime() + 1000) },
//     ];
//   });
// }

// function webhookEvents() {
//   return recoveryAttempts.filter((attempt) => attempt.status === "recovered" || attempt.status === "failed").map((attempt, index) => ({
//     eventId: `evt_seed_${String(index + 1).padStart(4, "0")}`,
//     event: attempt.status === "recovered" ? "payment.captured" : "payment.failed",
//     paymentId: attempt.paymentId,
//     status: "processed" as const,
//     receivedAt: new Date(String(attempt.attemptedAt)),
//     processingStartedAt: new Date(String(attempt.attemptedAt)),
//     processedAt: new Date(new Date(String(attempt.attemptedAt)).getTime() + 2000),
//   }));
// }

// async function main() {
//   // Load the database module only after .env.local has been applied.
//   const { connectDB } = await import("../src/lib/mongodb");
//   await connectDB();
//   console.log("MongoDB connected. Replacing application data...");

//   await Promise.all([
//     Customer.deleteMany({}),
//     Payment.deleteMany({}),
//     RecoveryAttempt.deleteMany({}),
//     RecoveryCommunication.deleteMany({}),
//     Subscription.deleteMany({}),
//     WebhookEvent.deleteMany({}),
//     AuditEvent.deleteMany({}),
//     Settings.deleteMany({}),
//   ]);

//   await Customer.insertMany(allCustomers);
//   await Payment.insertMany(payments);
//   await RecoveryAttempt.insertMany(recoveryAttempts);
//   await WebhookEvent.insertMany(webhookEvents());
//   await AuditEvent.insertMany(auditEvents());
//   await Subscription.insertMany(allCustomers.map((customer, index) => ({
//     subscriptionId: `SUB_SEED_${String(index + 1).padStart(4, "0")}`,
//     customerId: customer.customerId,
//     plan: customer.plan,
//     amount: customer.monthlyValue,
//     status: index % 9 === 0 ? "paused" : "active",
//     renewalDate: new Date(NOW.getTime() + (index + 1) * 86400000),
//   })));
//   await Settings.create({
//     key: "global",
//     policy: { retryLimit: 3, highValueThreshold: 500000, humanApprovalThreshold: 500000, suspiciousPayments: "manual_review", automaticRetries: true },
//     notifications: { emailOnEscalation: true, emailOnRecovery: true },
//   });

//   console.log("Seed replacement complete.");
//   console.table({
//     customers: allCustomers.length,
//     payments: payments.length,
//     failedPayments: payments.filter((payment) => payment.status === "failed").length,
//     recoveryAttempts: recoveryAttempts.length,
//     auditEvents: auditEvents().length,
//     webhookEvents: webhookEvents().length,
//     subscriptions: allCustomers.length,
//     dateRange: `last ${DAYS} days`,
//   });
//   console.log("Named cases: PAY_RECOVERED, PAY_BLOCKED, PAY_BOUNDED_RETRY, PAY_PENDING, PAY_UNANALYZED");
// }

// main()
//   .catch((error) => {
//     console.error("Seed replacement failed:", error);
//     process.exitCode = 1;
//   })
//   .finally(async () => {
//     await mongoose.disconnect();
//   });
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
import mongoose from "mongoose";

import AuditEvent from "../src/models/AuditEvent";
import Customer from "../src/models/Customer";
import Payment from "../src/models/Payment";
import PromiseToPay from "../src/models/PromiseToPay";
import RecoveryAttempt from "../src/models/RecoveryAttempt";
import RecoveryCommunication from "../src/models/RecoveryCommunication";
import Settings from "../src/models/settings";
import Subscription from "../src/models/Subscription";
import WebhookEvent from "../src/models/webhookEvent";

/**
 * Seed script v2.
 *
 * Fix vs. the previous version: the old script's NaN cast error on
 * `recoveryProbability` happened because an optional numeric field ended up
 * holding a computed NaN (e.g. from a division or a missing lookup) instead
 * of being left undefined. Mongoose casts an explicit NaN to the string
 * "NaN" and then fails validation, which is exactly the error you hit.
 * `finiteOrUndefined()` below is the guard: every optional numeric field on
 * RecoveryAttempt / RecoveryCommunication is routed through it, so a bad
 * computation is simply omitted instead of being written as NaN.
 *
 * Data volume is roughly 3x the previous seed (customers, payments,
 * recovery attempts), and adds new named edge cases plus two collections
 * the old script never seeded at all: RecoveryCommunication call
 * transcripts for the new cases, and PromiseToPay (which had a model but
 * no seed data before).
 */

const DAYS = 30;
const NOW = new Date();

function daysAgo(days: number, hours = 12, minutes = 0) {
  const date = new Date(NOW);
  date.setDate(date.getDate() - days);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function id(prefix: string, number: number) {
  return `${prefix}_${String(number).padStart(4, "0")}`;
}


function finiteOrUndefined(value: number | null | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

type Channel = "email" | "sms" | "call";
type AttemptStatus = "pending" | "processing" | "success" | "recovered" | "failed" | "cancelled";



const PLAN_TIERS = [
  ["Starter", 2500],
  ["Pro", 10000],
  ["Business", 25000],
  ["Enterprise", 75000],
] as const;

const NAME_POOL = [
  "Aarav Mehta", "Mira Shah", "Kabir Rao", "Ananya Iyer", "Rohan Kapoor", "Neha Verma",
  "Ishaan Gupta", "Diya Patel", "Vivaan Joshi", "Saanvi Reddy", "Arnav Nair", "Kavya Menon",
];

const customers = Array.from({ length: 108 }, (_, index) => {
  const number = index + 1;
  const [plan, monthlyValue] = PLAN_TIERS[index % PLAN_TIERS.length];

  return {
    customerId: id("CUS", number),
    name: `${NAME_POOL[index % NAME_POOL.length]} ${number}`,
    email: `customer${number}@recovered.demo`,
    plan,
    monthlyValue,
    lifetimeValue: monthlyValue * (5 + (index % 24)),
    successfulPayments: 5 + (index % 18),
    failedPayments: index % 7,
    phone: `+9199000${String(10000 + number)}`,
  };
});

const specialCustomers = [
  { customerId: "CUS_RECOVERED", name: "Arjith Mandula", email: "arjith.recovered@recovered.demo", plan: "Enterprise", monthlyValue: 27999, lifetimeValue: 320000, successfulPayments: 12, failedPayments: 2, phone: "+919900009001" },
  { customerId: "CUS_BLOCKED", name: "Priya Nair", email: "priya.blocked@recovered.demo", plan: "Pro", monthlyValue: 12000, lifetimeValue: 144000, successfulPayments: 10, failedPayments: 3, phone: "+919900009002" },
  { customerId: "CUS_RETRY", name: "Vikram Singh", email: "vikram.retry@recovered.demo", plan: "Business", monthlyValue: 18000, lifetimeValue: 216000, successfulPayments: 11, failedPayments: 4, phone: "+919900009003" },
  { customerId: "CUS_PENDING", name: "Sneha Kapoor", email: "sneha.pending@recovered.demo", plan: "Pro", monthlyValue: 15000, lifetimeValue: 90000, successfulPayments: 6, failedPayments: 2, phone: "+919900009004" },
  { customerId: "CUS_UNANALYZED", name: "Karan Malhotra", email: "karan.unanalyzed@recovered.demo", plan: "Starter", monthlyValue: 5000, lifetimeValue: 25000, successfulPayments: 5, failedPayments: 1, phone: "+919900009005" },
  { customerId: "CUS_HIGH_VALUE", name: "Rhea Chandrasekaran", email: "rhea.highvalue@recovered.demo", plan: "Enterprise", monthlyValue: 99999, lifetimeValue: 1250000, successfulPayments: 24, failedPayments: 1, phone: "+919900009006" },
  { customerId: "CUS_SUSPICIOUS", name: "Farhan Sheikh", email: "farhan.suspicious@recovered.demo", plan: "Business", monthlyValue: 22000, lifetimeValue: 44000, successfulPayments: 1, failedPayments: 5, phone: "+919900009007" },
  { customerId: "CUS_SMS_RECOVERED", name: "Ishita Bhatt", email: "ishita.sms@recovered.demo", plan: "Pro", monthlyValue: 11000, lifetimeValue: 132000, successfulPayments: 9, failedPayments: 2, phone: "+919900009008" },
  { customerId: "CUS_CALL_RECOVERED", name: "Devansh Oberoi", email: "devansh.call@recovered.demo", plan: "Business", monthlyValue: 21000, lifetimeValue: 189000, successfulPayments: 8, failedPayments: 3, phone: "+919900009009" },
  { customerId: "CUS_PROMISE_ACTIVE", name: "Tara Krishnan", email: "tara.promise@recovered.demo", plan: "Pro", monthlyValue: 13500, lifetimeValue: 108000, successfulPayments: 7, failedPayments: 2, phone: "+919900009010" },
  { customerId: "CUS_PROMISE_BROKEN", name: "Yusuf Ansari", email: "yusuf.broken@recovered.demo", plan: "Starter", monthlyValue: 4500, lifetimeValue: 27000, successfulPayments: 5, failedPayments: 3, phone: "+919900009011" },
  { customerId: "CUS_PROMISE_FULFILLED", name: "Meera Pillai", email: "meera.fulfilled@recovered.demo", plan: "Business", monthlyValue: 19000, lifetimeValue: 171000, successfulPayments: 10, failedPayments: 1, phone: "+919900009012" },
  { customerId: "CUS_REFUNDED", name: "Aditya Bose", email: "aditya.refunded@recovered.demo", plan: "Pro", monthlyValue: 16000, lifetimeValue: 96000, successfulPayments: 6, failedPayments: 2, phone: "+919900009013" },
  { customerId: "CUS_CANCELLED_RECOVERY", name: "Simran Kaur", email: "simran.cancelled@recovered.demo", plan: "Starter", monthlyValue: 3000, lifetimeValue: 18000, successfulPayments: 4, failedPayments: 2, phone: "+919900009014" },
  { customerId: "CUS_ESCALATED", name: "Nikhil Thakur", email: "nikhil.escalated@recovered.demo", plan: "Enterprise", monthlyValue: 64000, lifetimeValue: 640000, successfulPayments: 15, failedPayments: 4, phone: "+919900009015" },
  { customerId: "CUS_NO_ANSWER", name: "Pooja Desai", email: "pooja.noanswer@recovered.demo", plan: "Pro", monthlyValue: 10500, lifetimeValue: 63000, successfulPayments: 5, failedPayments: 3, phone: "+919900009016" },
];

const allCustomers = [...customers, ...specialCustomers];



const FAILURE_REASONS = ["bank_error", "insufficient_funds", "payment_timeout", "gateway_error", "authentication_failed"];

const payments: Array<Record<string, unknown>> = [];

for (let index = 0; index < 216; index += 1) {
  const customer = customers[index % customers.length];
  const number = index + 1;
  const status = index % 5 === 0 ? "pending" : index % 3 === 0 ? "failed" : "success";
  const failureReason = status === "failed" ? FAILURE_REASONS[index % FAILURE_REASONS.length] : null;

  payments.push({
    paymentId: id("PAY", number),
    orderId: `order_seed_${String(number).padStart(5, "0")}`,
    customerId: customer.customerId,
    amount: customer.monthlyValue,
    currency: "INR",
    status,
    failureReason,
    failureCode: failureReason,
    failureSource: status === "failed" ? "bank" : null,
    failureStep: status === "failed" ? "authorization" : null,
    attempts: 1,
    razorpayPaymentId: status === "success" ? `pay_seed_${number}` : null,
    recoveryStatus: "pending",
    recoveryAction: null,
    createdAt: daysAgo(number % DAYS, 8 + (index % 8)),
  });
}

const specialPayments: Array<Record<string, unknown>> = [
  { paymentId: "PAY_RECOVERED", orderId: "order_seed_recovered", customerId: "CUS_RECOVERED", amount: 27999, currency: "INR", status: "failed", failureReason: "bank_error", failureCode: "bank_error", failureSource: "bank", failureStep: "authorization", attempts: 2, razorpayPaymentId: null, recoveryStatus: "recovered", recoveryAction: "send_reminder", createdAt: daysAgo(3, 10) },
  { paymentId: "PAY_BLOCKED", orderId: "order_seed_blocked", customerId: "CUS_BLOCKED", amount: 12000, currency: "INR", status: "failed", failureReason: "card_blocked", failureCode: "card_blocked", failureSource: "bank", failureStep: "authorization", attempts: 1, razorpayPaymentId: null, recoveryStatus: "unrecoverable", recoveryAction: "no_action", createdAt: daysAgo(8, 11) },
  { paymentId: "PAY_BOUNDED_RETRY", orderId: "order_seed_bounded", customerId: "CUS_RETRY", amount: 18000, currency: "INR", status: "failed", failureReason: "payment_timeout", failureCode: "payment_timeout", failureSource: "gateway", failureStep: "authorization", attempts: 3, razorpayPaymentId: null, recoveryStatus: "unrecoverable", recoveryAction: "no_action", createdAt: daysAgo(12, 12) },
  { paymentId: "PAY_PENDING", orderId: "order_seed_pending", customerId: "CUS_PENDING", amount: 15000, currency: "INR", status: "failed", failureReason: "gateway_error", failureCode: "gateway_error", failureSource: "gateway", failureStep: "authorization", attempts: 1, razorpayPaymentId: null, recoveryStatus: "in_progress", recoveryAction: "send_reminder", createdAt: daysAgo(1, 14) },
  { paymentId: "PAY_UNANALYZED", orderId: "order_seed_unanalyzed", customerId: "CUS_UNANALYZED", amount: 5000, currency: "INR", status: "failed", failureReason: "unknown_provider_error", failureCode: "unknown_provider_error", failureSource: "provider", failureStep: "authorization", attempts: 1, razorpayPaymentId: null, recoveryStatus: "pending", recoveryAction: null, createdAt: daysAgo(5, 9) },
  { paymentId: "PAY_HIGH_VALUE", orderId: "order_seed_highvalue", customerId: "CUS_HIGH_VALUE", amount: 99999, currency: "INR", status: "failed", failureReason: "insufficient_funds", failureCode: "insufficient_funds", failureSource: "bank", failureStep: "authorization", attempts: 1, razorpayPaymentId: null, recoveryStatus: "pending", recoveryAction: null, createdAt: daysAgo(2, 9) },
  { paymentId: "PAY_SUSPICIOUS", orderId: "order_seed_suspicious", customerId: "CUS_SUSPICIOUS", amount: 22000, currency: "INR", status: "failed", failureReason: "authentication_failed", failureCode: "authentication_failed", failureSource: "bank", failureStep: "authorization", attempts: 4, razorpayPaymentId: null, recoveryStatus: "pending", recoveryAction: null, createdAt: daysAgo(1, 20) },
  { paymentId: "PAY_SMS_RECOVERED", orderId: "order_seed_sms", customerId: "CUS_SMS_RECOVERED", amount: 11000, currency: "INR", status: "failed", failureReason: "customer_unresponsive", failureCode: "customer_unresponsive", failureSource: "bank", failureStep: "authorization", attempts: 2, razorpayPaymentId: null, recoveryStatus: "recovered", recoveryAction: "send_reminder", createdAt: daysAgo(4, 10) },
  { paymentId: "PAY_CALL_RECOVERED", orderId: "order_seed_call", customerId: "CUS_CALL_RECOVERED", amount: 21000, currency: "INR", status: "failed", failureReason: "payment_timeout", failureCode: "payment_timeout", failureSource: "gateway", failureStep: "authorization", attempts: 2, razorpayPaymentId: null, recoveryStatus: "recovered", recoveryAction: "call_customer", createdAt: daysAgo(6, 15) },
  { paymentId: "PAY_PROMISE_ACTIVE", orderId: "order_seed_promise_active", customerId: "CUS_PROMISE_ACTIVE", amount: 13500, currency: "INR", status: "failed", failureReason: "insufficient_funds", failureCode: "insufficient_funds", failureSource: "bank", failureStep: "authorization", attempts: 1, razorpayPaymentId: null, recoveryStatus: "in_progress", recoveryAction: "call_customer", createdAt: daysAgo(2, 11) },
  { paymentId: "PAY_PROMISE_BROKEN", orderId: "order_seed_promise_broken", customerId: "CUS_PROMISE_BROKEN", amount: 4500, currency: "INR", status: "failed", failureReason: "insufficient_funds", failureCode: "insufficient_funds", failureSource: "bank", failureStep: "authorization", attempts: 2, razorpayPaymentId: null, recoveryStatus: "in_progress", recoveryAction: "call_customer", createdAt: daysAgo(10, 11) },
  { paymentId: "PAY_PROMISE_FULFILLED", orderId: "order_seed_promise_fulfilled", customerId: "CUS_PROMISE_FULFILLED", amount: 19000, currency: "INR", status: "failed", failureReason: "bank_error", failureCode: "bank_error", failureSource: "bank", failureStep: "authorization", attempts: 1, razorpayPaymentId: null, recoveryStatus: "recovered", recoveryAction: "call_customer", createdAt: daysAgo(7, 13) },
  { paymentId: "PAY_REFUNDED", orderId: "order_seed_refunded", customerId: "CUS_REFUNDED", amount: 16000, currency: "INR", status: "success", failureReason: null, failureCode: null, failureSource: null, failureStep: null, attempts: 2, razorpayPaymentId: "pay_seed_refunded", recoveryStatus: "refunded", recoveryAction: "refund_issued", createdAt: daysAgo(9, 10) },
  { paymentId: "PAY_CANCELLED_RECOVERY", orderId: "order_seed_cancelled", customerId: "CUS_CANCELLED_RECOVERY", amount: 3000, currency: "INR", status: "failed", failureReason: "customer_unresponsive", failureCode: "customer_unresponsive", failureSource: "bank", failureStep: "authorization", attempts: 1, razorpayPaymentId: null, recoveryStatus: "pending", recoveryAction: null, createdAt: daysAgo(4, 16) },
  { paymentId: "PAY_ESCALATED", orderId: "order_seed_escalated", customerId: "CUS_ESCALATED", amount: 64000, currency: "INR", status: "failed", failureReason: "gateway_error", failureCode: "gateway_error", failureSource: "gateway", failureStep: "authorization", attempts: 1, razorpayPaymentId: null, recoveryStatus: "in_progress", recoveryAction: "call_customer", createdAt: daysAgo(1, 17) },
  { paymentId: "PAY_NO_ANSWER", orderId: "order_seed_noanswer", customerId: "CUS_NO_ANSWER", amount: 10500, currency: "INR", status: "failed", failureReason: "payment_timeout", failureCode: "payment_timeout", failureSource: "gateway", failureStep: "authorization", attempts: 1, razorpayPaymentId: null, recoveryStatus: "in_progress", recoveryAction: "call_customer", createdAt: daysAgo(2, 18) },
];

payments.push(...specialPayments);

// ---------------------------------------------------------------------------
// Recovery attempts
// ---------------------------------------------------------------------------

const recoveryAttempts: Array<Record<string, unknown>> = [];

function addAttempt(input: {
  paymentId: string;
  customerId: string;
  amount: number;
  attemptNumber: number;
  status: AttemptStatus;
  strategy: string;
  reason: string;
  attemptedAt: Date;
  channel?: Channel;
  channelReason?: string;
  failureReason?: string | null;
  paymentUrl?: string | null;
  recoveryOrderId?: string | null;
  aiConfidence?: number;
  recoveryProbability?: number;
  recommendedDelayMinutes?: number;
  recommendedChannel?: Channel | "none";
  riskLevel?: "LOW" | "MEDIUM" | "HIGH";
}): string {
  const _id = new mongoose.Types.ObjectId();
  const isTerminal = input.status !== "pending" && input.status !== "processing";
  const isRecovered = input.status === "recovered" || input.status === "success";
  const channel = input.channel ?? "email";

  recoveryAttempts.push({
    _id,
    paymentId: input.paymentId,
    customerId: input.customerId,
    attemptNumber: input.attemptNumber,
    strategy: input.strategy,
    aiReason: input.reason,
    status: input.status,
    attemptedAt: input.attemptedAt,
    completedAt: isTerminal ? new Date(input.attemptedAt.getTime() + 25 * 60000) : null,
    recoveredAmount: isRecovered ? input.amount : 0,
    failureReason: input.failureReason ?? null,
    aiConfidence: finiteOrUndefined(input.aiConfidence ?? 0.92),
    recoveryProbability: finiteOrUndefined(input.recoveryProbability),
    recommendedDelayMinutes: finiteOrUndefined(input.recommendedDelayMinutes),
    recommendedChannel: input.recommendedChannel,
    riskLevel: input.riskLevel ?? (input.failureReason === "policy_blocked" ? "HIGH" : "MEDIUM"),
    suggestedMessage: "Your payment needs attention. Complete it securely using the payment link.",
    paymentUrl: input.paymentUrl ?? null,
    razorpayPaymentLinkId: input.paymentUrl ? `plink_seed_${input.paymentId}_${input.attemptNumber}` : null,
    recoveryOrderId: input.recoveryOrderId ?? null,
    recoveryRazorpayPaymentId: isRecovered ? `pay_recovery_${input.paymentId}` : null,
    razorpayOrderId: input.recoveryOrderId ?? null,
    razorpayPaymentId: isRecovered ? `pay_recovery_${input.paymentId}` : null,
    channel,
    channelReason: input.channelReason ?? "Email is available and the recovery policy allows a customer-initiated payment link.",
    emailSent: channel === "email" && input.status !== "pending",
    emailSentAt: channel === "email" && input.status !== "pending" ? input.attemptedAt : null,
    emailMessageId: channel === "email" && input.status !== "pending" ? `email_seed_${input.paymentId}_${input.attemptNumber}` : null,
    emailError: null,
  });

  return _id.toString();
}

// --- Named edge cases -------------------------------------------------

addAttempt({
  paymentId: "PAY_RECOVERED", customerId: "CUS_RECOVERED", amount: 27999, attemptNumber: 1,
  status: "failed", strategy: "send_reminder",
  reason: "The first payment link was not completed within the follow-up window.",
  failureReason: "customer_unresponsive", attemptedAt: daysAgo(3, 10),
  paymentUrl: "https://rzp.io/seed-recovered-1", recoveryOrderId: "order_seed_recovery_1",
  recoveryProbability: 0.55, recommendedDelayMinutes: 1440, recommendedChannel: "email",
});
addAttempt({
  paymentId: "PAY_RECOVERED", customerId: "CUS_RECOVERED", amount: 27999, attemptNumber: 2,
  status: "recovered", strategy: "send_reminder",
  reason: "The customer has a strong payment history, so a second payment-link reminder is appropriate.",
  attemptedAt: daysAgo(2, 10),
  paymentUrl: "https://rzp.io/seed-recovered-2", recoveryOrderId: "order_seed_recovery_2",
  recoveryProbability: 0.81, recommendedDelayMinutes: 60, recommendedChannel: "email",
});

addAttempt({
  paymentId: "PAY_BLOCKED", customerId: "CUS_BLOCKED", amount: 12000, attemptNumber: 1,
  status: "failed", strategy: "no_action",
  reason: "Card-blocked failures are permanent and must not be blindly retried.",
  failureReason: "policy_blocked", attemptedAt: daysAgo(8, 12), riskLevel: "HIGH",
  recoveryProbability: 0.02,
});

const boundedRetryAttemptIds: string[] = [];
for (let attemptNumber = 1; attemptNumber <= 3; attemptNumber += 1) {
  const attemptId = addAttempt({
    paymentId: "PAY_BOUNDED_RETRY", customerId: "CUS_RETRY", amount: 18000, attemptNumber,
    status: "failed", strategy: "send_reminder",
    reason: `Recovery attempt ${attemptNumber} failed; the configured maximum is three attempts.`,
    failureReason: attemptNumber === 3 ? "retry_limit_reached" : "payment_timeout",
    attemptedAt: daysAgo(13 - attemptNumber * 2, 10),
    recoveryProbability: 0.6 - attemptNumber * 0.15,
  });
  boundedRetryAttemptIds.push(attemptId);
}

addAttempt({
  paymentId: "PAY_PENDING", customerId: "CUS_PENDING", amount: 15000, attemptNumber: 1,
  status: "processing", strategy: "send_reminder",
  reason: "A temporary gateway error is eligible for customer-initiated recovery.",
  attemptedAt: daysAgo(1, 14),
  paymentUrl: "https://rzp.io/seed-pending", recoveryOrderId: "order_seed_pending_recovery",
  recoveryProbability: 0.7, recommendedDelayMinutes: 30, recommendedChannel: "email",
});



addAttempt({
  paymentId: "PAY_HIGH_VALUE", customerId: "CUS_HIGH_VALUE", amount: 99999, attemptNumber: 1,
  status: "pending", strategy: "human_approval_required",
  reason: "The payment amount exceeds the human-approval threshold, so the AI recommendation is held for merchant sign-off before any customer contact.",
  attemptedAt: daysAgo(2, 9),
  recoveryProbability: 0.74, recommendedDelayMinutes: 0, recommendedChannel: "email",
});

addAttempt({
  paymentId: "PAY_SUSPICIOUS", customerId: "CUS_SUSPICIOUS", amount: 22000, attemptNumber: 1,
  status: "failed", strategy: "manual_review",
  reason: "Repeated authentication failures combined with a thin payment history match the suspicious-payment pattern; routed to manual review instead of an automated retry.",
  failureReason: "policy_blocked", attemptedAt: daysAgo(1, 20), riskLevel: "HIGH",
  recoveryProbability: 0.1,
});

addAttempt({
  paymentId: "PAY_SMS_RECOVERED", customerId: "CUS_SMS_RECOVERED", amount: 11000, attemptNumber: 1,
  status: "failed", strategy: "send_reminder", channel: "email",
  reason: "Initial email reminder went unopened.",
  failureReason: "customer_unresponsive", attemptedAt: daysAgo(4, 10),
  paymentUrl: "https://rzp.io/seed-sms-1", recoveryOrderId: "order_seed_sms_1",
  recoveryProbability: 0.4,
});
const smsRecoveredAttemptId = addAttempt({
  paymentId: "PAY_SMS_RECOVERED", customerId: "CUS_SMS_RECOVERED", amount: 11000, attemptNumber: 2,
  status: "recovered", strategy: "send_reminder", channel: "sms",
  channelReason: "Customer has not engaged with email in the last two attempts; SMS has a higher open rate for this segment.",
  reason: "Switching channel to SMS after an unopened email reminder.",
  attemptedAt: daysAgo(3, 16),
  paymentUrl: "https://rzp.io/seed-sms-2", recoveryOrderId: "order_seed_sms_2",
  recoveryProbability: 0.78, recommendedChannel: "sms",
});

addAttempt({
  paymentId: "PAY_CALL_RECOVERED", customerId: "CUS_CALL_RECOVERED", amount: 21000, attemptNumber: 1,
  status: "cancelled", strategy: "send_reminder", channel: "email",
  reason: "Automated email reminder was cancelled after the customer requested a call instead.",
  attemptedAt: daysAgo(6, 15),
});
const callRecoveredAttemptId = addAttempt({
  paymentId: "PAY_CALL_RECOVERED", customerId: "CUS_CALL_RECOVERED", amount: 21000, attemptNumber: 2,
  status: "recovered", strategy: "call_customer", channel: "call",
  channelReason: "Customer explicitly asked for a call after the payment-timeout failure.",
  reason: "A voice call resolves the gateway confusion faster than another payment link.",
  attemptedAt: daysAgo(5, 17),
  recoveryProbability: 0.83, recommendedChannel: "call",
});

const promiseActiveAttemptId = addAttempt({
  paymentId: "PAY_PROMISE_ACTIVE", customerId: "CUS_PROMISE_ACTIVE", amount: 13500, attemptNumber: 1,
  status: "processing", strategy: "call_customer", channel: "call",
  reason: "Customer requested a short extension during the recovery call; awaiting the promised payment date.",
  attemptedAt: daysAgo(2, 11),
  recoveryProbability: 0.65,
});

const promiseBrokenAttemptId = addAttempt({
  paymentId: "PAY_PROMISE_BROKEN", customerId: "CUS_PROMISE_BROKEN", amount: 4500, attemptNumber: 1,
  status: "failed", strategy: "call_customer", channel: "call",
  reason: "Customer promised payment by a specific date during the call, but the date has since passed unfulfilled.",
  failureReason: "promise_broken", attemptedAt: daysAgo(10, 11),
  recoveryProbability: 0.3,
});
addAttempt({
  paymentId: "PAY_PROMISE_BROKEN", customerId: "CUS_PROMISE_BROKEN", amount: 4500, attemptNumber: 2,
  status: "processing", strategy: "send_reminder", channel: "email",
  reason: "Follow-up reminder sent after the earlier promise to pay was broken.",
  attemptedAt: daysAgo(2, 9),
  paymentUrl: "https://rzp.io/seed-promise-broken", recoveryOrderId: "order_seed_promise_broken",
  recoveryProbability: 0.35,
});

const promiseFulfilledAttemptId = addAttempt({
  paymentId: "PAY_PROMISE_FULFILLED", customerId: "CUS_PROMISE_FULFILLED", amount: 19000, attemptNumber: 1,
  status: "recovered", strategy: "call_customer", channel: "call",
  reason: "Customer promised payment during the call and paid before the promised due date.",
  attemptedAt: daysAgo(7, 13),
  recoveryProbability: 0.88,
});

addAttempt({
  paymentId: "PAY_REFUNDED", customerId: "CUS_REFUNDED", amount: 16000, attemptNumber: 1,
  status: "recovered", strategy: "send_reminder", channel: "email",
  reason: "Payment link reminder succeeded and the payment was captured.",
  attemptedAt: daysAgo(9, 10),
  paymentUrl: "https://rzp.io/seed-refunded", recoveryOrderId: "order_seed_refunded",
  recoveryProbability: 0.9,
});

const cancelledAttemptId = addAttempt({
  paymentId: "PAY_CANCELLED_RECOVERY", customerId: "CUS_CANCELLED_RECOVERY", amount: 3000, attemptNumber: 1,
  status: "cancelled", strategy: "send_reminder", channel: "email",
  reason: "Merchant manually paused recovery for this payment pending an internal billing dispute review.",
  attemptedAt: daysAgo(4, 16),
});

const escalatedAttemptId = addAttempt({
  paymentId: "PAY_ESCALATED", customerId: "CUS_ESCALATED", amount: 64000, attemptNumber: 1,
  status: "processing", strategy: "call_customer", channel: "call",
  reason: "High-value account requested to speak with a human agent during the recovery call.",
  attemptedAt: daysAgo(1, 17),
  recoveryProbability: 0.6,
});

const noAnswerAttemptId = addAttempt({
  paymentId: "PAY_NO_ANSWER", customerId: "CUS_NO_ANSWER", amount: 10500, attemptNumber: 1,
  status: "processing", strategy: "call_customer", channel: "call",
  reason: "Scheduled recovery call did not connect; a retry call is queued.",
  attemptedAt: daysAgo(2, 18),
  recoveryProbability: 0.5,
});



for (const payment of payments.filter((item) => item.status === "failed").slice(0, 30)) {
  const paymentId = String(payment.paymentId);
  if (recoveryAttempts.some((attempt) => attempt.paymentId === paymentId)) continue;
  addAttempt({
    paymentId,
    customerId: String(payment.customerId),
    amount: Number(payment.amount),
    attemptNumber: 1,
    status: "failed",
    strategy: payment.failureReason === "authentication_failed" ? "no_action" : "send_reminder",
    reason: "Seeded recovery case for testing list views and AI analysis.",
    failureReason: payment.failureReason === "authentication_failed" ? "policy_blocked" : "customer_unresponsive",
    attemptedAt: new Date(String(payment.createdAt)),
    recoveryProbability: payment.failureReason === "authentication_failed" ? 0.05 : 0.45,
  });
}

// ---------------------------------------------------------------------------
// Recovery communications (new: call transcripts + SMS/email logs). The old
// script never inserted anything into this collection.
// ---------------------------------------------------------------------------

const recoveryCommunications: Array<Record<string, unknown>> = [];

function addCommunication(input: {
  paymentId: string;
  customerId: string;
  recoveryAttemptId?: string | null;
  channel: Channel;
  status:
    | "pending" | "queued" | "initiated" | "ringing" | "answered"
    | "in_progress" | "completed" | "no_answer" | "busy" | "failed";
  provider: "twilio" | "email" | "other";
  recipient?: string | null;
  message?: string | null;
  transcript?: Array<{ speaker: "agent" | "customer"; text: string; timestamp: Date }>;
  customerProblem?: string | null;
  customerIntent?: string | null;
  requestedHumanSupport?: boolean;
  sentiment?: "positive" | "neutral" | "frustrated" | "negative" | null;
  resolution?: string | null;
  followUpRequired?: boolean;
  paymentLinkSent?: boolean;
  duration?: number;
  startedAt?: Date | null;
  endedAt?: Date | null;
  failureReason?: string | null;
}): string {
  const _id = new mongoose.Types.ObjectId();
  const transcript = input.transcript ?? [];

  recoveryCommunications.push({
    _id,
    paymentId: input.paymentId,
    customerId: input.customerId,
    recoveryAttemptId: input.recoveryAttemptId ?? null,
    channel: input.channel,
    status: input.status,
    provider: input.provider,
    providerId: `prov_seed_${input.paymentId}_${recoveryCommunications.length + 1}`,
    recipient: input.recipient ?? null,
    message: input.message ?? null,
    transcript,
    customerProblem: input.customerProblem ?? null,
    customerIntent: input.customerIntent ?? null,
    requestedHumanSupport: input.requestedHumanSupport ?? false,
    sentiment: input.sentiment ?? null,
    resolution: input.resolution ?? null,
    followUpRequired: input.followUpRequired ?? false,
    paymentLinkSent: input.paymentLinkSent ?? false,
    paymentLinkSentAt: input.paymentLinkSent ? (input.startedAt ?? new Date()) : null,
    duration: finiteOrUndefined(input.duration) ?? null,
    startedAt: input.startedAt ?? null,
    endedAt: input.endedAt ?? null,
    failureReason: input.failureReason ?? null,
    turnCount: transcript.length,
    metadata: {},
  });

  return _id.toString();
}

addCommunication({
  paymentId: "PAY_SMS_RECOVERED", customerId: "CUS_SMS_RECOVERED", recoveryAttemptId: smsRecoveredAttemptId,
  channel: "sms", status: "completed", provider: "twilio", recipient: "+919900009008",
  message: "Hi Ishita, your payment of Rs 11,000 didn't go through. Pay securely here: https://rzp.io/seed-sms-2",
  paymentLinkSent: true, startedAt: daysAgo(3, 16), endedAt: daysAgo(3, 16, 1),
});

addCommunication({
  paymentId: "PAY_CALL_RECOVERED", customerId: "CUS_CALL_RECOVERED", recoveryAttemptId: callRecoveredAttemptId,
  channel: "call", status: "completed", provider: "twilio", recipient: "+919900009009",
  transcript: [
    { speaker: "agent", text: "Hi, this is a courtesy call about a payment that didn't go through on your subscription.", timestamp: daysAgo(5, 17) },
    { speaker: "customer", text: "Oh, sorry about that. My card must have timed out. Can you send me a link?", timestamp: daysAgo(5, 17, 1) },
    { speaker: "agent", text: "Absolutely, I'll text you a secure payment link right now.", timestamp: daysAgo(5, 17, 2) },
  ],
  customerProblem: "Card timed out during checkout.",
  customerIntent: "wants_to_pay",
  sentiment: "neutral",
  resolution: "payment_link_requested",
  paymentLinkSent: true,
  duration: 184,
  startedAt: daysAgo(5, 17), endedAt: daysAgo(5, 17, 3),
});

const promiseActiveCommId = addCommunication({
  paymentId: "PAY_PROMISE_ACTIVE", customerId: "CUS_PROMISE_ACTIVE", recoveryAttemptId: promiseActiveAttemptId,
  channel: "call", status: "completed", provider: "twilio", recipient: "+919900009010",
  transcript: [
    { speaker: "agent", text: "We noticed your last payment didn't complete. Is now a good time to sort it out?", timestamp: daysAgo(2, 11) },
    { speaker: "customer", text: "Payday is in three days, can I pay then?", timestamp: daysAgo(2, 11, 1) },
    { speaker: "agent", text: "Of course, I'll note that you'll pay by then and follow up if needed.", timestamp: daysAgo(2, 11, 2) },
  ],
  customerProblem: "Waiting on payday.",
  customerIntent: "pay_later",
  sentiment: "positive",
  resolution: "customer_will_pay",
  followUpRequired: true,
  duration: 142,
  startedAt: daysAgo(2, 11), endedAt: daysAgo(2, 11, 3),
});

const promiseBrokenCommId = addCommunication({
  paymentId: "PAY_PROMISE_BROKEN", customerId: "CUS_PROMISE_BROKEN", recoveryAttemptId: promiseBrokenAttemptId,
  channel: "call", status: "completed", provider: "twilio", recipient: "+919900009011",
  transcript: [
    { speaker: "agent", text: "Following up on the payment you said you'd make earlier this week.", timestamp: daysAgo(10, 11) },
    { speaker: "customer", text: "I'll definitely pay by Friday, I promise.", timestamp: daysAgo(10, 11, 1) },
  ],
  customerProblem: "Short on funds.",
  customerIntent: "pay_later",
  sentiment: "neutral",
  resolution: "customer_will_pay",
  followUpRequired: true,
  duration: 96,
  startedAt: daysAgo(10, 11), endedAt: daysAgo(10, 11, 2),
});

const promiseFulfilledCommId = addCommunication({
  paymentId: "PAY_PROMISE_FULFILLED", customerId: "CUS_PROMISE_FULFILLED", recoveryAttemptId: promiseFulfilledAttemptId,
  channel: "call", status: "completed", provider: "twilio", recipient: "+919900009012",
  transcript: [
    { speaker: "agent", text: "Just checking in on the payment we discussed last week.", timestamp: daysAgo(7, 13) },
    { speaker: "customer", text: "Already paid it yesterday, all good!", timestamp: daysAgo(7, 13, 1) },
  ],
  customerProblem: "None -- payment already completed.",
  customerIntent: "wants_to_pay",
  sentiment: "positive",
  resolution: "problem_resolved",
  duration: 68,
  startedAt: daysAgo(7, 13), endedAt: daysAgo(7, 13, 1),
});

addCommunication({
  paymentId: "PAY_ESCALATED", customerId: "CUS_ESCALATED", recoveryAttemptId: escalatedAttemptId,
  channel: "call", status: "completed", provider: "twilio", recipient: "+919900009015",
  transcript: [
    { speaker: "agent", text: "Calling about a failed payment on your enterprise plan.", timestamp: daysAgo(1, 17) },
    { speaker: "customer", text: "This is a large account, I need to speak to an actual account manager, not a bot.", timestamp: daysAgo(1, 17, 1) },
  ],
  customerProblem: "Wants a human account manager for a high-value account.",
  customerIntent: "human_support",
  requestedHumanSupport: true,
  sentiment: "frustrated",
  resolution: "human_escalation",
  followUpRequired: true,
  duration: 75,
  startedAt: daysAgo(1, 17), endedAt: daysAgo(1, 17, 2),
});

addCommunication({
  paymentId: "PAY_NO_ANSWER", customerId: "CUS_NO_ANSWER", recoveryAttemptId: noAnswerAttemptId,
  channel: "call", status: "no_answer", provider: "twilio", recipient: "+919900009016",
  duration: 0,
  startedAt: daysAgo(2, 18), endedAt: daysAgo(2, 18, 1),
  failureReason: "No answer after 6 rings.",
});

// ---------------------------------------------------------------------------
// Promises to pay (new collection — the model existed but was never seeded)
// ---------------------------------------------------------------------------

const promisesToPay: Array<Record<string, unknown>> = [
  {
    paymentId: "PAY_PROMISE_ACTIVE", customerId: "CUS_PROMISE_ACTIVE",
    recoveryAttemptId: promiseActiveAttemptId, communicationId: promiseActiveCommId,
    channel: "call", status: "active", promisedAmount: 13500,
    promisedAt: daysAgo(2, 11), dueAt: daysAgo(-1, 18),
    customerIntent: "pay_later", notes: "Customer said they'll pay after their next payday.",
  },
  {
    paymentId: "PAY_PROMISE_BROKEN", customerId: "CUS_PROMISE_BROKEN",
    recoveryAttemptId: promiseBrokenAttemptId, communicationId: promiseBrokenCommId,
    channel: "call", status: "broken", promisedAmount: 4500,
    promisedAt: daysAgo(10, 11), dueAt: daysAgo(7, 18), brokenAt: daysAgo(6, 9),
    customerIntent: "pay_later", notes: "Promised payment by Friday; the due date passed with no payment.",
  },
  {
    paymentId: "PAY_PROMISE_FULFILLED", customerId: "CUS_PROMISE_FULFILLED",
    recoveryAttemptId: promiseFulfilledAttemptId, communicationId: promiseFulfilledCommId,
    channel: "call", status: "fulfilled", promisedAmount: 19000,
    promisedAt: daysAgo(8, 13), dueAt: daysAgo(6, 18), fulfilledAt: daysAgo(7, 13),
    customerIntent: "wants_to_pay", notes: "Customer paid a day after the call, ahead of the promised due date.",
  },
  {
    paymentId: "PAY_BOUNDED_RETRY", customerId: "CUS_RETRY",
    recoveryAttemptId: boundedRetryAttemptIds[0] ?? null, communicationId: null,
    channel: "email", status: "expired", promisedAmount: 18000,
    promisedAt: daysAgo(9, 10), dueAt: daysAgo(6, 10),
    customerIntent: "pay_later", notes: "Customer replied to an early reminder saying they'd pay, then went silent; the promise expired unfulfilled.",
  },
  {
    paymentId: "PAY_CANCELLED_RECOVERY", customerId: "CUS_CANCELLED_RECOVERY",
    recoveryAttemptId: cancelledAttemptId, communicationId: null,
    channel: "email", status: "cancelled", promisedAmount: 3000,
    promisedAt: daysAgo(5, 16), dueAt: daysAgo(2, 16),
    customerIntent: "other", notes: "Promise cancelled when the merchant paused recovery for a billing dispute review.",
  },
];


function auditEvents() {
  const generated = recoveryAttempts.flatMap((attempt) => {
    const paymentId = String(attempt.paymentId);
    const attemptNumber = Number(attempt.attemptNumber);
    const recoveryAttemptId = attempt._id ? String(attempt._id) : undefined;
    const createdAt = new Date(String(attempt.attemptedAt));
    const wasBlocked = attempt.status === "failed" && attempt.failureReason === "policy_blocked";

    return [
      {
        eventId: `audit_${paymentId}_${attemptNumber}_ai`,
        paymentId,
        recoveryAttemptId,
        actor: "ai_agent",
        layer: "agent",
        action: "strategy_recommended",
        reason: String(attempt.aiReason),
        metadata: { strategy: attempt.strategy, confidence: attempt.aiConfidence, recoveryProbability: attempt.recoveryProbability ?? null },
        createdAt,
      },
      {
        eventId: `audit_${paymentId}_${attemptNumber}_policy`,
        paymentId,
        recoveryAttemptId,
        actor: "policy_engine",
        layer: "policy",
        action: wasBlocked ? "strategy_blocked" : "strategy_approved",
        reason: String(attempt.aiReason),
        metadata: { attemptNumber },
        createdAt: new Date(createdAt.getTime() + 1000),
      },
    ];
  });

  const manual = [
    { eventId: "audit_refund_issued_1", paymentId: "PAY_REFUNDED", actor: "merchant", layer: "system", action: "refund_issued", reason: "Customer disputed the charge; merchant issued a manual refund.", metadata: { amount: 16000 }, createdAt: daysAgo(1, 12) },
    { eventId: "audit_recovery_cancelled_1", paymentId: "PAY_CANCELLED_RECOVERY", actor: "merchant", layer: "system", action: "recovery_cancelled", reason: "Merchant paused automated recovery pending an internal billing dispute review.", metadata: {}, createdAt: daysAgo(4, 16) },
    { eventId: "audit_suspicious_flagged_1", paymentId: "PAY_SUSPICIOUS", actor: "policy_engine", layer: "policy", action: "flagged_suspicious", reason: "Multiple authentication failures on a low-history account triggered the suspicious-payment policy.", metadata: { suspiciousPaymentsSetting: "manual_review" }, createdAt: daysAgo(1, 20) },
    { eventId: "audit_high_value_approval_1", paymentId: "PAY_HIGH_VALUE", actor: "system", layer: "system", action: "human_approval_requested", reason: "Recovery amount exceeds the configured human-approval threshold.", metadata: { threshold: 500000 }, createdAt: daysAgo(2, 9) },
  ];

  return [...generated, ...manual];
}

function webhookEvents() {
  const fromAttempts = recoveryAttempts
    .filter((attempt) => attempt.status === "recovered" || attempt.status === "failed")
    .map((attempt, index) => ({
      eventId: `evt_seed_${String(index + 1).padStart(4, "0")}`,
      event: attempt.status === "recovered" ? "payment.captured" : "payment.failed",
      paymentId: attempt.paymentId,
      status: "processed" as const,
      receivedAt: new Date(String(attempt.attemptedAt)),
      processingStartedAt: new Date(String(attempt.attemptedAt)),
      processedAt: new Date(new Date(String(attempt.attemptedAt)).getTime() + 2000),
    }));

  const manual = [
    { eventId: "evt_seed_refund_0001", event: "refund.processed", paymentId: "PAY_REFUNDED", status: "processed" as const, receivedAt: daysAgo(1, 12), processingStartedAt: daysAgo(1, 12), processedAt: new Date(daysAgo(1, 12).getTime() + 1500) },
    { eventId: "evt_seed_failed_processing_0001", event: "payment.failed", paymentId: "PAY_UNANALYZED", status: "failed" as const, receivedAt: daysAgo(5, 9), processingStartedAt: daysAgo(5, 9), lastError: "Handler timed out waiting on the Customer lookup." },
  ];

  return [...fromAttempts, ...manual];
}



async function main() {
  // Load the database module only after .env.local has been applied.
  const { connectDB } = await import("../src/lib/mongodb");
  await connectDB();
  console.log("MongoDB connected. Replacing application data...");

  await Promise.all([
    Customer.deleteMany({}),
    Payment.deleteMany({}),
    RecoveryAttempt.deleteMany({}),
    RecoveryCommunication.deleteMany({}),
    PromiseToPay.deleteMany({}),
    Subscription.deleteMany({}),
    WebhookEvent.deleteMany({}),
    AuditEvent.deleteMany({}),
    Settings.deleteMany({}),
  ]);

  await Customer.insertMany(allCustomers);
  await Payment.insertMany(payments);
  await RecoveryAttempt.insertMany(recoveryAttempts);
  await RecoveryCommunication.insertMany(recoveryCommunications);
  await PromiseToPay.insertMany(promisesToPay);
  await WebhookEvent.insertMany(webhookEvents());
  await AuditEvent.insertMany(auditEvents());
  await Subscription.insertMany(
    allCustomers.map((customer, index) => ({
      subscriptionId: `SUB_SEED_${String(index + 1).padStart(4, "0")}`,
      customerId: customer.customerId,
      plan: customer.plan,
      amount: customer.monthlyValue,
      status: index % 9 === 0 ? "paused" : "active",
      renewalDate: new Date(NOW.getTime() + (index + 1) * 86400000),
    }))
  );
  await Settings.create({
    key: "global",
    policy: {
      retryLimit: 3,
      highValueThreshold: 500000,
      humanApprovalThreshold: 500000,
      suspiciousPayments: "manual_review",
      automaticRetries: true,
    },
    notifications: { emailOnEscalation: true, emailOnRecovery: true },
  });

  console.log("Seed replacement complete.");
  console.table({
    customers: allCustomers.length,
    payments: payments.length,
    failedPayments: payments.filter((payment) => payment.status === "failed").length,
    recoveryAttempts: recoveryAttempts.length,
    recoveryCommunications: recoveryCommunications.length,
    promisesToPay: promisesToPay.length,
    auditEvents: auditEvents().length,
    webhookEvents: webhookEvents().length,
    subscriptions: allCustomers.length,
    dateRange: `last ${DAYS} days`,
  });
  console.log(
    "Named cases: PAY_RECOVERED, PAY_BLOCKED, PAY_BOUNDED_RETRY, PAY_PENDING, PAY_UNANALYZED, " +
    "PAY_HIGH_VALUE, PAY_SUSPICIOUS, PAY_SMS_RECOVERED, PAY_CALL_RECOVERED, PAY_PROMISE_ACTIVE, " +
    "PAY_PROMISE_BROKEN, PAY_PROMISE_FULFILLED, PAY_REFUNDED, PAY_CANCELLED_RECOVERY, PAY_ESCALATED, PAY_NO_ANSWER"
  );
}

main()
  .catch((error) => {
    console.error("Seed replacement failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });