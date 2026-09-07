---
name: verify-android
description: Boot the Pixel_10_Pro_XL emulator, run the app on it, and capture screenshots to verify a visual, animated, or measurement-dependent change on a real Android surface.
disable-model-invocation: true
---

# Verify on Android

`AGENTS.md` requires live Android verification for anything visual, animated,
or measurement-dependent - reasoning alone has repeatedly been wrong here.
Bugs found *only* this way include missing tab-bar icons, a wrong tab-bar
height (`docs/android-tab-bar.md`), and a related-article swipe that swallowed
the system back gesture. This skill is that loop.

**iOS has no local device or simulator in this environment** (no Mac). Never
claim an iOS fix is verified - say plainly that it needs the user's own device.

## Environment

`ANDROID_HOME` is `C:\Users\cheta\AppData\Local\Android\Sdk`. The only AVD is
`Pixel_10_Pro_XL`. Use the SDK's own binaries:

```bash
ADB="$ANDROID_HOME/platform-tools/adb.exe"
EMU="$ANDROID_HOME/emulator/emulator.exe"
```

## Steps

1. **Is a device already up?** `"$ADB" devices`. If one is listed, reuse it -
   do not boot a second.

2. **Boot if needed**, in the background, then wait for it to finish:
   ```bash
   "$EMU" -avd Pixel_10_Pro_XL &
   "$ADB" wait-for-device
   # boot_completed flips to 1 well after wait-for-device returns
   until [ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do :; done
   ```

3. **Run the app.** Prefer an already-running dev server - check before
   starting one, and never kill a dev server the user is running.
   ```bash
   npx expo run:android
   ```
   This is a native build; it can take several minutes on a cold cache.

4. **Capture what you changed.** Navigate with `adb shell input` (`tap x y`,
   `swipe x1 y1 x2 y2 ms`, `keyevent 4` for back), then:
   ```bash
   "$ADB" exec-out screencap -p > screen.png
   ```
   Read the PNG back and actually look at it. For layout questions,
   `"$ADB" shell uiautomator dump` plus pulling `/sdcard/window_dump.xml`
   gives exact node bounds - that is how the tab-bar height was pinned down.

5. **Report honestly.** Say what you saw, not what you expected. If the change
   is wrong, prefer changing approach over re-guessing the same fragile
   structure with a different number.

## Sending results

Screenshots are worth putting in front of the user directly rather than only
describing - use `SendUserFile` for the captured PNG.
