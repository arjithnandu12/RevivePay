README_rewritten.md


RevivePay
RevivePay is an autonomous revenue recovery platform built for Razorpay merchants.

It analyzes payment failures, identifies the likely root cause, and generates personalized recovery workflows across supported channels. AI recommendations are always subject to deterministic fintech guardrails so automation remains controlled and auditable.

Local setup
Install dependencies:

npm install
Copy the example environment file:

copy .env.example .env.local
On macOS/Linux:

cp .env.example .env.local
Add your own provider credentials to .env.local.

Environment variables
Never commit .env.local, provider secrets, API keys, or webhook secrets to Git.

Use placeholders such as:

# Database
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>

# Razorpay
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# Public Razorpay Checkout key
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...

# AI / LLM
OPENROUTER_API_KEY=sk-or-v1-...

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3004
# APP_API_KEY=your-production-api-key

# Email
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=your-verified-sender@example.com

# Twilio
# Retained for compatibility; not an active recovery channel.
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
Start the development server:

npm run dev
Open:

http://localhost:3004
Do not place private API keys in browser-side code. Only explicitly public values, such as NEXT_PUBLIC_RAZORPAY_KEY_ID, should use the NEXT_PUBLIC_* prefix.

Authentication
Local development permits API requests without APP_API_KEY so the existing dashboard can run easily.

For production, set:

APP_API_KEY=your-secure-key
Then send it using either:

Authorization: Bearer <key>
or:

x-api-key: <key>
Keep this key server-side and never expose it through browser code.

Provider webhooks
Configure Razorpay to send webhook events to:

/api/webhooks/razorpay
Set:

RAZORPAY_WEBHOOK_SECRET=...
Webhook requests are signature-checked and stored for idempotency.

Because provider events can be retried, delayed, or missed, production should also include a reconciliation job for delayed or missing events before payment information is treated as final.

Webhook idempotency
RevivePay protects against duplicate webhook processing in two layers:

Every Razorpay webhook is stored in WebhookEvent using Razorpay's unique eventId. A duplicate delivery can therefore be detected and skipped.

RecoveryAttempt uses a partial unique index so only one pending or processing recovery attempt can exist for a payment.

This prevents duplicate webhook deliveries or near-simultaneous requests from creating competing recovery workflows for the same failed payment.

AI consistency and verified customer facts
AI recommendations are grounded in the actual database instead of a free-form customer description.

Before the model makes a decision, the recovery workflow retrieves verified values from Customer and Payment, including:

attempts

successfulPayments

failedPayments

lifetimeValue

monthlyValue

failureReason

failureCode

failureSource

failureStep

These values are passed to the model as a structured verifiedFacts object.

The model is required to echo the relevant facts in its response. The returned values can then be compared with the original database values to detect when the model has drifted from the source data before the recommendation is acted upon.

Twilio
Twilio routes remain in the codebase for compatibility but are not active recovery channels.

Do not enable outbound Twilio recovery until the following controls are implemented and verified:

signature verification

customer consent

opt-out handling

quiet-hours enforcement

delivery controls

provider failure and retry handling

Architecture
src/app
  Dashboard pages and API route handlers

src/lib
  Provider clients
  Recovery orchestration
  AI / LangChain logic
  Deterministic policy engine
  Validation
  Authentication helpers

src/models
  Mongoose persistence models

middleware.ts
  API credential boundary

src/app/api/webhooks/razorpay
  Razorpay webhook verification and processing
Provider webhooks are excluded from the normal API credential boundary because they authenticate themselves through webhook signature verification.

Recovery attempts use a partial unique index so only one pending or processing attempt can exist for a payment.

AI recovery history is capped at 100 records.

Recovery guardrails
AI selects or recommends recovery strategies, but deterministic policy checks remain authoritative.

Examples include:

retry limits

high-value payment handling

human-approval thresholds

suspicious-payment handling

recovery eligibility

This separation keeps the AI flexible while preventing it from bypassing business and fintech rules.

Checks
Run these before committing changes:

npm run lint
npx tsc --noEmit
npm run build
For production readiness, add integration tests for:

payment verification

Razorpay webhook signature validation

webhook idempotency

recovery concurrency

authorization

AI grounding / verified facts

provider failures and retries

recovery policy guardrails