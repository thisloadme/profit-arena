"use client";

import { useEffect, useState } from "react";
import { Bell, Check, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useSocket } from "@/hooks/use-socket";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

type Notification = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const { socket } = useSocket();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  async function load() {
    const res = await apiFetch<{ items: Notification[]; unreadCount: number }>("/api/notifications");
    if (res.ok) {
      setItems(res.data.items);
      setUnread(res.data.unreadCount);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (n: { title: string; message: string }) => {
      setUnread((c) => c + 1);
      setItems((prev) => [
        { id: crypto.randomUUID(), title: n.title, message: n.message, isRead: false, createdAt: new Date().toISOString() },
        ...prev,
      ]);
      toast.info(n.title, { description: n.message });
    };
    socket.on("notification:new", handler);
    return () => {
      socket.off("notification:new", handler);
    };
  }, [socket]);

  async function markOne(id: string) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, isRead: true } : it)));
    setUnread((c) => Math.max(0, c - 1));
    await apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
  }

  async function markAll() {
    setItems((prev) => prev.map((it) => ({ ...it, isRead: true })));
    setUnread(0);
    await apiFetch("/api/notifications/read-all", { method: "POST" });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-text-muted hover:bg-soft"
        aria-label={`Notifications (${unread} unread)`}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-loss px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setOpen(false)} aria-hidden>
          <div
            className="absolute right-0 top-0 h-full w-80 max-w-[90vw] border-l border-border bg-card p-3 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text">Notifications</h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={markAll}
                  className="rounded p-1 text-xs text-text-muted hover:bg-soft"
                  title="Mark all as read"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded p-1 text-text-muted hover:bg-soft"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>
            <div className="flex max-h-[calc(100vh-100px)] flex-col gap-2 overflow-y-auto">
              {items.length === 0 && (
                <p className="py-8 text-center text-xs text-text-faint">No notifications yet.</p>
              )}
              {items.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "rounded-md border p-2.5 text-xs",
                    n.isRead ? "border-border bg-bg-base" : "border-accent/30 bg-info-soft",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-text">{n.title}</p>
                    {!n.isRead && (
                      <button
                        onClick={() => markOne(n.id)}
                        className="shrink-0 text-text-faint hover:text-text"
                        title="Mark as read"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <p className="mt-0.5 text-text-muted">{n.message}</p>
                  <p className="mt-1 text-[10px] text-text-faint">
                    {new Date(n.createdAt).toLocaleString("en-US")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
