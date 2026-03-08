package com.attentionbeeper.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;

import androidx.core.app.NotificationCompat;

public class BackgroundService extends Service {

    static final String CHANNEL_ID = "attention_beeper_channel";
    static final int NOTIFICATION_ID = 1;
    static final String PREFS_NAME = "AttentionBeeper";

    private Handler handler;
    private long intervalMs;
    private String mode;
    private PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate() {
        super.onCreate();

        handler = new Handler(Looper.getMainLooper());

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Attention Beeper",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Keeps beeping session running in background");
        getSystemService(NotificationManager.class).createNotificationChannel(channel);

        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "AttentionBeeper:BeepLock");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // If the service is restarted by the OS after being killed (intent == null),
        // restore the last-known parameters from SharedPreferences.
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        if (intent != null) {
            intervalMs = intent.getLongExtra("intervalMs", 60000L);
            mode = intent.getStringExtra("mode");
            if (mode == null) mode = "fixed";
            prefs.edit()
                .putLong("intervalMs", intervalMs)
                .putString("mode", mode)
                .apply();
        } else {
            intervalMs = prefs.getLong("intervalMs", 60000L);
            mode = prefs.getString("mode", "fixed");
        }

        // Show the persistent foreground notification.
        Intent openApp = new Intent(this, MainActivity.class);
        openApp.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, openApp, PendingIntent.FLAG_IMMUTABLE
        );

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Attention Beeper")
            .setContentText("Beeping session is running")
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build();

        startForeground(NOTIFICATION_ID, notification);

        // Acquire a partial wake lock so the CPU stays awake and Handler callbacks
        // fire on time even when the screen is off.
        if (!wakeLock.isHeld()) {
            wakeLock.acquire();
        }

        // Cancel any pending callbacks from a previous start before scheduling.
        handler.removeCallbacksAndMessages(null);
        scheduleNextBeep();

        return START_STICKY;
    }

    /**
     * Pick the next delay, wait for it on the main-thread Handler, then fire the beep
     * and reschedule. Running on the main thread is required because BackgroundModePlugin
     * calls notifyListeners() which posts to the WebView via evaluateJavascript().
     */
    private void scheduleNextBeep() {
        long delay;
        if ("random".equals(mode)) {
            delay = Math.max(1000L, (long) (Math.random() * intervalMs));
        } else {
            delay = intervalMs;
        }

        handler.postDelayed(() -> {
            BackgroundModePlugin.triggerBeep();
            scheduleNextBeep();
        }, delay);
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
