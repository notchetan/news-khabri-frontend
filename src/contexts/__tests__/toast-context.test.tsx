import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo, Button } from "react-native";

import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import { ToastProvider, useToast } from "@/contexts/toast-context";

jest.mock("@/hooks/use-color-scheme", () => ({ useColorScheme: () => "light" }));

const onAction = jest.fn();

function Harness() {
  const { show, hide } = useToast();
  return (
    <>
      <Button
        title="show"
        onPress={() =>
          show({ message: "Saved", action: { label: "View", onPress: onAction } })
        }
      />
      <Button title="hide" onPress={hide} />
    </>
  );
}

async function renderHarness() {
  return render(
    <ThemePreferenceProvider>
      <ToastProvider>
        <Harness />
      </ToastProvider>
    </ThemePreferenceProvider>
  );
}

describe("ToastProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows nothing until show() is called", async () => {
    await renderHarness();
    expect(screen.queryByTestId("toast")).toBeNull();
  });

  it("renders the message and action; the action fires onPress then dismisses", async () => {
    await renderHarness();

    fireEvent.press(screen.getByText("show"));
    await waitFor(() => {
      expect(screen.getByText("Saved")).toBeTruthy();
    });
    expect(screen.getByText("View")).toBeTruthy();

    fireEvent.press(screen.getByTestId("toast-action"));
    expect(onAction).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.queryByTestId("toast")).toBeNull();
    });
  });

  it("hide() dismisses the current toast", async () => {
    await renderHarness();

    fireEvent.press(screen.getByText("show"));
    await waitFor(() => {
      expect(screen.getByText("Saved")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("hide"));

    await waitFor(() => {
      expect(screen.queryByTestId("toast")).toBeNull();
    });
  });

  // A toast appears and self-dismisses in 4s without moving focus, so
  // nothing else would surface it to a screen reader.
  it("marks the toast as a polite live region", async () => {
    await renderHarness();

    fireEvent.press(screen.getByText("show"));
    await waitFor(() => expect(screen.getByTestId("toast")).toBeTruthy());

    expect(screen.getByTestId("toast")).toHaveProp(
      "accessibilityLiveRegion",
      "polite"
    );
  });

  // jest-expo runs with Platform.OS "ios", where there is no live-region
  // prop - the explicit announce is the only path.
  it("announces the message and its action label on iOS", async () => {
    const announce = jest
      .spyOn(AccessibilityInfo, "announceForAccessibility")
      .mockImplementation(() => {});

    await renderHarness();
    fireEvent.press(screen.getByText("show"));

    await waitFor(() => expect(announce).toHaveBeenCalledWith("Saved. View"));

    announce.mockRestore();
  });
});
