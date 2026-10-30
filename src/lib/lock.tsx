import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { LockKeyhole } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useTheme } from './theme';

// Biometric / device-passcode app lock. Re-locks after the app stays in background for LOCK_AFTER_MS.
const KEY = 'app_lock_enabled';
const LOCK_AFTER_MS = 30_000;
const isNative = Platform.OS !== 'web';

type LockCtx = { enabled: boolean; available: boolean; setEnabled: (v: boolean) => Promise<boolean> };
const Ctx = createContext<LockCtx>({ enabled: false, available: false, setEnabled: async () => false });
export const useAppLock = () => useContext(Ctx);

export function AppLockProvider({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  const [enabled, setEnabledState] = useState(false);
  const [available, setAvailable] = useState(false);
  const [locked, setLocked] = useState(isNative);
  const backgroundAt = useRef<number | null>(null);

  const unlock = useCallback(async () => {
    const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'Lifedex kilidini aç', cancelLabel: 'Vazgeç' });
    if (res.success) setLocked(false);
  }, []);

  useEffect(() => {
    if (!isNative) return;
    (async () => {
      const [hw, stored] = await Promise.all([LocalAuthentication.hasHardwareAsync(), SecureStore.getItemAsync(KEY)]);
      const level = await LocalAuthentication.getEnrolledLevelAsync();
      setAvailable(hw || level !== LocalAuthentication.SecurityLevel.NONE);
      const on = stored === '1';
      setEnabledState(on);
      if (on) unlock();
      else setLocked(false);
    })();
  }, [unlock]);

  useEffect(() => {
    if (!isNative || !enabled) return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') backgroundAt.current = Date.now();
      if (s === 'active' && backgroundAt.current && Date.now() - backgroundAt.current > LOCK_AFTER_MS) {
        setLocked(true);
        unlock();
      }
    });
    return () => sub.remove();
  }, [enabled, unlock]);

  const setEnabled = async (v: boolean) => {
    if (!isNative) return false;
    const res = await LocalAuthentication.authenticateAsync({ promptMessage: v ? 'Kilidi etkinleştir' : 'Kilidi kapat' });
    if (!res.success) return false;
    await SecureStore.setItemAsync(KEY, v ? '1' : '0');
    setEnabledState(v);
    return true;
  };

  return (
    <Ctx.Provider value={{ enabled, available, setEnabled }}>
      {children}
      {locked && (
        <View style={[StyleSheet.absoluteFill, styles.lock, { backgroundColor: c.background }]}>
          <View style={[styles.icon, { backgroundColor: c.primarySoft }]}>
            <LockKeyhole size={28} color={c.primary} />
          </View>
          <Text variant="title">Lifedex kilitli</Text>
          <Text tone="muted" style={{ textAlign: 'center' }}>
            Devam etmek için kimliğini doğrula.
          </Text>
          <Button title="Kilidi aç" onPress={unlock} style={{ marginTop: 12, alignSelf: 'stretch' }} />
        </View>
      )}
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  lock: { alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32, zIndex: 100 },
  icon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
});
