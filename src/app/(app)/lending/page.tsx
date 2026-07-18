"use client";

import { useEffect, useState } from "react";
import { Banknote, HandCoins, Landmark, Wallet } from "lucide-react";
import { cn } from "@/lib/cn";
import { Money } from "@/components/ui/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { StatCard } from "@/components/ui/stat-card";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { GAME_CONFIG } from "@/config/game";

type Loan = {
  id: string;
  amount: number;
  interestRate: number;
  tenorMonths: number;
  remainingAmount: number;
  status: string;
  dueDate?: string;
  lender?: { username: string };
  borrower?: { username: string };
};

type BankOffer = { eligible: boolean; maxLoan: number; rate: number; creditScore: number };

const RISK_GRADES: { grade: string; maxRate: number; cls: string }[] = [
  { grade: "AAA", maxRate: 0.02, cls: "bg-primary-soft text-primary border-primary/30" },
  { grade: "AA", maxRate: 0.05, cls: "bg-primary-soft text-primary border-primary/30" },
  { grade: "A", maxRate: 0.10, cls: "bg-warning-soft text-warning border-warning/30" },
  { grade: "B", maxRate: Infinity, cls: "bg-loss-soft text-loss border-loss/30" },
];

function riskGrade(rate: number) {
  // heuristic risk grade from monthly rate; no DB field — upgrade when risk model exists
  return RISK_GRADES.find((g) => rate <= g.maxRate) ?? RISK_GRADES[RISK_GRADES.length - 1];
}

function initials(name: string) {
  return name.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() || "??";
}

