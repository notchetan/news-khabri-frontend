import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  deleteAccount as deleteAccountRequest,
  fetchMe,
  putPreferences,
  signInWithApple,
  signInWithGoogle,
  type AuthResponse,
  type AuthUser,
  type PreferenceBundle,
  type ServerPreferences,
} from "@/api/auth";
import { isAuthRejection } from "@/api/client";
import { registerPushSubscription } from "@/api/notifications";
import { captureException } from "@/observability/sentry";
import { DEBUG_STORAGE_KEY } from "@/contexts/debug-preference";
import {
  DEFAULT_FONT_SIZE_PREFERENCE,
  FONT_SIZE_STORAGE_KEY,
} from "@/contexts/font-size-preference";
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY } from "@/contexts/language-preference";
import {
  DEFAULT_NOTIFICATION_INTERVAL,
  NOTIFICATION_STORAGE_KEY,
  PUSH_TOKEN_STORAGE_KEY,
} from "@/contexts/notification-preference";
import {
  DEFAULT_SOURCES_SELECTIONS,
  SOURCES_STORAGE_KEY,
} from "@/contexts/sources-preference";
import { DEFAULT_THEME_PREFERENCE, THEME_STORAGE_KEY } from "@/contexts/theme-preference";
import { getStoredToken, storeToken } from "@/contexts/session-token";
import { notifyPreferenceChanged, onPreferenceChanged } from "@/utils/preference-sync";

// The preference bundle this device last confirmed in sync with the
// server, persisted (not just held in a ref) so a relaunch can tell an
// unsynced local edit apart from a stale local value - see "Surviving an
// offline edit across a relaunch" in docs/google-sign-in.md.
export const PREFERENCES_BASELINE_KEY = "preferencesSyncBaseline";

type AuthContextValue = {
  user: AuthUser | null;
  // The session token itself - exposed so callers can authenticate their
  // own requests directly (e.g. api/reads.ts's recordRead, fetchStoryFeed's
  // optional personalization signal) rather than every such call needing
  // its own copy of getStoredToken()'s SecureStore lookup.
  token: string | null;
  isLoading: boolean;
  signInError: string | null;
  // Google sign-in (Android + iOS). Apple sign-in (iOS only) is a
  // separate entry point - the UI shows both on iOS.
  signIn: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  // Screens call this on unmount so a failure from one visit doesn't greet
  // the reader on their next one.
  clearSignInError: () => void;
  signOut: () => Promise<void>;
  // Permanently deletes the server-side account, then tears down the local
  // session exactly like signOut. Rejects (without clearing the session)
  // if the server call fails, so the caller can surface an error and let
  // the reader retry.
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// @react-native-google-signin/google-signin is not imported at this
// file's module scope - see "Why two new native modules are required
// lazily, not imported" in docs/google-sign-in.md. getStoredToken /
// storeToken (expo-secure-store, same convention) live in
// contexts/session-token.ts.

// A server preference row with its nullable theme/fontSize/language filled
// in from the same defaults the individual contexts use - so the rest of
// this file can work with one fully-populated shape.
function serverPreferencesToBundle(preferences: ServerPreferences): PreferenceBundle {
  return {
    theme: preferences?.theme ?? DEFAULT_THEME_PREFERENCE,
    fontSize: preferences?.fontSize ?? DEFAULT_FONT_SIZE_PREFERENCE,
    language: preferences?.language ?? DEFAULT_LANGUAGE,
    debugEnabled: preferences?.debugEnabled ?? false,
    sources: preferences?.sources ?? DEFAULT_SOURCES_SELECTIONS,
    notificationInterval:
      preferences?.notificationInterval ?? DEFAULT_NOTIFICATION_INTERVAL,
  };
}

// Writes a preference bundle into the exact same AsyncStorage keys each
// individual preference context already owns, then tells them to reload -
// see utils/preference-sync.ts for why a plain write alone wouldn't reach
// an already-mounted context.
async function writePreferencesToStorage(bundle: PreferenceBundle): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(THEME_STORAGE_KEY, bundle.theme),
    AsyncStorage.setItem(FONT_SIZE_STORAGE_KEY, bundle.fontSize),
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, bundle.language),
    AsyncStorage.setItem(DEBUG_STORAGE_KEY, String(bundle.debugEnabled)),
    AsyncStorage.setItem(SOURCES_STORAGE_KEY, JSON.stringify(bundle.sources)),
    AsyncStorage.setItem(
      NOTIFICATION_STORAGE_KEY,
      String(bundle.notificationInterval)
    ),
  ]);
  notifyPreferenceChanged();
}

