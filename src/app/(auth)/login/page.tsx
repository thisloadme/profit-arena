"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormCard } from "@/components/ui/field";
import { apiFetch } from "@/lib/api-client";
import { loginSchema, type LoginInput } from "@/lib/validations";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/dashboard";
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    const res = await apiFetch<{ ok: true }>("/api/auth/login", { body: values });
    if (!res.ok) {
      setServerError(res.error);
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-bg p-4">
      <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-primary/10 blur-[140px]" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-accent/10 blur-[140px]" />
      <FormCard
        title="Sign In"
        subtitle="Continue your financial journey"
        footer={
          <>
            Don&apos;t have an account?{" "}
            <a href="/register" className="font-medium text-accent hover:underline">
              Create one
            </a>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3" noValidate>
          {serverError && (
            <div
              role="alert"
              className="rounded-md border border-loss/40 bg-loss-soft px-3 py-2 text-xs text-loss"
            >
              {serverError}
            </div>
          )}
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
          <Field label="Password" htmlFor="password" error={errors.password?.message}>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              error={!!errors.password}
              {...register("password")}
            />
          </Field>
          <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
            Sign In
          </Button>
        </form>
      </FormCard>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="flex min-h-svh items-center justify-center bg-bg p-4"><div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-primary/10 blur-[140px]" /></main>}>
      <LoginForm />
    </Suspense>
  );
}
