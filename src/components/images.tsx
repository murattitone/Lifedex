import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useUserId } from '@/lib/auth';
import { notify } from '@/lib/confirm';
import { uploadImage, useSignedUrls } from '@/lib/data';
import { radius, useTheme } from '@/lib/theme';
import { Text } from './ui/text';

export function ImageStrip({ paths, onRemove, size = 96 }: { paths: string[]; onRemove?: (p: string) => void; size?: number }) {
  const { c } = useTheme();
  const { data: urls } = useSignedUrls(paths);
  const [preview, setPreview] = useState<string | null>(null);
  if (!paths.length) return null;
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {paths.map((p) => (
          <Pressable key={p} onPress={() => urls?.[p] && setPreview(urls[p])}>
            <Image
              source={urls?.[p]}
              style={{ width: size, height: size, borderRadius: radius.md, backgroundColor: c.surfaceMuted }}
              contentFit="cover"
              transition={150}
            />
            {onRemove && (
              <Pressable style={styles.remove} onPress={() => onRemove(p)} hitSlop={8} accessibilityLabel="Görseli kaldır">
                <X size={14} color="#fff" />
              </Pressable>
            )}
          </Pressable>
        ))}
      </ScrollView>
      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <Pressable style={styles.preview} onPress={() => setPreview(null)}>
          {preview && <Image source={preview} style={{ width: '100%', height: '85%' }} contentFit="contain" />}
        </Pressable>
      </Modal>
    </>
  );
}

export function ImagePickerField({ value, onChange }: { value: string[]; onChange: (paths: string[]) => void }) {
  const { c } = useTheme();
  const uid = useUserId();
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: true, selectionLimit: 6 });
    if (res.canceled) return;
    setBusy(true);
    try {
      const uploaded: string[] = [];
      for (const a of res.assets) uploaded.push(await uploadImage(uid, a.uri, a.mimeType ?? 'image/jpeg'));
      onChange([...value, ...uploaded]);
    } catch (e) {
      notify('Yükleme başarısız', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <ImageStrip paths={value} onRemove={(p) => onChange(value.filter((x) => x !== p))} />
      <Pressable onPress={pick} disabled={busy} style={[styles.add, { borderColor: c.borderStrong, backgroundColor: c.surfaceMuted }]}>
        {busy ? <ActivityIndicator color={c.textMuted} /> : <ImagePlus size={18} color={c.textMuted} />}
        <Text variant="label" tone="muted">
          {busy ? 'Yükleniyor…' : 'Görsel ekle'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  remove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  preview: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
});
