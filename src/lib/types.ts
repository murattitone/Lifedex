export type Json = Record<string, any>;

export type Item = {
  id: string;
  user_id: string;
  module: string;
  kind: string;
  title: string;
  body: string | null;
  data: Json;
  tags: string[];
  status: string | null;
  rating: number | null;
  favorite: boolean;
  pinned: boolean;
  due_at: string | null;
  remind_at: string | null;
  completed_at: string | null;
  parent_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type ItemInput = Partial<Omit<Item, 'user_id' | 'created_at' | 'updated_at'>> & { module: string; kind: string };

export type Log = {
  id: string;
  kind: string;
  item_id: string | null;
  amount: number;
  unit: string | null;
  data: Json;
  day: string;
  logged_at: string;
};

export type AlertRow = {
  id: string;
  user_id: string | null;
  source_key: string;
  kind: 'holiday' | 'religious' | 'shopping' | 'special' | 'news' | 'personal';
  title: string;
  body: string | null;
  url: string | null;
  starts_on: string;
  ends_on: string | null;
  importance: number;
};

export type Settings = {
  water_goal?: number;
  protein_goal?: number;
  pages_goal?: number;
  water_reminder?: { enabled: boolean; start: number; end: number; every: number };
  reading_reminder?: { enabled: boolean; hour: number; minute: number };
  alert_notifications?: boolean;
  timezone?: string;
  currency?: string;
};

export type Profile = { id: string; display_name: string | null; settings: Settings };

export type ApiToken = {
  id: string;
  name: string;
  token_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};
