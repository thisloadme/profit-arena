"use client";

import { useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  Clock,
  Wallet,
  TrendingUp,
  Briefcase,
  Building2,
  Calendar,
  AlertTriangle,
  History as HistoryIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { Money } from "@/components/ui/money";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { formatWorkHours, payPeriodLabel } from "@/config/jobs";
import { GAME_CONFIG } from "@/config/game";

type PayPeriod = "WEEKLY" | "MONTHLY";
type EmploymentStatus = "ACTIVE" | "NOTICE" | "TERMINATED";

type Job = {
  id: string;
  code: string;
  title: string;
  company: string;
  tier: string;
  salaryPerPay: number;
  payPeriod: PayPeriod;
  workStartHour: number;
  workEndHour: number;
  description: string;
  badgeColor: string;
  isActive: boolean;
};

type Employment = {
  id: string;
  jobId: string | null;
  companyName: string;
  position: string;
  salaryPerPay: number;
  payPeriod: PayPeriod;
  workStartHour: number;
  workEndHour: number;
  nextPayAtTick: number;
  status: EmploymentStatus;
  noticeUntilTick: number | null;
  startDate: string;
  endDate: string | null;
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [active, setActive] = useState<Employment[]>([]);
  const [notice, setNotice] = useState<Employment[]>([]);
  const [history, setHistory] = useState<Employment[]>([]);
  const [tickNumber, setTickNumber] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "ENTRY" | "MID" | "SENIOR">("ALL");

  async function load() {
    const [catalog, mine] = await Promise.all([
      apiFetch<{ jobs: Job[]; tickNumber: number }>("/api/jobs", { method: "GET" }),
      apiFetch<{ active: Employment[]; notice: Employment[]; history: Employment[]; tickNumber: number }>(
        "/api/jobs/mine",
        { method: "GET" },
      ),
    ]);
    if (catalog.ok) {
      setJobs(catalog.data.jobs);
      setTickNumber(catalog.data.tickNumber);
    }
    if (mine.ok) {
      setActive(mine.data.active);
      setNotice(mine.data.notice);
      setHistory(mine.data.history);
      setTickNumber(mine.data.tickNumber);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function apply(jobId: string) {
    setBusyId(jobId);
    const r = await apiFetch<{ employment: Employment }>(`/api/jobs/${jobId}/apply`, {
      method: "POST",
    });
    setBusyId(null);
    if (r.ok) {
      toast.success("Application accepted — welcome aboard!");
      load();
    } else {
      toast.error(r.error);
    }
  }

  async function leave(employmentId: string) {
    if (!confirm("Start notice period? You'll keep the next paycheck but cannot apply for conflicting jobs for 1 game-day.")) return;
    setBusyId(employmentId);
    const r = await apiFetch<{ employment: Employment }>(`/api/jobs/${employmentId}/leave`, {
      method: "POST",
    });
    setBusyId(null);
    if (r.ok) {
      toast.success("Notice started. See you on the other side.");
      load();
    } else {
      toast.error(r.error);
    }
  }

  // Hero KPI — total periodic income + counts.
  const summary = useMemo(() => {
    const monthlyIncome = active.reduce((s, e) => s + periodToMonthly(e.salaryPerPay, e.payPeriod), 0);
    const dailyIncome = monthlyIncome / 30;
    const nextPay = [...active, ...notice]
      .map((e) => ({ id: e.id, in: Math.max(0, e.nextPayAtTick - tickNumber) }))
      .sort((a, b) => a.in - b.in)[0];
    return {
      monthlyIncome,
      dailyIncome,
      activeCount: active.length,
      noticeCount: notice.length,
      nextPay,
    };
  }, [active, notice, tickNumber]);

  const filteredJobs = useMemo(
    () => filter === "ALL" ? jobs : jobs.filter((j) => j.tier === filter),
    [jobs, filter],
  );

  // Map jobId → user's employment (active or notice) so we can dim and mark.
  const myEmploymentByJobId = useMemo(() => {
    const m = new Map<string, Employment>();
    for (const e of [...active, ...notice]) if (e.jobId) m.set(e.jobId, e);
    return m;
  }, [active, notice]);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-10">
      <header className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-faint">Career</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-text">Job Board</h1>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-text-faint">
          <Calendar className="h-3 w-3" /> Day {Math.floor(tickNumber / GAME_CONFIG.TICKS_PER_GAME_DAY) + 1}
        </div>
      </header>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* ── HERO KPIs ── */}
          <section>
            <SectionLabel icon={<TrendingUp className="h-3 w-3" />} title="Career Overview" />
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
              <HeroKpi
                icon={<Wallet className="h-4 w-4" />}
                label="Monthly Income"
                value={<Money value={summary.monthlyIncome} />}
                tone="profit"
                hint={<>≈ <Money value={summary.dailyIncome} compact />/day</>}
              />
              <HeroKpi
                icon={<Briefcase className="h-4 w-4" />}
                label="Active Jobs"
                value={summary.activeCount}
                tone="neutral"
                hint={summary.noticeCount > 0
                  ? <span className="text-warning">+ {summary.noticeCount} on notice</span>
                  : "no notice"}
              />
              <HeroKpi
                icon={<Clock className="h-4 w-4" />}
                label="Next Paycheck"
                value={summary.nextPay
                  ? <>in {ticksToDaysLabel(summary.nextPay.in)}</>
                  : <>—</>}
                tone="neutral"
                hint={summary.nextPay ? <span className="text-text-muted">across all jobs</span> : "no active job"}
              />
              <HeroKpi
                icon={<GraduationCap className="h-4 w-4" />}
                label="Available Jobs"
                value={jobs.length}
                tone="neutral"
                hint={<span className="text-text-muted">{filter.toLowerCase()} filter</span>}
              />
            </div>
          </section>

          {/* ── TWO-COLUMN LAYOUT ── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            {/* LEFT: Active + Notice + History */}
            <div className="space-y-4">
              <section>
                <SectionLabel icon={<Briefcase className="h-3 w-3" />} title="Active Jobs" meta={`${active.length} EMPLOYED`} />
                {active.length === 0 ? (
                  <EmptyPanel icon={<Briefcase className="h-8 w-8" />} text="No active jobs — pick one from the board on the right." />
                ) : (
                  <div className="glass-panel divide-y divide-border/50">
                    {active.map((e) => <EmploymentRow key={e.id} e={e} tickNumber={tickNumber} onLeave={leave} busy={busyId === e.id} />)}
                  </div>
                )}
              </section>

              {notice.length > 0 && (
                <section>
                  <SectionLabel icon={<AlertTriangle className="h-3 w-3" />} title="On Notice" meta={`${notice.length} ENDING`} />
                  <div className="glass-panel divide-y divide-border/50">
                    {notice.map((e) => <EmploymentRow key={e.id} e={e} tickNumber={tickNumber} onLeave={leave} busy={busyId === e.id} />)}
                  </div>
                </section>
              )}

              <section>
                <SectionLabel icon={<HistoryIcon className="h-3 w-3" />} title="History" meta={`${history.length} PAST`} />
                {history.length === 0 ? (
                  <EmptyPanel icon={<HistoryIcon className="h-8 w-8" />} text="No past jobs yet." subtle />
                ) : (
                  <div className="glass-panel divide-y divide-border/50">
                    {history.slice(0, 8).map((e) => <HistoryRow key={e.id} e={e} />)}
                  </div>
                )}
              </section>
            </div>

            {/* RIGHT: Catalog */}
            <section>
              <div className="mb-2.5 flex items-center justify-between">
                <SectionLabel icon={<GraduationCap className="h-3 w-3" />} title="Career Opportunities" meta={`${filteredJobs.length} JOBS`} />
                <div className="flex items-center gap-1">
                  {(["ALL", "ENTRY", "MID", "SENIOR"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                        filter === f ? "bg-primary text-on-primary" : "text-text-muted hover:bg-soft",
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {filteredJobs.length === 0 ? (
                <EmptyPanel icon={<GraduationCap className="h-10 w-10" />} text="No jobs match this tier." />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {filteredJobs.map((j) => {
                    const mine = myEmploymentByJobId.get(j.id);
                    return (
                      <JobCard
                        key={j.id}
                        job={j}
                        myEmployment={mine}
                        busy={busyId === j.id}
                        onApply={() => apply(j.id)}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── helpers ─────────────────────────── */

function periodToMonthly(salary: number, period: PayPeriod): number {
  return period === "MONTHLY" ? salary : salary * 4;
}

function ticksToDaysLabel(ticks: number): string {
  const days = Math.floor(ticks / GAME_CONFIG.TICKS_PER_GAME_DAY);
  const hours = Math.floor((ticks % GAME_CONFIG.TICKS_PER_GAME_DAY) / 60);
  if (days >= 1) return `${days}d ${hours}h`;
  return `${hours}h`;
}

/* ─────────────────────────── components ───────────────────────── */

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

function HeroKpi({
  icon, label, value, hint, tone,
}: {
  icon: React.ReactNode; label: string; value: React.ReactNode; hint?: React.ReactNode;
  tone: "profit" | "loss" | "neutral";
}) {
  const iconBg =
    tone === "profit" ? "bg-profit-soft text-profit" :
    tone === "loss" ? "bg-loss-soft text-loss" :
    "bg-surface-highest text-text-muted";
  const valueColor = tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : "text-text";
  return (
    <div className="glass-panel flex flex-col gap-2 p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-faint">{label}</span>
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", iconBg)}>{icon}</span>
      </div>
      <div className={cn("tnum font-bold leading-none text-2xl", valueColor)}>{value}</div>
      {hint && <div className="text-[11px] text-text-muted">{hint}</div>}
    </div>
  );
}

function EmptyPanel({ icon, text, subtle }: { icon: React.ReactNode; text: string; subtle?: boolean }) {
  return (
    <div className={cn(
      "glass-panel flex flex-col items-center gap-2 py-10 text-center text-sm",
      subtle ? "text-text-faint" : "text-text-muted",
    )}>
      <span className={cn("opacity-40", !subtle && "opacity-50")}>{icon}</span>
      <p className={cn(!subtle && "font-medium text-text")}>{text}</p>
    </div>
  );
}

/** Active / Notice row — left panel. */
function EmploymentRow({
  e, tickNumber, onLeave, busy,
}: {
  e: Employment; tickNumber: number;
  onLeave: (id: string) => void; busy: boolean;
}) {
  const isNotice = e.status === "NOTICE";
  const noticeDaysLeft = isNotice && e.noticeUntilTick !== null
    ? Math.ceil((e.noticeUntilTick - tickNumber) / GAME_CONFIG.TICKS_PER_GAME_DAY)
    : null;
  const daysLeftToPay = Math.max(0, Math.ceil((e.nextPayAtTick - tickNumber) / GAME_CONFIG.TICKS_PER_GAME_DAY));

  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xs font-bold",
        isNotice ? "bg-warning-soft text-warning" : "bg-profit-soft text-profit",
      )}>
        <Building2 className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-bold text-text">{e.position}</span>
          <span className="truncate text-[11px] text-text-muted">@ {e.companyName}</span>
          {isNotice && (
            <span className="rounded-full bg-warning-soft px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-warning">Notice · {noticeDaysLeft}d</span>
          )}
        </div>
        <div className="tnum mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-text-muted">
          <span className="text-profit">+<Money value={e.salaryPerPay} /></span>
          <span className="text-text-faint">/ {payPeriodLabel(e.payPeriod)}</span>
          <span className="text-text-faint">·</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {formatWorkHours(e.workStartHour, e.workEndHour)}</span>
          <span className="text-text-faint">·</span>
          <span>next pay in {daysLeftToPay}d</span>
        </div>
      </div>
      {!isNotice && (
        <Button size="sm" variant="ghost" onClick={() => onLeave(e.id)} loading={busy} className="shrink-0">
          Resign
        </Button>
      )}
    </div>
  );
}

/** History row — left panel, smaller. */
function HistoryRow({ e }: { e: Employment }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 text-xs">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-highest text-text-faint">
        <Briefcase className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="font-semibold text-text">{e.position}</span>
        <span className="text-text-faint"> @ {e.companyName}</span>
      </div>
      <div className="tnum text-text-muted"><Money value={e.salaryPerPay} /> / {payPeriodLabel(e.payPeriod)}</div>
    </div>
  );
}

/** Career opportunity card — right panel (Stitch "Job Board" tile). */
function JobCard({
  job, myEmployment, busy, onApply,
}: {
  job: Job; myEmployment?: Employment; busy: boolean; onApply: () => void;
}) {
  const tierStyle =
    job.tier === "SENIOR" ? "bg-info/10 text-info" :
    job.tier === "MID" ? "bg-primary/10 text-primary" :
    "bg-surface-highest text-text-muted";
  const monthlyEquiv = periodToMonthly(job.salaryPerPay, job.payPeriod);

  return (
    <div className="glass-panel relative flex flex-col gap-2.5 p-3.5 transition-all hover:border-border-strong">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", tierStyle)}>
              {job.tier}
            </span>
            <h3 className="truncate text-sm font-bold text-text">{job.title}</h3>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-text-muted">
            <Building2 className="h-3 w-3 shrink-0 text-text-faint" />
            <span className="truncate">{job.company}</span>
          </div>
        </div>
        <GraduationCap className="h-5 w-5 shrink-0 text-primary opacity-60" />
      </div>

      <p className="line-clamp-2 text-[11px] leading-snug text-text-muted">{job.description}</p>

      <div className="grid grid-cols-2 gap-2 rounded-md bg-surface-low/60 p-2">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-text-faint">Pay</div>
          <div className="tnum text-sm font-bold text-profit">+<Money value={job.salaryPerPay} /></div>
          <div className="text-[9px] text-text-muted">per {payPeriodLabel(job.payPeriod)}</div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-text-faint">Schedule</div>
          <div className="tnum text-sm font-bold text-text">{formatWorkHours(job.workStartHour, job.workEndHour)}</div>
          <div className="text-[9px] text-text-muted">{payPeriodLabel(job.payPeriod) === "month" ? "monthly pay" : "weekly pay"}</div>
        </div>
      </div>

      <div className="tnum flex items-center justify-between text-[10px] text-text-faint">
        <span>≈ <Money value={monthlyEquiv} compact />/month equiv</span>
        {myEmployment && (
          <span className={cn(
            "rounded-full px-1.5 py-0.5 font-semibold uppercase",
            myEmployment.status === "NOTICE" ? "bg-warning-soft text-warning" : "bg-profit-soft text-profit",
          )}>
            {myEmployment.status === "NOTICE" ? "On Notice" : "Applied"}
          </span>
        )}
      </div>

      <Button
        size="sm"
        onClick={onApply}
        disabled={!!myEmployment}
        loading={busy}
        className="w-full"
      >
        {myEmployment
          ? myEmployment.status === "NOTICE" ? "In Notice" : "Already Employed"
          : "Apply Now"}
      </Button>
    </div>
  );
}
