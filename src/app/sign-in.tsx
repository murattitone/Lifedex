import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import { Droplets, Dumbbell, Lightbulb, MoonStar, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconTile, Segmented } from '@/components/ui/misc';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/lib/auth';
import { notify } from '@/lib/confirm';
import { supabase } from '@/lib/supabase';
import { radius, useTheme } from '@/lib/theme';

export default function SignIn() {
  const { session } = useAuth();
  const { c, accent, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Redirect href="/" />;

  const submit = async () => {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Geçerli bir e-posta gir.');
    if (password.length < 8) return setError('Şifre en az 8 karakter olmalı.');
    setBusy(true);
    try {
      if (mode === 'in') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim() || undefined } },
        });
        if (error) throw error;
        if (!data.session) notify('E-postanı kontrol et', 'Hesabını etkinleştirmek için gönderdiğimiz bağlantıya tıkla.');
      }
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg.includes('Invalid login') ? 'E-posta veya şifre hatalı.' : msg);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Şifre sıfırlamak için e-postanı yaz.');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) setError(error.message);
    else notify('Bağlantı gönderildi', 'Şifreni sıfırlamak için e-postanı kontrol et.');
  };

  const tiles = [
    { icon: Dumbbell, a: accent('blue') },
    { icon: MoonStar, a: accent('teal') },
    { icon: Lightbulb, a: accent('amber') },
    { icon: Droplets, a: accent('sky') },
  ];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.background }}>
      <LinearGradient colors={isDark ? ['#16203D', c.background] : ['#DCE6FF', c.background]} style={[StyleSheet.absoluteFill, { height: 420 }]} />
      <ScrollView
        contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {tiles.map((t, i) => (
            <IconTile key={i} icon={t.icon} color={t.a.strong} bg={t.a.soft} size={46} />
          ))}
        </View>
        <View style={{ gap: 8 }}>
          <Text variant="display">Hayat</Text>
          <Text tone="muted">Sporun, mutfağın, ibadetin, fikirlerin ve hedeflerin — tek, sade bir yerde.</Text>
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'in', label: 'Giriş yap' },
              { value: 'up', label: 'Hesap oluştur' },
            ]}
          />
          {mode === 'up' && <Input label="Adın" value={name} onChangeText={setName} placeholder="Adın" autoComplete="name" />}
          <Input
            label="E-posta"
            value={email}
            onChangeText={setEmail}
            placeholder="ornek@mail.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Input
            label="Şifre"
            value={password}
            onChangeText={setPassword}
            placeholder="En az 8 karakter"
            secureTextEntry
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            onSubmitEditing={submit}
          />
          {error && (
            <Text variant="caption" tone="danger">
              {error}
            </Text>
          )}
          <Button title={mode === 'in' ? 'Giriş yap' : 'Hesap oluştur'} onPress={submit} loading={busy} size="lg" />
          {mode === 'in' && <Button title="Şifremi unuttum" variant="ghost" size="sm" onPress={reset} />}
        </View>

        <View style={styles.secure}>
          <ShieldCheck size={16} color={c.success} />
          <Text variant="caption" tone="muted" style={{ flex: 1 }}>
            Verilerin satır düzeyinde güvenlikle yalnızca sana açık; oturumun cihazın güvenli kasasında saklanır.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, gap: 24, width: '100%', maxWidth: 480, alignSelf: 'center' },
  card: { gap: 14, padding: 18, borderRadius: radius.xl, borderWidth: 1 },
  secure: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 4 },
});
