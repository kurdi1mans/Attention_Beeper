package com.attentionbeeper.app;

import android.content.Intent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BackgroundMode")
public class BackgroundModePlugin extends Plugin {

    // Static reference so BackgroundService can call back into JS without holding
    // a reference to the Activity. Updated on every load() call (e.g. after rotation).
    private static BackgroundModePlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    /**
     * Fired once when the scheduler starts so JS can show the countdown immediately,
     * before the first beep arrives.
     * nextDelayMs = how long until the first beep.
     */
    public static void notifyNextDelay(long nextDelayMs) {
        if (instance != null) {
            JSObject data = new JSObject();
            data.put("nextDelayMs", nextDelayMs);
            instance.notifyListeners("scheduled", data);
        }
    }

    /**
     * Fired on every beep. Includes the delay already chosen for the NEXT beep so JS
     * can update the countdown to reflect the native timer exactly, with no drift.
     */
    public static void triggerBeep(long nextDelayMs) {
        if (instance != null) {
            JSObject data = new JSObject();
            data.put("nextDelayMs", nextDelayMs);
            instance.notifyListeners("beep", data);
        }
    }

    /**
     * Start the native beep scheduler.
     * Expected JS call: BackgroundMode.schedule({ intervalMs: number, mode: 'fixed'|'random' })
     */
    @PluginMethod
    public void schedule(PluginCall call) {
        // Use getDouble() because Capacitor's Android bridge stores JSON numbers as
        // doubles internally; getLong() can silently return the default if the key is
        // not found under that type. getDouble() returns boxed Double, so unbox via
        // longValue(). A value like 600000.0 converts exactly to 600000L.
        Double dMs = call.getDouble("intervalMs", 60000.0);
        long intervalMs = (dMs != null) ? dMs.longValue() : 60000L;
        String mode = call.getString("mode", "fixed");

        Intent intent = new Intent(getContext(), BackgroundService.class);
        intent.putExtra("intervalMs", intervalMs);
        intent.putExtra("mode", mode);
        getContext().startForegroundService(intent);
        call.resolve();
    }

    /**
     * Stop the native beep scheduler and release the foreground service.
     * Expected JS call: BackgroundMode.cancel()
     */
    @PluginMethod
    public void cancel(PluginCall call) {
        getContext().stopService(new Intent(getContext(), BackgroundService.class));
        call.resolve();
    }
}
