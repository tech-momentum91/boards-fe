/**
 * Lightweight client helpers for notification delivery prefs that must react
 * outside the settings page (realtime sound, presence heartbeats).
 */

let browserPlaySound = false;

export function setCachedBrowserPlaySound(enabled) {
  browserPlaySound = Boolean(enabled);
}

export function getCachedBrowserPlaySound() {
  return browserPlaySound;
}

let audioCtx = null;

/** Soft notification chime via Web Audio (no asset file required). */
export function playNotificationSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;
    if (!audioCtx) {
      audioCtx = new AudioContextCtor();
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const gain = audioCtx.createGain();
    gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.28);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.36);
  } catch {
    // Autoplay policies / unsupported AudioContext — ignore.
  }
}

export function maybePlayInboxSound(payload) {
  if (payload?.action && payload.action !== 'created') return;
  const items = Array.isArray(payload?.items) ? payload.items : [];
  if (!items.length) return;
  const fromServer = items.some((item) => Boolean(item?.play_sound));
  if (fromServer || browserPlaySound) {
    playNotificationSound();
  }
}
