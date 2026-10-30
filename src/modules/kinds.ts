import {
  BookMarked,
  CalendarHeart,
  ChefHat,
  Clapperboard,
  CookingPot,
  Lightbulb,
  ListTodo,
  NotebookPen,
  ShoppingBasket,
  Sparkles,
  Target,
  Tv,
  type LucideIcon,
} from 'lucide-react-native';

import type { Accent } from '@/lib/theme';

export type FieldType =
  'text' | 'textarea' | 'number' | 'rating' | 'score' | 'select' | 'date' | 'datetime' | 'reminder' | 'toggle' | 'tags' | 'list' | 'images';

export type Field = {
  key: string; // core column (title, body, status, rating, favorite, due_at, tags) or a key inside items.data
  type: FieldType;
  label: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
};

export type KindDef = {
  kind: string;
  module: string;
  label: string;
  icon: LucideIcon;
  accent: Accent;
  fields: Field[];
  defaults?: Record<string, unknown>;
  favorite?: boolean;
};

export const CORE_KEYS = ['title', 'body', 'status', 'rating', 'favorite', 'due_at', 'tags'] as const;

const REMINDER: Field = { key: 'remind_offset', type: 'reminder', label: 'Hatırlatma' };
const TAGS: Field = { key: 'tags', type: 'tags', label: 'Etiketler', placeholder: 'virgülle ayır' };
const IMAGES: Field = { key: 'images', type: 'images', label: 'Görseller / ekran görüntüleri' };

export const REMINDER_OPTIONS = [
  { value: '-1', label: 'Yok' },
  { value: '0', label: 'Zamanında' },
  { value: '10', label: '10 dk önce' },
  { value: '60', label: '1 saat önce' },
  { value: '1440', label: '1 gün önce' },
];

const watchStatus = (inProgress?: string) => [
  { value: 'wishlist', label: 'İstek listesi' },
  ...(inProgress ? [{ value: 'in_progress', label: inProgress }] : []),
  { value: 'done', label: 'Tamamlandı' },
];

export const IDEA_STATUS = [
  { value: 'new', label: 'Yeni' },
  { value: 'research', label: 'Araştırılıyor' },
  { value: 'building', label: 'Geliştiriliyor' },
  { value: 'launched', label: 'Hayata geçti' },
  { value: 'parked', label: 'Rafa kalktı' },
];

export const SHOPPING_CATEGORIES = [
  { value: 'manav', label: 'Manav' },
  { value: 'kasap', label: 'Et & tavuk' },
  { value: 'sut', label: 'Süt & kahvaltılık' },
  { value: 'kuru', label: 'Kuru gıda' },
  { value: 'icecek', label: 'İçecek' },
  { value: 'temizlik', label: 'Temizlik' },
  { value: 'diger', label: 'Diğer' },
];

