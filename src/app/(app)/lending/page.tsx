"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { Money } from "@/components/ui/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function LendingPage() {
  const [tab, setTab] = useState<"offers" | "mine" | "bank">("offers");
  const [offers, setOffers] = useState<Loan[]>([]);
  const [given, setGiven] = useState<Loan[]>([]);
  const [taken, setTaken] = useState<Loan[]>([]);
  const [bankOffer, setBankOffer] = useState<{ eligible: boolean; maxLoan: number; rate: number; creditScore: number } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createAmt, setCreateAmt] = useState("100000");
  const [createRate, setCreateRate] = useState("0.02");
  const [createTenor, setCreateTenor] = useState("3");
  const [bankAmt, setBankAmt] = useState("");
  const [bankTenor, setBankTenor] = useState("6");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const [o, m] = await Promise.all([
      apiFetch<{ loans: Loan[] }>("/api/loans?list=offers"),
      apiFetch<{ given: Loan[]; taken: Loan[] }>("/api/loans?list=mine"),
    ]);
    if (o.ok) setOffers(o.data.loans);
    if (m.ok) { setGiven(m.data.given); setTaken(m.data.taken); }
  }

  async function loadBank() {
    const r = await apiFetch<{ eligible: boolean; maxLoan: number; rate: number; creditScore: number }>("/api/bank");
    if (r.ok) setBankOffer(r.data);
  }

  useEffect(() => { load(); loadBank(); }, []);

  async function createOffer() {
    setSubmitting(true);
    const r = await apiFetch("/api/loans", { body: { amount: Number(createAmt), interestRate: Number(createRate), tenorMonths: Number(createTenor) } });
    setSubmitting(false);
    if (r.ok) { toast.success("Loan offer created"); setShowCreate(false); load(); }
    else toast.error(r.error);
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
    if (r.ok) { toast.success("Bank loan disbursed!"); load(); loadBank(); }
    else toast.error(r.error);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary">Lending</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>Create Offer</Button>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 rounded border border-border p-0.5">
        {(["offers", "mine", "bank"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("rounded px-3 py-1.5 text-xs font-medium", tab === t ? "bg-primary text-white" : "text-text-muted hover:bg-soft")}>
            {t === "offers" ? "Marketplace" : t === "mine" ? "My Loans" : "Bank"}
          </button>
        ))}
      </div>

      {/* Marketplace tab */}
      {tab === "offers" && (
        <div className="flex flex-col gap-2">
          {offers.length === 0 ? (
            <p className="py-8 text-center text-xs text-text-faint">No loan offers available yet.</p>
          ) : offers.map((l) => (
            <div key={l.id} className="card-compact flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Money value={l.amount} compact className="text-sm font-semibold text-text" />
                  <span className="rounded bg-soft px-1.5 py-0.5 text-[10px] text-text-muted">
                    {(l.interestRate * 100).toFixed(1)}%/mo
                  </span>
                  <span className="text-[10px] text-text-faint">{l.tenorMonths} mo</span>
                </div>
                <p className="mt-0.5 text-xs text-text-muted">
                  By {l.lender?.username ?? "—"} · Installment ≈{" "}
                  <Money value={(l.amount * (1 + l.interestRate)) / l.tenorMonths} compact />
                  /mo
                </p>
              </div>
              <Button size="sm" onClick={() => acceptOffer(l.id)}>Take</Button>
            </div>
          ))}
        </div>
      )}

      {/* Mine tab */}
      {tab === "mine" && (
        <div className="flex flex-col gap-4">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Given</h3>
            {given.length === 0 ? <p className="text-xs text-text-faint">No loans given yet.</p> : given.map((l) => (
              <div key={l.id} className="card-compact mb-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-text"><Money value={l.amount} compact /></span>
                  <span className={cn("rounded px-1.5 py-0.5 text-[10px]", statusClass(l.status))}>{statusLabel(l.status)}</span>
                </div>
                <p className="mt-0.5 text-text-muted">To {l.borrower?.username ?? "—"} · {(l.interestRate * 100).toFixed(1)}% · {l.tenorMonths} mo</p>
              </div>
            ))}
          </section>
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Taken</h3>
            {taken.length === 0 ? <p className="text-xs text-text-faint">No loans taken yet.</p> : taken.map((l) => (
              <div key={l.id} className="card-compact mb-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-text"><Money value={l.remainingAmount} compact /></span>
                  <span className={cn("rounded px-1.5 py-0.5 text-[10px]", statusClass(l.status))}>{statusLabel(l.status)}</span>
                </div>
                <p className="mt-0.5 text-text-muted">
                  From {l.lender?.username ?? "—"} · {(l.interestRate * 100).toFixed(1)}% · Due {l.dueDate ? new Date(l.dueDate).toLocaleDateString("en-US") : "—"}
                </p>
              </div>
            ))}
          </section>
        </div>
      )}

      {/* Bank tab */}
      {tab === "bank" && (
        <div className="card-compact flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-text">NPC Bank Loan</h3>
          {bankOffer && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><span className="text-text-muted">Credit Score</span><div className="tnum font-medium text-text">{bankOffer.creditScore}</div></div>
              <div><span className="text-text-muted">Max Loan</span><div className="tnum font-medium text-text"><Money value={bankOffer.maxLoan} compact /></div></div>
              <div><span className="text-text-muted">Interest</span><div className="tnum font-medium text-text">{(bankOffer.rate * 100).toFixed(1)}%/mo</div></div>
            </div>
          )}
          {(!bankOffer?.eligible) ? (
            <p className="text-xs text-text-faint">Not eligible yet. Requires net worth &gt; 0 and credit score ≥ {GAME_CONFIG.BANK_MIN_CREDIT_SCORE}.</p>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Input placeholder="Amount" value={bankAmt} onChange={(e) => setBankAmt(e.target.value)} />
                <Input placeholder="Tenor (mo)" value={bankTenor} onChange={(e) => setBankTenor(e.target.value)} className="w-20" />
              </div>
              <Button onClick={takeBankLoan} loading={submitting}>Take Bank Loan</Button>
            </div>
          )}
        </div>
      )}

      {/* Create offer modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowCreate(false)}>
          <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-text">Create Loan Offer</h2>
            <Input placeholder="Amount" value={createAmt} onChange={(e) => setCreateAmt(e.target.value)} />
            <Input placeholder="Monthly interest (0.02 = 2%)" value={createRate} onChange={(e) => setCreateRate(e.target.value)} />
            <Input placeholder="Tenor (months)" value={createTenor} onChange={(e) => setCreateTenor(e.target.value)} />
            <div className="text-xs text-text-muted">
              Installment preview: <Money value={Number(createAmt) * (1 + Number(createRate)) / Number(createTenor)} compact />
              /mo × {createTenor} mo
            </div>
            <div className="flex gap-2">
              <Button onClick={createOffer} loading={submitting} className="flex-1">Create</Button>
              <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function statusClass(s: string): string {
  if (s === "ACTIVE") return "bg-info-soft text-info";
  if (s === "PAID") return "bg-profit-soft text-profit";
  if (s === "DEFAULTED") return "bg-loss-soft text-loss";
  return "bg-soft text-text-muted";
}

function statusLabel(s: string): string {
  if (s === "ACTIVE") return "Active";
  if (s === "PAID") return "Paid";
  if (s === "DEFAULTED") return "Defaulted";
  return s;
}
