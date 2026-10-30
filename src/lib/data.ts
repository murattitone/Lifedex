import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from './auth';
import { dayKey } from './date';
import { requestNotificationSync } from './notifications';
import { supabase } from './supabase';
import type { AlertRow, ApiToken, Item, ItemInput, Log, Profile, Settings } from './types';

export type ItemFilter = {
  module?: string;
  kind?: string | string[];
  status?: string | string[];
  parentId?: string | null;
  favorite?: boolean;
  dueFrom?: string;
  dueTo?: string;
  hasDue?: boolean;
  open?: boolean;
  order?: 'created' | 'due' | 'position' | 'updated';
  limit?: number;
};

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export function useItems(filter: ItemFilter = {}, enabled = true) {
  return useQuery({
    queryKey: ['items', filter],
    enabled,
    queryFn: async () => {
      let q = supabase.from('items').select('*');
      if (filter.module) q = q.eq('module', filter.module);
      if (filter.kind) q = Array.isArray(filter.kind) ? q.in('kind', filter.kind) : q.eq('kind', filter.kind);
      if (filter.status) q = Array.isArray(filter.status) ? q.in('status', filter.status) : q.eq('status', filter.status);
      if (filter.parentId !== undefined) q = filter.parentId === null ? q.is('parent_id', null) : q.eq('parent_id', filter.parentId);
      if (filter.favorite) q = q.eq('favorite', true);
      if (filter.hasDue) q = q.not('due_at', 'is', null);
      if (filter.dueFrom) q = q.gte('due_at', filter.dueFrom);
      if (filter.dueTo) q = q.lte('due_at', filter.dueTo);
      if (filter.open) q = q.is('completed_at', null);
      switch (filter.order) {
        case 'due':
          q = q.order('due_at', { ascending: true, nullsFirst: false });
          break;
        case 'position':
          q = q.order('position').order('created_at');
          break;
        case 'updated':
          q = q.order('updated_at', { ascending: false });
          break;
        default:
          q = q.order('created_at', { ascending: false });
      }
      return unwrap<Item[]>(await q.limit(filter.limit ?? 500));
    },
  });
}

export function useItem(id?: string) {
  return useQuery({
    queryKey: ['item', id],
    enabled: !!id && id !== 'new',
    queryFn: async () => unwrap<Item>(await supabase.from('items').select('*').eq('id', id!).single()),
  });
}

export function useSaveItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ItemInput) => {
      const { id, ...rest } = input;
      if (id) return unwrap<Item>(await supabase.from('items').update(rest).eq('id', id).select().single());
      return unwrap<Item>(await supabase.from('items').insert(rest).select().single());
    },
    onSuccess: (item) => {
      qc.setQueryData(['item', item.id], item);
      qc.invalidateQueries({ queryKey: ['items'] });
      if (item.remind_at || item.due_at) requestNotificationSync();
    },
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('items').delete().eq('id', id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] });
      requestNotificationSync();
    },
  });
}

export function useToggleDone() {
  const save = useSaveItem();
  return (item: Item) =>
    save.mutate({
      id: item.id,
      module: item.module,
      kind: item.kind,
      completed_at: item.completed_at ? null : new Date().toISOString(),
      status: item.completed_at ? 'todo' : 'done',
    });
}

export type LogFilter = { kind?: string | string[]; from?: string; to?: string; itemId?: string; limit?: number };

export function useLogs(filter: LogFilter, enabled = true) {
  return useQuery({
    queryKey: ['logs', filter],
    enabled,
    queryFn: async () => {
      let q = supabase.from('logs').select('*');
      if (filter.kind) q = Array.isArray(filter.kind) ? q.in('kind', filter.kind) : q.eq('kind', filter.kind);
      if (filter.from) q = q.gte('day', filter.from);
      if (filter.to) q = q.lte('day', filter.to);
      if (filter.itemId) q = q.eq('item_id', filter.itemId);
      return unwrap<Log[]>(await q.order('logged_at', { ascending: false }).limit(filter.limit ?? 2000));
    },
  });
}

