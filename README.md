# RevivePay
an autonomous revenue recovery platform built for Razorpay merchants. RevivePay solves this with an intelligent agent that analyzes the root cause of every payment failure and generates personalized, multi-channel recovery workflows—all strictly governed by deterministic fintech guardrails."

 # Recovered

Recovered is a Next.js revenue-recovery dashboard using MongoDB, Razorpay, email, and an advisory AI policy workflow. Twilio communication is intentionally on hold.

## Local setup

1. Run `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set `MONGODB_URI` and the provider credentials needed for the feature being tested.
4. Run `npm run dev` and open `http://localhost:3000`.

Local development permits API requests without `APP_API_KEY` so the existing dashboard works. In production, set `APP_API_KEY` and send it as `Authorization: Bearer <key>` or `x-api-key`. Do not embed an API key in browser code; use a real authenticated session before production deployment.

## Provider webhooks

Configure Razorpay to call `/api/webhooks/razorpay` and set `RAZORPAY_WEBHOOK_SECRET`. Events are signature-checked and stored for idempotency. Add a reconciliation job for missed or delayed provider events before treating payment data as final.

Twilio routes remain for compatibility but are not active recovery channels. Do not enable them until signature verification, consent, opt-out, quiet-hours, and delivery controls are implemented.

## Architecture

- `src/app`: dashboard pages and API route handlers
- `src/lib`: provider clients, recovery orchestration, AI, policy, validation, and authentication helpers
- `src/models`: Mongoose persistence models
- `middleware.ts`: API credential boundary; provider webhooks are excluded and must authenticate themselves

Recovery attempts use a partial unique index so only one pending or processing attempt can exist for a payment. AI recovery history is capped at 100 records.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Before production, add integration tests for payment verification, Razorpay webhook idempotency, recovery concurrency, authorization, and provider failure/retry behavior.
