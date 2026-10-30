import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ArrowUpRight } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { fmt } from '@/lib/date';
import { supabase } from '@/lib/supabase';
import { font, radius, useTheme } from '@/lib/theme';
import type { AlertRow } from '@/lib/types';

type Block = { type: 'p' | 'h' | 'quote' | 'li'; text: string };
type Article = { title: string; byline: string | null; site: string | null; image: string | null; url: string; blocks: Block[] };

/** In-app reader for news alerts: text is extracted server-side (article function) and set in the app's own typography. */
export default function NewsReader() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();

  const alert = useQuery({
    queryKey: ['alert', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('alerts').select('*').eq('id', id).single();
      if (error) throw new Error(error.message);
      return data as AlertRow;
    },
  });
  const article = useQuery({
    queryKey: ['article', id],
    staleTime: Infinity,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<Article & { error?: string }>('article', { body: { id } });
      if (error) throw new Error(error.message);
      if (!data || data.error) throw new Error(data?.error ?? 'Haber okunamadı');
      return data;
    },
  });

  const a = article.data;
  const src = alert.data?.url ?? a?.url;
  const host = src ? src.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : '';
  const openSource = () => src && WebBrowser.openBrowserAsync(src);

  return (
    <Screen
      title={a?.title || alert.data?.title || 'Haber'}
      subtitle={[a?.site ?? host, alert.data ? fmt(alert.data.starts_on, 'd MMMM yyyy') : null].filter(Boolean).join(' · ')}
      back
      footer={src ? <Button title={`Kaynakta aç · ${host}`} icon={ArrowUpRight} variant="outline" onPress={openSource} /> : undefined}>
      {a?.byline ? (
        <Text variant="caption" tone="muted">
          {a.byline}
        </Text>
      ) : null}

      {alert.data?.body ? (
        <View style={[styles.summary, { borderLeftColor: c.signal }]}>
          <Text variant="overline" tone="signal">
            Özet
          </Text>
          <Text variant="bodyMedium">{alert.data.body}</Text>
        </View>
      ) : null}

      {a?.image ? <Image source={a.image} style={[styles.image, { backgroundColor: c.surfaceMuted }]} contentFit="cover" transition={200} /> : null}

      {article.isLoading && (
        <View style={styles.loading}>
          <ActivityIndicator color={c.textMuted} />
          <Text variant="caption" tone="muted">
            Haber metni hazırlanıyor…
          </Text>
        </View>
      )}

      {article.isError && (
        <View style={{ gap: 10 }}>
          <Text tone="muted">Bu haberin metni uygulama içinde gösterilemedi ({article.error.message}). Kaynağında okuyabilirsin.</Text>
          <Button
            title="Tekrar dene"
            variant="ghost"
            size="sm"
            style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }}
            onPress={() => article.refetch()}
          />
        </View>
      )}

      {a?.blocks.map((b, i) => {
        if (b.type === 'h')
          return (
            <Text key={i} variant="heading" style={{ marginTop: 8 }}>
              {b.text}
            </Text>
          );
        if (b.type === 'quote')
          return (
            <View key={i} style={[styles.quote, { borderLeftColor: c.text }]}>
              <Text style={styles.reading}>{b.text}</Text>
            </View>
          );
        if (b.type === 'li')
          return (
            <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
              <Text style={styles.reading}>—</Text>
              <Text style={[styles.reading, { flex: 1 }]}>{b.text}</Text>
            </View>
          );
        return (
          <Text key={i} style={styles.reading}>
            {b.text}
          </Text>
        );
      })}

      {a && a.blocks.length === 0 && <Text tone="muted">Bu sayfada okunabilir metin bulunamadı. Kaynağında açabilirsin.</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  reading: { fontFamily: font.regular, fontSize: 17, lineHeight: 27 },
  summary: { borderLeftWidth: 2, paddingLeft: 14, gap: 6 },
  image: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.md },
  quote: { borderLeftWidth: 2, paddingLeft: 14 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 20 },
});
