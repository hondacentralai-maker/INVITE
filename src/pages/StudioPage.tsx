import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Layers,
  MapPin,
  Monitor,
  Music,
  Palette,
  PenTool,
  Play,
  Plus,
  QrCode,
  Save,
  Share2,
  Smartphone,
  Sparkles,
  Square,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  createDraftInvitationFromTemplate,
  supabase,
  uploadInvitationMedia,
} from '../lib/supabase';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/ToastProvider';
import { LuxuryAudioPlayer, MUSIC_PRESET_OPTIONS } from '../lib/audioSynth';
import {
  buildWhatsAppShareUrl,
  downloadSvgQrCode,
  exportElementAsPdf,
  exportElementAsPng,
  extractCoordsFromMapsUrl,
} from '../lib/exportCard';
import { InvitationRenderer } from '../components/InvitationRenderer';
import { DEFAULT_POSTER_CONFIG } from '../components/PosterRenderer';
import type {
  FontCatalogItem,
  Invitation,
  LayoutMode,
  MediaAssetItem,
  PosterConfig,
  ScheduleItem,
  Template,
  TemplateConfig,
} from '../types/database';

interface StudioPageProps {
  onOpenAuth: () => void;
}

type StudioTab = 'style' | 'poster' | 'couple' | 'venue' | 'program' | 'publish';

const PALETTE_PRESETS: Array<{ nameAr: string; nameEn: string; patch: Partial<TemplateConfig> }> = [
  {
    nameAr: 'ملكي أسود وذهبي',
    nameEn: 'Obsidian & Gold',
    patch: { bgColor: '#0F0E0C', surfaceColor: '#191714', textColor: '#FAF4E8', accentColor: '#D4AF37', darkSurface: true },
  },
  {
    nameAr: 'عاجي كلاسيكي',
    nameEn: 'Classic Ivory',
    patch: { bgColor: '#FAF6EE', surfaceColor: '#FFFFFF', textColor: '#1E1A15', accentColor: '#A67C37', darkSurface: false },
  },
  {
    nameAr: 'زيتي ملكي مذهب',
    nameEn: 'Royal Olive Gold',
    patch: { bgColor: '#222D1F', surfaceColor: '#293625', textColor: '#FAF5E8', accentColor: '#DFBC70', darkSurface: true },
  },
  {
    nameAr: 'بيج أندلسي دافئ',
    nameEn: 'Andalusian Cream',
    patch: { bgColor: '#F3ECE0', surfaceColor: '#FFFDF9', textColor: '#1F1B15', accentColor: '#9E772E', darkSurface: false },
  },
  {
    nameAr: 'مرمر أبيض Minimal',
    nameEn: 'Minimal Alabaster',
    patch: { bgColor: '#FFFFFF', surfaceColor: '#FCFBF8', textColor: '#171717', accentColor: '#8C7242', darkSurface: false },
  },
  {
    nameAr: 'شامبين ذهبي فاخر',
    nameEn: 'Champagne Foil',
    patch: { bgColor: '#EFE4CE', surfaceColor: '#FFFDF7', textColor: '#21190F', accentColor: '#B9892C', darkSurface: false },
  },
];

const LOCAL_DRAFT_KEY = 'marasim_studio_pending_draft';

