"use client";

import { useEffect, useState } from "react";
import { Plus, ArrowUp, UserPlus, UserMinus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Money } from "@/components/ui/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { BUSINESS_TYPES } from "@/config/businesses";
import { upgradeCost } from "@/config/businesses";

type Biz = {
  id: string;
  name: string;
  type: string;
  level: number;
  revenuePerTick: number;
  expensePerTick: number;
  employeeCount: number;
  isActive: boolean;
  createdAt: string;
};

export default function BusinessPage() {
  const [bizs, setBizs] = useState<Biz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createType, setCreateType] = useState("CAFE");
  const [createName, setCreateName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const r = await apiFetch<{ businesses: Biz[] }>("/api/business", { method: "GET" });
    if (r.ok) setBizs(r.data.businesses);
    setLoading(false);
  }

  useEffect(() => {
    fetch("/api/business")
      .then((r) => r.json())
      .then((d) => { if (d.businesses) setBizs(d.businesses); })
      .finally(() => setLoading(false));
  }, []);

  async function create() {
    if (!createName.trim()) { toast.error("Business name is required"); return; }
    setSubmitting(true);
    const r = await apiFetch("/api/business", { body: { name: createName, type: createType } });
    setSubmitting(false);
    if (r.ok) { toast.success("Business created!"); setShowCreate(false); setCreateName(""); load(); }
    else toast.error(r.error);
  }

  async function act(id: string, action: string) {
    const r = await apiFetch<{ business?: Biz; refund?: number }>(
      `/api/business/${id}?action=${action}`, { method: "POST" },
    );
    if (r.ok) {
      if (r.data.refund) toast.success(`Liquidated, refunded ${r.data.refund}`);
      else toast.success("Done");
      load();
    } else toast.error(r.error);
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10">
      <header className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
            Ventures
          </p>
          <h1 className="mt-0.5 text-2xl font-bold text-text">Business</h1>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5" /> New Business
        </Button>
      </header>

      {loading ? (
        <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : bizs.length === 0 ? (
        <div className="glass-panel flex flex-col items-center gap-2 py-12 text-sm text-text-faint">
          <p>No businesses yet.</p>
          <p>Start with a Cafe from $50,000 setup cost.</p>
          <Button size="sm" onClick={() => setShowCreate(true)}>New Business</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {bizs.map((b) => {
            const bt = BUSINESS_TYPES.find((t) => t.code === b.type);
            const profit = b.revenuePerTick - b.expensePerTick;
            return (
              <div key={b.id} className="glass-panel flex flex-col gap-2.5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-text">{b.name}</span>
                    <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">{bt?.label ?? b.type}</span>
                  </div>
                  {!b.isActive && <span className="text-xs text-text-faint">(closed)</span>}
                </div>

                {b.isActive && (
                  <>
                    {/* Level + progress */}
                    <div className="flex items-center gap-2">
                      <span className="tnum text-xs font-medium text-text-muted">Lv.{b.level}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full bg-primary transition-all glow-primary"
                          style={{ width: `${(b.level / 10) * 100}%` }}
                        />
                      </div>
                      <span className="tnum text-[10px] text-text-faint">/10</span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-text-faint">Revenue</span>
                        <div className="tnum font-medium text-profit">
                          +<Money value={b.revenuePerTick} />
                        </div>
                      </div>
                      <div>
                        <span className="text-text-faint">Expense</span>
                        <div className="tnum font-medium text-loss">
                          -<Money value={b.expensePerTick} />
                        </div>
                      </div>
                      <div>
                        <span className="text-text-faint">Profit</span>
                        <div className={cn("tnum font-medium", profit >= 0 ? "text-profit" : "text-loss")}>
                          <Money value={profit} signed />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted">{b.employeeCount} employees</span>
                      {b.level < 10 && (
                        <span className="tnum text-text-faint">
                          Upgrade: <Money value={upgradeCost(b.type, b.level)} compact />
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {b.level < 10 && (
                        <button onClick={() => act(b.id, "upgrade")}
                          className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] font-medium text-text transition-colors hover:bg-soft"
                        ><ArrowUp className="h-3 w-3" /> Upgrade</button>
                      )}
                      <button onClick={() => act(b.id, "hire")}
                        className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] font-medium text-text transition-colors hover:bg-soft"
                      ><UserPlus className="h-3 w-3" /> Hire</button>
                      {b.employeeCount > 1 && (
                        <button onClick={() => act(b.id, "fire")}
                          className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] font-medium text-text transition-colors hover:bg-loss-soft"
                        ><UserMinus className="h-3 w-3" /> Fire</button>
                      )}
                      <button onClick={() => act(b.id, "liquidate")}
                        className="flex items-center gap-1 rounded-full border border-loss/40 px-3 py-1 text-[11px] font-medium text-loss transition-colors hover:bg-loss-soft"
                      >Liquidate</button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="glass-panel flex w-full max-w-md flex-col gap-3 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-text">New Business</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-md p-1 text-text-muted transition-colors hover:bg-soft hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">Business Name</label>
              <Input placeholder="My Business" value={createName} onChange={(e) => setCreateName(e.target.value)} />
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">Type</label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {BUSINESS_TYPES.map((bt) => (
                  <button
                    key={bt.code}
                    onClick={() => setCreateType(bt.code)}
                    className={cn(
                      "rounded-lg border p-3 text-left text-xs transition-all",
                      createType === bt.code
                        ? "border-primary bg-primary/10 glow-primary"
                        : "border-border hover:bg-soft hover:border-border-strong",
                    )}
                  >
                    <div className="font-bold text-text">{bt.label}</div>
                    <div className="mt-0.5 text-text-faint">{bt.description}</div>
                    <div className="tnum mt-1 text-text-muted">
                      Cost: <Money value={bt.setupCost} compact /> | Revenue: <Money value={bt.baseRevenue} />/tick
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={create} loading={submitting} disabled={!createName.trim()} className="mt-2">Create Business</Button>
          </div>
        </div>
      )}
    </div>
  );
}
