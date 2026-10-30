import * as SecureStore from 'expo-secure-store';

// Session storage backed by the OS keychain/keystore. SecureStore values are size-limited,
// so long values (Supabase sessions) are split into chunks.
const CHUNK = 1800;

const key = (k: string) => k.replace(/[^A-Za-z0-9._-]/g, '_');

export const secureStorage = {
  async getItem(k: string) {
    const base = key(k);
    const count = await SecureStore.getItemAsync(`${base}__n`);
    if (count === null) return SecureStore.getItemAsync(base);
    let out = '';
    for (let i = 0; i < Number(count); i++) out += (await SecureStore.getItemAsync(`${base}__${i}`)) ?? '';
    return out;
  },
  async setItem(k: string, value: string) {
    const base = key(k);
    await this.removeItem(k);
    const parts = Math.ceil(value.length / CHUNK);
    for (let i = 0; i < parts; i++) await SecureStore.setItemAsync(`${base}__${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK));
    await SecureStore.setItemAsync(`${base}__n`, String(parts));
  },
  async removeItem(k: string) {
    const base = key(k);
    const count = await SecureStore.getItemAsync(`${base}__n`);
    if (count !== null) {
      for (let i = 0; i < Number(count); i++) await SecureStore.deleteItemAsync(`${base}__${i}`);
      await SecureStore.deleteItemAsync(`${base}__n`);
    }
    await SecureStore.deleteItemAsync(base);
  },
};
