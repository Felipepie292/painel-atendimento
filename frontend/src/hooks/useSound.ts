let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

/**
 * Plays a subtle two-tone notification "ding" using the Web Audio API.
 * Duration: ~200ms total. No external audio files needed.
 */
export function playNotificationSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    osc1.connect(gain);
    osc1.start(now);
    osc1.stop(now + 0.1);

    const gain2 = ctx.createGain();
    gain2.connect(ctx.destination);
    gain2.gain.setValueAtTime(0.12, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1175, now + 0.1);
    osc2.connect(gain2);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.25);
  } catch {
    // Silently fail if audio is not available
  }
}
