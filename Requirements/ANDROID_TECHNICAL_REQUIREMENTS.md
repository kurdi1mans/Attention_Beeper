# Attention Beeper — Android App Technical Requirements

## Technology Stack

| Concern | Choice |
|---|---|
| Native wrapper | Capacitor 8 (`@capacitor/core`, `@capacitor/android`, `@capacitor/cli`) |
| Language | Java |
| Background scheduling | Custom Capacitor plugin (`BackgroundMode`) backed by a native `Handler` loop |
| Background audio | Web Audio API called from JS via `evaluateJavascript()` — no native audio API |
| Process protection | Android foreground service with `PARTIAL_WAKE_LOCK` |
| Min SDK | 24 (Android 7.0) |
| Target / Compile SDK | 36 |

---

## `capacitor.config.json`

```json
{
  "appId": "com.attentionbeeper.app",
  "appName": "Attention Beeper",
  "webDir": "dist"
}
```

---

## File Structure

```
capacitor.config.json
android/
  app/src/main/
    AndroidManifest.xml
    java/com/attentionbeeper/app/
      MainActivity.java
      BackgroundModePlugin.java
      BackgroundService.java
```

---

## `AndroidManifest.xml` — Key Entries

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
<uses-permission android:name="android.permission.WAKE_LOCK" />

<service
    android:name=".BackgroundService"
    android:foregroundServiceType="mediaPlayback"
    android:exported="false" />
```

---

## `MainActivity.java`

Extends `BridgeActivity`. Registers `BackgroundModePlugin` before `super.onCreate()` so the plugin is available from the first frame:

```java
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BackgroundModePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

---

## `BackgroundModePlugin.java`

Capacitor plugin (`name = "BackgroundMode"`). Holds a static reference to itself (`instance`) so `BackgroundService` can call back into JS without holding an Activity reference. The reference is refreshed in `load()` on every Activity creation.

### Plugin Methods (called from JS)

**`schedule({ intervalMs, mode })`**
- Reads `intervalMs` via `call.getDouble("intervalMs", 60000.0).longValue()` — `getDouble` is used because Capacitor stores JSON numbers as boxed `Double` internally; `getLong` silently returns the default.
- Reads `mode` via `call.getString("mode", "fixed")`.
- Puts both as Intent extras and calls `startForegroundService`.

**`cancel()`**
- Calls `stopService` on `BackgroundService`.

### Static Callbacks (called from `BackgroundService`)

**`notifyNextDelay(long nextDelayMs)`**
- Fires a `"scheduled"` event to JS with `{ nextDelayMs }`.
- Called once at session start so JS can display the countdown before the first beep arrives.

**`triggerBeep(long nextDelayMs)`**
- Fires a `"beep"` event to JS with `{ nextDelayMs }`.
- Called on every beep. `nextDelayMs` is the delay already committed to the next `Handler.postDelayed` call, so the JS countdown is exact — not an estimate.

---

## `BackgroundService.java`

Extends `Service`. Owns all timing logic; the WebView is not involved in scheduling.

### Lifecycle

**`onCreate`**
- Creates `Handler(Looper.getMainLooper())` — all callbacks run on the main thread, required for `evaluateJavascript`.
- Creates the `NotificationChannel` (`IMPORTANCE_LOW`, id: `attention_beeper_channel`).
- Creates the `PARTIAL_WAKE_LOCK` (not acquired yet).

**`onStartCommand`**
- Reads `intervalMs` and `mode` from the Intent.
- Persists both to `SharedPreferences` (key: `"AttentionBeeper"`) so that a `START_STICKY` restart (Intent is null) can restore state without the JS layer.
- If Intent is null, reads from `SharedPreferences` instead.
- Shows the foreground notification (title: `"Attention Beeper"`, body: `"Beeping session is running"`, ongoing, tapping opens `MainActivity`).
- Calls `wakeLock.acquire()` if not already held.
- Calls `handler.removeCallbacksAndMessages(null)` to cancel any leftover callbacks.
- Calls `startScheduler()`.
- Returns `START_STICKY`.

**`onDestroy`**
- Calls `handler.removeCallbacksAndMessages(null)`.
- Releases the WakeLock if held.

### Scheduling Design

```
startScheduler()
  firstDelay = computeDelay()
  BackgroundModePlugin.notifyNextDelay(firstDelay)   → JS shows initial countdown
  scheduleNextBeep(firstDelay)

scheduleNextBeep(delay)
  handler.postDelayed(() → {
    nextDelay = computeDelay()                        → sampled before triggerBeep
    BackgroundModePlugin.triggerBeep(nextDelay)       → JS plays sound + updates countdown
    scheduleNextBeep(nextDelay)                       → same value given to Handler
  }, delay)

computeDelay()
  fixed  → return intervalMs
  random → return max(1000, (long)(Math.random() * intervalMs))
```

The next delay is computed **once** per cycle, immediately when the current beep fires, and passed to both `triggerBeep` and the next `postDelayed`. This ensures the value in the JS countdown is identical to the value the Android timer is waiting on — there is no separate random sampling on the JS side.

### Why This Works in the Background

| Mechanism | What it prevents |
|---|---|
| Foreground service | Android killing the process to reclaim memory |
| `PARTIAL_WAKE_LOCK` | CPU sleeping, which would stall `Handler.postDelayed` |
| Native `Handler` (not JS `setTimeout`) | Android throttling WebView timers in backgrounded apps |
| `START_STICKY` + `SharedPreferences` | Session parameters surviving a process restart |

---

## Platform Compatibility

- Android 7.0+ (minSdk 24).
- Tested on Android 12+ (targetSdk 36).

---

## Build & Deployment

```sh
# 1. Build web assets
npm run build

# 2. Copy into the Android project
npx cap sync android

# 3. Compile the APK
cd android && ./gradlew assembleDebug
# output: android/app/build/outputs/apk/debug/app-debug.apk
```

Prerequisites: JDK 21, Android SDK with API 36, `JAVA_HOME` pointing to the full JDK (not just JRE).
