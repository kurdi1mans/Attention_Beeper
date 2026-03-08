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

        // Cancel any leftover callbacks, then start fresh.
        handler.removeCallbacksAndMessages(null);
        startScheduler();

        return START_STICKY;
    }

    /**
     * Compute the first delay, immediately tell JS about it (so the countdown shows
     * before the first beep arrives), then enqueue the first callback.
     */
    private void startScheduler() {
        long firstDelay = computeDelay();
        BackgroundModePlugin.notifyNextDelay(firstDelay);
        scheduleNextBeep(firstDelay);
    }

    /**
     * Enqueue a callback to fire after `delay` ms. When it fires:
     *   1. Compute the delay for the cycle AFTER this one.
     *   2. Tell JS: "beep now, and your next beep is in nextDelay ms."
     *   3. Enqueue the next callback with that pre-computed delay.
     *
     * Pre-computing the next delay before calling triggerBeep() means JS receives
     * the exact value the native Handler is about to wait on — no independent
     * random sampling on the JS side, no drift between the countdown and the beep.
     */
    private void scheduleNextBeep(long delay) {
        handler.postDelayed(() -> {
            long nextDelay = computeDelay();
            BackgroundModePlugin.triggerBeep(nextDelay);
            scheduleNextBeep(nextDelay);
        }, delay);
    }

    /** Returns a delay in ms: fixed = intervalMs, random = uniform in [1000, intervalMs]. */
    private long computeDelay() {
        if ("random".equals(mode)) {
            return Math.max(1000L, (long) (Math.random() * intervalMs));
        }
        return intervalMs;
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
