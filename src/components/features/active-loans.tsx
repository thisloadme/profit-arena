"use client";

import { Money } from "@/components/ui/money";
import { cn } from "@/lib/cn";

type Loan = {
  id: string;
  amount: number;
  interestRate: number;
  remainingAmount: number;
  dueDate: string | Date | null;
};

type Props = {
  loans: Loan[];
  className?: string;
};

export function ActiveLoans({ loans, className }: Props) {
  return (
    <div className={cn("card-compact", className)}>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        Active Loans
      </h3>
      {loans.length === 0 ? (
        <p className="py-4 text-center text-xs text-text-faint">No active loans.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {loans.map((l) => {
            const overdue = l.dueDate ? new Date(l.dueDate) < new Date() : false;
            return (
              <div
                key={l.id}
                className={cn(
                  "rounded border px-2.5 py-2 text-xs",
                  overdue ? "border-loss/40 bg-loss-soft" : "border-border bg-bg-base",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-text">
                    <Money value={l.remainingAmount} compact />
                    <span className="ml-1 text-text-faint font-normal">/ {l.amount.toLocaleString("en-US")}</span>
                  </span>
                  <span className="text-text-muted">{(l.interestRate * 100).toFixed(1)}%/mo</span>
                </div>
                <div className="mt-1 text-text-faint">
                  {l.dueDate ? (
                    <>Due: {new Date(l.dueDate).toLocaleDateString("en-US")}{overdue && <span className="ml-1 font-medium text-loss">(overdue)</span>}</>
                  ) : (
                    "Pending"
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
