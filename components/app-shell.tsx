"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavBadge } from "@/components/nav-badge";

const navItems = [
  { href: "/",          label: "Home",      icon: "home" },
  { href: "/accounts",  label: "Accounts",  icon: "building" },
  { href: "/pipeline",  label: "Pipeline",  icon: "chart" },
  { href: "/people",    label: "People",    icon: "users" },
  { href: "/tasks",     label: "Tasks",     icon: "check" },
  { href: "/docs",      label: "Docs",      icon: "file", badge: true },
  { href: "/memory",    label: "Memory",    icon: "brain" },
  { href: "/hatti",     label: "Hatti",     icon: "chat" },
];

function NavIcon({ name }: { name: string }) {
  const iconProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "home":
      return <svg {...iconProps}><path d="M3 10.8 12 3l9 7.8" /><path d="M5.5 9.5v10.5h13V9.5" /></svg>;
    case "building":
      return <svg {...iconProps}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h1M12 7h1M16 7h1M8 11h1M12 11h1M16 11h1M8 15h1M12 15h1M16 15h1" /><path d="M11 21v-3h2v3" /></svg>;
    case "chart":
      return <svg {...iconProps}><path d="M4 20h16" /><path d="M7 16v-4" /><path d="M12 16V9" /><path d="M17 16v-7" /></svg>;
    case "users":
      return <svg {...iconProps}><path d="M16.5 20c0-2.4-2-4.3-4.5-4.3s-4.5 2-4.5 4.3" /><circle cx="12" cy="9" r="3" /><path d="M20 19.5c0-1.8-1.3-3.2-3.1-3.6" /><path d="M7.1 15.9C5.3 16.3 4 17.8 4 19.5" /></svg>;
    case "check":
      return <svg {...iconProps}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m8.5 12 2.3 2.4 4.8-4.9" /></svg>;
    case "file":
      return <svg {...iconProps}><path d="M8 3.5h6l4 4V20a1 1 0 0 1-1 1H8a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z" /><path d="M14 3.5V8h4" /><path d="M9 13h6M9 17h6" /></svg>;
    case "brain":
      return <svg {...iconProps}><path d="M9.4 5.1a2.7 2.7 0 1 0-4.1 2.2A3.5 3.5 0 0 0 4 10.2 3.5 3.5 0 0 0 7.5 14h.3" /><path d="M14.6 5.1a2.7 2.7 0 1 1 4.1 2.2 3.5 3.5 0 0 1 1.3 2.9 3.5 3.5 0 0 1-3.5 3.8h-.3" /><path d="M12 4v16" /><path d="M9.5 10.5H12M12 13.5h2.5" /></svg>;
    case "chat":
      return <svg {...iconProps}><path d="M6 18 4 21v-4.5A7.5 7.5 0 1 1 20 12" /><path d="M8.5 11h7M8.5 14h5" /></svg>;
    default:
      return null;
  }
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ minHeight: "100vh", background: "#141720", color: "#f0f2f5", fontFamily: "Inter, -apple-system, sans-serif" }}>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 52,
        background: "linear-gradient(180deg, rgba(24, 28, 40, 0.92) 0%, rgba(17, 20, 30, 0.9) 100%)", backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3), inset 0 -1px 0 rgba(255,255,255,0.04)",
        display: "flex", alignItems: "center",
        padding: "0 20px", zIndex: 100,
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15, color: "#f0f2f5", textDecoration: "none", marginRight: 24, flexShrink: 0 }}>
          <span style={{ width: 28, height: 28, background: "linear-gradient(135deg, #10B981 0%, #059669 100%)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🏔️</span>
          <span style={{ display: "flex", gap: 4 }}>Mission <span style={{ color: "#10B981" }}>Control</span></span>
        </Link>

        {/* Nav Items — desktop only (hidden on mobile via CSS) */}
        <div className="top-nav-items" style={{ alignItems: "center", gap: 4, flex: 1, overflowX: "auto" }}>
          {navItems.map(item => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`top-nav-link${active ? " active" : ""}`}>
                <span className="icon"><NavIcon name={item.icon} /></span>
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
              <span className="icon"><NavIcon name={item.icon} /></span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main style={{ paddingTop: 52, minHeight: "100vh" }}>{children}</main>
    </div>
  );
}
