

import Twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

export const twilioClient =
  accountSid?.startsWith("AC") && authToken
    ? Twilio(accountSid, authToken)
    : null;

export const TWILIO_PHONE_NUMBER =
  process.env.TWILIO_PHONE_NUMBER || "";

export function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3004"
  );
}