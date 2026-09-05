import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import WebhookEvent from "@/models/webhookEvent";
import RecoveryAttempt from "@/models/RecoveryAttempt";
import AuditEvent from "@/models/AuditEvent";

const PAGE_SIZE = 20;

const FETCH_LIMIT = 150;

interface ActivityEvent {
  id: string;
  time: string;
  label: string;
  paymentId: string;
  detail: string;
  layer: "razorpay" | "agent" | "policy";
  status: "success" | "pending" | "failure";
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const cursor = request.nextUrl.searchParams.get("cursor");
    const offset = cursor ? parseInt(cursor, 10) || 0 : 0;

    const [webhookEvents, attempts, auditEvents] = await Promise.all([
      WebhookEvent.find({}).sort({ receivedAt: -1 }).limit(FETCH_LIMIT).lean(),
      RecoveryAttempt.find({}).sort({ attemptedAt: -1 }).limit(FETCH_LIMIT).lean(),
      AuditEvent.find({}).sort({ createdAt: -1 }).limit(FETCH_LIMIT).lean(),
    ]);

    const events: ActivityEvent[] = [];

   
    for (const e of webhookEvents) {
      events.push({
        id: `webhook-${e._id}`,
        time: new Date(e.receivedAt).toISOString(),
        label: formatEventLabel(e.event),
        paymentId: e.paymentId ?? "—",
        detail: e.lastError ?? e.status,
        layer: "razorpay",
        status:
          e.status === "failed" ? "failure" : e.status === "processing" ? "pending" : "success",
      });
    }

    for (const a of attempts) {
      const time = new Date(a.attemptedAt).toISOString();
      const status: ActivityEvent["status"] =
        a.status === "failed" ? "failure" : a.status === "pending" ? "pending" : "success";

      events.push({
        id: `agent-${a._id}`,
        time,
        label: "Recovery strategy selected",
        paymentId: a.paymentId,
        detail: a.strategy.replace(/_/g, " "),
        layer: "agent",
        status,
      });

      events.push({
        id: `policy-${a._id}`,
        time,
        label: "Policy validation",
        paymentId: a.paymentId,
        detail: a.riskLevel ? `${a.riskLevel} risk` : "evaluated",
        layer: "policy",
        status,
      });
    }

    for (const e of auditEvents) {
      events.push({
        id: `audit-${e._id}`,
        time: new Date(e.createdAt).toISOString(),
        label: formatEventLabel(e.action),
        paymentId: e.paymentId ?? "—",
        detail: e.reason ?? e.actor,
        layer: e.layer === "system" ? "policy" : e.layer,
        status: e.action.includes("blocked") || e.action.includes("stopped") ? "failure" : "success",
      });
    }

    events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    const page = events.slice(offset, offset + PAGE_SIZE);
    const nextOffset = offset + PAGE_SIZE;
    const nextCursor = nextOffset < events.length ? String(nextOffset) : null;

    return NextResponse.json({ events: page, nextCursor });
  } catch (error) {
    console.error("GET /api/activity error:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}

function formatEventLabel(event: string): string {
  return event.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}