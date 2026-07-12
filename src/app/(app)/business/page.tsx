"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, ArrowUp, UserPlus, UserMinus, X, Minus, AlertTriangle, TrendingUp, TrendingDown, Wallet, Users, Activity, MoreVertical, Briefcase } from "lucide-react";
import { cn } from "@/lib/cn";
import { Money } from "@/components/ui/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import {
  BUSINESS_TYPES,
  getBusinessType,
  upgradeCost,
  effectiveWage,
  wageRatio,
  moraleFromWage,
  incidentChance,
  payrollCost,
  staffingLevel,
} from "@/config/businesses";

type Biz = {
  id: string;
  name: string;
  type: string;
  level: number;
  revenuePerTick: number;
  expensePerTick: number;
  employeeCount: number;
  isActive: boolean;
  salaryPerEmployee: number;
  createdAt: string;
};

type BizAction = "upgrade" | "hire" | "fire" | "set-wage-up" | "set-wage-down" | "liquidate";

export default function BusinessPage() {
  const [bizs, setBizs] = useState<Biz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createType, setCreateType] = useState("CAFE");
  const [createName, setCreateName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const r = await apiFetch<{ businesses: Biz[] }>("/api/business", { method: "GET" });
    if (r.ok) setBizs(r.data.businesses);
    setLoading(false);
  }

  useEffect(() => {
    // Initial load — fetch resolves async, setState fires after, not during render.
    fetch("/api/business")
      .then((r) => r.json())
      .then((d) => { if (d.businesses) setBizs(d.businesses); })
      .catch(() => {})
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

  async function doAction(id: string, action: BizAction) {
    if (action === "liquidate" && !confirm("Liquidate this business? Refund 40% of setup cost.")) return;
    const [base, , direction] = action.split("-");
    const url = action.startsWith("set-wage")
      ? `/api/business/${id}?action=set-wage&direction=${direction}`
      : `/api/business/${id}?action=${base}`;
    const r = await apiFetch<{ refund?: number; ratio?: number }>(url, { method: "POST" });
    if (!r.ok) { toast.error(r.error); return; }
    if (action === "liquidate") toast.success(`Liquidated — refunded $${r.data.refund?.toLocaleString() ?? 0}`);
    else if (action.startsWith("set-wage")) toast.success(`Wage → ${Math.round((r.data.ratio ?? 1) * 100)}% base`);
    else toast.success("Done");
    load();
  }

  const summary = useMemo(() => {
    const active = bizs.filter((b) => b.isActive);
    const revenue = active.reduce((s, b) => s + b.revenuePerTick, 0);
    const expense = active.reduce((s, b) => s + b.expensePerTick, 0);
    const payroll = active.reduce((s, b) => s + payrollCost(b.type, b.employeeCount, b.salaryPerEmployee), 0);
    const employees = active.reduce((s, b) => s + b.employeeCount, 0);
    const avgRisk = active.length
      ? active.reduce((s, b) => s + incidentChance(b.type, b.salaryPerEmployee), 0) / active.length
      : 0;
    return { revenue, expense, payroll, employees, avgRisk, profit: revenue - expense, count: active.length };
  }, [bizs]);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-10">
      <header className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-faint">Ventures</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-text">Business Management</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="hidden items-center gap-1 rounded-full bg-surface-low px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-profit" /> {summary.count} active
          </span>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5" /> New Business
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : bizs.length === 0 ? (
        <div className="glass-panel flex flex-col items-center gap-2 py-16 text-center text-sm text-text-faint">
          <Briefcase className="h-10 w-10 opacity-40" />
          <p className="text-base font-medium text-text">No businesses yet</p>
          <p>Start with a Street Food stall from $15,000 setup cost.</p>
          <Button size="sm" onClick={() => setShowCreate(true)} className="mt-2"><Plus className="h-3.5 w-3.5" /> New Business</Button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* ── SECTION 1: Hero KPI strip — Stitch "Total Revenue" tiles ── */}
          <section>
            <SectionLabel icon={<TrendingUp className="h-3 w-3" />} title="Financial Overview" meta="PER TICK" />
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
              <HeroKpi
                icon={<TrendingUp className="h-4 w-4" />}
                label="Total Revenue"
                value={<Money value={summary.revenue} />}
                tone="profit"
                hint={<><ArrowUp className="inline h-3 w-3" /> {summary.count} ventures</>}
              />
              <HeroKpi
                icon={<TrendingDown className="h-4 w-4" />}
                label="Operating Costs"
                value={<Money value={summary.expense} />}
                tone="loss"
                hint={<><Wallet className="inline h-3 w-3" /> payroll <Money value={summary.payroll} compact /></>}
              />
              <HeroKpi
                icon={<Activity className="h-4 w-4" />}
                label="Net Profit"
                value={<Money value={summary.profit} signed />}
                tone={summary.profit >= 0 ? "profit" : "loss"}
                hint={summary.profit >= 0 ? <span className="text-profit">healthy</span> : <span className="text-loss">bleeding</span>}
                prominent
              />
              <HeroKpi
                icon={<Users className="h-4 w-4" />}
                label="Workforce"
                value={summary.employees}
                tone="neutral"
                hint={<span className={summary.avgRisk > 0.08 ? "text-loss" : "text-text-muted"}>risk {(summary.avgRisk * 100).toFixed(1)}%/t</span>}
              />
            </div>
          </section>

          {/* ── SECTION 2: Business Performance — Stitch "Department Performance" ── */}
          <section>
            <SectionLabel icon={<Activity className="h-3 w-3" />} title="Business Performance" meta={`${bizs.length} VENTURE${bizs.length > 1 ? "S" : ""}`} />
            <div className="glass-panel divide-y divide-border/50">
              {bizs.map((b) => (
                <PerformanceRow key={b.id} b={b} onUpgrade={(id) => doAction(id, "upgrade")} />
              ))}
            </div>
          </section>

          {/* ── SECTION 3: Payroll & Staffing — Stitch table ── */}
          <section>
            <SectionLabel icon={<Users className="h-3 w-3" />} title="Payroll & Staffing" meta={`${summary.employees} EMPLOYEES`} />
            <div className="glass-panel overflow-hidden">
              <div className="grid grid-cols-[1.3fr_0.8fr_1.1fr_1.1fr_1fr_0.5fr] gap-2 border-b border-border bg-surface-low/60 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-text-faint">
                <span>Venture</span>
                <span className="text-center">Staff</span>
                <span className="text-right">Avg Wage</span>
                <span className="text-center">Morale</span>
                <span className="text-center">Risk</span>
                <span className="text-center">Act</span>
              </div>
              {bizs.map((b) => (
                <StaffingRow key={b.id} b={b} onAct={doAction} />
              ))}
            </div>
          </section>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="glass-panel flex w-full max-w-md flex-col gap-3 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-text">New Business</h2>
              <button onClick={() => setShowCreate(false)} className="rounded-md p-1 text-text-muted transition-colors hover:bg-soft hover:text-text"><X className="h-4 w-4" /></button>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">Business Name</label>
              <Input placeholder="My Business" value={createName} onChange={(e) => setCreateName(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">Type</label>
              <div className="mt-1.5 flex flex-col gap-1.5">
                {BUSINESS_TYPES.map((bt) => (
                  <button
                    key={bt.code}
                    onClick={() => setCreateType(bt.code)}
                    className={cn(
                      "rounded-lg border p-2.5 text-left text-xs transition-all",
                      createType === bt.code ? "border-primary bg-primary/10 glow-primary" : "border-border hover:bg-soft hover:border-border-strong",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-text">{bt.label}</span>
                      <span className="tnum text-text-faint">Risk {Math.round(bt.volatility * 100)}%</span>
                    </div>
                    <div className="mt-0.5 text-text-faint">{bt.description}</div>
                    <div className="tnum mt-1 flex gap-3 text-text-muted">
                      <span>Cost <Money value={bt.setupCost} compact /></span>
                      <span>Rev <Money value={bt.baseRevenue} />/t</span>
                      <span>Wage <Money value={bt.baseSalary} /></span>
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

/** Stitch-style section label: icon + title + caps meta on the right. */
function SectionLabel({ icon, title, meta }: { icon: React.ReactNode; title: string; meta?: string }) {
  return (
    <div className="mb-2.5 flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <span className="text-text-faint">{icon}</span>
        <h2 className="text-sm font-bold tracking-tight text-text">{title}</h2>
      </div>
      {meta && <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-text-faint">{meta}</span>}
    </div>
  );
}

/** Hero KPI tile — Stitch "Total Revenue" style. */
function HeroKpi({
  icon, label, value, hint, tone, prominent,
}: {
  icon: React.ReactNode; label: string; value: React.ReactNode; hint?: React.ReactNode;
  tone: "profit" | "loss" | "neutral"; prominent?: boolean;
}) {
  const iconBg =
    tone === "profit" ? "bg-profit-soft text-profit" :
    tone === "loss" ? "bg-loss-soft text-loss" :
    "bg-surface-highest text-text-muted";
  const valueColor = tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : "text-text";
  return (
    <div className={cn(
      "glass-panel flex flex-col gap-2 p-3.5",
      prominent && tone === "profit" && "glow-primary",
    )}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-faint">{label}</span>
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", iconBg)}>{icon}</span>
      </div>
      <div className={cn("tnum font-bold leading-none", valueColor, prominent ? "text-3xl" : "text-2xl")}>{value}</div>
      {hint && <div className="text-[11px] text-text-muted">{hint}</div>}
    </div>
  );
}

/** Performance row — Stitch "Department Performance": avatar + name + P/L + efficiency bar + %. */
function PerformanceRow({ b, onUpgrade }: { b: Biz; onUpgrade: (id: string) => void }) {
  const bt = getBusinessType(b.type);
  const profit = b.revenuePerTick - b.expensePerTick;
  const morale = moraleFromWage(b.type, b.salaryPerEmployee);
  // Efficiency = blend of margin & morale, 0-100. Drives the Stitch bar.
  const margin = b.revenuePerTick > 0 ? (profit / b.revenuePerTick) * 100 : 0;
  const efficiency = Math.max(0, Math.min(100, 50 + margin / 2 + (morale - 50) / 4));
  const effTone = efficiency >= 75 ? "bg-profit" : efficiency >= 50 ? "bg-warning" : "bg-loss";
  const effLabel = efficiency >= 75 ? "Efficient" : efficiency >= 50 ? "Stable" : "Struggling";

  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xs font-bold",
        profit >= 0 ? "bg-profit-soft text-profit" : "bg-loss-soft text-loss",
      )}>
        {b.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-bold text-text">{b.name}</span>
          <span className="shrink-0 rounded-full bg-surface-highest px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-text-muted">{bt?.label ?? b.type}</span>
          <span className="tnum shrink-0 text-[10px] text-text-faint">Lv.{b.level}</span>
        </div>
        <div className="tnum mt-0.5 flex items-center gap-1.5 text-[11px] text-text-muted">
          <span className="text-profit">+<Money value={b.revenuePerTick} /></span>
          <span className="text-text-faint">−</span>
          <span className="text-loss"><Money value={b.expensePerTick} /></span>
          <span className="text-text-faint">=</span>
          <span className={cn("font-semibold", profit >= 0 ? "text-profit" : "text-loss")}><Money value={profit} signed /></span>
          {!b.isActive && <span className="text-text-faint">· closed</span>}
        </div>
      </div>
      {b.isActive && (
        <div className="flex w-24 shrink-0 flex-col items-end gap-1 sm:w-40">
          <span className={cn("tnum text-xs font-bold", efficiency >= 75 ? "text-profit" : efficiency >= 50 ? "text-warning" : "text-loss")}>
            {Math.round(efficiency)}% {effLabel}
          </span>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div className={cn("h-full rounded-full transition-all", effTone)} style={{ width: `${efficiency}%` }} />
          </div>
        </div>
      )}
      <div className="shrink-0">
        {b.isActive && b.level < 10 ? (
          <button
            onClick={() => onUpgrade(b.id)}
            className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-text transition-colors hover:bg-soft"
            title={`Upgrade to Lv.${b.level + 1}`}
          ><ArrowUp className="h-3 w-3" /> <span className="tnum text-text-faint"><Money value={upgradeCost(b.type, b.level)} compact /></span></button>
        ) : b.isActive ? (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase text-primary">Max</span>
        ) : null}
      </div>
    </div>
  );
}

/** Staffing table row — Stitch "Payroll & Staffing" columns. */
function StaffingRow({ b, onAct }: { b: Biz; onAct: (id: string, action: BizAction) => void }) {
  const wage = effectiveWage(b.type, b.salaryPerEmployee);
  const ratio = wageRatio(b.type, b.salaryPerEmployee);
  const morale = moraleFromWage(b.type, b.salaryPerEmployee);
  const risk = incidentChance(b.type, b.salaryPerEmployee);
  const staff = staffingLevel(b.level, b.employeeCount);
  const moraleLabel = morale >= 85 ? "Elite" : morale >= 65 ? "Good" : morale >= 40 ? "Neutral" : morale >= 20 ? "Low" : "Critical";
  const moraleBadge =
    morale >= 85 ? "bg-profit-soft text-profit" :
    morale >= 65 ? "bg-profit/10 text-profit" :
    morale >= 40 ? "bg-warning-soft text-warning" :
    "bg-loss-soft text-loss";
  const disabled = !b.isActive;

  return (
    <div className="grid grid-cols-[1.3fr_0.8fr_1.1fr_1.1fr_1fr_0.5fr] items-center gap-2 border-b border-border/40 px-3 py-2.5 text-xs last:border-b-0 hover:bg-surface-low/40">
      {/* Venture */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-semibold text-text">{b.name}</span>
          <span className={cn("shrink-0 rounded px-1.5 py-0 text-[9px] font-medium uppercase", staff === "understaffed" ? "bg-warning/10 text-warning" : staff === "overstaffed" ? "bg-info/10 text-info" : "bg-surface-highest text-text-faint")}>{staff}</span>
        </div>
      </div>
      {/* Staff count + hire/fire */}
      <div className="flex items-center justify-center gap-1">
        <button onClick={() => onAct(b.id, "fire")} disabled={disabled || b.employeeCount <= 1} className="flex h-5 w-5 items-center justify-center rounded border border-border text-text-muted transition-colors hover:bg-loss-soft disabled:opacity-30" title="Fire"><UserMinus className="h-3 w-3" /></button>
        <span className="tnum w-6 text-center font-bold text-text">{b.employeeCount}</span>
        <button onClick={() => onAct(b.id, "hire")} disabled={disabled} className="flex h-5 w-5 items-center justify-center rounded border border-border text-text-muted transition-colors hover:bg-profit-soft disabled:opacity-30" title="Hire"><UserPlus className="h-3 w-3" /></button>
      </div>
      {/* Avg wage + ratio + adjust */}
      <div className="flex items-center justify-end gap-1.5">
        <div className="flex flex-col items-end leading-tight">
          <span className="tnum font-semibold text-text"><Money value={wage} /></span>
          <span className="tnum text-[9px] text-text-faint">{Math.round(ratio * 100)}% base</span>
        </div>
        <div className="flex flex-col">
          <button onClick={() => onAct(b.id, "set-wage-up")} disabled={disabled || ratio >= 2 - 0.001} className="flex h-3.5 w-5 items-center justify-center rounded-sm border border-border text-text-muted transition-colors hover:bg-soft disabled:opacity-30" title="Raise wage 5%"><Plus className="h-2.5 w-2.5" /></button>
          <button onClick={() => onAct(b.id, "set-wage-down")} disabled={disabled || ratio <= 0.4 + 0.001} className="mt-0.5 flex h-3.5 w-5 items-center justify-center rounded-sm border border-border text-text-muted transition-colors hover:bg-soft disabled:opacity-30" title="Lower wage 5%"><Minus className="h-2.5 w-2.5" /></button>
        </div>
      </div>
      {/* Morale badge + bar */}
      <div className="flex flex-col items-center gap-1">
        <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide", moraleBadge)}>{moraleLabel} {morale}</span>
        <div className="h-1 w-full max-w-[60px] overflow-hidden rounded-full bg-border">
          <div className={cn("h-full rounded-full", morale >= 65 ? "bg-profit" : morale >= 40 ? "bg-warning" : "bg-loss")} style={{ width: `${morale}%` }} />
        </div>
      </div>
      {/* Risk */}
      <div className="flex items-center justify-center gap-1.5">
        <AlertTriangle className={cn("h-3 w-3 shrink-0", risk > 0.08 ? "text-loss" : risk > 0.04 ? "text-warning" : "text-text-faint")} />
        <span className="tnum text-[10px] text-text-muted">{(risk * 100).toFixed(1)}%</span>
      </div>
      {/* Action — liquidate */}
      <div className="flex items-center justify-center">
        <button onClick={() => onAct(b.id, "liquidate")} disabled={disabled} className="rounded p-1 text-text-faint transition-colors hover:bg-loss-soft hover:text-loss disabled:opacity-30" title="Liquidate"><MoreVertical className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
