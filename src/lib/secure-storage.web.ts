// Web: browser storage (the session token is scoped to this origin; CSP headers limit script injection).
export const secureStorage = {
  async getItem(k: string) {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  async setItem(k: string, v: string) {
    try {
      window.localStorage.setItem(k, v);
    } catch {}
  },
  async removeItem(k: string) {
    try {
      window.localStorage.removeItem(k);
    } catch {}
  },
};
