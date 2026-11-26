import { createClient } from '@supabase/supabase-js';
import type { Invitation, Profile, Template, TemplateConfig } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in environment');
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  db: {
    schema: 'invite_cart',
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const MEDIA_BUCKET = 'invite-cart-media';

export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  bgColor: '#0F0E0C',
  surfaceColor: '#191714',
  textColor: '#FAF4E8',
  accentColor: '#D4AF37',
  secondaryColor: '#8F6E2B',
  fontAr: 'Aref Ruqaa',
  fontEn: 'Cormorant Garamond',
  ornamentStyle: 'royal_crest',
  animationPreset: 'curtain',
  envelopeStyle: 'obsidian_wax',
  borderStyle: 'double_filigree',
  darkSurface: true,
};

export async function ensureUserProfile(
  userId: string,
  email: string | undefined,
  fullName?: string,
  preferredLang: 'ar' | 'en' = 'ar',
): Promise<Profile | null> {
  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (existing) return existing as Profile;
  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Failed to load profile:', fetchError.message);
  }

  const displayName =
    fullName?.trim() || (email ? email.split('@')[0] : '') || 'ضيف مراسم';

  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email: email ?? null,
      full_name: displayName,
      preferred_lang: preferredLang,
    })
    .select('*')
    .single();

  if (insertError) {
    console.error('Failed to create profile:', insertError.message);
    return null;
  }
  return created as Profile;
}

export async function uploadInvitationMedia(
  file: File,
  userId: string,
  folder: 'covers' | 'gallery' | 'audio' = 'gallery',
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = `${userId}/${folder}/${safeName}`;

  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function recordInvitationView(slug: string, source = 'direct'): Promise<void> {
  try {
    await supabase.rpc('record_invitation_view', {
      p_slug: slug,
      p_source: source,
    });
  } catch {
    // Non-blocking analytics call
  }
}

export function createDraftInvitationFromTemplate(
  template: Template | null,
  userId = '',
): Omit<Invitation, 'id' | 'created_at' | 'updated_at' | 'view_count'> {
  const futureDate = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);
  futureDate.setHours(20, 0, 0, 0);
  const randomCode = Math.random().toString(36).slice(2, 6);

  return {
    user_id: userId,
    template_id: template?.id ?? null,
    slug: `wedding-${randomCode}`,
    status: 'draft',
    is_featured: false,
    primary_lang: 'bilingual',
    bride_name_ar: 'نورة بنت فهد الدوسري',
    groom_name_ar: 'طارق بن عبدالعزيز العتيبي',
    bride_name_en: 'Noura Al-Dosari',
    groom_name_en: 'Tariq Al-Otaibi',
    parents_text_ar: 'تتشرف عائلتا العتيبي والدوسري بدعوتكم لحضور حفل زفاف نجليهما',
    parents_text_en:
      'Together with their families, Al-Otaibi & Al-Dosari cordially invite you to the wedding of',
    opening_verse:
      '﴿ وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً ﴾',
    invitation_title_ar: 'أفراح العتيبي والدوسري',
    invitation_title_en: 'A Royal Wedding Celebration',
    invitation_body_ar:
      'بحضوركم تكتمل فرحتنا، وبمشاركتكم تزدان ليلتنا بهجةً وسروراً. يسعدنا تشريفكم مأدبة العشاء وحفل الزفاف.',
    invitation_body_en:
      'With joyful hearts, we invite you to share in our sacred union, evening reception, and gala dinner.',
    event_date: futureDate.toISOString(),
    event_time_label: '8:00 مساءً — 12:30 منتصف الليل',
    hijri_date: 'الجمعة ١٨ جمادى الآخرة ١٤٤٨ هـ',
    venue_name_ar: 'قاعة القصر الملكي — الرياض',
    venue_name_en: 'Royal Palace Ballroom — Riyadh',
    venue_address: 'حي الهدا، طريق مكة المكرمة، الرياض',
    maps_url: 'https://maps.google.com/?q=24.6647,46.6318',
    maps_lat: 24.6647,
    maps_lng: 46.6318,
    cover_image_url: '',
    gallery_urls: [],
    schedule: [
      {
        id: 'sch-1',
        time: '8:00 PM',
        titleAr: 'استقبال الضيوف والقهوة العربية',
        titleEn: 'Welcome Reception & Arabic Coffee',
        descAr: 'الترحيب بالضيوف في البهو الرئيسي',
        descEn: 'Warm welcome in the grand foyer',
      },
      {
        id: 'sch-2',
        time: '9:15 PM',
        titleAr: 'الزفة الملكية وكلمة الترحيب',
        titleEn: 'Grand Entrance & Blessing',
        descAr: 'دخول العروسين وتبادل التهاني',
        descEn: 'Ceremonial entrance and family greetings',
      },
      {
        id: 'sch-3',
        time: '10:30 PM',
        titleAr: 'مأدبة العشاء الفاخرة',
        titleEn: 'Gala Wedding Banquet',
        descAr: 'عشاء فاخر على شرف المدعوين',
        descEn: 'Luxury banquet dinner for our guests',
      },
    ],
    theme_config: template?.config ? { ...template.config } : { ...DEFAULT_TEMPLATE_CONFIG },
    music_enabled: true,
    music_preset: 'hijaz_oud',
    music_url: '',
    rsvp_enabled: true,
    guestbook_enabled: true,
    notes_ar: 'تتوفر خدمة صف السيارات المجانية عند البوابة الرئيسية.',
    notes_en: 'Complimentary valet parking is available at the main entrance.',
  };
}
