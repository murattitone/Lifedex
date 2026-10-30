import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export type HeadingState = { heading: number | null; accuracy: number | null; needsGesture: boolean; start: () => void; error?: string };

/** Device compass heading in degrees from true north (falls back to magnetic). */
export function useHeading(enabled: boolean): HeadingState {
  const [heading, setHeading] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!enabled) return;
    let sub: Location.LocationSubscription | undefined;
    let cancelled = false;
    Location.watchHeadingAsync((h) => {
      const v = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
      setHeading(v);
      setAccuracy(h.accuracy);
    })
      .then((s) => (cancelled ? s.remove() : (sub = s)))
      .catch((e) => setError(String(e?.message ?? e)));
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled]);

  return { heading, accuracy, needsGesture: false, start: () => {}, error };
}
