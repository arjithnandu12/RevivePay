"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ShieldCheck, ShieldAlert } from "lucide-react";
import AppShell from "@/components/layout/app-shell";

interface Settings {
  razorpay: { connected: boolean; accountId: string | null };
  policy: {
    retryLimit: number;
    highValueThreshold: number;
    humanApprovalThreshold: number;
    suspiciousPayments: "manual_review" | "auto_block";
    automaticRetries: boolean;
  };
  notifications: {
    emailOnEscalation: boolean;
    emailOnRecovery: boolean;
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState("");

  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true);

        const response = await fetch("/api/settings");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch settings");
        }

        setSettings(data);
      } catch (err) {
        console.error("Settings fetch error:", err);
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  async function saveSettings() {
    if (!settings) return;

    try {
      setSaving(true);
      setSaved(false);

      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to save settings");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error("Save settings error:", err);
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

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
              Terminal
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
            Loading settings...
          </span>
        </div>
      </div>
    </AppShell>
  );
}

  if (error || !settings) {
    return (
      <AppShell>
        <div className="mx-auto max-w-4xl px-8 py-8">
          <div className="rounded-lg border border-danger-border bg-danger-bg p-10 text-center">
            <h1 className="text-[16px] font-semibold text-danger">
              Failed to load settings
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
          Settings
        </h1>
        <p className="mt-0.5 text-[13px] text-text-secondary">
          Connection, policy limits, and notifications.
        </p>
      </header>

      <div className="mx-auto max-w-3xl px-8 py-6">
        <section className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-[14px] font-semibold text-text-primary">
            Razorpay Connection
          </h2>
          <div className="mt-4 flex items-center justify-between rounded-md border border-border bg-bg-elevated px-4 py-3">
            <div className="flex items-center gap-2.5">
              {settings.razorpay.connected ? (
                <ShieldCheck size={16} className="text-success" />
              ) : (
                <ShieldAlert size={16} className="text-warning" />
              )}
              <div>
                <p className="text-[13px] font-medium text-text-primary">
                  {settings.razorpay.connected ? "Connected" : "Not connected"}
                </p>
                {settings.razorpay.accountId && (
                  <p className="font-num text-[11.5px] text-text-tertiary">
                    {settings.razorpay.accountId}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setConnectionMessage("Configure Razorpay credentials in .env.local, then reload settings.")}
              className="rounded-md border border-border bg-surface px-3.5 py-1.5 text-[12.5px] font-medium text-text-primary hover:bg-surface-hover"
            >
              {settings.razorpay.connected ? "Reconnect" : "Connect"}
            </button>
          </div>
          {connectionMessage && <p className="mt-2 text-[12px] text-text-tertiary">{connectionMessage}</p>}
        </section>

        <section className="mt-4 rounded-lg border border-border bg-surface p-6">
          <h2 className="text-[14px] font-semibold text-text-primary">
            Policy Engine Rules
          </h2>
          <p className="mt-1 text-[12.5px] text-text-tertiary">
            These are hard limits — the AI agent cannot override them.
          </p>

          <div className="mt-5 space-y-5">
            <NumberField
              label="Retry limit"
              value={settings.policy.retryLimit}
              onChange={(v) =>
                setSettings({ ...settings, policy: { ...settings.policy, retryLimit: v } })
              }
            />
            <NumberField
              label="High-value threshold (₹)"
              value={settings.policy.highValueThreshold}
              onChange={(v) =>
                setSettings({
                  ...settings,
                  policy: { ...settings.policy, highValueThreshold: v },
                })
              }
            />
            <NumberField
              label="Human approval threshold (₹)"
              value={settings.policy.humanApprovalThreshold}
              onChange={(v) =>
                setSettings({
                  ...settings,
                  policy: { ...settings.policy, humanApprovalThreshold: v },
                })
              }
            />

            <div className="flex items-center justify-between">
              <label className="text-[13px] text-text-secondary">
                Suspicious payments
              </label>
              <select
                value={settings.policy.suspiciousPayments}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    policy: {
                      ...settings.policy,
                      suspiciousPayments: e.target.value as "manual_review" | "auto_block",
                    },
                  })
                }
                className="rounded-md border border-border bg-bg-elevated px-3 py-1.5 text-[13px] text-text-primary outline-none"
              >
                <option value="manual_review">Manual review</option>
                <option value="auto_block">Auto-block</option>
              </select>
            </div>

            <ToggleField
              label="Automatic retries"
              checked={settings.policy.automaticRetries}
              onChange={(v) =>
                setSettings({
                  ...settings,
                  policy: { ...settings.policy, automaticRetries: v },
                })
              }
            />
          </div>
        </section>

        <section className="mt-4 rounded-lg border border-border bg-surface p-6">
          <h2 className="text-[14px] font-semibold text-text-primary">
            Notifications
          </h2>

          <div className="mt-5 space-y-5">
            <ToggleField
              label="Email me when a case is escalated"
              checked={settings.notifications.emailOnEscalation}
              onChange={(v) =>
                setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, emailOnEscalation: v },
                })
              }
            />
            <ToggleField
              label="Email me when a payment is RevivePay"
              checked={settings.notifications.emailOnRecovery}
              onChange={(v) =>
                setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, emailOnRecovery: v },
                })
              }
            />
          </div>
        </section>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="rounded-md bg-text-primary px-5 py-2.5 text-[13px] font-medium text-bg hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-[12.5px] text-success">
              <CheckCircle2 size={14} />
              Saved
            </span>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-[13px] text-text-secondary">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="font-num w-32 rounded-md border border-border bg-bg-elevated px-3 py-1.5 text-right text-[13px] text-text-primary outline-none focus:border-agent"
      />
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-[13px] text-text-secondary">{label}</label>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors ${
          checked ? "bg-success" : "bg-border-strong"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-bg transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}