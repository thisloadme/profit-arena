import { LandingPage } from "./landing-client";
import { getSession } from "@/lib/session";

/**
 * Server entry — resolves session once on the server so the landing nav can
 * hide arena links (Market/Portfolio/Business) when the visitor isn't logged
 * in. Keeps the entire visual layer in LandingPage (client) for animations.
 */
export default async function Page() {
  const session = await getSession();
  return <LandingPage signedIn={Boolean(session?.sub)} />;
}