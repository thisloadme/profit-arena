"use client";

import { useEffect, useState } from "react";
import { Money } from "@/components/ui/money";
import { PercentChange } from "@/components/ui/percent-change";
import { useSocket } from "@/hooks/use-socket";

type Props = {
  initial: { netWorth: number; changePct: number; cash: number };
};

/**
 * Live net worth + cash — refreshes from server on `user:tick` socket event.
 *
 * refetch the small dashboard endpoint rather than compute on client
 * (server-authoritative values). Cache-busting via `?t=` to bypass SWR/fetch cache.
 */
export function NetWorthDisplay({ initial }: Props) {
  const { socket } = useSocket();
  const [netWorth, setNetWorth] = useState(initial.netWorth);
  const [cash, setCash] = useState(initial.cash);
  const [changePct, setChangePct] = useState(initial.changePct);

  useEffect(() => {
    if (!socket) return;
    const handler = async () => {
      const res = await fetch(`/api/me/stats?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const data: { netWorth: number; cash: number; prevNetWorth: number } = await res.json();
      setNetWorth(data.netWorth);
      setCash(data.cash);
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
    <div className="flex items-center gap-3">
      <div className="flex items-baseline gap-1.5">
        <span className="text-[10px] uppercase tracking-widest text-text-faint">NW</span>
        <Money value={netWorth} compact className="tnum text-sm font-semibold text-text" />
        <PercentChange value={changePct} className="text-[10px]" />
      </div>
      <div className="h-4 w-px bg-border" aria-hidden />
      <div className="flex items-baseline gap-1.5">
        <span className="text-[10px] uppercase tracking-widest text-text-faint">Cash</span>
        <Money value={cash} compact className="tnum text-sm font-semibold text-text" />
      </div>
    </div>
  );
}
