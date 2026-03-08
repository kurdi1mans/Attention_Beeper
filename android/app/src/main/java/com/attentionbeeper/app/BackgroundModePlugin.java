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
     * Called by BackgroundService on the main thread each time a beep fires.
     * Forwards the event to JS so the Web Audio API can play the selected sound.
     */
    public static void triggerBeep() {
        if (instance != null) {
            instance.notifyListeners("beep", new JSObject());
        }
    }

    /**
     * Start the native beep scheduler.
     * Expected JS call: BackgroundMode.schedule({ intervalMs: number, mode: 'fixed'|'random' })
     */
    @PluginMethod
    public void schedule(PluginCall call) {
        long intervalMs = call.getLong("intervalMs", 60000L);
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
