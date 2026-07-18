import { NextResponse } from "next/server";

/**
 * Standardized API response helpers.
 *
 * ponytail: every route used to roll its own { error: msg } shape — leading to
 * inconsistent client error handling. Centralizing gives one place to evolve
 * the contract (e.g. RFC 7807 Problem Details later) without grepping 30+ routes.
 */

export function apiError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function apiUnauthorized(): NextResponse {
  return apiError(401, "unauthorized");
}

export function apiBadRequest(message = "Invalid request"): NextResponse {
  return apiError(400, message);
}

export function apiTooManyRequests(message = "Too many requests, slow down."): NextResponse {
  return apiError(429, message);
}

export function apiOk<T extends Record<string, unknown>>(data: T): NextResponse {
  return NextResponse.json({ ok: true, ...data });
}
