"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";

export function NotificationBadge() {
  const { data: session } = authClient.useSession();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!session) return;

    const fetchUnreadCount = async () => {
      try {
        const res = await fetch("/api/notifications?count=true");
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (err) {
        console.error("Failed to fetch unread count:", err);
      }
    };

    fetchUnreadCount();
    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [session]);

  if (unreadCount === 0) return null;

  return (
    <span className="absolute top-2 right-2 bg-primary text-on-primary-fixed text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border-2 border-surface">
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  );
}
