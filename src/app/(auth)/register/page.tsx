"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormCard } from "@/components/ui/field";
import { GoogleButton } from "@/components/auth/google-button";
import { AuthDivider } from "@/components/auth/auth-divider";
import { apiFetch } from "@/lib/api-client";
import { registerSchema, type RegisterInput } from "@/lib/validations";

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_state: "Sign-in session expired. Please try again.",
  google_missing_code: "Google didn't return an authorization code.",
  google_exchange: "Couldn't complete Google sign-in. Please try again.",
  google_unverified: "Your Google account email isn't verified.",
  google_rate_limited: "Too many attempts. Try again later.",
  google_create: "Couldn't create your account. Please try again.",
};

export default function RegisterPage() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/onboarding";
  const googleError = GOOGLE_ERROR_MESSAGES[params.get("error") ?? ""];
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    const res = await apiFetch<{ ok: true }>("/api/auth/register", { body: values });
    if (!res.ok) {
      setServerError(res.error);
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-bg p-4">
      <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-primary/10 blur-[140px]" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-accent/10 blur-[140px]" />
      <FormCard
        title="Create Account"
        subtitle="Start from zero, build your wealth"
        footer={
          <>
            Already have an account?{" "}
            <a href="/login" className="font-medium text-accent hover:underline">
              Sign in
            </a>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <GoogleButton callbackUrl={callbackUrl} />
          <AuthDivider />
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3" noValidate>
            {(serverError || googleError) && (
              <div
                role="alert"
                className="rounded-md border border-loss/40 bg-loss-soft px-3 py-2 text-xs text-loss"
              >
                {googleError ?? serverError}
              </div>
            )}
            <Field label="Username" htmlFor="username" error={errors.username?.message}>
              <Input
                id="username"
                autoComplete="username"
                placeholder="player_one"
                error={!!errors.username}
                {...register("username")}
              />
            </Field>
            <Field label="Email" htmlFor="email" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                error={!!errors.email}
                {...register("email")}
              />
            </Field>
            <Field
              label="Password"
              htmlFor="password"
              error={errors.password?.message}
              hint="Minimum 8 characters."
            >
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                error={!!errors.password}
                {...register("password")}
              />
            </Field>
            <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
              Create Account
            </Button>
          </form>
        </div>
      </FormCard>
    </main>
  );
}