async function applyServerPreferences(preferences: ServerPreferences): Promise<void> {
  if (!preferences) return;
  await writePreferencesToStorage(serverPreferencesToBundle(preferences));
}

async function readSyncBaseline(): Promise<PreferenceBundle | null> {
  const raw = await AsyncStorage.getItem(PREFERENCES_BASELINE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // Only trust a full bundle; a partial/old shape is treated as "no
    // baseline yet" so the server value wins, same as a first sync.
    return parsed && typeof parsed === "object" && "theme" in parsed
      ? (parsed as PreferenceBundle)
      : null;
  } catch {
    return null;
  }
}

async function writeSyncBaseline(bundle: PreferenceBundle | null): Promise<void> {
  if (bundle) {
    await AsyncStorage.setItem(PREFERENCES_BASELINE_KEY, JSON.stringify(bundle));
  } else {
    await AsyncStorage.removeItem(PREFERENCES_BASELINE_KEY);
  }
}

// On a relaunch we already have a synced baseline. A field whose current
// local value no longer matches that baseline is an edit this device made
// but never managed to PUT (offline, then killed before the retry) - keep
// it and re-push it, rather than letting the server's value silently
// overwrite it. Every other field takes the server's value.
function reconcileOnRestore(
  server: PreferenceBundle,
  local: PreferenceBundle,
  baseline: PreferenceBundle
): { merged: PreferenceBundle; unsynced: Partial<PreferenceBundle> } {
  const merged: PreferenceBundle = { ...server };
  const unsynced: Partial<PreferenceBundle> = {};
  (Object.keys(server) as (keyof PreferenceBundle)[]).forEach((key) => {
    const localVal = key === "sources" ? JSON.stringify(local[key]) : local[key];
    const baseVal = key === "sources" ? JSON.stringify(baseline[key]) : baseline[key];
    if (localVal !== baseVal) {
      (merged as Record<string, unknown>)[key] = local[key];
      (unsynced as Record<string, unknown>)[key] = local[key];
    }
  });
  return { merged, unsynced };
}

async function readLocalPreferencesBundle(): Promise<PreferenceBundle> {
  const [theme, fontSize, language, debug, sourcesRaw, notificationInterval] =
    await Promise.all([
      AsyncStorage.getItem(THEME_STORAGE_KEY),
      AsyncStorage.getItem(FONT_SIZE_STORAGE_KEY),
      AsyncStorage.getItem(LANGUAGE_STORAGE_KEY),
      AsyncStorage.getItem(DEBUG_STORAGE_KEY),
      AsyncStorage.getItem(SOURCES_STORAGE_KEY),
      AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY),
    ]);
  return {
    theme: theme ?? DEFAULT_THEME_PREFERENCE,
    fontSize: fontSize ?? DEFAULT_FONT_SIZE_PREFERENCE,
    language: language ?? DEFAULT_LANGUAGE,
    debugEnabled: debug === "true",
    sources: parseStoredSources(sourcesRaw),
    notificationInterval: Number(notificationInterval) || DEFAULT_NOTIFICATION_INTERVAL,
  };
}

// Matches sources-preference.tsx's own codec: a corrupt stored value falls
// back to the "no filter" default rather than throwing. An unguarded parse
// here rejected readLocalPreferencesBundle, which on the launch path landed
// in the session-restore catch (destroying the stored token) and in the
// change listener became an unhandled rejection.
function parseStoredSources(raw: string | null): PreferenceBundle["sources"] {
  if (!raw) return DEFAULT_SOURCES_SELECTIONS;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : DEFAULT_SOURCES_SELECTIONS;
  } catch {
    return DEFAULT_SOURCES_SELECTIONS;
  }
}