export default function LendingPage() {
  const [offers, setOffers] = useState<Loan[]>([]);
  const [given, setGiven] = useState<Loan[]>([]);
  const [taken, setTaken] = useState<Loan[]>([]);
  const [bankOffer, setBankOffer] = useState<BankOffer | null>(null);
  const [cash, setCash] = useState(0);

  const [bankAmt, setBankAmt] = useState("");
  const [bankTenor, setBankTenor] = useState("6");
  const [submitting, setSubmitting] = useState(false);
  const [repaying, setRepaying] = useState<string | null>(null);

  // load() is also called from event handlers (accept/bank/form/repay) — keep it shared.
  useEffect(() => { load(); }, []);

  async function load() {
    const [o, m, b, d] = await Promise.all([
      apiFetch<{ loans: Loan[] }>("/api/loans?list=offers", { method: "GET" }),
      apiFetch<{ given: Loan[]; taken: Loan[] }>("/api/loans?list=mine", { method: "GET" }),
      apiFetch<BankOffer>("/api/bank", { method: "GET" }),
      apiFetch<{ cash: number }>("/api/dashboard", { method: "GET" }),
    ]);
    if (o.ok) setOffers(o.data.loans);
    if (m.ok) { setGiven(m.data.given); setTaken(m.data.taken); }
    if (b.ok) setBankOffer(b.data);
    if (d.ok) setCash(d.data.cash);
  }

  async function acceptOffer(id: string) {
    setSubmitting(true);
    const r = await apiFetch("/api/loans/" + id + "/accept", { method: "POST" });
    setSubmitting(false);
    if (r.ok) { toast.success("Loan taken!"); load(); }
    else toast.error(r.error);
  }

  async function takeBankLoan() {
    if (!bankAmt) return;
    setSubmitting(true);
    const r = await apiFetch("/api/bank", { method: "POST", body: { amount: Number(bankAmt), tenorMonths: Number(bankTenor) } });
    setSubmitting(false);
    if (r.ok) { toast.success("Bank loan disbursed!"); setBankAmt(""); load(); }
    else toast.error(r.error);
  }

  async function repayLoan(id: string, amount?: number) {
    setRepaying(id);
    const r = await apiFetch("/api/loans/" + id + "/repay", {
      method: "POST",
      body: amount && amount > 0 ? { amount } : {},
    });
    setRepaying(null);
    if (r.ok) { toast.success(amount && amount > 0 ? "Payment made!" : "Loan repaid!"); load(); }
    else toast.error(r.error);
  }

  const activeGiven = given.filter((l) => l.status === "ACTIVE");
  const activeTaken = taken.filter((l) => l.status === "ACTIVE");
  const totalLentOut = activeGiven.reduce((s, l) => s + l.remainingAmount, 0);
  const totalOwed = activeTaken.reduce((s, l) => s + l.remainingAmount, 0);
  const projectedYield = activeGiven.length
    ? (activeGiven.reduce((s, l) => s + l.amount * l.interestRate, 0) / totalLentOut) * 100
    : 0;
  const liquidityIdx = cash + totalLentOut > 0
    ? Math.min(100, Math.round((cash / (cash + totalOwed || 1)) * 100))
    : 0;
  const liquidityLabel = liquidityIdx >= 70 ? "HIGH" : liquidityIdx >= 40 ? "MID" : "LOW";

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10">
      <header className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">Credit Market</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-text">Lending Marketplace</h1>
        </div>
      </header>

      {/* Stats row */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard variant="glass" label="Lending Capacity" icon={<Wallet className="h-4 w-4" />} value={<Money value={cash} compact />} hint="Cash on hand" />
        <StatCard variant="glass" label="Active Principal" icon={<HandCoins className="h-4 w-4" />} value={<Money value={totalLentOut} compact />} hint={`${activeGiven.length} loans out`} />
        <StatCard variant="glass" label="Projected Yield" icon={<Landmark className="h-4 w-4" />} value={`${projectedYield.toFixed(2)}%`} hint="Weighted APY" />
        <StatCard variant="glass" label="Credit Score" icon={<Banknote className="h-4 w-4" />} value={bankOffer?.creditScore ?? "—"} hint={bankOffer?.eligible ? "Bank eligible" : `Needs ≥ ${GAME_CONFIG.BANK_MIN_CREDIT_SCORE}`} />
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Left: marketplace + bank */}
        <div className="col-span-12 flex flex-col gap-5 xl:col-span-8">
          {/* P2P Marketplace table */}
          <section className="glass-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-text">
                <HandCoins className="h-4 w-4 text-primary" /> P2P Marketplace
              </h2>
              <span className="text-[10px] uppercase tracking-widest text-text-faint">{offers.length} offers</span>
            </div>
            {offers.length === 0 ? (
              <p className="px-5 py-10 text-center text-xs text-text-faint">No loan offers available yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border text-[10px] uppercase tracking-widest text-text-faint">
                      <th className="px-5 py-3 font-semibold">Lender</th>
                      <th className="px-5 py-3 font-semibold">Amount</th>
                      <th className="px-5 py-3 text-center font-semibold">Rate</th>
                      <th className="px-5 py-3 font-semibold">Tenor</th>
                      <th className="px-5 py-3 font-semibold">Grade</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {offers.map((l) => {
                      const g = riskGrade(l.interestRate);
                      const installment = l.amount * (1 + l.interestRate) / l.tenorMonths;
                      const name = l.lender?.username ?? "—";
                      return (
                        <tr key={l.id} className="text-sm transition-colors hover:bg-soft">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-[10px] font-bold text-primary">{initials(name)}</div>
                              <span className="font-medium text-text">{name}</span>
                            </div>
                          </td>
                          <td className="tnum px-5 py-3 text-text"><Money value={l.amount} compact /></td>
                          <td className="tnum px-5 py-3 text-center text-primary">{(l.interestRate * 100).toFixed(1)}%</td>
                          <td className="px-5 py-3 text-text-muted">{l.tenorMonths} mo</td>
                          <td className="px-5 py-3">
                            <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-bold", g.cls)}>{g.grade}</span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Button size="sm" variant="secondary" onClick={() => acceptOffer(l.id)} disabled={submitting}>Take</Button>
                            <p className="mt-0.5 text-right text-[10px] text-text-faint">≈ <Money value={installment} compact />/mo</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* NPC Bank */}
          <section className="glass-panel overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <Landmark className="h-4 w-4 text-accent" />
              <h2 className="text-base font-bold text-text">Institutional NPC Vault</h2>
            </div>
            <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">
              {/* Bank terms card */}
              <div className="flex flex-col justify-between rounded-md border border-border bg-surface-lowest/60 p-4">
                <div>
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-text">Central Reserve Bank</h3>
                      <p className="text-[11px] text-text-muted">Tier-1 institutional liquidity</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    <Row k="Max Credit" v={<Money value={bankOffer?.maxLoan ?? 0} compact />} />
                    <Row k="Base Rate" v={`${bankOffer ? (bankOffer.rate * 100).toFixed(1) : "—"}% /mo`} accent />
                    <Row k="Min Score" v={`${GAME_CONFIG.BANK_MIN_CREDIT_SCORE}`} />
                  </div>
                </div>
                {!bankOffer?.eligible && (
                  <p className="mt-3 text-[11px] text-loss">Locked — raise net worth &amp; credit score first.</p>
                )}
              </div>

              {/* Bank form */}
              <div className="flex flex-col gap-2.5">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Field label="Amount">
                      <Input type="number" placeholder="0" value={bankAmt} onChange={(e) => setBankAmt(e.target.value)} disabled={!bankOffer?.eligible} />
                    </Field>
                  </div>
                  <Field label="Tenor (mo)">
                    <Input type="number" min={1} max={24} value={bankTenor} onChange={(e) => setBankTenor(e.target.value)} disabled={!bankOffer?.eligible} />
                  </Field>
                </div>
                {bankAmt && Number(bankTenor) > 0 && bankOffer && (
                  <p className="text-[11px] text-text-muted">
                    Receive <Money value={Number(bankAmt)} compact /> now · repay ≈{" "}
                    <Money value={Number(bankAmt) * (1 + bankOffer.rate) / Number(bankTenor)} compact />/mo × {bankTenor} mo
                  </p>
                )}
                <Button onClick={takeBankLoan} loading={submitting} disabled={!bankOffer?.eligible || !bankAmt} className="w-full">
                  Take Bank Loan
                </Button>
              </div>
            </div>
          </section>
        </div>

        {/* Right: create offer form + my activity */}
        <div className="col-span-12 flex flex-col gap-5 xl:col-span-4">
          <CreateOfferForm submitting={submitting} onDone={load} />

          {/* My Activity */}
          <section className="glass-panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-bold text-text">
                <HandCoins className="h-4 w-4 text-accent" /> My Activity
              </h3>
              <span className="text-[10px] uppercase tracking-widest text-text-faint">{given.length + taken.length} total</span>
            </div>
            {given.length === 0 && taken.length === 0 ? (
              <p className="py-6 text-center text-xs text-text-faint">No loan activity yet.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {[...given.map((l) => ({ l, kind: "given" as const })), ...taken.map((l) => ({ l, kind: "taken" as const }))]
                  .sort((a) => (a.l.status === "ACTIVE" ? -1 : 1))
                  .map(({ l, kind }) => (
                    <ActivityRow
                      key={`${kind}-${l.id}`}
                      loan={l}
                      kind={kind}
                      onRepay={kind === "taken" && l.status === "ACTIVE" ? (amt?: number) => repayLoan(l.id, amt) : undefined}
                      repaying={repaying === l.id}
                    />
                  ))}
              </div>
            )}
          </section>

          {/* Liquidity index — from real data, no decorative dummy */}
          <div className="glass-panel flex h-28 items-center justify-center">
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-faint">Market Liquidity Index</p>
              <p className="tnum mt-1 text-xl font-bold text-text">{liquidityLabel}</p>
              <p className="text-[10px] text-text-muted">{liquidityIdx}% cash vs debt</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, accent }: { k: string; v: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-faint">{k}</span>
      <span className={cn("tnum font-medium", accent ? "text-accent" : "text-text")}>{v}</span>
    </div>
  );
}

function ActivityRow({ loan, kind, onRepay, repaying }: { loan: Loan; kind: "given" | "taken"; onRepay?: (amt?: number) => void; repaying?: boolean }) {
  const counterpart = kind === "given" ? loan.borrower?.username : loan.lender?.username;
  const label = kind === "given" ? "Lending" : "Debt";
  const isGiven = kind === "given";
  const [repayAmt, setRepayAmt] = useState("");

  // Schedule
  // simple straight-line amortization; no interest-on-interest.
  const installment = loan.tenorMonths > 0 ? (loan.amount * (1 + loan.interestRate)) / loan.tenorMonths : 0;
  const paidPrincipal = loan.amount - loan.remainingAmount;
  const paymentsMade = installment > 0 ? Math.floor(paidPrincipal / installment) : 0;
  const progressPct = loan.amount > 0 ? Math.min(100, Math.round((paidPrincipal / loan.amount) * 100)) : 0;

  return (
    <div className={cn("rounded-r border-l-4 bg-soft px-3 py-2.5", isGiven ? "border-primary" : "border-loss")}>
      <div className="mb-1 flex items-center justify-between">
        <span className={cn("text-[10px] font-bold uppercase", isGiven ? "text-primary" : "text-loss")}>{label}</span>
        <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", statusClass(loan.status))}>{statusLabel(loan.status)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text">{counterpart ?? "—"}</span>
        <span className="tnum text-sm font-medium text-text"><Money value={loan.remainingAmount} compact /></span>
      </div>
      <div className="mt-0.5 flex items-center justify-between">
        <span className="text-[10px] text-text-faint">
          {(loan.interestRate * 100).toFixed(1)}% · {loan.tenorMonths} mo{loan.dueDate ? ` · due ${new Date(loan.dueDate).toLocaleDateString("en-US")}` : ""}
        </span>
      </div>

      {/* Schedule progress for active loans */}
      {loan.status === "ACTIVE" && installment > 0 && (
        <div className="mt-1.5">
          <div className="flex items-center justify-between text-[9px] text-text-faint">
            <span>≈ <Money value={installment} compact />/mo</span>
            <span>{paymentsMade}/{loan.tenorMonths} payments</span>
          </div>
          <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {/* Inline partial repayment */}
      {onRepay && (
        <div className="mt-2 flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            max={loan.remainingAmount}
            placeholder="Amount"
            value={repayAmt}
            onChange={(e) => setRepayAmt(e.target.value)}
            disabled={repaying}
            className="tnum h-6 w-24 rounded border border-border bg-surface-lowest px-1.5 text-[11px] text-text outline-none placeholder:text-text-faint focus:border-primary/50"
          />
          <button
            onClick={() => {
              const amt = Number(repayAmt);
              onRepay(amt > 0 && amt <= loan.remainingAmount ? amt : undefined);
              if (amt > 0 && amt <= loan.remainingAmount) setRepayAmt("");
            }}
            disabled={repaying}
            className="rounded bg-profit-soft px-2 py-0.5 text-[10px] font-semibold text-profit transition-colors hover:bg-profit-soft/70 disabled:opacity-50"
          >
            {repaying ? "..." : repayAmt && Number(repayAmt) >= loan.remainingAmount ? "Pay off" : "Repay"}
          </button>
        </div>
      )}
    </div>
  );
}

function CreateOfferForm({ submitting, onDone }: { submitting: boolean; onDone: () => void }) {
  const [amount, setAmount] = useState("100000");
  const [rate, setRate] = useState("0.02");
  const [tenor, setTenor] = useState("3");

  const amt = Number(amount) || 0;
  const r = Number(rate) || 0;
  const t = Number(tenor) || 0;
  const totalReturn = amt * (1 + r);
  const installment = t > 0 ? totalReturn / t : 0;
  const profit = totalReturn - amt;
  const g = riskGrade(r);
  const canSubmit = amt > 0 && r > 0 && r <= 0.5 && t > 0 && t <= 24;

  async function submit() {
    if (!canSubmit) return;
    const res = await apiFetch("/api/loans", { body: { amount: amt, interestRate: r, tenorMonths: t } });
    if (res.ok) { toast.success("Loan offer created"); onDone(); }
    else toast.error(res.error);
  }

  return (
    <section className="glass-panel p-5">
      <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-text">
        <span className="text-primary">+</span> Create Offer
      </h3>
      <div className="flex flex-col gap-3">
        <Field label="Principal Amount" hint="Cash you lock into the offer">
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Interest Rate" hint="0.02 = 2%/mo">
            <Input type="number" step="0.001" value={rate} onChange={(e) => setRate(e.target.value)} />
          </Field>
          <Field label="Tenor (mo)" hint="1–24 months">
            <Input type="number" min={1} max={24} value={tenor} onChange={(e) => setTenor(e.target.value)} />
          </Field>
        </div>

        {/* Live preview */}
        <div className="rounded-md border border-border bg-surface-lowest/60 p-3 text-xs">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-widest text-text-faint">
            <span>Preview</span>
            <span className={cn("rounded border px-1.5 py-0.5 font-bold", g.cls)}>{g.grade}</span>
          </div>
          <div className="grid grid-cols-2 gap-y-1.5">
            <span className="text-text-muted">Principal</span>
            <span className="tnum text-right text-text"><Money value={amt} compact /></span>
            <span className="text-text-muted">Total Return</span>
            <span className="tnum text-right text-text"><Money value={totalReturn} compact /></span>
            <span className="text-text-muted">Profit</span>
            <span className="tnum text-right text-profit"><Money value={profit} compact /></span>
            <span className="text-text-muted">Installment</span>
            <span className="tnum text-right text-text"><Money value={installment} compact />/mo</span>
          </div>
        </div>

        <Button onClick={submit} loading={submitting} disabled={!canSubmit} className="w-full">
          {!canSubmit && r > 0.5 ? "Rate capped at 50%" : "Post Lending Offer"}
        </Button>
      </div>
    </section>
  );
}

function statusClass(s: string): string {
  if (s === "ACTIVE") return "bg-info-soft text-info";
  if (s === "PAID") return "bg-profit-soft text-profit";
  if (s === "DEFAULTED") return "bg-loss-soft text-loss";
  if (s === "PENDING") return "bg-warning-soft text-warning";
  return "bg-surface-highest text-text-muted";
}

function statusLabel(s: string): string {
  if (s === "ACTIVE") return "Active";
  if (s === "PAID") return "Paid";
  if (s === "DEFAULTED") return "Defaulted";
  if (s === "PENDING") return "Pending";
  return s;
}
