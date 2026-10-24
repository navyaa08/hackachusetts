import { useEffect, useRef } from 'react';
import { useStore } from '../store';

/**
 * Speaks a spoken warning via the Web Speech API when the driver enters a
 * sustained 'alert' state. Debounced so it doesn't nag every frame.
 */
export function useVoiceAlert(enabled: boolean) {
  const alert = useStore((s) => s.alert);
  const lastSpoke = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    if (alert !== 'alert') return;
    const now = Date.now();
    if (now - lastSpoke.current < 8000) return; // at most once / 8s
    lastSpoke.current = now;

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      const u = new SpeechSynthesisUtterance('Your eyes need a break.');
      u.rate = 1;
      u.pitch = 1;
      u.volume = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {
      /* speech not available */
    }
  }, [alert, enabled]);
}
