import * as Location from 'expo-location';
import { Compass, LocateFixed, MapPin } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import { Button, haptic } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useHeading } from '@/lib/heading';
import { font, useTheme } from '@/lib/theme';

const KAABA = { lat: 21.422487, lon: 39.826206 };
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

function qiblaBearing(lat: number, lon: number) {
  const φ1 = rad(lat);
  const φ2 = rad(KAABA.lat);
  const Δλ = rad(KAABA.lon - lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

function distanceKm(lat: number, lon: number) {
  const dφ = rad(KAABA.lat - lat);
  const dλ = rad(KAABA.lon - lon);
  const a = Math.sin(dφ / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(KAABA.lat)) * Math.sin(dλ / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getPosition(): Promise<{ lat: number; lon: number; place?: string } | { error: string }> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return { error: 'Kıble yönü için konum izni gerekli.' };
    const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    let place: string | undefined;
    try {
      const [g] = await Location.reverseGeocodeAsync({ latitude: p.coords.latitude, longitude: p.coords.longitude });
      place = [g?.district ?? g?.subregion, g?.city ?? g?.region].filter(Boolean).join(', ');
    } catch {}
    return { lat: p.coords.latitude, lon: p.coords.longitude, place };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

const SIZE = 300;
const R = SIZE / 2;

export default function Qibla() {
  const { c, accent } = useTheme();
  const teal = accent('teal');
  const [pos, setPos] = useState<{ lat: number; lon: number; place?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const compass = useHeading(!!pos);
  const aligned = useRef(false);

  const apply = (r: Awaited<ReturnType<typeof getPosition>>) => {
    if ('error' in r) setError(r.error);
    else {
      setPos(r);
      setError(null);
    }
    setLoading(false);
  };

  const locate = () => {
    setLoading(true);
    getPosition().then(apply);
  };

  useEffect(() => {
    let cancelled = false;
    getPosition().then((r) => !cancelled && apply(r));
    return () => {
      cancelled = true;
    };
  }, []);

  const bearing = pos ? qiblaBearing(pos.lat, pos.lon) : null;
  const heading = compass.heading;
  const diff = bearing !== null && heading !== null ? ((bearing - heading + 540) % 360) - 180 : null;
  const isAligned = diff !== null && Math.abs(diff) <= 4;

  useEffect(() => {
    if (isAligned && !aligned.current) haptic('success');
    aligned.current = isAligned;
  }, [isAligned]);

  const tone = isAligned ? c.success : teal.strong;

  return (
    <Screen title="Kıble" back>
      <Card style={{ alignItems: 'center', gap: 16, paddingVertical: 24 }}>
        <View style={{ width: SIZE, height: SIZE }}>
          <Svg width={SIZE} height={SIZE}>
            <G rotation={heading !== null ? -heading : 0} origin={`${R}, ${R}`}>
              <Circle cx={R} cy={R} r={R - 4} fill={c.surfaceMuted} stroke={c.border} strokeWidth={2} />
              {Array.from({ length: 72 }, (_, i) => {
                const a = rad(i * 5);
                const long = i % 18 === 0;
                const r1 = R - 8;
                const r2 = R - (long ? 24 : i % 2 === 0 ? 16 : 12);
                return (
                  <Line
                    key={i}
                    x1={R + r1 * Math.sin(a)}
                    y1={R - r1 * Math.cos(a)}
                    x2={R + r2 * Math.sin(a)}
                    y2={R - r2 * Math.cos(a)}
                    stroke={long ? c.text : c.borderStrong}
                    strokeWidth={long ? 2.5 : 1.2}
                  />
                );
              })}
              {(['K', 'D', 'G', 'B'] as const).map((l, i) => {
                const a = rad(i * 90);
                return (
                  <SvgText
                    key={l}
                    x={R + (R - 42) * Math.sin(a)}
                    y={R - (R - 42) * Math.cos(a) + 6}
                    fontSize={17}
                    fontWeight="700"
                    fill={l === 'K' ? c.danger : c.textMuted}
                    textAnchor="middle">
                    {l}
                  </SvgText>
                );
              })}
              {bearing !== null && (
                <G rotation={bearing} origin={`${R}, ${R}`}>
                  <Line x1={R} y1={R} x2={R} y2={46} stroke={tone} strokeWidth={4} strokeLinecap="round" />
                  <Path d={`M ${R - 14} 50 L ${R} 22 L ${R + 14} 50 Z`} fill={tone} />
                  <Path d={`M ${R - 9} 4 h18 v14 h-18 Z`} fill="#111" />
                  <Path d={`M ${R - 9} 8 h18`} stroke="#D4A017" strokeWidth={2} />
                </G>
              )}
            </G>
            <Path d={`M ${R - 8} 0 L ${R} 14 L ${R + 8} 0 Z`} fill={c.text} />
            <Circle cx={R} cy={R} r={8} fill={tone} />
          </Svg>
        </View>

        {bearing !== null ? (
          <>
            <Text variant="display" color={tone}>
              {Math.round(bearing)}°
            </Text>
            <Text variant="bodyMedium" color={isAligned ? c.success : c.text}>
              {heading === null
                ? 'Pusula bekleniyor…'
                : isAligned
                  ? 'Kıbleye dönüksün ✓'
                  : `${Math.abs(Math.round(diff!))}° ${diff! > 0 ? 'sağa' : 'sola'} dön`}
            </Text>
          </>
        ) : (
          <Text tone="muted">{loading ? 'Konum alınıyor…' : 'Konum bekleniyor'}</Text>
        )}

        {compass.needsGesture && <Button title="Pusulayı başlat" icon={Compass} onPress={compass.start} />}
      </Card>

      {pos && (
        <Card style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MapPin size={16} color={c.textMuted} />
            <Text variant="bodyMedium" style={{ flex: 1 }}>
              {pos.place || `${pos.lat.toFixed(4)}, ${pos.lon.toFixed(4)}`}
            </Text>
          </View>
          <Text variant="caption" tone="muted">
            Kâbe’ye uzaklık:{' '}
            <Text variant="caption" style={{ fontFamily: font.semibold }}>
              {Math.round(distanceKm(pos.lat, pos.lon)).toLocaleString('tr-TR')} km
            </Text>
          </Text>
        </Card>
      )}
      {(error || compass.error) && (
        <Text variant="caption" tone="danger">
          {error || compass.error}
        </Text>
      )}
      <Button title="Konumu yenile" icon={LocateFixed} variant="outline" onPress={locate} loading={loading} />
      <View style={[styles.tip, { backgroundColor: c.surfaceMuted }]}>
        <Text variant="caption" tone="muted">
          İpucu: Telefonu düz tut, metal ve mıknatıslardan uzaklaş. Sapma olursa telefonu havada 8 çizerek pusulayı kalibre et. Yön, gerçek kuzeye
          göre büyük daire formülüyle hesaplanır.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tip: { padding: 14, borderRadius: 14 },
});
