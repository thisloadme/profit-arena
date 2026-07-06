import { cn } from "@/lib/cn";
import { forwardRef, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & { error?: boolean };

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ className, error, ...rest }, ref) => (
    <input
      ref={ref}
      {...rest}
      className={cn(
        "h-9 w-full rounded-md border bg-card px-3 text-sm text-text placeholder:text-text-faint focus-ring",
        "border-border",
        error && "border-loss",
        className,
      )}
    />
  ),
);
Input.displayName = "Input";