export const KINDS: KindDef[] = [
  {
    kind: 'task',
    module: 'planner',
    label: 'Görev',
    icon: ListTodo,
    accent: 'rose',
    defaults: { status: 'todo', data: { remind_offset: '0', priority: 'normal' } },
    fields: [
      { key: 'title', type: 'text', label: 'Başlık', placeholder: 'Ne yapılacak?', required: true },
      { key: 'due_at', type: 'datetime', label: 'Tarih ve saat' },
      REMINDER,
      { key: 'alarm', type: 'toggle', label: 'Alarm gibi çalsın (yüksek öncelikli bildirim)' },
      {
        key: 'priority',
        type: 'select',
        label: 'Öncelik',
        options: [
          { value: 'low', label: 'Düşük' },
          { value: 'normal', label: 'Normal' },
          { value: 'high', label: 'Yüksek' },
        ],
      },
      { key: 'body', type: 'textarea', label: 'Not', placeholder: 'Detaylar…' },
      TAGS,
    ],
  },
  {
    kind: 'special_day',
    module: 'planner',
    label: 'Özel gün',
    icon: CalendarHeart,
    accent: 'rose',
    defaults: { data: { yearly: true, remind_offset: '1440' } },
    fields: [
      { key: 'title', type: 'text', label: 'Ne günü?', placeholder: 'ör. Annemin doğum günü', required: true },
      { key: 'due_at', type: 'date', label: 'Tarih' },
      { key: 'yearly', type: 'toggle', label: 'Her yıl tekrarla' },
      REMINDER,
      { key: 'body', type: 'textarea', label: 'Not', placeholder: 'Hediye fikri, plan…' },
    ],
  },
  {
    kind: 'note',
    module: 'notes',
    label: 'Not',
    icon: NotebookPen,
    accent: 'slate',
    favorite: true,
    fields: [{ key: 'title', type: 'text', label: 'Başlık', required: true }, { key: 'body', type: 'textarea', label: 'Not' }, IMAGES, TAGS],
  },
  {
    kind: 'shopping',
    module: 'kitchen',
    label: 'Alışveriş',
    icon: ShoppingBasket,
    accent: 'orange',
    defaults: { status: 'todo', data: { category: 'diger' } },
    fields: [
      { key: 'title', type: 'text', label: 'Ürün', placeholder: 'ör. Domates', required: true },
      { key: 'qty', type: 'text', label: 'Miktar', placeholder: 'ör. 1 kg' },
      { key: 'category', type: 'select', label: 'Reyon', options: SHOPPING_CATEGORIES },
      { key: 'body', type: 'textarea', label: 'Not' },
    ],
  },
  {
    kind: 'recipe',
    module: 'kitchen',
    label: 'Tarif',
    icon: ChefHat,
    accent: 'orange',
    favorite: true,
    fields: [
      { key: 'title', type: 'text', label: 'Tarif adı', required: true },
      { key: 'duration', type: 'number', label: 'Süre (dk)' },
      { key: 'servings', type: 'number', label: 'Kaç kişilik' },
      { key: 'ingredients', type: 'list', label: 'Malzemeler', placeholder: 'Malzeme ekle' },
      { key: 'body', type: 'textarea', label: 'Yapılışı' },
      { key: 'url', type: 'text', label: 'Kaynak bağlantısı', placeholder: 'https://' },
      IMAGES,
      TAGS,
    ],
  },
  {
    kind: 'meal_plan',
    module: 'kitchen',
    label: 'Yemek planı',
    icon: CookingPot,
    accent: 'orange',
    defaults: { data: { remind_offset: '0', alarm: true } },
    fields: [
      { key: 'title', type: 'text', label: 'Ne pişecek?', required: true },
      { key: 'due_at', type: 'datetime', label: 'Pişirme zamanı' },
      REMINDER,
      { key: 'alarm', type: 'toggle', label: 'Alarm' },
      { key: 'body', type: 'textarea', label: 'Not', placeholder: 'Önceden çözülecekler, hazırlık…' },
    ],
  },
  {
    kind: 'verse',
    module: 'faith',
    label: 'Ayet',
    icon: Sparkles,
    accent: 'teal',
    favorite: true,
    fields: [
      { key: 'title', type: 'text', label: 'Sure / ayet', placeholder: 'ör. Bakara 286', required: true },
      { key: 'arabic', type: 'textarea', label: 'Arapça metin (isteğe bağlı)' },
      { key: 'body', type: 'textarea', label: 'Meal' },
      { key: 'note', type: 'textarea', label: 'Benim için anlamı' },
      IMAGES,
      TAGS,
    ],
  },
  {
    kind: 'book',
    module: 'growth',
    label: 'Kitap',
    icon: BookMarked,
    accent: 'violet',
    defaults: { status: 'wishlist' },
    favorite: true,
    fields: [
      { key: 'title', type: 'text', label: 'Kitap adı', required: true },
      { key: 'creator', type: 'text', label: 'Yazar' },
      { key: 'status', type: 'select', label: 'Durum', options: watchStatus('Okunuyor') },
      { key: 'total_pages', type: 'number', label: 'Sayfa sayısı' },
      { key: 'current_page', type: 'number', label: 'Kaldığım sayfa' },
      { key: 'rating', type: 'rating', label: 'Puanım' },
      { key: 'body', type: 'textarea', label: 'Notlarım', placeholder: 'Altını çizdiklerim, düşüncelerim…' },
      TAGS,
    ],
  },
  {
    kind: 'movie',
    module: 'growth',
    label: 'Film',
    icon: Clapperboard,
    accent: 'violet',
    defaults: { status: 'wishlist' },
    favorite: true,
    fields: [
      { key: 'title', type: 'text', label: 'Film adı', required: true },
      { key: 'creator', type: 'text', label: 'Yönetmen' },
      { key: 'year', type: 'number', label: 'Yıl' },
      { key: 'status', type: 'select', label: 'Durum', options: watchStatus() },
      { key: 'rating', type: 'rating', label: 'Puanım' },
      { key: 'body', type: 'textarea', label: 'Notlarım' },
      TAGS,
    ],
  },
  {
    kind: 'series',
    module: 'growth',
    label: 'Dizi',
    icon: Tv,
    accent: 'violet',
    defaults: { status: 'wishlist' },
    favorite: true,
    fields: [
      { key: 'title', type: 'text', label: 'Dizi adı', required: true },
      { key: 'status', type: 'select', label: 'Durum', options: watchStatus('İzleniyor') },
      { key: 'progress', type: 'text', label: 'Kaldığım yer', placeholder: 'ör. S2 B5' },
      { key: 'rating', type: 'rating', label: 'Puanım' },
      { key: 'body', type: 'textarea', label: 'Notlarım' },
      TAGS,
    ],
  },
  {
    kind: 'idea',
    module: 'ideas',
    label: 'Fikir',
    icon: Lightbulb,
    accent: 'amber',
    defaults: { status: 'new', data: { potential: 3, effort: 3, excitement: 3 } },
    favorite: true,
    fields: [
      { key: 'title', type: 'text', label: 'Fikir', required: true },
      { key: 'body', type: 'textarea', label: 'Açıklama' },
      { key: 'problem', type: 'textarea', label: 'Çözdüğü problem' },
      { key: 'audience', type: 'text', label: 'Hedef kitle' },
      { key: 'status', type: 'select', label: 'Aşama', options: IDEA_STATUS },
      { key: 'potential', type: 'score', label: 'Potansiyel' },
      { key: 'effort', type: 'score', label: 'Gereken efor' },
      { key: 'excitement', type: 'score', label: 'Heyecanım' },
      { key: 'evaluation', type: 'textarea', label: 'Düşünceler ve değerlendirme' },
      { key: 'next_step', type: 'text', label: 'Sonraki adım' },
      TAGS,
    ],
  },
  {
    kind: 'goal',
    module: 'goals',
    label: 'Hedef',
    icon: Target,
    accent: 'green',
    defaults: { status: 'active' },
    fields: [
      { key: 'title', type: 'text', label: 'Hedef', placeholder: 'ör. Yeni bilgisayar', required: true },
      { key: 'target_amount', type: 'number', label: 'Hedef tutar' },
      { key: 'start_amount', type: 'number', label: 'Şu anki birikim' },
      { key: 'due_at', type: 'date', label: 'Hedef tarihi' },
      { key: 'body', type: 'textarea', label: 'Neden önemli?' },
    ],
  },
];

export const kindDef = (kind: string) => KINDS.find((k) => k.kind === kind);
export const kindsOf = (module: string) => KINDS.filter((k) => k.module === module);

/** Turns a module-defined score (1-5) into a single idea score: high potential & excitement, low effort. */
export function ideaScore(data: Record<string, any>) {
  const p = Number(data.potential ?? 3);
  const e = Number(data.effort ?? 3);
  const x = Number(data.excitement ?? 3);
  return Math.round(((p * 2 + x + (6 - e)) / 20) * 100);
}
