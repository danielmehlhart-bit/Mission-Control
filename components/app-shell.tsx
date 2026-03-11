"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavBadge } from "@/components/nav-badge";

const navItems = [
  { href: "/",          label: "Home",      icon: "⌂" },
  { href: "/accounts",  label: "Accounts",  icon: "🏢" },
  { href: "/pipeline",  label: "Pipeline",  icon: "📊" },
  { href: "/people",    label: "People",    icon: "👥" },
  { href: "/tasks",     label: "Tasks",     icon: "✓" },
  { href: "/docs",      label: "Docs",      icon: "📄", badge: true },
  { href: "/memory",    label: "Memory",    icon: "🧠" },
  { href: "/hatti",     label: "Hatti",     icon: "💬" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ minHeight: "100vh", background: "#0d0f12", color: "#f0f2f5", fontFamily: "Inter, -apple-system, sans-serif" }}>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 52,
        background: "rgba(13,15,18,0.93)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #1e2128",
        display: "flex", alignItems: "center",
        padding: "0 20px", zIndex: 100,
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15, color: "#f0f2f5", textDecoration: "none", marginRight: 24, flexShrink: 0 }}>
          <span style={{ width: 28, height: 28, background: "linear-gradient(135deg, #10B981 0%, #059669 100%)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🏔️</span>
          <span style={{ display: "flex", gap: 4 }}>Mission <span style={{ color: "#10B981" }}>Control</span></span>
        </Link>

        {/* Nav Items — desktop only (hidden on mobile via CSS) */}
        <div className="top-nav-items" style={{ alignItems: "center", gap: 2, flex: 1, overflowX: "auto" }}>
          {navItems.map(item => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "5px 11px", borderRadius: 999, fontSize: 13, fontWeight: 500,
                color: active ? "#f0f2f5" : "#8b90a0",
                background: active ? "#1a1d27" : "transparent",
                boxShadow: active ? "0 0 0 1px #1e2128" : "none",
                textDecoration: "none", transition: "all 0.15s", whiteSpace: "nowrap",
              }}>
                <span style={{ fontSize: 13, color: active ? "#10B981" : undefined }}>{item.icon}</span>
                {item.label}
                {item.badge && !active && <NavBadge />}
              </Link>
            );
          })}
        </div>

        {/* Right — desktop only */}
        <div className="top-nav-right" style={{ alignItems: "center", gap: 10, marginLeft: 12, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#8b90a0" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
            Online
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 10px 4px 4px", borderRadius: 999, background: "#141720", border: "1px solid #1e2128" }}>
            <span style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg, #6366F1, #10B981)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white" }}>D</span>
            <span style={{ fontSize: 12.5, fontWeight: 500 }}>Daniel</span>
          </div>
        </div>
      </nav>

      {/* Bottom Nav — mobile only (shown via CSS) */}
      <nav className="bottom-nav">
        {navItems.map(item => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={active ? "active" : ""}>
              <span className="icon">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main style={{ paddingTop: 52, minHeight: "100vh" }}>{children}</main>
    </div>
  );
}
