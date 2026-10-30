import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import {
  BellRing,
  BookOpenText,
  Copy,
  Droplets,
  Fingerprint,
  KeyRound,
  LogOut,
  MonitorSmartphone,
  Plug,
  ShieldCheck,
  Trash2,
} from 'lucide-react-native';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge, ChipSelect, Divider, ListRow, SectionHeader, SwitchRow } from '@/components/ui/misc';
import { Screen } from '@/components/ui/screen';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/lib/auth';
import { confirm, notify } from '@/lib/confirm';
import { createApiToken, revokeApiToken, useApiTokens, useProfile, useSettings, useUpdateProfile } from '@/lib/data';
import { fromNow } from '@/lib/date';
import { useAppLock } from '@/lib/lock';
import { ensureNotificationSetup, notificationsSupported } from '@/lib/notifications';
import { MCP_URL, supabase } from '@/lib/supabase';
import { font, useTheme } from '@/lib/theme';

export default function Me() {
  const { session } = useAuth();
  const { data: profile } = useProfile();
  return (
    <Screen title="Profil" subtitle={session?.user.email} dock>
      {profile && <ProfileCard key={profile.id} displayName={profile.display_name ?? ''} />}
      <NotificationSettings />
      <SecuritySettings />
      <McpSettings />

      <Text variant="caption" tone="subtle" style={{ textAlign: 'center' }}>
        Hayat v{Constants.expoConfig?.version ?? '1.0.0'}
      </Text>
    </Screen>
  );
}

function ProfileCard({ displayName }: { displayName: string }) {
  const settings = useSettings();
  const update = useUpdateProfile();
  const [name, setName] = useState(displayName);
  const [goals, setGoals] = useState({
    water: String(settings.water_goal),
    protein: String(settings.protein_goal),
    pages: String(settings.pages_goal),
  });

  const saveProfile = () =>
    update.mutate(
      {
        display_name: name.trim(),
        settings: {
          water_goal: Number(goals.water) || 2500,
          protein_goal: Number(goals.protein) || 120,
          pages_goal: Number(goals.pages) || 20,
        },
      },
      { onSuccess: () => notify('Kaydedildi') },
    );

  return (
    <Card style={{ gap: 14 }}>
      <Input label="Adın" value={name} onChangeText={setName} />
      <Text variant="label" tone="muted">
        Günlük hedefler
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Input label="Su (ml)" keyboardType="number-pad" value={goals.water} onChangeText={(v) => setGoals({ ...goals, water: v })} />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Protein (g)" keyboardType="number-pad" value={goals.protein} onChangeText={(v) => setGoals({ ...goals, protein: v })} />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Sayfa" keyboardType="number-pad" value={goals.pages} onChangeText={(v) => setGoals({ ...goals, pages: v })} />
        </View>
      </View>
      <Button title="Kaydet" onPress={saveProfile} loading={update.isPending} />
    </Card>
  );
}

function NotificationSettings() {
  const settings = useSettings();
  const update = useUpdateProfile();
  const water = settings.water_reminder!;
  const reading = settings.reading_reminder!;
  const enable = async (fn: () => void) => {
    if (await ensureNotificationSetup()) fn();
    else notify('Bildirim izni gerekli', 'Ayarlar > Uygulamalar > Hayat > Bildirimler kısmından izin ver.');
  };

  return (
    <>
      <SectionHeader title="Bildirimler" />
      <Card style={{ gap: 4 }}>
        {!notificationsSupported && (
          <Text variant="caption" tone="warning" style={{ marginBottom: 6 }}>
            Zamanlanmış bildirimler mobil uygulamada çalışır. Web’de ayarlar kaydedilir ve telefonuna uygulanır.
          </Text>
        )}
        <SwitchRow
          icon={Droplets}
          label="Su hatırlatıcısı"
          hint={`${water.start}:00 – ${water.end}:00 arası, ${water.every} saatte bir`}
          value={water.enabled}
          onChange={(v) => enable(() => update.mutate({ settings: { water_reminder: { ...water, enabled: v } } }))}
        />
        {water.enabled && (
          <ChipSelect
            value={String(water.every)}
            onChange={(v) => update.mutate({ settings: { water_reminder: { ...water, every: Number(v) } } })}
            options={['1', '2', '3'].map((v) => ({ value: v, label: `${v} saatte bir` }))}
          />
        )}
        <Divider />
        <SwitchRow
          icon={BookOpenText}
          label="Okuma hatırlatıcısı"
          hint={`Her gün ${String(reading.hour).padStart(2, '0')}:${String(reading.minute).padStart(2, '0')} · hedef ${settings.pages_goal} sayfa`}
          value={reading.enabled}
          onChange={(v) => enable(() => update.mutate({ settings: { reading_reminder: { ...reading, enabled: v } } }))}
        />
        {reading.enabled && (
          <ChipSelect
            value={String(reading.hour)}
            onChange={(v) => update.mutate({ settings: { reading_reminder: { ...reading, hour: Number(v), minute: 0 } } })}
            options={['7', '12', '20', '21', '22', '23'].map((v) => ({ value: v, label: `${v}:00` }))}
          />
        )}
        <Divider />
        <SwitchRow
          icon={BellRing}
          label="Önemli günler"
          hint="Bayram, tatil, indirim ve özel günlerde bildir"
          value={settings.alert_notifications !== false}
          onChange={(v) => update.mutate({ settings: { alert_notifications: v } })}
        />
      </Card>
    </>
  );
}

