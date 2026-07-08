/** Tiny fetch helper for client → API with JSON + error handling. */
export async function apiFetch<T>(
  url: string,
  opts?: { method?: string; body?: unknown; signal?: AbortSignal },
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: opts?.method ?? "POST",
      headers: opts?.body ? { "Content-Type": "application/json" } : undefined,
      body: opts?.body ? JSON.stringify(opts.body) : undefined,
      signal: opts?.signal,
    });
  } catch {
    return { ok: false, error: "Network error — check your connection", status: 0 };
  }
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const error =
      typeof payload === "object" && payload && "error" in payload
        ? String((payload as { error: unknown }).error)
        : `Request failed (${res.status})`;
    return { ok: false, error, status: res.status };
  }
  return { ok: true, data: payload as T };
}
