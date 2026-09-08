import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import { useReducedMotion } from "../use-reduced-motion";

type MotionListener = (enabled: boolean) => void;

describe("useReducedMotion", () => {
  let listener: MotionListener | undefined;
  let remove: jest.Mock;

  // Captures the handler the hook subscribes with, so a test can drive the
  // "reader flipped the setting while the app was open" path directly.
  function mockAccessibilityInfo(initial: boolean) {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(initial);
    jest
      .spyOn(AccessibilityInfo, "addEventListener")
      .mockImplementation(((event: string, handler: MotionListener) => {
        if (event === "reduceMotionChanged") listener = handler;
        return { remove };
      }) as never);
  }

  beforeEach(() => {
    listener = undefined;
    remove = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("reports the OS setting once the initial async read resolves", async () => {
    mockAccessibilityInfo(true);

    const { result } = await renderHook(() => useReducedMotion());

    await waitFor(() => expect(result.current).toBe(true));
  });

  it("stays false when the reader has not asked to reduce motion", async () => {
    mockAccessibilityInfo(false);

    const { result } = await renderHook(() => useReducedMotion());

    await waitFor(() => expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it("follows the setting being toggled while mounted", async () => {
    mockAccessibilityInfo(false);

    const { result } = await renderHook(() => useReducedMotion());
    await waitFor(() => expect(listener).toBeDefined());

    await act(async () => listener?.(true));
    expect(result.current).toBe(true);

    await act(async () => listener?.(false));
    expect(result.current).toBe(false);
  });

  it("unsubscribes on unmount", async () => {
    mockAccessibilityInfo(false);

    const { unmount } = await renderHook(() => useReducedMotion());
    await waitFor(() => expect(listener).toBeDefined());

    await act(async () => {
      unmount();
    });
    expect(remove).toHaveBeenCalled();
  });
});
