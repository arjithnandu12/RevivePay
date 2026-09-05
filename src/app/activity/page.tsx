"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import AppShell from "@/components/layout/app-shell";
import { LayerTag } from "@/components/ui/badges";

interface ActivityEvent {
  id: string;
  time: string;
  label: string;
  paymentId: string;
  detail: string;
  layer: "razorpay" | "agent" | "policy";
  status: "success" | "pending" | "failure";
}

const LAYERS: { key: "all" | "razorpay" | "agent" | "policy"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "razorpay", label: "Razorpay" },
  { key: "agent", label: "AI Agent" },
  { key: "policy", label: "Policy Engine" },
];

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [layerFilter, setLayerFilter] = useState<"all" | "razorpay" | "agent" | "policy">("all");

  useEffect(() => {
    async function fetchActivity() {
      try {
        setLoading(true);

        const response = await fetch("/api/activity");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch activity");
        }

        setEvents(data.events || []);
        setNextCursor(data.nextCursor ?? null);
      } catch (err) {
        console.error("Activity fetch error:", err);
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchActivity();
  }, []);

  async function loadMore() {
    if (!nextCursor) return;

    try {
      setLoadingMore(true);

      const response = await fetch(`/api/activity?cursor=${nextCursor}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch more activity");
      }

      setEvents((prev) => [...prev, ...(data.events || [])]);
      setNextCursor(data.nextCursor ?? null);
    } catch (err) {
      console.error("Load more error:", err);
    } finally {
      setLoadingMore(false);
    }
  }

  const filtered =
    layerFilter === "all" ? events : events.filter((e) => e.layer === layerFilter);

if (loading) {
  return (
    <AppShell>
      <div className="flex min-h-[500px] items-center justify-center">
        <div
          className="
            relative box-border w-[12em] overflow-hidden rounded-[4px]
            border-[0.1em] border-[#333]
            bg-[#1a1a1a]
            p-[1.5em_1em]
            font-mono text-[1em] text-[#00ff00]
            shadow-[0_4px_8px_rgba(0,0,0,0.2)]
          "
        >
          <div
            className="
              absolute inset-x-0 top-0 box-border h-[1.5em]
              rounded-t-[4px]
              bg-[#333]
              px-[0.4em]
            "
          >
            <div className="float-right">
              <span className="ml-[0.4em] inline-block h-[0.6em] w-[0.6em] rounded-full bg-[#e33]" />
              <span className="ml-[0.4em] inline-block h-[0.6em] w-[0.6em] rounded-full bg-[#ee0]" />
              <span className="ml-[0.4em] inline-block h-[0.6em] w-[0.6em] rounded-full bg-[#0b0]" />
            </div>

            <div className="float-left leading-[1.5em] text-[#eee]">
              Status:
            </div>
          </div>

          <span
            className="
              mt-[1.5em] inline-block
              overflow-hidden whitespace-nowrap
              border-r-[0.2em] border-r-green-500
              animate-type-delete animate-blink-cursor
            "
          >
            Loading ...
          </span>
        </div>
      </div>
    </AppShell>
  );
}

  if (error) {
    return (
      <AppShell>
        <div className="mx-auto max-w-4xl px-8 py-8">
          <div className="rounded-lg border border-danger-border bg-danger-bg p-10 text-center">
            <h1 className="text-[16px] font-semibold text-danger">
              Failed to load activity
            </h1>
            <p className="mt-2 text-[13px] text-text-secondary">{error}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="border-b border-border px-8 py-5">
        <h1 className="text-[19px] font-semibold tracking-tight text-text-primary">
          Activity
        </h1>
        <p className="mt-0.5 text-[13px] text-text-secondary">
          The full event log across Razorpay, the AI agent, and the policy engine.
        </p>
      </header>

      <div className="px-8 py-6">
        <div className="mb-4 flex flex-wrap gap-2">
          {LAYERS.map((l) => (
            <button
              key={l.key}
              onClick={() => setLayerFilter(l.key)}
              className={`rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                layerFilter === l.key
                  ? "bg-text-primary text-bg"
                  : "border border-border bg-surface text-text-secondary hover:bg-surface-hover"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-surface p-6">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-text-tertiary">
              No activity yet.
            </p>
          ) : (
            <ol className="space-y-0">
              {filtered.map((event, i) => (
                <li key={event.id} className="flex gap-3 py-3">
                  <div className="flex flex-col items-center">
                    <StatusIcon status={event.status} />
                    {i < filtered.length - 1 && (
                      <span className="mt-1 w-px flex-1 bg-border" />
                    )}
                  </div>

                  <Link
                    href={`/payments/${event.paymentId}`}
                    className="group -mt-0.5 flex-1 pb-1"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13px] font-medium text-text-primary group-hover:text-agent">
                        {event.label}
                      </p>
                      <span className="text-[11.5px] text-text-tertiary">
                        {formatTime(event.time)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="font-num text-[12px] text-text-secondary">
                        {event.paymentId}
                      </span>
                      <span className="text-[11.5px] text-text-tertiary">·</span>
                      <span className="text-[12px] text-text-secondary">
                        {event.detail}
                      </span>
                    </div>
                    <div className="mt-1">
                      <LayerTag layer={event.layer} />
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          )}

          {nextCursor && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-3 w-full rounded-md border border-border bg-bg-elevated py-2.5 text-[12.5px] font-medium text-text-secondary hover:bg-surface-hover disabled:opacity-50"
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function StatusIcon({ status }: { status: "success" | "pending" | "failure" }) {
  if (status === "failure")
    return <XCircle size={15} className="mt-0.5 shrink-0 text-danger" />;
  if (status === "pending")
    return <Clock size={15} className="mt-0.5 shrink-0 text-warning" />;
  return <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-success" />;
}

function formatTime(iso: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;

  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}