export const StudioPage: React.FC<StudioPageProps> = ({ onOpenAuth }) => {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const templateSlugParam = searchParams.get('template');

  const { isAr, lang, formatEventDate } = useI18n();
  const { user } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [fonts, setFonts] = useState<FontCatalogItem[]>([]);
  const [verses, setVerses] = useState<MediaAssetItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<StudioTab>('style');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewEnvelopeClosed, setPreviewEnvelopeClosed] = useState(false);
  const [mobileStudioView, setMobileStudioView] = useState<'editor' | 'preview'>('editor');

  const [draft, setDraft] = useState(() => createDraftInvitationFromTemplate(null));
  const [editingId, setEditingId] = useState<string | null>(id ?? null);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [guestTestName, setGuestTestName] = useState('');

  const audioRef = useRef<LuxuryAudioPlayer | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const qrRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    audioRef.current = new LuxuryAudioPlayer();
    return () => {
      audioRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from('templates').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('fonts_catalog').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('media_assets').select('*').eq('kind', 'verse').eq('is_active', true),
    ]).then(async ([tplRes, fontRes, verseRes]) => {
      if (!active) return;
      const loadedTemplates = (tplRes.data as Template[]) ?? [];
      setTemplates(loadedTemplates);
      setFonts((fontRes.data as FontCatalogItem[]) ?? []);
      setVerses((verseRes.data as MediaAssetItem[]) ?? []);

      if (id) {
        const { data: invData } = await supabase
          .from('invitations')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (active && invData) {
          const inv = invData as Invitation;
          setEditingId(inv.id);
          setDraft({
            user_id: inv.user_id,
            template_id: inv.template_id,
            slug: inv.slug,
            status: inv.status,
            is_featured: inv.is_featured,
            primary_lang: inv.primary_lang,
            bride_name_ar: inv.bride_name_ar,
            groom_name_ar: inv.groom_name_ar,
            bride_name_en: inv.bride_name_en,
            groom_name_en: inv.groom_name_en,
            parents_text_ar: inv.parents_text_ar,
            parents_text_en: inv.parents_text_en,
            opening_verse: inv.opening_verse,
            invitation_title_ar: inv.invitation_title_ar,
            invitation_title_en: inv.invitation_title_en,
            invitation_body_ar: inv.invitation_body_ar,
            invitation_body_en: inv.invitation_body_en,
            event_date: inv.event_date,
            event_time_label: inv.event_time_label,
            hijri_date: inv.hijri_date,
            venue_name_ar: inv.venue_name_ar,
            venue_name_en: inv.venue_name_en,
            venue_address: inv.venue_address,
            maps_url: inv.maps_url,
            maps_lat: inv.maps_lat,
            maps_lng: inv.maps_lng,
            cover_image_url: inv.cover_image_url,
            gallery_urls: inv.gallery_urls ?? [],
            schedule: inv.schedule ?? [],
            theme_config: inv.theme_config,
            music_enabled: inv.music_enabled,
            music_preset: inv.music_preset,
            music_url: inv.music_url,
            rsvp_enabled: inv.rsvp_enabled,
            guestbook_enabled: inv.guestbook_enabled,
            notes_ar: inv.notes_ar,
            notes_en: inv.notes_en,
          });
          setLoading(false);
          return;
        }
      }

      if (templateSlugParam) {
        const matched = loadedTemplates.find((t) => t.slug === templateSlugParam);
        if (matched) {
          setDraft(createDraftInvitationFromTemplate(matched));
          setLoading(false);
          return;
        }
      }

      const savedLocal = localStorage.getItem(LOCAL_DRAFT_KEY);
      if (savedLocal && !id) {
        try {
          const parsed = JSON.parse(savedLocal);
          setDraft((prev) => ({ ...prev, ...parsed }));
          setLoading(false);
          return;
        } catch {
          // Ignore malformed local draft
        }
      }

      if (loadedTemplates.length > 0) {
        setDraft(createDraftInvitationFromTemplate(loadedTemplates[0]));
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [id, templateSlugParam]);

  // Persist unsaved studio draft locally when unauthenticated so signing in keeps edits
  useEffect(() => {
    if (!id && !loading) {
      localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(draft));
    }
  }, [draft, id, loading]);

  const arabicFonts = useMemo(
    () => fonts.filter((f) => f.script_type === 'arabic' || f.script_type === 'both'),
    [fonts],
  );
  const latinFonts = useMemo(
    () => fonts.filter((f) => f.script_type === 'latin' || f.script_type === 'both'),
    [fonts],
  );

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/i/${draft.slug || 'my-wedding'}${guestTestName.trim() ? `?to=${encodeURIComponent(guestTestName.trim())}` : ''
      }`
      : '';

  const updateTheme = (patch: Partial<TemplateConfig>) => {
    setDraft((prev) => ({
      ...prev,
      theme_config: { ...prev.theme_config, ...patch },
    }));
  };

  const currentPoster: PosterConfig = {
    ...DEFAULT_POSTER_CONFIG,
    ...(draft.theme_config.poster ?? {}),
    night1: {
      ...DEFAULT_POSTER_CONFIG.night1,
      ...(draft.theme_config.poster?.night1 ?? {}),
    },
    night2: {
      ...DEFAULT_POSTER_CONFIG.night2,
      ...(draft.theme_config.poster?.night2 ?? {}),
    },
  };

  const updatePoster = (patch: Partial<PosterConfig>) => {
    updateTheme({
      poster: {
        ...currentPoster,
        ...patch,
      },
    });
  };

  const switchLayoutMode = (mode: LayoutMode) => {
    if (mode === 'stage_poster') {
      updateTheme({
        layoutMode: mode,
        bgColor: '#0D0905',
        surfaceColor: '#140E07',
        textColor: '#FFF6E5',
        accentColor: '#F5B041',
        darkSurface: true,
        poster: {
          ...currentPoster,
          showSpotlights: true,
          showMedallions: true,
          showFloralCorners: false,
          showLantern: false,
        },
      });
    } else if (mode === 'split_poster') {
      updateTheme({
        layoutMode: mode,
        bgColor: '#F3ECE0',
        surfaceColor: '#FBF6EC',
        textColor: '#1C1812',
        accentColor: '#B89246',
        darkSurface: false,
        poster: {
          ...currentPoster,
          headlineAr: currentPoster.headlineAr === 'الفرحة المنتظرة' ? 'أفراح العرب' : currentPoster.headlineAr,
          showSpotlights: false,
          showMedallions: false,
          showFloralCorners: true,
          showLantern: true,
        },
      });
    } else {
      updateTheme({ layoutMode: mode });
    }
  };

  const handleSelectTemplate = (tpl: Template) => {
    setDraft((prev) => ({
      ...prev,
      template_id: tpl.id,
      theme_config: { ...tpl.config },
    }));
    notify(
      isAr ? `تم تطبيق قالب "${tpl.name_ar}"` : `Applied "${tpl.name_en}" template`,
      'info',
    );
  };

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user) {
      onOpenAuth();
      return;
    }
    setUploadingCover(true);
    try {
      const url = await uploadInvitationMedia(file, user.id, 'covers');
      setDraft((prev) => ({ ...prev, cover_image_url: url }));
      notify(isAr ? 'تم رفع صورة الغلاف بنجاح' : 'Cover photo uploaded', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleUploadGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    if (!user) {
      onOpenAuth();
      return;
    }
    setUploadingGallery(true);
    try {
      const urls = await Promise.all(
        files.slice(0, 6).map((f) => uploadInvitationMedia(f, user.id, 'gallery')),
      );
      setDraft((prev) => ({
        ...prev,
        gallery_urls: [...prev.gallery_urls, ...urls].slice(0, 9),
      }));
      notify(isAr ? 'تمت إضافة الصور إلى المعرض' : 'Gallery photos uploaded', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gallery upload failed', 'error');
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleUploadAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user) {
      onOpenAuth();
      return;
    }
    setUploadingAudio(true);
    try {
      const url = await uploadInvitationMedia(file, user.id, 'audio');
      setDraft((prev) => ({ ...prev, music_url: url, music_enabled: true }));
      notify(isAr ? 'تم رفع الملف الصوتي بنجاح' : 'Audio file uploaded', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Audio upload failed', 'error');
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleToggleAudioPreview = async () => {
    if (!audioRef.current) return;
    if (musicPlaying) {
      audioRef.current.stop();
      setMusicPlaying(false);
    } else {
      const ok = await audioRef.current.start(draft.music_preset, draft.music_url);
      setMusicPlaying(ok);
    }
  };

  const sanitizeSlug = (raw: string) =>
    raw
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '') || `invite-${Date.now().toString(36)}`;

  const handleSaveInvitation = async (targetStatus: 'draft' | 'published') => {
    if (!user) {
      notify(
        isAr
          ? 'يرجى تسجيل الدخول لحفظ ونشر الدعوة (تم حفظ تعديلاتك مؤقتاً)'
          : 'Please sign in to save & publish (your edits are preserved)',
        'info',
      );
      onOpenAuth();
      return;
    }

    setSaving(true);
    const cleanSlug = sanitizeSlug(draft.slug);

    const payload = {
      ...draft,
      user_id: editingId ? draft.user_id || user.id : user.id,
      slug: cleanSlug,
      status: targetStatus,
    };

    if (editingId) {
      const { data, error } = await supabase
        .from('invitations')
        .update(payload)
        .eq('id', editingId)
        .select('*')
        .single();

      setSaving(false);
      if (error) {
        notify(error.message, 'error');
        return;
      }
      setDraft((prev) => ({ ...prev, slug: (data as Invitation).slug, status: targetStatus }));
      notify(
        targetStatus === 'published'
          ? isAr
            ? 'تم حفظ ونشر الدعوة بنجاح!'
            : 'Invitation saved & published!'
          : isAr
            ? 'تم حفظ التعديلات في المسودة'
            : 'Draft updated',
        'success',
      );
    } else {
      const { data, error } = await supabase
        .from('invitations')
        .insert(payload)
        .select('*')
        .single();

      setSaving(false);
      if (error) {
        if (error.code === '23505') {
          notify(
            isAr
              ? 'هذا الرابط مستخدم بالفعل، يرجى اختيار رابط آخر'
              : 'That slug is already taken, please choose another',
            'error',
          );
        } else {
          notify(error.message, 'error');
        }
        return;
      }

      const created = data as Invitation;
      localStorage.removeItem(LOCAL_DRAFT_KEY);
      setEditingId(created.id);
      setDraft((prev) => ({ ...prev, slug: created.slug, status: created.status }));
      notify(
        targetStatus === 'published'
          ? isAr
            ? 'تم نشر دعوتك بنجاح!'
            : 'Invitation published!'
          : isAr
            ? 'تم حفظ الدعوة كمسودة'
            : 'Saved as draft',
        'success',
      );
      navigate(`/studio/${created.id}`, { replace: true });
    }
  };

  const addScheduleRow = () => {
    const newRow: ScheduleItem = {
      id: `sch-${Date.now()}`,
      time: '11:00 PM',
      titleAr: 'فقرة جديدة في الحفل',
      titleEn: 'New Program Segment',
      descAr: 'تفاصيل الفقرة',
      descEn: 'Segment details',
    };
    setDraft((prev) => ({ ...prev, schedule: [...prev.schedule, newRow] }));
  };

  const updateScheduleRow = (rowId: string, patch: Partial<ScheduleItem>) => {
    setDraft((prev) => ({
      ...prev,
      schedule: prev.schedule.map((s) => (s.id === rowId ? { ...s, ...patch } : s)),
    }));
  };

  const removeScheduleRow = (rowId: string) => {
    setDraft((prev) => ({
      ...prev,
      schedule: prev.schedule.filter((s) => s.id !== rowId),
    }));
  };

  const dateInputVal = (() => {
    const d = new Date(draft.event_date);
    if (Number.isNaN(d.getTime())) return '';
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  })();

  const tabs: Array<{ id: StudioTab; icon: React.ComponentType<{ className?: string }>; ar: string; en: string }> = [
    { id: 'style', icon: Palette, ar: 'القالب والألوان', en: 'Style' },
    { id: 'poster', icon: Sparkles, ar: 'البوستر والليلتين', en: 'Poster & 2-Nights' },
    { id: 'couple', icon: Users, ar: 'العروسان والصور', en: 'Couple' },
    { id: 'venue', icon: MapPin, ar: 'الموعد والمكان', en: 'Date & Map' },
    { id: 'program', icon: Music, ar: 'البرنامج والصوت', en: 'Program & Audio' },
    { id: 'publish', icon: Share2, ar: 'النشر والمشاركة', en: 'Publish & Share' },
  ];

  if (loading) {
    return (
      <main id="main-content" className="max-w-7xl mx-auto px-4 py-12">
        <div className="h-[600px] rounded-3xl bg-[#EFE7D6] animate-pulse" />
      </main>
    );
  }

  return (
    <main id="main-content" className="max-w-[1440px] mx-auto px-2.5 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* Studio Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 rounded-2xl border border-[#B89246]/30 bg-white p-3.5 sm:px-5 sm:py-4 shadow-sm">
        <div>
          <h1
            className="text-xl sm:text-3xl font-bold text-[#151412]"
            style={{ fontFamily: isAr ? '"Amiri", serif' : '"Cormorant Garamond", serif' }}
          >
            {isAr ? 'استوديو تصميم الدعوة التفاعلية' : 'Interactive Wedding Studio'}
          </h1>
          <p className="text-[11px] sm:text-xs text-[#524B40]">
            {editingId
              ? isAr
                ? `تعديل الدعوة: /i/${draft.slug}`
                : `Editing: /i/${draft.slug}`
              : isAr
                ? 'تصميم جديد — شاهد كل تعديل مباشرة قبل النشر'
                : 'New design — watch every change live before publishing'}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSaveInvitation('draft')}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 h-10 sm:h-11 px-3 sm:px-4 rounded-xl border border-[#B89246]/45 bg-[#FAF6EE] text-[#151412] text-xs font-bold hover:bg-[#F2EADB] disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5 text-[#7C5F21]" aria-hidden="true" />
            <span>{isAr ? 'حفظ كمسودة' : 'Save Draft'}</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSaveInvitation('published')}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 h-10 sm:h-11 px-4 sm:px-5 rounded-xl bg-[#151412] text-[#FAF6EE] text-xs font-bold hover:bg-[#32402E] disabled:opacity-60 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D8B86F]" aria-hidden="true" />
            <span>{saving ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : isAr ? 'نشر الدعوة' : 'Publish Live'}</span>
          </button>

          {editingId && draft.status === 'published' && (
            <Link
              to={`/i/${draft.slug}`}
              className="inline-flex items-center justify-center gap-1 h-10 sm:h-11 px-3 sm:px-4 rounded-xl bg-[#32402E] text-[#FAF6EE] text-xs font-bold"
            >
              <span>{isAr ? 'عرض' : 'Live'}</span>
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Sticky View Mode Switcher */}
      <div className="xl:hidden sticky top-18 z-40 flex justify-center py-1">
        <div className="inline-flex p-1 rounded-full bg-[#151412] text-[#FAF6EE] shadow-xl border border-[#D8B86F]/50 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setMobileStudioView('editor')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors ${
              mobileStudioView === 'editor'
                ? 'bg-[#D8B86F] text-[#151412] shadow'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isAr ? 'تعديل المحتوى' : 'Edit Info'}</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileStudioView('preview')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors ${
              mobileStudioView === 'preview'
                ? 'bg-[#D8B86F] text-[#151412] shadow'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isAr ? 'معاينة البطاقة' : 'Live Preview'}</span>
          </button>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Controls Panel */}
        <section
          className={`xl:col-span-5 rounded-2xl sm:rounded-3xl border border-[#B89246]/30 bg-white shadow-sm overflow-hidden ${
            mobileStudioView === 'editor' ? 'block' : 'hidden xl:block'
          }`}
        >
          {/* Tabs */}
          <div
            role="tablist"
            aria-label={isAr ? 'أقسام المحرر' : 'Studio sections'}
            className="flex overflow-x-auto no-scrollbar border-b border-[#B89246]/20 bg-[#FAF6EE] scroll-smooth"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-[76px] sm:min-w-[96px] flex flex-col items-center gap-1 py-2.5 sm:py-3 px-1.5 sm:px-2 text-[10px] sm:text-xs font-bold border-b-2 transition-colors shrink-0 ${
                    selected
                      ? 'border-[#151412] bg-white text-[#151412]'
                      : 'border-transparent text-[#524B40] hover:text-[#151412]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#7C5F21]" aria-hidden="true" />
                  <span className="whitespace-nowrap">{isAr ? tab.ar : tab.en}</span>
                </button>
              );
            })}
          </div>

          <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 max-h-[calc(100dvh-13rem)] overflow-y-auto">
            {/* TAB 1: STYLE & TEMPLATE */}
            {activeTab === 'style' && (
              <div className="space-y-5 sm:space-y-6">
                {/* Layout Mode Switcher: Classic Card vs Stage Poster vs Split Poster */}
                <div className="space-y-2">
                  <span className="block text-xs sm:text-sm font-bold text-[#151412]">
                    {isAr ? 'نمط التصميم (بطاقة أم بوستر أفراح)' : 'Design Format'}
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    {(
                      [
                        { id: 'classic_card', ar: 'بطاقة رسمية', en: 'Classic Card' },
                        { id: 'stage_poster', ar: 'بوستر السهرة', en: 'Stage 3D' },
                        { id: 'split_poster', ar: 'بوستر الليلتين', en: '2-Night' },
                      ] as const
                    ).map((m) => {
                      const current = draft.theme_config.layoutMode || 'classic_card';
                      const active = current === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => switchLayoutMode(m.id)}
                          className={`py-2 px-1.5 sm:py-2.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold border transition-colors ${
                            active
                              ? 'bg-[#151412] text-[#FAF6EE] border-[#151412]'
                              : 'bg-[#FAF6EE] text-[#3A352C] border-[#B89246]/35 hover:border-[#B89246]'
                          }`}
                        >
                          {isAr ? m.ar : m.en}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2.5">
                  <h2 className="text-sm font-bold text-[#151412] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#7C5F21]" aria-hidden="true" />
                    <span>{isAr ? 'اختر قالب الأساس' : 'Base Template'}</span>
                  </h2>
                  <div className="grid grid-cols-2 gap-2.5">
                    {templates.map((tpl) => {
                      const active = draft.template_id === tpl.id;
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => handleSelectTemplate(tpl)}
                          className={`text-start p-3 rounded-xl border transition-all ${active
                              ? 'border-[#151412] ring-2 ring-[#B89246]/50 bg-[#FAF6EE]'
                              : 'border-[#B89246]/25 bg-white hover:border-[#B89246]'
                            }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span
                              className="w-5 h-5 rounded-full border border-black/15 shrink-0"
                              style={{ backgroundColor: tpl.config.bgColor }}
                            />
                            {active && <Check className="w-4 h-4 text-[#32402E]" aria-hidden="true" />}
                          </div>
                          <p className="text-[11px] sm:text-xs font-bold text-[#151412] line-clamp-2 min-h-[2rem] leading-tight">
                            {isAr ? tpl.name_ar : tpl.name_en}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color Palette Presets */}
                <div className="space-y-2.5">
                  <h2 className="text-sm font-bold text-[#151412]">
                    {isAr ? 'لوحات ألوان سريعة' : 'Curated Luxury Palettes'}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PALETTE_PRESETS.map((p) => (
                      <button
                        key={p.nameEn}
                        type="button"
                        onClick={() => updateTheme(p.patch)}
                        className="flex items-center gap-2 p-2.5 rounded-xl border border-[#B89246]/30 bg-[#FAF6EE]/60 hover:bg-[#FAF6EE] text-xs font-semibold"
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                          style={{ backgroundColor: p.patch.bgColor }}
                        />
                        <span className="truncate">{isAr ? p.nameAr : p.nameEn}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Color Pickers */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label htmlFor="c-bg" className="block text-[11px] font-bold mb-1">
                      {isAr ? 'الخلفية' : 'Background'}
                    </label>
                    <input
                      id="c-bg"
                      type="color"
                      value={draft.theme_config.bgColor}
                      onChange={(e) => updateTheme({ bgColor: e.target.value })}
                      className="w-full h-10 rounded-lg border border-[#B89246]/30 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label htmlFor="c-surface" className="block text-[11px] font-bold mb-1">
                      {isAr ? 'البطاقة' : 'Card'}
                    </label>
                    <input
                      id="c-surface"
                      type="color"
                      value={draft.theme_config.surfaceColor}
                      onChange={(e) => updateTheme({ surfaceColor: e.target.value })}
                      className="w-full h-10 rounded-lg border border-[#B89246]/30 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label htmlFor="c-accent" className="block text-[11px] font-bold mb-1">
                      {isAr ? 'الذهبي / الزخرفة' : 'Accent'}
                    </label>
                    <input
                      id="c-accent"
                      type="color"
                      value={draft.theme_config.accentColor}
                      onChange={(e) => updateTheme({ accentColor: e.target.value })}
                      className="w-full h-10 rounded-lg border border-[#B89246]/30 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label htmlFor="c-text" className="block text-[11px] font-bold mb-1">
                      {isAr ? 'لون النص' : 'Text'}
                    </label>
                    <input
                      id="c-text"
                      type="color"
                      value={draft.theme_config.textColor}
                      onChange={(e) => updateTheme({ textColor: e.target.value })}
                      className="w-full h-10 rounded-lg border border-[#B89246]/30 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Dark surface toggle + Fonts */}
                <div className="flex items-center gap-2.5">
                  <input
                    id="dark-surface-toggle"
                    type="checkbox"
                    checked={draft.theme_config.darkSurface}
                    onChange={(e) => updateTheme({ darkSurface: e.target.checked })}
                    className="w-4 h-4 accent-[#151412]"
                  />
                  <label htmlFor="dark-surface-toggle" className="text-xs font-semibold">
                    {isAr ? 'خلفية داكنة (لتحسين التباين داخل البطاقة)' : 'Dark surface mode (high contrast inner cards)'}
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="font-ar" className="block text-xs font-bold mb-1">
                      {isAr ? 'الخط العربي للأسماء' : 'Arabic Display Font'}
                    </label>
                    <select
                      id="font-ar"
                      value={draft.theme_config.fontAr}
                      onChange={(e) => updateTheme({ fontAr: e.target.value })}
                      className="w-full min-h-11 px-3 rounded-xl border border-[#B89246]/35 bg-white text-sm"
                    >
                      {arabicFonts.map((f) => (
                        <option key={f.id} value={f.family_name}>
                          {isAr ? f.display_name_ar : f.display_name_en}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="font-en" className="block text-xs font-bold mb-1">
                      {isAr ? 'الخط الإنجليزي' : 'English Display Font'}
                    </label>
                    <select
                      id="font-en"
                      value={draft.theme_config.fontEn}
                      onChange={(e) => updateTheme({ fontEn: e.target.value })}
                      className="w-full min-h-11 px-3 rounded-xl border border-[#B89246]/35 bg-white text-sm"
                    >
                      {latinFonts.map((f) => (
                        <option key={f.id} value={f.family_name}>
                          {isAr ? f.display_name_ar : f.display_name_en}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Ornament & Border Style */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="ornament-style" className="block text-xs font-bold mb-1">
                      {isAr ? 'الزخرفة والشعار' : 'Ornament Motif'}
                    </label>
                    <select
                      id="ornament-style"
                      value={draft.theme_config.ornamentStyle}
                      onChange={(e) =>
                        updateTheme({
                          ornamentStyle: e.target.value as TemplateConfig['ornamentStyle'],
                        })
                      }
                      className="w-full min-h-11 px-3 rounded-xl border border-[#B89246]/35 bg-white text-sm"
                    >
                      <option value="royal_crest">{isAr ? 'ختم ملكي' : 'Royal Crest'}</option>
                      <option value="islamic_khatam">{isAr ? 'نجمة إسلامية ثمانية' : 'Islamic Khatam Rosette'}</option>
                      <option value="botanical_arch">{isAr ? 'غصن زيتون نباتي' : 'Botanical Olive Sprig'}</option>
                      <option value="imperial_foil">{isAr ? 'تاج ذهبي فويل' : 'Imperial Gold Foil'}</option>
                      <option value="minimal_hairline">{isAr ? 'خطوط هندسية بسيطة' : 'Minimal Hairline'}</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="border-style" className="block text-xs font-bold mb-1">
                      {isAr ? 'إطار البطاقة' : 'Frame Border'}
                    </label>
                    <select
                      id="border-style"
                      value={draft.theme_config.borderStyle}
                      onChange={(e) =>
                        updateTheme({
                          borderStyle: e.target.value as TemplateConfig['borderStyle'],
                        })
                      }
                      className="w-full min-h-11 px-3 rounded-xl border border-[#B89246]/35 bg-white text-sm"
                    >
                      <option value="double_filigree">{isAr ? 'إطار مزدوج فاخر' : 'Double Filigree'}</option>
                      <option value="mashrabiya">{isAr ? 'مشربية أندلسية' : 'Andalusian Mashrabiya'}</option>
                      <option value="ornate_gold">{isAr ? 'إطار ذهبي متوهج' : 'Ornate Gold Foil'}</option>
                      <option value="architectural">{isAr ? 'خط علوي معماري' : 'Architectural Top Bar'}</option>
                      <option value="single_thin">{isAr ? 'رفيع Minimal' : 'Single Hairline'}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: POSTER & TWO-NIGHT SETTINGS */}
            {activeTab === 'poster' && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-[#B89246]/35 bg-[#FAF6EE] p-3.5 space-y-2">
                  <p className="text-xs font-bold text-[#151412]">
                    {isAr
                      ? 'تفعيل وضع البوستر الفاخر (مثل بوستر السهرة أو بوستر أفراح العرب ليلتين)'
                      : 'Poster Mode Layout'}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'stage_poster', ar: 'بوستر السهرة 3D', en: 'Stage 3D' },
                        { id: 'split_poster', ar: 'بوستر أفراح العرب', en: 'Split Heritage' },
                        { id: 'classic_card', ar: 'بطاقة كلاسيكية', en: 'Classic Card' },
                      ] as const
                    ).map((m) => {
                      const active = (draft.theme_config.layoutMode || 'classic_card') === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => switchLayoutMode(m.id)}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border ${active
                              ? 'bg-[#151412] text-[#FAF6EE] border-[#151412]'
                              : 'bg-white text-[#151412] border-[#B89246]/35'
                            }`}
                        >
                          {isAr ? m.ar : m.en}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="poster-headline" className="block text-xs font-bold mb-1">
                      {isAr ? 'العنوان الرئيسي البارز (3D / خط)' : 'Main Poster Headline'}
                    </label>
                    <input
                      id="poster-headline"
                      type="text"
                      value={currentPoster.headlineAr}
                      onChange={(e) => updatePoster({ headlineAr: e.target.value })}
                      className="w-full min-h-10 px-3 rounded-xl border border-[#B89246]/35 text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label htmlFor="poster-topribbon" className="block text-xs font-bold mb-1">
                      {isAr ? 'الشريط العلوي' : 'Top Ribbon Banner'}
                    </label>
                    <input
                      id="poster-topribbon"
                      type="text"
                      value={currentPoster.topRibbonAr}
                      onChange={(e) => updatePoster({ topRibbonAr: e.target.value })}
                      className="w-full min-h-10 px-3 rounded-xl border border-[#B89246]/35 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="poster-badge" className="block text-xs font-bold mb-1">
                      {isAr ? 'شارة الدعوة (مثل: الدعوة عامة)' : 'Sub-Badge (e.g. Open Invite)'}
                    </label>
                    <input
                      id="poster-badge"
                      type="text"
                      value={currentPoster.badgeTextAr}
                      onChange={(e) => updatePoster({ badgeTextAr: e.target.value })}
                      className="w-full min-h-10 px-3 rounded-xl border border-[#B89246]/35 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="poster-monogram" className="block text-xs font-bold mb-1">
                      {isAr ? 'أحرف الميدالية الذهبية' : 'Medallion Monogram'}
                    </label>
                    <input
                      id="poster-monogram"
                      type="text"
                      dir="ltr"
                      value={currentPoster.monogramText}
                      onChange={(e) => updatePoster({ monogramText: e.target.value })}
                      className="w-full min-h-10 px-3 rounded-xl border border-[#B89246]/35 text-sm"
                    />
                  </div>
                </div>

                {/* Stage Side Callouts */}
                <div className="rounded-2xl border border-[#B89246]/25 bg-[#FAF6EE]/60 p-3.5 space-y-3">
                  <p className="text-xs font-bold text-[#7C5F21]">
                    {isAr ? 'عبارات الجوانب (بوستر السهرة)' : 'Stage Side Callouts'}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      aria-label="Right title"
                      value={currentPoster.rightTitleAr}
                      onChange={(e) => updatePoster({ rightTitleAr: e.target.value })}
                      placeholder="أفراح بلدنا"
                      className="min-h-9 px-2.5 rounded-lg border border-[#B89246]/30 bg-white text-xs font-bold"
                    />
                    <input
                      type="text"
                      aria-label="Left title"
                      value={currentPoster.leftTitleAr}
                      onChange={(e) => updatePoster({ leftTitleAr: e.target.value })}
                      placeholder="فرحة العمر"
                      className="min-h-9 px-2.5 rounded-lg border border-[#B89246]/30 bg-white text-xs font-bold"
                    />
                    <input
                      type="text"
                      aria-label="Right subtitle"
                      value={currentPoster.rightSubAr}
                      onChange={(e) => updatePoster({ rightSubAr: e.target.value })}
                      className="min-h-9 px-2.5 rounded-lg border border-[#B89246]/30 bg-white text-xs"
                    />
                    <input
                      type="text"
                      aria-label="Left subtitle"
                      value={currentPoster.leftSubAr}
                      onChange={(e) => updatePoster({ leftSubAr: e.target.value })}
                      className="min-h-9 px-2.5 rounded-lg border border-[#B89246]/30 bg-white text-xs"
                    />
                  </div>
                  <div className="flex flex-wrap gap-4 pt-1">
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={currentPoster.showSpotlights}
                        onChange={(e) => updatePoster({ showSpotlights: e.target.checked })}
                      />
                      <span>{isAr ? 'أضواء الستيج' : 'Stage Lights'}</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={currentPoster.showMedallions}
                        onChange={(e) => updatePoster({ showMedallions: e.target.checked })}
                      />
                      <span>{isAr ? 'الميداليات المعلقة' : 'Medallions'}</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={currentPoster.showFloralCorners}
                        onChange={(e) => updatePoster({ showFloralCorners: e.target.checked })}
                      />
                      <span>{isAr ? 'باقات الزهور' : 'Floral Corners'}</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={currentPoster.showLantern}
                        onChange={(e) => updatePoster({ showLantern: e.target.checked })}
                      />
                      <span>{isAr ? 'فانوس التراث' : 'Lantern'}</span>
                    </label>
                  </div>
                </div>

                {/* Two-Night Event Editor */}
                <div className="rounded-2xl border border-[#B89246]/30 bg-white p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-[#151412]">
                      {isAr ? 'بطاقتا الليلة الأولى والليلة الثانية' : 'Two-Night Event Cards'}
                    </h2>
                    <label className="inline-flex items-center gap-2 text-xs font-bold">
                      <input
                        type="checkbox"
                        checked={currentPoster.twoNightsEnabled}
                        onChange={(e) => updatePoster({ twoNightsEnabled: e.target.checked })}
                        className="w-4 h-4 accent-[#32402E]"
                      />
                      <span>{isAr ? 'تفعيل ليلتين' : 'Two Nights'}</span>
                    </label>
                  </div>

                  {/* Night 1 */}
                  <div className="rounded-xl bg-[#FAF6EE] p-3 space-y-2 border border-[#B89246]/25">
                    <p className="text-xs font-bold text-[#7C5F21]">{isAr ? 'الليلة الأولى (الحناء / السهرة)' : 'First Night'}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        aria-label="Night 1 event title"
                        value={currentPoster.night1.eventTitleAr}
                        onChange={(e) =>
                          updatePoster({ night1: { ...currentPoster.night1, eventTitleAr: e.target.value } })
                        }
                        placeholder="حفل الحناء"
                        className="min-h-9 px-2.5 rounded-lg border border-[#B89246]/30 bg-white text-xs font-bold"
                      />
                      <input
                        type="text"
                        aria-label="Night 1 date"
                        dir="ltr"
                        value={currentPoster.night1.dateLabel}
                        onChange={(e) =>
                          updatePoster({ night1: { ...currentPoster.night1, dateLabel: e.target.value } })
                        }
                        placeholder="07/10/2026"
                        className="min-h-9 px-2.5 rounded-lg border border-[#B89246]/30 bg-white text-xs font-bold"
                      />
                      <input
                        type="text"
                        aria-label="Night 1 day"
                        value={currentPoster.night1.subDateLabel}
                        onChange={(e) =>
                          updatePoster({ night1: { ...currentPoster.night1, subDateLabel: e.target.value } })
                        }
                        placeholder="الأربعاء"
                        className="min-h-9 px-2.5 rounded-lg border border-[#B89246]/30 bg-white text-xs"
                      />
                      <input
                        type="text"
                        aria-label="Night 1 venue"
                        value={currentPoster.night1.venueAr}
                        onChange={(e) =>
                          updatePoster({ night1: { ...currentPoster.night1, venueAr: e.target.value } })
                        }
                        placeholder="أمام منزل الداعي"
                        className="min-h-9 px-2.5 rounded-lg border border-[#B89246]/30 bg-white text-xs"
                      />
                    </div>
                  </div>

                  {/* Night 2 */}
                  {currentPoster.twoNightsEnabled && (
                    <div className="rounded-xl bg-[#FAF6EE] p-3 space-y-2 border border-[#B89246]/25">
                      <p className="text-xs font-bold text-[#7C5F21]">{isAr ? 'الليلة الثانية (حفل الزفاف)' : 'Second Night'}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          aria-label="Night 2 event title"
                          value={currentPoster.night2.eventTitleAr}
                          onChange={(e) =>
                            updatePoster({ night2: { ...currentPoster.night2, eventTitleAr: e.target.value } })
                          }
                          placeholder="حفل الزفاف"
                          className="min-h-9 px-2.5 rounded-lg border border-[#B89246]/30 bg-white text-xs font-bold"
                        />
                        <input
                          type="text"
                          aria-label="Night 2 date"
                          dir="ltr"
                          value={currentPoster.night2.dateLabel}
                          onChange={(e) =>
                            updatePoster({ night2: { ...currentPoster.night2, dateLabel: e.target.value } })
                          }
                          placeholder="09/10/2026"
                          className="min-h-9 px-2.5 rounded-lg border border-[#B89246]/30 bg-white text-xs font-bold"
                        />
                        <input
                          type="text"
                          aria-label="Night 2 day"
                          value={currentPoster.night2.subDateLabel}
                          onChange={(e) =>
                            updatePoster({ night2: { ...currentPoster.night2, subDateLabel: e.target.value } })
                          }
                          placeholder="الجمعة"
                          className="min-h-9 px-2.5 rounded-lg border border-[#B89246]/30 bg-white text-xs"
                        />
                        <input
                          type="text"
                          aria-label="Night 2 venue"
                          value={currentPoster.night2.venueAr}
                          onChange={(e) =>
                            updatePoster({ night2: { ...currentPoster.night2, venueAr: e.target.value } })
                          }
                          placeholder="قاعة البوليفارد"
                          className="min-h-9 px-2.5 rounded-lg border border-[#B89246]/30 bg-white text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: COUPLE, PARENTS & PHOTOS */}
            {activeTab === 'couple' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="groom-ar" className="block text-xs font-bold mb-1">
                      {isAr ? 'اسم العريس (عربي)' : 'Groom Name (Arabic)'}
                    </label>
                    <input
                      id="groom-ar"
                      type="text"
                      value={draft.groom_name_ar}
                      onChange={(e) => setDraft({ ...draft, groom_name_ar: e.target.value })}
                      className="w-full min-h-11 px-3 rounded-xl border border-[#B89246]/35 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="bride-ar" className="block text-xs font-bold mb-1">
                      {isAr ? 'اسم العروس (عربي)' : 'Bride Name (Arabic)'}
                    </label>
                    <input
                      id="bride-ar"
                      type="text"
                      value={draft.bride_name_ar}
                      onChange={(e) => setDraft({ ...draft, bride_name_ar: e.target.value })}
                      className="w-full min-h-11 px-3 rounded-xl border border-[#B89246]/35 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="groom-en" className="block text-xs font-bold mb-1">
                      {isAr ? 'اسم العريس (إنجليزي)' : 'Groom Name (English)'}
                    </label>
                    <input
                      id="groom-en"
                      type="text"
                      dir="ltr"
                      value={draft.groom_name_en}
                      onChange={(e) => setDraft({ ...draft, groom_name_en: e.target.value })}
                      className="w-full min-h-11 px-3 rounded-xl border border-[#B89246]/35 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="bride-en" className="block text-xs font-bold mb-1">
                      {isAr ? 'اسم العروس (إنجليزي)' : 'Bride Name (English)'}
                    </label>
                    <input
                      id="bride-en"
                      type="text"
                      dir="ltr"
                      value={draft.bride_name_en}
                      onChange={(e) => setDraft({ ...draft, bride_name_en: e.target.value })}
                      className="w-full min-h-11 px-3 rounded-xl border border-[#B89246]/35 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="parents-ar" className="block text-xs font-bold mb-1">
                    {isAr ? 'أسماء الوالدين / العائلات (عربي)' : 'Parents / Families Line (Arabic)'}
                  </label>
                  <input
                    id="parents-ar"
                    type="text"
                    value={draft.parents_text_ar}
                    onChange={(e) => setDraft({ ...draft, parents_text_ar: e.target.value })}
                    className="w-full min-h-11 px-3 rounded-xl border border-[#B89246]/35 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="parents-en" className="block text-xs font-bold mb-1">
                    {isAr ? 'أسماء الوالدين / العائلات (إنجليزي)' : 'Parents / Families Line (English)'}
                  </label>
                  <input
                    id="parents-en"
                    type="text"
                    dir="ltr"
                    value={draft.parents_text_en}
                    onChange={(e) => setDraft({ ...draft, parents_text_en: e.target.value })}
                    className="w-full min-h-11 px-3 rounded-xl border border-[#B89246]/35 text-sm"
                  />
                </div>

                {/* Selectable Opening Verses */}
                {verses.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="block text-xs font-bold">
                      {isAr ? 'ترويسة قرآنية أو شعرية جاهزة:' : 'Quick Opening Verse Presets:'}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {verses.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setDraft({ ...draft, opening_verse: v.value })}
                          className="px-3 py-1.5 rounded-full border border-[#B89246]/35 bg-[#FAF6EE] text-[11px] font-bold hover:bg-[#F2EADB]"
                        >
                          {isAr ? v.title_ar : v.title_en}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="opening-verse" className="block text-xs font-bold mb-1">
                    {isAr ? 'الآية / العبارة الافتتاحية' : 'Opening Verse / Blessing'}
                  </label>
                  <textarea
                    id="opening-verse"
                    rows={2}
                    value={draft.opening_verse}
                    onChange={(e) => setDraft({ ...draft, opening_verse: e.target.value })}
                    className="w-full p-3 rounded-xl border border-[#B89246]/35 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="body-ar" className="block text-xs font-bold mb-1">
                    {isAr ? 'نص الدعوة (عربي)' : 'Invitation Body (Arabic)'}
                  </label>
                  <textarea
                    id="body-ar"
                    rows={3}
                    value={draft.invitation_body_ar}
                    onChange={(e) => setDraft({ ...draft, invitation_body_ar: e.target.value })}
                    className="w-full p-3 rounded-xl border border-[#B89246]/35 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="body-en" className="block text-xs font-bold mb-1">
                    {isAr ? 'نص الدعوة (إنجليزي)' : 'Invitation Body (English)'}
                  </label>
                  <textarea
                    id="body-en"
                    rows={2}
                    dir="ltr"
                    value={draft.invitation_body_en}
                    onChange={(e) => setDraft({ ...draft, invitation_body_en: e.target.value })}
                    className="w-full p-3 rounded-xl border border-[#B89246]/35 text-sm"
                  />
                </div>

                {/* Personal Photos Upload */}
                <div className="pt-2 border-t border-[#B89246]/20 space-y-3">
                  <h2 className="text-sm font-bold text-[#151412]">
                    {isAr ? 'الصور الشخصية ومعرض اللحظات' : 'Personal Portrait & Photo Gallery'}
                  </h2>

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FAF6EE] border border-[#B89246]/45 text-xs font-bold cursor-pointer hover:bg-[#F2EADB]">
                      <Upload className="w-4 h-4 text-[#7C5F21]" aria-hidden="true" />
                      <span>
                        {uploadingCover
                          ? isAr
                            ? 'جارٍ الرفع...'
                            : 'Uploading...'
                          : isAr
                            ? 'رفع صورة الغلاف الرئيسية'
                            : 'Upload Portrait Photo'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadCover}
                        className="visually-hidden"
                      />
                    </label>

                    {draft.cover_image_url && (
                      <button
                        type="button"
                        onClick={() => setDraft({ ...draft, cover_image_url: '' })}
                        className="px-3 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-bold"
                      >
                        {isAr ? 'إزالة صورة الغلاف' : 'Remove Portrait'}
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#B89246]/45 text-xs font-bold cursor-pointer hover:bg-[#FAF6EE]">
                      <ImageIcon className="w-4 h-4 text-[#7C5F21]" aria-hidden="true" />
                      <span>
                        {uploadingGallery
                          ? isAr
                            ? 'جارٍ رفع الصور...'
                            : 'Uploading...'
                          : isAr
                            ? 'إضافة صور إلى المعرض'
                            : 'Add Gallery Photos'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleUploadGallery}
                        className="visually-hidden"
                      />
                    </label>
                    {draft.gallery_urls.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        {draft.gallery_urls.map((url, idx) => (
                          <div key={`${url}-${idx}`} className="relative group aspect-square rounded-xl overflow-hidden border">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              aria-label="Remove photo"
                              onClick={() =>
                                setDraft((prev) => ({
                                  ...prev,
                                  gallery_urls: prev.gallery_urls.filter((_, i) => i !== idx),
                                }))
                              }
                              className="absolute top-1 end-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center text-xs"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: DATE & VENUE */}
            {activeTab === 'venue' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="event-datetime" className="block text-xs font-bold mb-1">
                      {isAr ? 'تاريخ ووقت الزفاف' : 'Wedding Date & Time'}
                    </label>
                    <input
                      id="event-datetime"
                      type="datetime-local"
                      value={dateInputVal}
                      onChange={(e) => {
                        if (e.target.value) {
                          setDraft({ ...draft, event_date: new Date(e.target.value).toISOString() });
                        }
                      }}
                      className="w-full min-h-11 px-3 rounded-xl border border-[#B89246]/35 text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="hijri-date" className="block text-xs font-bold mb-1">
                      {isAr ? 'التاريخ الهجري (عرض)' : 'Hijri Date Label'}
                    </label>
                    <input
                      id="hijri-date"
                      type="text"
                      value={draft.hijri_date}
                      onChange={(e) => setDraft({ ...draft, hijri_date: e.target.value })}
                      className="w-full min-h-11 px-3 rounded-xl border border-[#B89246]/35 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="time-label" className="block text-xs font-bold mb-1">
                    {isAr ? 'ساعات الحفل' : 'Event Time Window'}
                  </label>
                  <input
                    id="time-label"
                    type="text"
                    value={draft.event_time_label}
                    onChange={(e) => setDraft({ ...draft, event_time_label: e.target.value })}
                    className="w-full min-h-11 px-3 rounded-xl border border-[#B89246]/35 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="venue-ar" className="block text-xs font-bold mb-1">
                      {isAr ? 'اسم القاعة / الفندق (عربي)' : 'Venue Name (Arabic)'}
                    </label>
                    <input
                      id="venue-ar"
                      type="text"
                      value={draft.venue_name_ar}
                      onChange={(e) => setDraft({ ...draft, venue_name_ar: e.target.value })}
                      className="w-full min-h-11 px-3 rounded-xl border border-[#B89246]/35 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="venue-en" className="block text-xs font-bold mb-1">
                      {isAr ? 'اسم القاعة / الفندق (إنجليزي)' : 'Venue Name (English)'}
                    </label>
                    <input
                      id="venue-en"
                      type="text"
                      dir="ltr"
                      value={draft.venue_name_en}
                      onChange={(e) => setDraft({ ...draft, venue_name_en: e.target.value })}
                      className="w-full min-h-11 px-3 rounded-xl border border-[#B89246]/35 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="venue-address" className="block text-xs font-bold mb-1">
                    {isAr ? 'العنوان التفصيلي' : 'Full Address'}
                  </label>
                  <input
                    id="venue-address"
                    type="text"
                    value={draft.venue_address}
                    onChange={(e) => setDraft({ ...draft, venue_address: e.target.value })}
                    className="w-full min-h-11 px-3 rounded-xl border border-[#B89246]/35 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="maps-url" className="block text-xs font-bold mb-1">
                    {isAr ? 'رابط خرائط جوجل (Google Maps)' : 'Google Maps URL'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="maps-url"
                      type="url"
                      dir="ltr"
                      value={draft.maps_url}
                      onChange={(e) => {
                        const val = e.target.value;
                        const coords = extractCoordsFromMapsUrl(val);
                        setDraft((prev) => ({
                          ...prev,
                          maps_url: val,
                          ...(coords ? { maps_lat: coords.lat, maps_lng: coords.lng } : {}),
                        }));
                      }}
                      className="flex-1 min-h-11 px-3 rounded-xl border border-[#B89246]/35 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="maps-lat" className="block text-xs font-bold mb-1">
                      {isAr ? 'خط العرض (Lat)' : 'Latitude'}
                    </label>
                    <input
                      id="maps-lat"
                      type="number"
                      step="any"
                      dir="ltr"
                      value={draft.maps_lat ?? ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          maps_lat: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full min-h-11 px-3 rounded-xl border border-[#B89246]/35 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="maps-lng" className="block text-xs font-bold mb-1">
                      {isAr ? 'خط الطول (Lng)' : 'Longitude'}
                    </label>
                    <input
                      id="maps-lng"
                      type="number"
                      step="any"
                      dir="ltr"
                      value={draft.maps_lng ?? ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          maps_lng: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full min-h-11 px-3 rounded-xl border border-[#B89246]/35 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="notes-ar" className="block text-xs font-bold mb-1">
                    {isAr ? 'تنبيهات وتعليمات الحفل (عربي)' : 'Dress Code & Notes (Arabic)'}
                  </label>
                  <textarea
                    id="notes-ar"
                    rows={2}
                    value={draft.notes_ar}
                    onChange={(e) => setDraft({ ...draft, notes_ar: e.target.value })}
                    className="w-full p-3 rounded-xl border border-[#B89246]/35 text-sm"
                  />
                </div>
              </div>
            )}

            {/* TAB 4: SCHEDULE & MUSIC */}
            {activeTab === 'program' && (
              <div className="space-y-6">
                {/* Schedule Timeline Builder */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-[#151412] flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#7C5F21]" aria-hidden="true" />
                      <span>{isAr ? 'البرنامج الزمني للحفل' : 'Wedding Program Timeline'}</span>
                    </h2>
                    <button
                      type="button"
                      onClick={addScheduleRow}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#32402E] text-[#FAF6EE] text-xs font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{isAr ? 'إضافة فقرة' : 'Add Segment'}</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {draft.schedule.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-[#B89246]/30 bg-[#FAF6EE]/60 p-3 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            dir="ltr"
                            value={item.time}
                            onChange={(e) => updateScheduleRow(item.id, { time: e.target.value })}
                            placeholder="8:30 PM"
                            className="w-28 min-h-9 px-2.5 rounded-lg border border-[#B89246]/30 bg-white text-xs font-bold"
                          />
                          <input
                            type="text"
                            value={item.titleAr}
                            onChange={(e) => updateScheduleRow(item.id, { titleAr: e.target.value })}
                            placeholder={isAr ? 'عنوان الفقرة (عربي)' : 'Title (Arabic)'}
                            className="flex-1 min-h-9 px-2.5 rounded-lg border border-[#B89246]/30 bg-white text-xs font-semibold"
                          />
                          <button
                            type="button"
                            onClick={() => removeScheduleRow(item.id)}
                            aria-label={isAr ? 'حذف الفقرة' : 'Remove segment'}
                            className="p-2 text-red-700 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            dir="ltr"
                            value={item.titleEn}
                            onChange={(e) => updateScheduleRow(item.id, { titleEn: e.target.value })}
                            placeholder="Title (English)"
                            className="min-h-9 px-2.5 rounded-lg border border-[#B89246]/30 bg-white text-xs"
                          />
                          <input
                            type="text"
                            value={item.descAr}
                            onChange={(e) => updateScheduleRow(item.id, { descAr: e.target.value })}
                            placeholder={isAr ? 'وصف مختصر' : 'Short description'}
                            className="min-h-9 px-2.5 rounded-lg border border-[#B89246]/30 bg-white text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Music Settings */}
                <div className="pt-4 border-t border-[#B89246]/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-[#151412] flex items-center gap-2">
                      <Music className="w-4 h-4 text-[#7C5F21]" aria-hidden="true" />
                      <span>{isAr ? 'الموسيقى الترحيبية عند الفتح' : 'Opening Ambient Music'}</span>
                    </h2>
                    <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.music_enabled}
                        onChange={(e) => setDraft({ ...draft, music_enabled: e.target.checked })}
                        className="w-4 h-4 accent-[#32402E]"
                      />
                      <span>{isAr ? 'تفعيل' : 'Enabled'}</span>
                    </label>
                  </div>

                  {draft.music_enabled && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <select
                          aria-label={isAr ? 'اختر المقطوعة' : 'Choose melody'}
                          value={draft.music_preset}
                          onChange={(e) => setDraft({ ...draft, music_preset: e.target.value })}
                          className="flex-1 min-h-11 px-3 rounded-xl border border-[#B89246]/35 bg-white text-sm"
                        >
                          {MUSIC_PRESET_OPTIONS.map((m) => (
                            <option key={m.id} value={m.id}>
                              {isAr ? m.labelAr : m.labelEn}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleToggleAudioPreview}
                          className="inline-flex items-center gap-1.5 px-4 rounded-xl bg-[#151412] text-[#FAF6EE] text-xs font-bold"
                        >
                          {musicPlaying ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          <span>{musicPlaying ? (isAr ? 'إيقاف' : 'Stop') : isAr ? 'استماع' : 'Test'}</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#B89246]/40 bg-[#FAF6EE] text-xs font-bold cursor-pointer">
                          <Upload className="w-3.5 h-3.5 text-[#7C5F21]" aria-hidden="true" />
                          <span>
                            {uploadingAudio
                              ? isAr
                                ? 'جارٍ رفع الصوت...'
                                : 'Uploading...'
                              : isAr
                                ? 'رفع ملف MP3 مخصص'
                                : 'Upload Custom Audio'}
                          </span>
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={handleUploadAudio}
                            className="visually-hidden"
                          />
                        </label>
                        {draft.music_url && (
                          <button
                            type="button"
                            onClick={() => setDraft({ ...draft, music_url: '' })}
                            className="text-xs text-red-700 font-bold px-2 py-1"
                          >
                            {isAr ? 'حذف الصوت المخصص' : 'Clear custom audio'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* RSVP & Guestbook Toggles */}
                <div className="pt-4 border-t border-[#B89246]/20 space-y-2.5">
                  <label className="flex items-center gap-2.5 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={draft.rsvp_enabled}
                      onChange={(e) => setDraft({ ...draft, rsvp_enabled: e.target.checked })}
                      className="w-4 h-4 accent-[#32402E]"
                    />
                    <span>{isAr ? 'تفعيل نموذج تأكيد الحضور (RSVP)' : 'Enable Guest RSVP Form'}</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={draft.guestbook_enabled}
                      onChange={(e) => setDraft({ ...draft, guestbook_enabled: e.target.checked })}
                      className="w-4 h-4 accent-[#32402E]"
                    />
                    <span>{isAr ? 'إظهار دفتر تهاني الضيوف' : 'Show Public Wishes Wall'}</span>
                  </label>
                </div>
              </div>
            )}

            {/* TAB 5: PUBLISH & SHARE */}
            {activeTab === 'publish' && (
              <div className="space-y-5">
                <div>
                  <label htmlFor="invite-slug" className="block text-xs font-bold mb-1">
                    {isAr ? 'الرابط المستقل للدعوة (بالإنجليزية)' : 'Custom URL Slug'}
                  </label>
                  <div className="flex items-center rounded-xl border border-[#B89246]/35 overflow-hidden bg-white" dir="ltr">
                    <span className="px-3 py-2.5 bg-[#FAF6EE] text-xs text-[#524B40] border-e border-[#B89246]/25">
                      /i/
                    </span>
                    <input
                      id="invite-slug"
                      type="text"
                      value={draft.slug}
                      onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                      className="flex-1 min-h-11 px-3 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="guest-test-name" className="block text-xs font-bold mb-1">
                    {isAr ? 'معاينة اسم ضيف في الرابط (?to=)' : 'Personalize Guest Name (?to=)'}
                  </label>
                  <input
                    id="guest-test-name"
                    type="text"
                    value={guestTestName}
                    onChange={(e) => setGuestTestName(e.target.value)}
                    placeholder={isAr ? 'مثال: معالي الشيخ عبدالله' : 'e.g. Mr. Abdullah'}
                    className="w-full min-h-11 px-3 rounded-xl border border-[#B89246]/35 text-sm"
                  />
                </div>

                <div className="rounded-2xl border border-[#B89246]/30 bg-[#FAF6EE] p-4 flex flex-col items-center gap-3 text-center">
                  <div className="p-3 bg-white rounded-xl border border-[#B89246]/25">
                    <QRCodeSVG ref={qrRef} value={shareUrl} size={150} bgColor="#FFFFFF" fgColor="#151412" />
                  </div>
                  <p className="text-[11px] text-[#524B40] break-all" dir="ltr">
                    {shareUrl}
                  </p>
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(shareUrl);
                        notify(isAr ? 'تم نسخ الرابط' : 'Copied!', 'success');
                      }}
                      className="min-h-10 rounded-xl bg-white border border-[#B89246]/40 text-xs font-bold inline-flex items-center justify-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{isAr ? 'نسخ الرابط' : 'Copy Link'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadSvgQrCode(qrRef.current, draft.slug || 'marasim')}
                      className="min-h-10 rounded-xl bg-white border border-[#B89246]/40 text-xs font-bold inline-flex items-center justify-center gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{isAr ? 'تحميل QR' : 'Save QR'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!exportRef.current) return;
                      try {
                        await exportElementAsPng(exportRef.current, draft.slug || 'marasim-invite');
                        notify(isAr ? 'تم تحميل PNG' : 'PNG Downloaded', 'success');
                      } catch (err) {
                        notify(err instanceof Error ? err.message : 'Export error', 'error');
                      }
                    }}
                    className="min-h-11 rounded-xl bg-[#151412] text-[#FAF6EE] text-xs font-bold inline-flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-[#D8B86F]" aria-hidden="true" />
                    <span>{isAr ? 'تصدير PNG' : 'Export PNG'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (!exportRef.current) return;
                      try {
                        await exportElementAsPdf(
                          exportRef.current,
                          draft.slug || 'marasim-invite',
                          draft.theme_config.bgColor,
                        );
                        notify(isAr ? 'تم تصدير PDF' : 'PDF Exported', 'success');
                      } catch (err) {
                        notify(err instanceof Error ? err.message : 'PDF error', 'error');
                      }
                    }}
                    className="min-h-11 rounded-xl border border-[#B89246]/45 bg-white text-[#151412] text-xs font-bold inline-flex items-center justify-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#7C5F21]" aria-hidden="true" />
                    <span>{isAr ? 'تصدير PDF' : 'Export PDF'}</span>
                  </button>

                  <a
                    href={buildWhatsAppShareUrl({
                      url: shareUrl,
                      groomAr: draft.groom_name_ar,
                      brideAr: draft.bride_name_ar,
                      groomEn: draft.groom_name_en,
                      brideEn: draft.bride_name_en,
                      dateLabel: formatEventDate(draft.event_date),
                      venue: isAr ? draft.venue_name_ar : draft.venue_name_en,
                      guestName: guestTestName.trim() || undefined,
                      lang,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-11 rounded-xl bg-[#32402E] text-[#FAF6EE] text-xs font-bold inline-flex items-center justify-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#D8B86F]" aria-hidden="true" />
                    <span>{isAr ? 'واتساب' : 'WhatsApp'}</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Live Preview Canvas */}
        <section
          className={`xl:col-span-7 space-y-4 ${
            mobileStudioView === 'preview' ? 'block' : 'hidden xl:block'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-[#B89246]/30 bg-white p-3 sm:px-4 sm:py-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                  previewDevice === 'desktop'
                    ? 'bg-[#151412] text-[#FAF6EE]'
                    : 'text-[#524B40] hover:bg-[#FAF6EE]'
                }`}
              >
                <Monitor className="w-4 h-4" aria-hidden="true" />
                <span>{isAr ? 'عرض متكامل' : 'Desktop'}</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                  previewDevice === 'mobile'
                    ? 'bg-[#151412] text-[#FAF6EE]'
                    : 'text-[#524B40] hover:bg-[#FAF6EE]'
                }`}
              >
                <Smartphone className="w-4 h-4" aria-hidden="true" />
                <span>{isAr ? 'جوال' : 'Mobile'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setPreviewEnvelopeClosed((v) => !v)}
              className="px-3 py-1.5 rounded-lg border border-[#B89246]/40 bg-[#FAF6EE] text-xs font-bold text-[#151412]"
            >
              {previewEnvelopeClosed
                ? isAr
                  ? 'عرض البطاقة المفتوحة'
                  : 'Show Open Card'
                : isAr
                  ? 'معاينة المغلف المغلق'
                  : 'Test Envelope Gate'}
            </button>
          </div>

          <div className="flex justify-center">
            <div
              className={`transition-all duration-300 ${
                previewDevice === 'mobile'
                  ? 'w-full max-w-[420px] border-0 sm:border-[10px] sm:border-[#151412] rounded-2xl sm:rounded-[2.6rem] shadow-2xl overflow-hidden bg-transparent sm:bg-[#151412]'
                  : 'w-full'
              }`}
            >
              <InvitationRenderer
                invitation={draft}
                guestName={guestTestName.trim() || undefined}
                showEnvelopeGate={previewEnvelopeClosed}
                isOpened={!previewEnvelopeClosed}
                onOpenEnvelope={() => setPreviewEnvelopeClosed(false)}
                musicPlaying={musicPlaying}
                onToggleMusic={handleToggleAudioPreview}
                shareUrl={shareUrl}
                exportCardRef={exportRef}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};
