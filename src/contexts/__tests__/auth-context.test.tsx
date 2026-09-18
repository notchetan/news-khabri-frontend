import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  deleteAccount,
  fetchMe,
  putPreferences,
  signInWithApple,
  signInWithGoogle,
} from "@/api/auth";
import {
  AuthProvider,
  PREFERENCES_BASELINE_KEY,
  useAuth,
} from "@/contexts/auth-context";
import { ApiError } from "@/api/client";
import { SOURCES_STORAGE_KEY } from "@/contexts/sources-preference";
import { ThemePreferenceProvider, useThemePreference } from "@/contexts/theme-preference";

jest.mock("@/api/auth", () => ({
  fetchMe: jest.fn(),
  signInWithGoogle: jest.fn(),
  signInWithApple: jest.fn(),
  putPreferences: jest.fn(),
  deleteAccount: jest.fn(),
}));

const mockAppleSignInAsync = jest.requireMock("expo-apple-authentication")
  .signInAsync as jest.Mock;

jest.mock("@/api/notifications", () => ({
  registerPushSubscription: jest.fn().mockResolvedValue(undefined),
}));
const mockRegisterPushSubscription = jest.requireMock("@/api/notifications")
  .registerPushSubscription as jest.Mock;

const mockGetItemAsync = jest.fn();
const mockSetItemAsync = jest.fn();
const mockDeleteItemAsync = jest.fn();
jest.mock("expo-secure-store", () => ({
  getItemAsync: (...args: unknown[]) => mockGetItemAsync(...args),
  setItemAsync: (...args: unknown[]) => mockSetItemAsync(...args),
  deleteItemAsync: (...args: unknown[]) => mockDeleteItemAsync(...args),
}));

const mockGoogleSignInCall = jest.fn();
jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: (...args: unknown[]) => mockGoogleSignInCall(...args),
    signOut: jest.fn().mockResolvedValue(null),
  },
}));

const mockFetchMe = fetchMe as jest.Mock;
const mockSignInWithGoogle = signInWithGoogle as jest.Mock;
const mockSignInWithApple = signInWithApple as jest.Mock;
const mockPutPreferences = putPreferences as jest.Mock;
const mockDeleteAccount = deleteAccount as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemePreferenceProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemePreferenceProvider>
  );
}

