"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormCard } from "@/components/ui/field";
import { apiFetch } from "@/lib/api-client";
import { registerSchema, type RegisterInput } from "@/lib/validations";

export default function RegisterPage() {
  const router = useRouter();
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
    // register endpoint sets session cookie already (auto-login).
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-bg p-4">
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
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3" noValidate>
          {serverError && (
            <div
              role="alert"
              className="rounded-md border border-loss/40 bg-loss-soft px-3 py-2 text-xs text-loss"
            >
              {serverError}
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
      </FormCard>
    </main>
  );
}
