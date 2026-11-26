export type AppLang = 'ar' | 'en';

export type TemplateCategory =
  | 'royal'
  | 'classic'
  | 'modern'
  | 'islamic'
  | 'minimal'
  | 'cinematic'
  | 'gold_luxury';

export type UserRole = 'user' | 'moderator' | 'admin';
export type PlanTier = 'free' | 'royal' | 'imperial';
export type InvitationStatus = 'draft' | 'published' | 'archived';
export type RsvpAttendance = 'attending' | 'declined' | 'maybe';

export type LayoutMode = 'classic_card' | 'stage_poster' | 'split_poster';

export interface NightEventConfig {
  labelAr: string;
  labelEn: string;
  eventTitleAr: string;
  eventTitleEn: string;
  dateLabel: string;
  subDateLabel: string;
  venueAr: string;
  venueEn: string;
  icon: 'henna' | 'rings' | 'sparkles' | 'crown';
}

export interface PosterConfig {
  topRibbonAr: string;
  topRibbonEn: string;
  badgeTextAr: string;
  badgeTextEn: string;
  headlineAr: string;
  headlineEn: string;
  subHeadlineAr: string;
  subHeadlineEn: string;
  rightTitleAr: string;
  rightSubAr: string;
  leftTitleAr: string;
  leftSubAr: string;
  footerBadgeAr: string;
  cornerRightAr: string;
  cornerLeftAr: string;
  monogramText: string;
  showSpotlights: boolean;
  showFloralCorners: boolean;
  showLantern: boolean;
  showMedallions: boolean;
  twoNightsEnabled: boolean;
  night1: NightEventConfig;
  night2: NightEventConfig;
}

export interface TemplateConfig {
  bgColor: string;
  surfaceColor: string;
  textColor: string;
  accentColor: string;
  secondaryColor: string;
  fontAr: string;
  fontEn: string;
  ornamentStyle:
    | 'royal_crest'
    | 'botanical_arch'
    | 'geometric_frame'
    | 'islamic_khatam'
    | 'minimal_hairline'
    | 'starlight_arch'
    | 'imperial_foil';
  animationPreset:
    | 'curtain'
    | 'envelope'
    | 'slide_reveal'
    | 'fade_quiet'
    | 'cinematic_doors'
    | 'shimmer_reveal';
  envelopeStyle: string;
  borderStyle:
    | 'double_filigree'
    | 'hairline_gold'
    | 'architectural'
    | 'mashrabiya'
    | 'single_thin'
    | 'filigree_glow'
    | 'ornate_gold';
  darkSurface: boolean;
  layoutMode?: LayoutMode;
  poster?: PosterConfig;
}

export interface Template {
  id: string;
  slug: string;
  category: TemplateCategory;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  is_premium: boolean;
  is_active: boolean;
  sort_order: number;
  config: TemplateConfig;
  created_at: string;
  updated_at: string;
}

export interface ScheduleItem {
  id: string;
  time: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
}

export interface Invitation {
  id: string;
  user_id: string;
  template_id: string | null;
  slug: string;
  status: InvitationStatus;
  is_featured: boolean;
  primary_lang: 'ar' | 'en' | 'bilingual';
  bride_name_ar: string;
  groom_name_ar: string;
  bride_name_en: string;
  groom_name_en: string;
  parents_text_ar: string;
  parents_text_en: string;
  opening_verse: string;
  invitation_title_ar: string;
  invitation_title_en: string;
  invitation_body_ar: string;
  invitation_body_en: string;
  event_date: string;
  event_time_label: string;
  hijri_date: string;
  venue_name_ar: string;
  venue_name_en: string;
  venue_address: string;
  maps_url: string;
  maps_lat: number | null;
  maps_lng: number | null;
  cover_image_url: string;
  gallery_urls: string[];
  schedule: ScheduleItem[];
  theme_config: TemplateConfig;
  music_enabled: boolean;
  music_preset: string;
  music_url: string;
  rsvp_enabled: boolean;
  guestbook_enabled: boolean;
  notes_ar: string;
  notes_en: string;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string;
  avatar_url: string;
  role: UserRole;
  plan_tier: PlanTier;
  is_active: boolean;
  preferred_lang: AppLang;
  created_at: string;
  updated_at: string;
}

export interface RsvpRecord {
  id: string;
  invitation_id: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  attendance: RsvpAttendance;
  guests_count: number;
  wishes_message: string;
  dietary_or_note: string;
  is_wish_public: boolean;
  created_at: string;
}

export interface PublicWish {
  id: string;
  invitation_id: string;
  guest_name: string;
  attendance: RsvpAttendance;
  wishes_message: string;
  created_at: string;
}

export interface PackagePlan {
  id: PlanTier;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  price_sar: number;
  max_invitations: number;
  features_ar: string[];
  features_en: string[];
  is_active: boolean;
  sort_order: number;
}

export interface OrderRecord {
  id: string;
  user_id: string;
  package_id: PlanTier;
  status: 'pending' | 'active' | 'cancelled';
  amount: number;
  currency: string;
  payment_method: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface FontCatalogItem {
  id: string;
  family_name: string;
  display_name_ar: string;
  display_name_en: string;
  script_type: 'arabic' | 'latin' | 'both';
  category: 'calligraphy' | 'serif' | 'sans' | 'kufi';
  css_stack: string;
  is_active: boolean;
  sort_order: number;
}

export interface MediaAssetItem {
  id: string;
  uploaded_by: string | null;
  kind: 'verse' | 'music_preset' | 'background' | 'photo' | 'announcement';
  title_ar: string;
  title_en: string;
  value: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface InvitationViewEvent {
  id: number;
  invitation_id: string;
  source: string;
  viewed_at: string;
}
