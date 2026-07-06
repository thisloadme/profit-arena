"use client";

import { useEffect, useState } from "react";
import { Money } from "@/components/ui/money";
import { PercentChange } from "@/components/ui/percent-change";
import { useSocket } from "@/hooks/use-socket";

type Props = {
  initial: { netWorth: number; changePct: number };
};

/**
 * Live net worth — refreshes from server on `user:tick` socket event.
 *
 * ponytail: refetch the small dashboard endpoint rather than compute on client
 * (server-authoritative values). Cache-busting via `?t=` to bypass SWR/fetch cache.
 */
export function NetWorthDisplay({ initial }: Props) {
  const { socket } = useSocket();
  const [netWorth, setNetWorth] = useState(initial.netWorth);
  const [changePct, setChangePct] = useState(initial.changePct);

  useEffect(() => {
    if (!socket) return;
    const handler = async () => {
      const res = await fetch(`/api/me/stats?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const data: { netWorth: number; prevNetWorth: number } = await res.json();
      setNetWorth(data.netWorth);
      if (data.prevNetWorth > 0) {
        setChangePct(((data.netWorth - data.prevNetWorth) / data.prevNetWorth) * 100);
      }
    };
    socket.on("user:tick", handler);
    return () => {
      socket.off("user:tick", handler);
    };
  }, [socket]);

  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-text-muted">Net Worth</span>
      <Money value={netWorth} compact className="text-base font-semibold text-text" />
      <PercentChange value={changePct} className="text-[11px]" />
    </div>
  );
}
