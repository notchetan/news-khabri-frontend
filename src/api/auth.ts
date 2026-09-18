import { apiFetch } from "./client";

export type AuthUser = {
  id: number;
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

// The full preference bundle synced with the server - one canonical shape
// `putPreferences`'s param, `readLocalPreferencesBundle` in auth-context.tsx,
// and `ServerPreferences` below all derive from, rather than each
// hand-typing their own copy of the same six fields.
export type PreferenceBundle = {
  theme: string;
  fontSize: string;
  language: string;
  debugEnabled: boolean;
  sources: Record<string, string[]>;
  notificationInterval: number;
};

// What `/me` and `/auth/google` actually return: theme/fontSize/language
// can be null for an account the server has no value for yet.
export type ServerPreferences =
  | (Omit<PreferenceBundle, "theme" | "fontSize" | "language"> & {
      theme: string | null;
      fontSize: string | null;
      language: string | null;
    })
  | null;

export type AuthResponse = {
  token: string;
  user: AuthUser;
  preferences: ServerPreferences;
};

// Exchanges a Google ID token (from @react-native-google-signin/google-signin)
// for this app's own session token - see the backend's
// docs/google-sign-in.md for why there's a second token at all.
export async function signInWithGoogle(idToken: string): Promise<AuthResponse> {
  return apiFetch("/auth/google", {
    method: "POST",
    body: { idToken },
    errorMessage: "Failed to sign in with Google",
  });
}

// Sign in with Apple. `fullName` is only non-null on a device's very first
// authorization for this app - Apple never sends it again - so the backend
// only uses it to fill an empty name. `authorizationCode` lets the backend
// revoke the Apple tokens on account deletion (Apple requires it). See the
// backend's docs/apple-sign-in.md.
export async function signInWithApple(
  identityToken: string,
  fullName?: { givenName?: string | null; familyName?: string | null } | null,
  authorizationCode?: string | null
): Promise<AuthResponse> {
  return apiFetch("/auth/apple", {
    method: "POST",
    body: { identityToken, fullName: fullName ?? null, authorizationCode: authorizationCode ?? null },
    errorMessage: "Failed to sign in with Apple",
  });
}

export async function fetchMe(
  token: string
): Promise<{ user: AuthUser; preferences: ServerPreferences }> {
  return apiFetch("/me", { token, errorMessage: "Failed to fetch account" });
}

// A partial patch: send only the fields this device actually changed. The
// backend updates just those columns and leaves the rest alone, so two
// signed-in devices editing different preferences don't clobber each
// other. Sending the full bundle still works (first sync of a new
// account).
export async function putPreferences(
  token: string,
  preferences: Partial<PreferenceBundle>
): Promise<void> {
  await apiFetch("/me/preferences", {
    method: "PUT",
    token,
    body: preferences,
    parseJson: false,
    errorMessage: "Failed to save preferences",
  });
}

// Permanently deletes the account and everything the server has synced to
// it (preferences, bookmarks, reading history). The backend clears every
// referencing table in one transaction - see its docs/google-sign-in.md.
export async function deleteAccount(token: string): Promise<void> {
  await apiFetch("/me", {
    method: "DELETE",
    token,
    parseJson: false,
    errorMessage: "Failed to delete account",
  });
}
