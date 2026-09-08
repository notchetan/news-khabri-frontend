import { apiFetch } from "./client";

// Registers (or updates) this device's push token with the backend -
// called every time the interval or language preference changes, not just
// once, so the backend's own cron (see the backend's
// docs/push-notifications.md) picks up the change on its very next tick.
// The endpoint is anonymous, but passing the session token (when signed
// in) links the subscription to the account so it can be cleaned up on
// account deletion; re-registering without one nulls that link.
export async function registerPushSubscription(
  pushToken: string,
  intervalMinutes: number,
  language: string,
  sessionToken?: string | null
): Promise<void> {
  await apiFetch("/push-subscriptions", {
    method: "POST",
    token: sessionToken,
    body: { pushToken, intervalMinutes, language },
    parseJson: false,
    errorMessage: "Failed to register push subscription",
  });
}

