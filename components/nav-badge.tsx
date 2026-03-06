"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function NavBadge() {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    // When visiting /docs, reset the badge
    if (pathname === "/docs") {
      localStorage.setItem("lastSeenTimestamp", Date.now().toString());
      setCount(0);
      return;
    }

    const check = async () => {
      try {
        const res = await fetch("/api/briefings", { cache: "no-store" });
        const data = await res.json();
        const files = data.files ?? [];
        const lastSeen = parseInt(localStorage.getItem("lastSeenTimestamp") ?? "0", 10);
        const newCount = files.filter(
          (f: { modified: string }) => new Date(f.modified).getTime() > lastSeen
        ).length;
        setCount(newCount);
      } catch {}
    };

    check();
  }, [pathname]);

  if (count === 0) return null;

  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}
