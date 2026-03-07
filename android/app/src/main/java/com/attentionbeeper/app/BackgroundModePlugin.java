package com.attentionbeeper.app;

import android.content.Intent;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BackgroundMode")
public class BackgroundModePlugin extends Plugin {

    @PluginMethod
    public void enable(PluginCall call) {
        Intent intent = new Intent(getContext(), BackgroundService.class);
        getContext().startForegroundService(intent);
        call.resolve();
    }

    @PluginMethod
    public void disable(PluginCall call) {
        Intent intent = new Intent(getContext(), BackgroundService.class);
        getContext().stopService(intent);
        call.resolve();
    }
}