// Fields whose value differs between the last-synced bundle and the
// current one - the only fields worth PUTting. `sources` is an object, so
// compare it serialized.
function diffPreferenceBundle(
  prev: PreferenceBundle,
  next: PreferenceBundle
): Partial<PreferenceBundle> {
  const changed: Partial<PreferenceBundle> = {};
  (Object.keys(next) as (keyof PreferenceBundle)[]).forEach((key) => {
    const a = key === "sources" ? JSON.stringify(prev[key]) : prev[key];
    const b = key === "sources" ? JSON.stringify(next[key]) : next[key];
    if (a !== b) (changed as Record<string, unknown>)[key] = next[key];
  });
  return changed;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [signInError, setSignInError] = useState<string | null>(null);
  // Stable identity on purpose: screens use this as an unmount cleanup
  // (`useEffect(() => clearSignInError, [clearSignInError])`), so a fresh
  // closure every render would re-run that cleanup on every re-render and
  // wipe the error the moment it was set.
  const clearSignInError = useCallback(() => setSignInError(null), []);
  // The preference bundle this device last got in sync with the server -
  // the baseline the next local change is diffed against, so only the
  // changed field(s) get PUT.
  const lastSyncedBundleRef = useRef<PreferenceBundle | null>(null);

  // Restores a previous session on launch, validated against the server
  // (not just "a token exists locally") so a revoked/expired session
  // doesn't silently pretend to still be signed in.
  useEffect(() => {
    (async () => {
      const stored = await getStoredToken();
      if (!stored) {
        setIsLoading(false);
        return;
      }
      try {
        const { user: me, preferences } = await fetchMe(stored);
        setToken(stored);
        setUser(me);

        const baseline = await readSyncBaseline();
        if (!baseline) {
          // First sync on this device (or a build from before the baseline
          // existed) - the server is the source of truth, as it always was.
          await applyServerPreferences(preferences);
          const bundle = await readLocalPreferencesBundle();
          lastSyncedBundleRef.current = bundle;
          await writeSyncBaseline(bundle);
        } else {
          const server = serverPreferencesToBundle(preferences);
          const local = await readLocalPreferencesBundle();
          const { merged, unsynced } = reconcileOnRestore(server, local, baseline);
          // The baseline is what the server currently has; the diff between
          // it and `merged` is exactly the field(s) still to push.
          lastSyncedBundleRef.current = server;
          await writeSyncBaseline(server);
          await writePreferencesToStorage(merged);
          if (Object.keys(unsynced).length > 0) {
            putPreferences(stored, unsynced)
              .then(() => {
                lastSyncedBundleRef.current = merged;
                return writeSyncBaseline(merged);
              })
              .catch(() => {
                // Still offline - the edit stays in local storage and the
                // baseline still reflects the server, so the next change or
                // launch retries it.
              });
          }
        }
      } catch (err) {
        // Only a genuine auth rejection means this session is gone. Any other
        // failure - offline, DNS, a 500, apiFetch's own 15s timeout - says
        // nothing about the token's validity, and clearing it there meant a
        // single launch without signal permanently signed the reader out.
        // The session stays; the next authed request retries it.
        if (isAuthRejection(err)) {
          await storeToken(null);
          await writeSyncBaseline(null);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // On any local preference change, PUT just the field(s) that actually
  // differ from the last-synced baseline - so a second signed-in device
  // changing a *different* preference isn't overwritten. Until this device
  // has a baseline, the first change pushes the whole bundle.
  useEffect(() => {
    if (!token) {
      lastSyncedBundleRef.current = null;
      return undefined;
    }
    return onPreferenceChanged(() => {
      readLocalPreferencesBundle()
        .then((bundle) => {
          const prev = lastSyncedBundleRef.current;
          const payload = prev ? diffPreferenceBundle(prev, bundle) : bundle;
          if (Object.keys(payload).length === 0) return;
          return putPreferences(token, payload).then(() => {
            lastSyncedBundleRef.current = bundle;
            return writeSyncBaseline(bundle);
          });
        })
        .catch(() => {
          // A transient network (or storage) failure just means this one
          // change doesn't sync immediately - the baseline still reflects
          // the last confirmed sync, so the next change (or the next
          // launch's reconcile) re-pushes this field instead of losing it.
          // Catching on the outer chain rather than only the PUT keeps a
          // failed local read from surfacing as an unhandled rejection.
        });
    });
  }, [token]);

  // Shared tail of every sign-in: store the session token and reconcile
  // this device's preferences against the account's (existing account) or
  // seed the account with them (new account).
  const establishSession = async (response: AuthResponse) => {
    const { token: sessionToken, user: signedInUser, preferences } = response;
    await storeToken(sessionToken);
    setToken(sessionToken);
    setUser(signedInUser);

    if (preferences) {
      // An existing account's saved preferences become this device's
      // source of truth.
      await applyServerPreferences(preferences);
      const bundle = await readLocalPreferencesBundle();
      lastSyncedBundleRef.current = bundle;
      await writeSyncBaseline(bundle);
    } else {
      // A brand new account - seed it with whatever this device currently
      // has, rather than leaving it empty.
      //
      // The baseline is only written once the server has actually confirmed
      // the seed. Writing it unconditionally claimed the server held values
      // it had never received, and since every later sync is a baseline
      // diff, those fields were then never re-pushed - a first sign-in on a
      // flaky connection silently lost the whole bundle. Leaving the
      // baseline unset makes the next change (or the next launch) push
      // everything again.
      const bundle = await readLocalPreferencesBundle();
      try {
        await putPreferences(sessionToken, bundle);
        lastSyncedBundleRef.current = bundle;
        await writeSyncBaseline(bundle);
      } catch {
        lastSyncedBundleRef.current = null;
        await writeSyncBaseline(null);
      }
    }
  };

  const signIn = async () => {
    setSignInError(null);
    try {
      const {
        GoogleSignin,
      }: typeof import("@react-native-google-signin/google-signin") = require("@react-native-google-signin/google-signin");

      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        // iOS needs its own OAuth client - see docs/google-sign-in.md.
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
      });
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();
      if (result.type !== "success" || !result.data.idToken) {
        return; // Cancelled, or no ID token - nothing to sign in with.
      }
      await establishSession(await signInWithGoogle(result.data.idToken));
    } catch (err) {
      // The raw message is a native SDK string (e.g. DEVELOPER_ERROR) - it
      // goes to Sentry, never to the reader. The UI renders a translated
      // generic instead; see profile.tsx / onboarding/sign-in.tsx.
      captureException(err);
      setSignInError("sign-in-failed");
    }
  };

  const signInWithAppleFlow = async () => {
    setSignInError(null);
    try {
      const AppleAuthentication: typeof import("expo-apple-authentication") = require("expo-apple-authentication");
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) return; // Nothing to verify server-side.
      await establishSession(
        await signInWithApple(
          credential.identityToken,
          credential.fullName,
          credential.authorizationCode
        )
      );
    } catch (err) {
      // A user cancelling the native sheet isn't an error worth surfacing.
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === "ERR_REQUEST_CANCELED"
      ) {
        return;
      }
      // The raw message is a native SDK string (e.g. DEVELOPER_ERROR) - it
      // goes to Sentry, never to the reader. The UI renders a translated
      // generic instead; see profile.tsx / onboarding/sign-in.tsx.
      captureException(err);
      setSignInError("sign-in-failed");
    }
  };

  const clearLocalSession = async () => {
    try {
      const {
        GoogleSignin,
      }: typeof import("@react-native-google-signin/google-signin") = require("@react-native-google-signin/google-signin");
      await GoogleSignin.signOut();
    } catch {
      // Not configured/never signed in natively this session - fine,
      // still clear our own session below regardless.
    }
    await storeToken(null);
    await writeSyncBaseline(null);
    setToken(null);
    setUser(null);

    // This device is a guest again - re-register its push token with no
    // Authorization header so the backend drops the user_id it had while
    // signed in. Notifications keep working (as a guest); best-effort, a
    // failure just leaves the account link until the next preference
    // change re-registers.
    try {
      const [pushToken, intervalRaw, language] = await Promise.all([
        AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY),
        AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY),
        AsyncStorage.getItem(LANGUAGE_STORAGE_KEY),
      ]);
      if (pushToken) {
        await registerPushSubscription(
          pushToken,
          Number(intervalRaw) || DEFAULT_NOTIFICATION_INTERVAL,
          language || DEFAULT_LANGUAGE
        );
      }
    } catch {
      // best-effort
    }
  };

  const signOut = async () => {
    await clearLocalSession();
  };

  const deleteAccount = async () => {
    if (!token) return;
    // Let a failure here propagate - the session stays intact so the
    // reader can retry rather than being half-signed-out with a live
    // server account.
    await deleteAccountRequest(token);
    await clearLocalSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        signInError,
        signIn,
        signInWithApple: signInWithAppleFlow,
        clearSignInError,
        signOut,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
