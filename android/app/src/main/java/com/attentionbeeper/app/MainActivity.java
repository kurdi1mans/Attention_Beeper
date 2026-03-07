package com.attentionbeeper.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(BackgroundModePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
