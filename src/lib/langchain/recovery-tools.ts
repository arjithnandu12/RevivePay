import { connectDB } from "@/lib/mongodb";

import Customer from "@/models/Customer";
import Payment from "@/models/Payment";

import {
  evaluateRecoveryPolicy,
} from "@/lib/policy-engine";

export async function getCustomer(
  customerId: string
) {
  await connectDB();

  const customer =
    await Customer.findOne({
      customerId,
    }).lean();

  if (!customer) {
    throw new Error(
      `Customer ${customerId} not found`
    );
  }

  return customer;
}

export async function getPaymentHistory(
  customerId: string,
  limit = 10
) {
  await connectDB();

  const payments =
    await Payment.find({
      customerId,
    })
      .sort({
        createdAt: -1,
      })
      .limit(limit)
      .lean();

  return payments;
}

export async function getRecoverySummary(
  customerId: string
) {
  await connectDB();

  const payments =
    await Payment.find({
      customerId,
    }).lean();

  const successful =
    payments.filter(
      (p) => p.status === "success"
    ).length;

  const failed =
    payments.filter(
      (p) => p.status === "failed"
    ).length;

  const totalAttempts =
    payments.reduce(
      (sum, p) =>
        sum + (p.attempts || 0),
      0
    );

  const RevivePayAmount =
    payments
      .filter(
        (p) => p.status === "success"
      )
      .reduce(
        (sum, p) =>
          sum + (p.amount || 0),
        0
      );

  return {
    customerId,
    totalPayments: payments.length,
    successfulPayments: successful,
    failedPayments: failed,
    totalAttempts,
    RevivePayAmount,
  };
}

export async function checkRecoveryPolicy(
  strategy:
    | "retry_payment"
    | "send_reminder"
    | "offer_discount"
    | "contact_customer"
    | "no_action",

  paymentAmount: number,
  attempts: number,
  failureReason: string | null,

 
) {
  return evaluateRecoveryPolicy({
    strategy,
    paymentAmount,
    attempts,
    customerLifetimeValue: 0,
    successfulPayments: 0,
    failedPayments: 0,
    failureReason,
  });
}