export function useAddLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (log: Partial<Log> & { kind: string; amount: number }) =>
      unwrap<Log>(
        await supabase
          .from('logs')
          .insert({ day: dayKey(), ...log })
          .select()
          .single(),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['logs'] }),
  });
}

export function useDeleteLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string | string[]) =>
      unwrap(
        await supabase
          .from('logs')
          .delete()
          .in('id', Array.isArray(ids) ? ids : [ids]),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['logs'] }),
  });
}

export const DEFAULT_SETTINGS: Required<Pick<Settings, 'water_goal' | 'protein_goal' | 'pages_goal'>> & Settings = {
  water_goal: 2500,
  protein_goal: 120,
  pages_goal: 20,
  water_reminder: { enabled: false, start: 9, end: 22, every: 2 },
  reading_reminder: { enabled: false, hour: 21, minute: 0 },
  alert_notifications: true,
  timezone: 'Europe/Istanbul',
  currency: 'TL',
};

export function useProfile() {
  const uid = useUserId();
  return useQuery({
    queryKey: ['profile', uid],
    enabled: !!uid,
    queryFn: async () => {
      const p = unwrap<Profile>(await supabase.from('profiles').select('*').eq('id', uid).single());
      return { ...p, settings: { ...DEFAULT_SETTINGS, ...p.settings } };
    },
  });
}

export function useSettings() {
  const { data } = useProfile();
  return (data?.settings ?? DEFAULT_SETTINGS) as typeof DEFAULT_SETTINGS;
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const uid = useUserId();
  return useMutation({
    mutationFn: async (patch: { display_name?: string; settings?: Settings }) => {
      const current = qc.getQueryData<Profile>(['profile', uid]);
      const body: Record<string, unknown> = {};
      if (patch.display_name !== undefined) body.display_name = patch.display_name;
      if (patch.settings) body.settings = { ...(current?.settings ?? {}), ...patch.settings };
      return unwrap<Profile>(await supabase.from('profiles').update(body).eq('id', uid).select().single());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      requestNotificationSync();
    },
  });
}

export function useAlerts(from: string, to: string) {
  return useQuery({
    queryKey: ['alerts', from, to],
    queryFn: async () =>
      unwrap<AlertRow[]>(
        await supabase
          .from('alerts')
          .select('*')
          .or(`ends_on.gte.${from},and(ends_on.is.null,starts_on.gte.${from})`)
          .lte('starts_on', to)
          .order('starts_on')
          .order('importance', { ascending: false }),
      ),
  });
}

export async function refreshAlerts() {
  try {
    await supabase.functions.invoke('alerts-sync', { body: {} });
  } catch {}
}

export function useApiTokens() {
  return useQuery({
    queryKey: ['tokens'],
    queryFn: async () =>
      unwrap<ApiToken[]>(
        await supabase
          .from('api_tokens')
          .select('id,name,token_prefix,scopes,last_used_at,revoked_at,created_at')
          .order('created_at', { ascending: false }),
      ),
  });
}

export async function createApiToken(name: string, scopes: string[]) {
  const { data, error } = await supabase.rpc('create_api_token', { p_name: name, p_scopes: scopes });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function revokeApiToken(id: string) {
  const { error } = await supabase.from('api_tokens').update({ revoked_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
}

// Attachments (private bucket, signed URLs)
export async function uploadImage(userId: string, uri: string, mime = 'image/jpeg') {
  const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const body = await (await fetch(uri)).arrayBuffer();
  const { error } = await supabase.storage.from('attachments').upload(path, body, { contentType: mime });
  if (error) throw new Error(error.message);
  return path;
}

export function useSignedUrls(paths: string[] = []) {
  return useQuery({
    queryKey: ['signed', paths],
    enabled: paths.length > 0,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from('attachments').createSignedUrls(paths, 3600);
      if (error) throw new Error(error.message);
      return Object.fromEntries(data.map((d) => [d.path, d.signedUrl]));
    },
  });
}

export async function removeFiles(paths: string[]) {
  if (paths.length) await supabase.storage.from('attachments').remove(paths);
}
