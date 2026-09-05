"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Receipt,
  ShieldCheck,
  Users,
  Bot,
  BarChart3,
  Activity,
  Settings,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/payments", label: "Payments", icon: Receipt },
  { href: "/recovery", label: "Recovery Cases", icon: ShieldCheck },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/agent", label: "AI Agent", icon: Bot },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/payments/TestPayment", label: "Test Payment", icon: Activity },
];

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-bg text-text-primary">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-border bg-bg-elevated">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-text-primary">
            <span className="text-[13px] font-semibold text-bg">R</span>
          </div>
          <div className="leading-tight">
            <p className="text-[13.5px] font-semibold tracking-tight text-text-primary">
              RevivePay
            </p>
            <p className="text-[10.5px] text-text-tertiary">
              Autonomous Revenue Recovery
            </p>
          </div>
        </div>

        <div className="mx-5 h-px bg-border" />

        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname?.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors ${
                  active
                    ? "bg-surface text-text-primary"
                    : "text-text-secondary hover:bg-surface hover:text-text-primary"
                }`}
              >
                <Icon
                  size={16}
                  strokeWidth={1.75}
                  className={active ? "text-text-primary" : "text-text-tertiary group-hover:text-text-secondary"}
                />
                <span className="font-medium">{item.label}</span>
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-agent" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border px-4 py-4">
          <div className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2.5">
            <div>
              <p className="text-[12px] font-medium text-text-primary">
                Razorpay
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-text-tertiary">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-success" />
                Connected · Live
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="ml-60 flex-1">{children}</div>
    </div>
  );
}