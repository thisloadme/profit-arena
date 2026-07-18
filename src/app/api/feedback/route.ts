import { getSession } from "@/lib/session";
import { feedbackSchema } from "@/lib/validations";
import { checkUserRateLimit } from "@/lib/user-rate-limiter";
import { isCrossOriginPost } from "@/lib/csrf-guard";
import {
  apiBadRequest,
  apiError,
  apiOk,
  apiTooManyRequests,
  apiUnauthorized,
} from "@/lib/api-response";

/**
 * POST /api/feedback — submit user feedback.
 * ponytail: logs to stdout. Store in DB when volume justifies it.
 */
export async function POST(req: Request) {
  const csrf = isCrossOriginPost(req);
  if (csrf) return csrf;

  const s = await getSession();
  if (!s?.sub) return apiUnauthorized();
  if (!checkUserRateLimit(s.sub, 3)) return apiTooManyRequests();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiBadRequest("Invalid body");
  }
  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, parsed.error.issues[0]?.message ?? "Invalid input");
  }

  console.log("[feedback]", { userId: s.sub, rating: parsed.data.rating });
  return apiOk({});
}
