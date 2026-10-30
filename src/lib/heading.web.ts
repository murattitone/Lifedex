import { useCallback, useEffect, useState } from 'react';

import type { HeadingState } from './heading';

type OrientationEvt = DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number };

/** Browser compass via DeviceOrientation (iOS needs a user gesture to grant permission). */
export function useHeading(enabled: boolean): HeadingState {
  const [heading, setHeading] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string>();
  const DOE = typeof window !== 'undefined' ? (window as any).DeviceOrientationEvent : undefined;
  const needsPermission = typeof DOE?.requestPermission === 'function';

  const start = useCallback(async () => {
    if (!DOE) return setError('Bu tarayıcı pusula sensörünü desteklemiyor.');
    if (needsPermission) {
      const res = await DOE.requestPermission().catch(() => 'denied');
      if (res !== 'granted') return setError('Pusula izni verilmedi.');
    }
    setStarted(true);
  }, [DOE, needsPermission]);

  const active = started || (enabled && !needsPermission);

  useEffect(() => {
    if (!active) return;
    const onAbs = (e: OrientationEvt) => {
      if (typeof e.webkitCompassHeading === 'number') {
        setHeading(e.webkitCompassHeading);
        setAccuracy(e.webkitCompassAccuracy ?? null);
      } else if (e.alpha !== null && (e.absolute || e.type === 'deviceorientationabsolute')) {
        setHeading((360 - e.alpha) % 360);
      }
    };
    const evt = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(evt as any, onAbs as any);
    return () => window.removeEventListener(evt as any, onAbs as any);
  }, [active]);

  return { heading, accuracy, needsGesture: needsPermission && !active, start, error };
}