function SecuritySettings() {
  const lock = useAppLock();
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);

  const changePassword = async () => {
    if (pw.length < 8) return notify('Şifre en az 8 karakter olmalı');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return notify('Değiştirilemedi', error.message);
    setPw('');
    setPwOpen(false);
    notify('Şifren güncellendi');
  };

  return (
    <>
      <SectionHeader title="Güvenlik" />
      <Card style={{ gap: 4 }}>
        {Platform.OS !== 'web' && (
          <>
            <SwitchRow
              icon={Fingerprint}
              label="Uygulama kilidi"
              hint={lock.available ? 'Açılışta ve 30 sn arka plandan sonra parmak izi / yüz / cihaz şifresi' : 'Cihazda ekran kilidi tanımlı değil'}
              value={lock.enabled}
              onChange={(v) => lock.setEnabled(v)}
            />
            <Divider />
          </>
        )}
        <ListRow icon={KeyRound} label="Şifreyi değiştir" onPress={() => setPwOpen(true)} />
        <Divider />
        <ListRow
          icon={MonitorSmartphone}
          label="Tüm cihazlardan çıkış yap"
          hint="Kaybolan cihaz veya şüpheli durumda"
          onPress={async () => {
            if (await confirm('Tüm oturumlar kapatılsın mı?', 'Bu cihaz dahil her yerden çıkış yapılacak.', 'Çıkış yap')) {
              await supabase.auth.signOut({ scope: 'global' });
            }
          }}
        />
        <Divider />
        <ListRow icon={LogOut} label="Çıkış yap" onPress={() => supabase.auth.signOut()} />
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 }}>
          <ShieldCheck size={14} color="#16A34A" />
          <Text variant="caption" tone="muted" style={{ flex: 1 }}>
            Veriler RLS ile yalnızca hesabına açık, görseller özel depoda ve süreli bağlantılarla gösterilir.
          </Text>
        </View>
      </Card>
      <Sheet visible={pwOpen} onClose={() => setPwOpen(false)} title="Yeni şifre">
        <Input value={pw} onChangeText={setPw} secureTextEntry placeholder="En az 8 karakter" autoComplete="new-password" />
        <Button title="Güncelle" onPress={changePassword} loading={busy} />
      </Sheet>
    </>
  );
}

function McpSettings() {
  const { c } = useTheme();
  const tokens = useApiTokens();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'read' | 'write'>('read');
  const [created, setCreated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try {
      const token = await createApiToken(name.trim() || 'MCP istemcisi', scope === 'write' ? ['read', 'write'] : ['read']);
      setCreated(token);
      tokens.refetch();
    } catch (e) {
      notify('Oluşturulamadı', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    notify('Kopyalandı');
  };

  const config = created
    ? JSON.stringify({ mcpServers: { hayat: { type: 'http', url: MCP_URL, headers: { Authorization: `Bearer ${created}` } } } }, null, 2)
    : '';

  const active = (tokens.data ?? []).filter((t) => !t.revoked_at);

  return (
    <>
      <SectionHeader title="MCP bağlantıları" />
      <Card style={{ gap: 10 }}>
        <Text variant="caption" tone="muted">
          Claude, Cursor gibi MCP destekleyen uygulamalar bu adresle notlarına, görevlerine ve takiplerine erişebilir. Her uygulama için ayrı anahtar
          oluştur; istediğin an iptal et.
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text variant="caption" style={{ flex: 1, fontFamily: font.medium }} numberOfLines={1}>
            {MCP_URL}
          </Text>
          <IconButton icon={Copy} size={34} onPress={() => copy(MCP_URL)} accessibilityLabel="Adresi kopyala" />
        </View>
        <Divider />
        {active.map((t) => (
          <ListRow
            key={t.id}
            icon={Plug}
            label={t.name}
            hint={`${t.token_prefix}… · ${t.last_used_at ? `son kullanım ${fromNow(t.last_used_at)}` : 'hiç kullanılmadı'}`}
            right={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Badge label={t.scopes.includes('write') ? 'okuma+yazma' : 'okuma'} />
                <IconButton
                  icon={Trash2}
                  variant="ghost"
                  size={34}
                  color={c.danger}
                  accessibilityLabel="İptal et"
                  onPress={async () => {
                    if (await confirm('Anahtar iptal edilsin mi?', `"${t.name}" artık erişemeyecek.`, 'İptal et')) {
                      await revokeApiToken(t.id);
                      tokens.refetch();
                    }
                  }}
                />
              </View>
            }
          />
        ))}
        <Button
          title="Yeni anahtar oluştur"
          icon={Plug}
          variant="secondary"
          onPress={() => {
            setCreated(null);
            setName('');
            setOpen(true);
          }}
        />
      </Card>
      <Sheet visible={open} onClose={() => setOpen(false)} title={created ? 'Anahtarın hazır' : 'Yeni MCP anahtarı'}>
        {created ? (
          <>
            <Text variant="caption" tone="warning">
              Bu anahtar yalnızca bir kez gösterilir. Güvenli bir yere kaydet.
            </Text>
            <Card flat style={{ backgroundColor: c.surfaceMuted }}>
              <Text variant="caption" style={{ fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) }} selectable>
                {config}
              </Text>
            </Card>
            <Button title="Yapılandırmayı kopyala" icon={Copy} onPress={() => copy(config)} />
            <Button title="Sadece anahtarı kopyala" variant="outline" onPress={() => copy(created)} />
          </>
        ) : (
          <>
            <Input label="İsim" value={name} onChangeText={setName} placeholder="ör. Claude Desktop" />
            <ChipSelect
              value={scope}
              onChange={setScope}
              options={[
                { value: 'read', label: 'Sadece okuma' },
                { value: 'write', label: 'Okuma + yazma' },
              ]}
            />
            <Button title="Oluştur" onPress={create} loading={busy} />
          </>
        )}
      </Sheet>
    </>
  );
}