describe("AuthProvider preference sync", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockGetItemAsync.mockResolvedValue(null);
    mockSetItemAsync.mockResolvedValue(undefined);
    mockDeleteItemAsync.mockResolvedValue(undefined);
    mockPutPreferences.mockResolvedValue(undefined);
    mockDeleteAccount.mockResolvedValue(undefined);
  });

  async function signIn(result: { current: { auth: ReturnType<typeof useAuth> } }) {
    mockGoogleSignInCall.mockResolvedValue({ type: "success", data: { idToken: "google-id-token" } });
    mockSignInWithGoogle.mockResolvedValue({
      token: "session-token",
      user: { id: 1, email: "chetan@example.com", name: "Chetan Shetty", avatarUrl: null },
      preferences: null,
    });
    await act(async () => {
      await result.current.auth.signIn();
    });
    await waitFor(() => {
      expect(result.current.auth.user).not.toBeNull();
    });
  }

  it("deleteAccount calls the API with the token then clears the local session", async () => {
    const { result } = await renderHook(() => ({ auth: useAuth() }), { wrapper });
    await signIn(result);

    await act(async () => {
      await result.current.auth.deleteAccount();
    });

    expect(mockDeleteAccount).toHaveBeenCalledWith("session-token");
    expect(result.current.auth.user).toBeNull();
    expect(result.current.auth.token).toBeNull();
    expect(mockDeleteItemAsync).toHaveBeenCalledWith("sessionToken");
  });

  it("deleteAccount keeps the session intact when the API call fails", async () => {
    const { result } = await renderHook(() => ({ auth: useAuth() }), { wrapper });
    await signIn(result);
    mockDeleteAccount.mockRejectedValueOnce(new Error("network"));

    await expect(
      act(async () => {
        await result.current.auth.deleteAccount();
      })
    ).rejects.toThrow("network");

    expect(result.current.auth.user).not.toBeNull();
    expect(result.current.auth.token).toBe("session-token");
  });

  it("on sign-out, re-registers the cached push token anonymously (no session token) so the backend drops the account link", async () => {
    await AsyncStorage.setItem("notificationPushToken", "ExponentPushToken[dev]");
    await AsyncStorage.setItem("notificationPreference", "15");
    const { result } = await renderHook(() => ({ auth: useAuth() }), { wrapper });
    await signIn(result);
    mockRegisterPushSubscription.mockClear();

    await act(async () => {
      await result.current.auth.signOut();
    });

    expect(mockRegisterPushSubscription).toHaveBeenCalledWith(
      "ExponentPushToken[dev]",
      15,
      "en"
    );
  });

  it("on sign-out with no cached push token, does not call the push API", async () => {
    const { result } = await renderHook(() => ({ auth: useAuth() }), { wrapper });
    await signIn(result);
    mockRegisterPushSubscription.mockClear();

    await act(async () => {
      await result.current.auth.signOut();
    });

    expect(mockRegisterPushSubscription).not.toHaveBeenCalled();
  });

  it("signInWithApple exchanges the Apple credential (incl. first-time name) for a session", async () => {
    mockAppleSignInAsync.mockResolvedValue({
      identityToken: "apple-identity-token",
      authorizationCode: "apple-auth-code",
      fullName: { givenName: "Chetan", familyName: "Shetty" },
    });
    mockSignInWithApple.mockResolvedValue({
      token: "apple-session-token",
      user: { id: 2, email: "chetan@privaterelay.appleid.com", name: "Chetan Shetty", avatarUrl: null },
      preferences: null,
    });

    const { result } = await renderHook(() => ({ auth: useAuth() }), { wrapper });

    await act(async () => {
      await result.current.auth.signInWithApple();
    });
    await waitFor(() => expect(result.current.auth.user).not.toBeNull());

    expect(mockSignInWithApple).toHaveBeenCalledWith(
      "apple-identity-token",
      { givenName: "Chetan", familyName: "Shetty" },
      "apple-auth-code"
    );
    expect(result.current.auth.token).toBe("apple-session-token");
    expect(result.current.auth.user?.email).toBe("chetan@privaterelay.appleid.com");
  });

  it("signInWithApple treats a user cancel (ERR_REQUEST_CANCELED) as a no-op, not an error", async () => {
    mockAppleSignInAsync.mockRejectedValue(
      Object.assign(new Error("The user canceled the authorization attempt."), {
        code: "ERR_REQUEST_CANCELED",
      })
    );

    const { result } = await renderHook(() => ({ auth: useAuth() }), { wrapper });

    await act(async () => {
      await result.current.auth.signInWithApple();
    });

    expect(result.current.auth.user).toBeNull();
    expect(result.current.auth.signInError).toBeNull();
    expect(mockSignInWithApple).not.toHaveBeenCalled();
  });

  // The push side of the sync bus - see "The preference sync bus" in
  // docs/google-sign-in.md for why this doesn't rely on provider nesting order.
  it("pushes only the field that changed, not the whole bundle, once a device has a synced baseline", async () => {
    mockGoogleSignInCall.mockResolvedValue({
      type: "success",
      data: { idToken: "google-id-token" },
    });
    mockSignInWithGoogle.mockResolvedValue({
      token: "session-token",
      user: { id: 1, email: "chetan@example.com", name: "Chetan Shetty", avatarUrl: null },
      preferences: null,
    });

    const { result } = await renderHook(
      () => ({ auth: useAuth(), theme: useThemePreference() }),
      { wrapper }
    );

    await act(async () => {
      await result.current.auth.signIn();
    });
    await waitFor(() => {
      expect(result.current.auth.user).not.toBeNull();
    });
    mockPutPreferences.mockClear(); // Clear the initial "seed a new account" call.

    await act(async () => {
      result.current.theme.setPreference("night");
    });

    await waitFor(() => {
      expect(mockPutPreferences).toHaveBeenCalledWith("session-token", { theme: "night" });
    });
    // Not a whole-bundle push.
    expect(mockPutPreferences.mock.calls.at(-1)?.[1]).toEqual({ theme: "night" });
  });

  // A failed seed used to still write the sync baseline, so the device
  // believed the server held values it had never received - and since every
  // later push is a baseline diff, those fields were never re-sent.
  it("re-pushes the whole bundle on the next change when the new-account seed failed", async () => {
    mockPutPreferences.mockRejectedValueOnce(new Error("offline"));

    const { result } = await renderHook(
      () => ({ auth: useAuth(), theme: useThemePreference() }),
      { wrapper }
    );
    await signIn(result);
    expect(mockPutPreferences).toHaveBeenCalledTimes(1); // the failed seed
    expect(await AsyncStorage.getItem(PREFERENCES_BASELINE_KEY)).toBeNull();

    mockPutPreferences.mockResolvedValue(undefined);
    await act(async () => {
      result.current.theme.setPreference("night");
    });

    // No baseline to diff against, so the whole bundle goes up rather than
    // just the one field that changed.
    await waitFor(() => {
      expect(mockPutPreferences).toHaveBeenCalledTimes(2);
    });
    expect(mockPutPreferences.mock.calls.at(-1)?.[1]).toEqual(
      expect.objectContaining({ theme: "night", fontSize: "medium", language: "en" })
    );
  });

  it("still records the baseline when the new-account seed succeeds", async () => {
    const { result } = await renderHook(() => ({ auth: useAuth() }), { wrapper });
    await signIn(result);

    await waitFor(async () => {
      expect(await AsyncStorage.getItem(PREFERENCES_BASELINE_KEY)).not.toBeNull();
    });
  });

  // The whole point of ApiError: a token is only destroyed when the server
  // actually rejects it. Before this, one launch without signal signed the
  // reader out permanently, with no explanation.
  it("keeps the session when the launch validation fails for a non-auth reason", async () => {
    mockGetItemAsync.mockResolvedValue("stored-session-token");
    mockFetchMe.mockRejectedValue(new Error("Network request failed"));

    const { result } = await renderHook(() => ({ auth: useAuth() }), { wrapper });

    await waitFor(() => {
      expect(result.current.auth.isLoading).toBe(false);
    });
    expect(mockDeleteItemAsync).not.toHaveBeenCalled();
  });

  it("keeps the session on a 500 too - a server fault says nothing about the token", async () => {
    mockGetItemAsync.mockResolvedValue("stored-session-token");
    mockFetchMe.mockRejectedValue(new ApiError("Failed to fetch account", 500));

    const { result } = await renderHook(() => ({ auth: useAuth() }), { wrapper });

    await waitFor(() => {
      expect(result.current.auth.isLoading).toBe(false);
    });
    expect(mockDeleteItemAsync).not.toHaveBeenCalled();
  });

  it.each([401, 403])(
    "clears the session when the server rejects the token with %s",
    async (status) => {
      mockGetItemAsync.mockResolvedValue("stored-session-token");
      mockFetchMe.mockRejectedValue(new ApiError("Failed to fetch account", status));

      const { result } = await renderHook(() => ({ auth: useAuth() }), { wrapper });

      await waitFor(() => {
        expect(result.current.auth.isLoading).toBe(false);
      });
      expect(mockDeleteItemAsync).toHaveBeenCalled();
      expect(result.current.auth.user).toBeNull();
    }
  );

  // A corrupt sources value threw out of readLocalPreferencesBundle. On the
  // launch path that landed in the session-restore catch and destroyed the
  // stored token; in the change listener it was an unhandled rejection.
  it("survives a corrupt stored sources value instead of losing the session", async () => {
    mockGetItemAsync.mockResolvedValue("stored-session-token");
    await AsyncStorage.setItem(SOURCES_STORAGE_KEY, "{not json");
    mockFetchMe.mockResolvedValue({
      user: { id: 1, email: "chetan@example.com", name: null, avatarUrl: null },
      preferences: null,
    });

    const { result } = await renderHook(() => ({ auth: useAuth() }), { wrapper });

    await waitFor(() => {
      expect(result.current.auth.isLoading).toBe(false);
    });
    expect(result.current.auth.token).toBe("stored-session-token");
    expect(mockDeleteItemAsync).not.toHaveBeenCalled();
  });

  it("does not push preference changes while signed out", async () => {
    const { result } = await renderHook(
      () => ({ theme: useThemePreference() }),
      { wrapper }
    );

    await act(async () => {
      result.current.theme.setPreference("night");
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockPutPreferences).not.toHaveBeenCalled();
  });

  // --- reconcile on relaunch (persisted sync baseline) -----------------

  const FULL_BUNDLE = {
    theme: "automatic",
    fontSize: "medium",
    language: "en",
    debugEnabled: false,
    sources: {},
    notificationInterval: 0,
  };

  async function restore(serverPrefs: Record<string, unknown>) {
    mockGetItemAsync.mockResolvedValue("session-token"); // stored session token
    mockFetchMe.mockResolvedValue({
      user: { id: 1, email: "chetan@example.com", name: "Chetan Shetty", avatarUrl: null },
      preferences: serverPrefs,
    });
    const rendered = await renderHook(
      () => ({ auth: useAuth(), theme: useThemePreference() }),
      { wrapper }
    );
    await waitFor(() => expect(rendered.result.current.auth.user).not.toBeNull());
    return rendered;
  }

  it("keeps an unsynced local edit across a relaunch instead of letting the server value overwrite it", async () => {
    await AsyncStorage.setItem("themePreference", "night");
    await AsyncStorage.setItem(
      "preferencesSyncBaseline",
      JSON.stringify({ ...FULL_BUNDLE, theme: "automatic" })
    );

    const { result } = await restore({ ...FULL_BUNDLE, theme: "automatic" });

    expect(result.current.theme.preference).toBe("night");
    await waitFor(() =>
      expect(mockPutPreferences).toHaveBeenCalledWith("session-token", { theme: "night" })
    );
  });

  it("adopts the server value on relaunch when the local value matches the baseline", async () => {
    await AsyncStorage.setItem("themePreference", "automatic");
    await AsyncStorage.setItem(
      "preferencesSyncBaseline",
      JSON.stringify({ ...FULL_BUNDLE, theme: "automatic" })
    );

    const { result } = await restore({ ...FULL_BUNDLE, theme: "night" });

    expect(result.current.theme.preference).toBe("night");
    expect(mockPutPreferences).not.toHaveBeenCalled();
  });

  it("falls back to server-wins on relaunch when there is no persisted baseline yet", async () => {
    await AsyncStorage.setItem("themePreference", "night");

    const { result } = await restore({ ...FULL_BUNDLE, theme: "automatic" });

    expect(result.current.theme.preference).toBe("automatic");
    expect(mockPutPreferences).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem("preferencesSyncBaseline")).toContain('"automatic"');
  });
});
