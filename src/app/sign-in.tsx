import { Redirect } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/misc';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/lib/auth';
import { notify } from '@/lib/confirm';
import { fmt } from '@/lib/date';
import { toHijri } from '@/lib/hijri';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';

const CONTENTS = ['Spor', 'Mutfak', 'İbadet', 'Gelişim', 'Fikirler', 'Hedefler', 'Takip', 'Plan'];

export default function SignIn() {
  const { session } = useAuth();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Redirect href="/" />;

  const now = new Date();
  const hijri = toHijri(now);

  const submit = async () => {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('E-posta adresini ad@alan.com biçiminde yaz.');
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
        if (!data.session) notify('E-postanı kontrol et', 'Hesabını etkinleştirmek için gönderdiğimiz bağlantıya dokun.');
      }
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg.includes('Invalid login') ? 'E-posta ya da şifre eşleşmedi. Şifreni unuttuysan aşağıdan sıfırlayabilirsin.' : msg);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Sıfırlama bağlantısı için önce e-posta adresini yaz.');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) setError(error.message);
    else notify('Bağlantı gönderildi', 'Şifreni yenilemek için e-postandaki bağlantıya dokun.');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.mast}>
          <Text variant="overline">Lifedex</Text>
          <Text variant="overline" tone="subtle">
            Kişisel dizin
          </Text>
        </View>
        <View style={[styles.rule, { backgroundColor: c.text }]} />

        <View style={styles.dateRow}>
          <Text variant="numeral" color={now.getDay() === 0 ? c.signal : c.text}>
            {now.getDate()}
          </Text>
          <View style={{ flex: 1, paddingBottom: 12, gap: 2 }}>
            <Text variant="overline">{fmt(now, 'EEEE')}</Text>
            <Text variant="title" style={{ textTransform: 'capitalize' }}>
              {fmt(now, 'MMMM yyyy')}
            </Text>
            <Text variant="caption" tone="muted">
              {hijri.day} {hijri.monthName} {hijri.year}
            </Text>
          </View>
        </View>

        <Text variant="body" tone="muted">
          Hayatının dizini: programın, listelerin, ayetlerin, okudukların, fikirlerin ve hedeflerin — her gün tek yaprakta.
        </Text>
        <View style={styles.contents}>
          {CONTENTS.map((t, i) => (
            <Text key={t} variant="caption" tone="subtle">
              {String(i + 1).padStart(2, '0')} {t}
            </Text>
          ))}
        </View>

        <View style={{ gap: 16, marginTop: 8 }}>
          <Segmented
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError(null);
            }}
            options={[
              { value: 'in', label: 'Giriş yap' },
              { value: 'up', label: 'Hesap oluştur' },
            ]}
          />
          {mode === 'up' && <Input label="Adın" value={name} onChangeText={setName} placeholder="Murat" autoComplete="name" />}
          <Input
            label="E-posta"
            value={email}
            onChangeText={setEmail}
            placeholder="ad@alan.com"
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
          <Button title={mode === 'in' ? 'Giriş yap' : 'Hesabı oluştur'} onPress={submit} loading={busy} size="lg" />
          {mode === 'in' && (
            <Button title="Şifremi unuttum" variant="ghost" size="sm" onPress={reset} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} />
          )}
        </View>

        <View style={[styles.hair, { backgroundColor: c.border }]} />
        <Text variant="caption" tone="subtle">
          Kayıtların yalnızca sana açık: veritabanında satır düzeyinde güvenlik, telefonda oturum cihazın güvenli kasasında.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 22, gap: 14, width: '100%', maxWidth: 480, alignSelf: 'center' },
  mast: { flexDirection: 'row', justifyContent: 'space-between' },
  rule: { height: 2 },
  hair: { height: 1, marginTop: 10 },
  dateRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 16 },
  contents: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4 },
});
