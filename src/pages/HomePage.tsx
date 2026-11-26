import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  Crown,
  ExternalLink,
  HeartHandshake,
  MapPin,
  Music,
  PenTool,
  QrCode,
  Share2,
  Sparkles,
} from 'lucide-react';
import { createDraftInvitationFromTemplate, supabase } from '../lib/supabase';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/ToastProvider';
import { ArabesqueDivider, CornerFiligree, KhatamRosette } from '../components/Ornaments';
import { InvitationRenderer } from '../components/InvitationRenderer';
import type { Invitation, PackagePlan, Template } from '../types/database';

interface HomePageProps {
  onOpenAuth: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenAuth }) => {
  const { isAr, categoryLabel, formatEventDate } = useI18n();
  const { user } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [featuredInvites, setFeaturedInvites] = useState<Invitation[]>([]);
  const [packages, setPackages] = useState<PackagePlan[]>([]);
  const [heroTemplateIndex, setHeroTemplateIndex] = useState(0);
  const [orderingPkgId, setOrderingPkgId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase
        .from('templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('invitations')
        .select('*')
        .eq('status', 'published')
        .eq('is_featured', true)
        .order('view_count', { ascending: false })
        .limit(6),
      supabase
        .from('packages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
    ]).then(([tplRes, invRes, pkgRes]) => {
      if (!active) return;
      if (tplRes.data) setTemplates(tplRes.data as Template[]);
      if (invRes.data) setFeaturedInvites(invRes.data as Invitation[]);
      if (pkgRes.data) setPackages(pkgRes.data as PackagePlan[]);
    });
    return () => {
      active = false;
    };
  }, []);

  const heroTemplates = templates.slice(0, 4);
  const activeHeroTemplate = heroTemplates[heroTemplateIndex] ?? templates[0] ?? null;
  const heroSampleInvite = createDraftInvitationFromTemplate(activeHeroTemplate);

  const handleOrderPackage = async (pkg: PackagePlan) => {
    if (!user) {
      onOpenAuth();
      return;
    }
    setOrderingPkgId(pkg.id);
    const { error } = await supabase.from('orders').insert({
      user_id: user.id,
      package_id: pkg.id,
      status: pkg.price_sar === 0 ? 'active' : 'pending',
      amount: pkg.price_sar,
      currency: 'SAR',
      payment_method: pkg.price_sar === 0 ? 'free' : 'bank_transfer',
      notes: isAr ? `طلب تفعيل باقة ${pkg.name_ar}` : `Subscription request for ${pkg.name_en}`,
    });
    setOrderingPkgId(null);
    if (error) {
      notify(error.message, 'error');
      return;
    }
    notify(
      isAr
        ? `تم تسجيل طلب باقة ${pkg.name_ar} بنجاح! يمكنك متابعته من لوحة دعواتي.`
        : `Order for ${pkg.name_en} submitted! Track it in your dashboard.`,
      'success',
    );
    navigate('/dashboard');
  };

  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  const features = [
    {
      icon: PenTool,
      titleAr: 'محرر مباشر بـ 7 أنماط فاخرة',
      titleEn: 'Live WYSIWYG 7-Style Studio',
      descAr: 'تحكم كامل بالأسماء، الأهل، الآيات، الألوان، الخطوط العربية والخلفيات مع معاينة فورية.',
      descEn: 'Customize names, parents, verses, palettes, Arabic calligraphy, and photos in real time.',
    },
    {
      icon: QrCode,
      titleAr: 'رابط مستقل ورمز QR لكل دعوة',
      titleEn: 'Custom Slug & QR Pass',
      descAr: 'رابط خاص مع دعم تخصيص اسم الضيف (?to=...) ورمز QR جاهز للطباعة أو المشاركة.',
      descEn: 'Dedicated invitation link with personalized guest greetings and downloadable QR code.',
    },
    {
      icon: Share2,
      titleAr: 'مشاركة واتساب وتصدير PNG و PDF',
      titleEn: 'WhatsApp Share & PNG/PDF',
      descAr: 'رسالة واتساب منسقة بضغطة زر مع إمكانية تحميل البطاقة بدقة طباعة عالية.',
      descEn: 'One-tap formatted WhatsApp share plus crisp high-DPI PNG and PDF export.',
    },
    {
      icon: MapPin,
      titleAr: 'خريطة Google Maps والبرنامج الزمني',
      titleEn: 'Google Maps & Schedule',
      descAr: 'عرض تفاعلي لموقع القاعة مع الاتجاهات المباشرة والعد التنازلي وجدول فقرات الحفل.',
      descEn: 'Embedded Google Maps venue view, direct navigation link, countdown, and timeline.',
    },
    {
      icon: HeartHandshake,
      titleAr: 'تأكيد الحضور RSVP ودفتر التهاني',
      titleEn: 'RSVP & Wishes Wall',
      descAr: 'استقبال ردود المدعوين وعدد المرافقين مع إحصائيات حية وتصدير CSV للضيوف.',
      descEn: 'Collect attendance, guest counts, and heartfelt wishes with live host analytics.',
    },
    {
      icon: Music,
      titleAr: 'موسيقى ترحيبية ومؤثرات سينمائية',
      titleEn: 'Ambient Audio & Envelope Reveal',
      descAr: 'بوابة فتح مغلف بختم شمعي ذهبي ومقطوعات عود وبيانو هادئة قابلة للتعطيل.',
      descEn: 'Interactive wax-seal envelope opening paired with mute-ready oud & classical melodies.',
    },
  ];

  return (
    <main id="main-content" className="overflow-x-clip">
      {/* HERO SECTION */}
      <section className="relative bg-islamic-lattice border-b border-[#B89246]/20">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-8 sm:py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Editorial Copy */}
          <div className="lg:col-span-6 space-y-4 sm:space-y-6 text-start">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1 rounded-full bg-[#32402E] text-[#FAF6EE] text-xs font-bold shadow-sm">
              <Crown className="w-3.5 h-3.5 text-[#D8B86F]" aria-hidden="true" />
              <span>
                {isAr
                  ? 'دار تصميم الدعوات الرقمية الملكية'
                  : 'Royal Digital Wedding Stationery'}
              </span>
            </div>

            <h1
              className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-[1.25] text-[#151412]"
              style={{ fontFamily: isAr ? '"Amiri", serif' : '"Cormorant Garamond", serif' }}
            >
              {isAr
                ? 'دعوات زفاف إلكترونية تليق بليلة العمر'
                : 'Digital Wedding Invitations Crafted Like Fine Stationery'}
            </h1>

            <p className="text-sm sm:text-lg text-[#524B40] max-w-xl leading-relaxed">
              {isAr
                ? 'صمّم دعوة زفافك خلال دقائق بهوية عربية وإسلامية راقية: مغلف سينمائي بختم ذهبي، عداد تنازلي، خرائط جوجل، تأكيد حضور RSVP، رمز QR، وتحميل فوري بصيغة PNG وPDF.'
                : 'Compose, customize, and share unforgettable bilingual wedding invitations with wax-seal envelope reveals, Google Maps, live countdowns, QR codes, and real-time RSVP tracking.'}
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-1">
              <Link
                to="/studio"
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full bg-[#151412] text-[#FAF6EE] font-bold text-sm sm:text-base shadow-lg hover:bg-[#2a2723] transition-colors"
              >
                <Sparkles className="w-4 h-4 text-[#D8B86F]" aria-hidden="true" />
                <span>{isAr ? 'ابدأ تصميم دعوتك الآن' : 'Launch Invitation Studio'}</span>
                <ArrowIcon className="w-4 h-4" aria-hidden="true" />
              </Link>

              <Link
                to="/i/tariq-noura"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full border border-[#B89246]/50 bg-white/80 text-[#151412] font-bold text-sm sm:text-base hover:bg-white transition-colors"
              >
                <span>{isAr ? 'معاينة دعوة حية' : 'Experience Live Invite'}</span>
                <ExternalLink className="w-4 h-4 text-[#7C5F21]" aria-hidden="true" />
              </Link>
            </div>

            {/* Interactive Live Hero Style Switcher */}
            {heroTemplates.length > 0 && (
              <div className="pt-2 sm:pt-4 space-y-2">
                <p className="text-xs font-bold text-[#7C5F21]">
                  {isAr ? 'جرّب تبديل القالب مباشرة:' : 'Preview live template styles:'}
                </p>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1.5 pt-0.5">
                  {heroTemplates.map((tpl, idx) => {
                    const active = idx === heroTemplateIndex;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setHeroTemplateIndex(idx)}
                        className={`shrink-0 inline-flex items-center gap-2 min-h-9 px-3.5 py-2 rounded-full text-xs font-bold border transition-all ${
                          active
                            ? 'bg-[#32402E] text-[#FAF6EE] border-[#32402E] shadow-sm'
                            : 'bg-white/85 text-[#3A352C] border-[#B89246]/30 hover:border-[#B89246]'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/15 shrink-0"
                          style={{ backgroundColor: tpl.config.bgColor }}
                          aria-hidden="true"
                        />
                        <span className="whitespace-nowrap">{isAr ? tpl.name_ar : tpl.name_en}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Interactive Live Card Showcase */}
          <div className="lg:col-span-6">
            <div className="relative rounded-2xl sm:rounded-3xl p-1.5 sm:p-3 bg-white/75 border border-[#B89246]/35 shadow-2xl">
              <div
                className="relative rounded-xl sm:rounded-2xl overflow-hidden px-4 py-7 sm:px-9 sm:py-11 text-center transition-colors duration-300"
                style={{
                  backgroundColor: heroSampleInvite.theme_config.surfaceColor,
                  color: heroSampleInvite.theme_config.textColor,
                  border: `1.5px solid ${heroSampleInvite.theme_config.accentColor}88`,
                }}
              >
                <CornerFiligree
                  color={heroSampleInvite.theme_config.accentColor}
                  position="tl"
                  styleVariant={heroSampleInvite.theme_config.ornamentStyle}
                />
                <CornerFiligree
                  color={heroSampleInvite.theme_config.accentColor}
                  position="tr"
                  styleVariant={heroSampleInvite.theme_config.ornamentStyle}
                />
                <CornerFiligree
                  color={heroSampleInvite.theme_config.accentColor}
                  position="bl"
                  styleVariant={heroSampleInvite.theme_config.ornamentStyle}
                />
                <CornerFiligree
                  color={heroSampleInvite.theme_config.accentColor}
                  position="br"
                  styleVariant={heroSampleInvite.theme_config.ornamentStyle}
                />

                <div className="relative z-10 space-y-4">
                  <KhatamRosette
                    color={heroSampleInvite.theme_config.accentColor}
                    className="w-12 h-12 mx-auto"
                  />
                  <p
                    className="text-xs sm:text-sm opacity-90"
                    style={{
                      fontFamily: `"${heroSampleInvite.theme_config.fontAr}", "Amiri", serif`,
                      color: heroSampleInvite.theme_config.accentColor,
                    }}
                  >
                    {heroSampleInvite.opening_verse}
                  </p>
                  <p className="text-xs opacity-80">
                    {isAr ? heroSampleInvite.parents_text_ar : heroSampleInvite.parents_text_en}
                  </p>
                  <h2
                    className="text-3xl sm:text-4xl font-bold"
                    style={{
                      fontFamily: isAr
                        ? `"${heroSampleInvite.theme_config.fontAr}", serif`
                        : `"${heroSampleInvite.theme_config.fontEn}", serif`,
                      color: heroSampleInvite.theme_config.accentColor,
                    }}
                  >
                    {isAr
                      ? `${heroSampleInvite.groom_name_ar.split(' ')[0]} & ${heroSampleInvite.bride_name_ar.split(' ')[0]}`
                      : `${heroSampleInvite.groom_name_en} & ${heroSampleInvite.bride_name_en}`}
                  </h2>
                  <ArabesqueDivider
                    color={heroSampleInvite.theme_config.accentColor}
                    className="mx-auto w-44 h-4"
                  />
                  <p className="text-xs sm:text-sm opacity-85">
                    {formatEventDate(heroSampleInvite.event_date)} •{' '}
                    {isAr ? heroSampleInvite.venue_name_ar : heroSampleInvite.venue_name_en}
                  </p>
                  <div className="pt-2">
                    <Link
                      to={activeHeroTemplate ? `/studio?template=${activeHeroTemplate.slug}` : '/studio'}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-transform hover:scale-105"
                      style={{
                        backgroundColor: heroSampleInvite.theme_config.accentColor,
                        color: '#151412',
                      }}
                    >
                      <PenTool className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{isAr ? 'تخصيص هذا القالب' : 'Customize This Style'}</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TEMPLATES GALLERY PREVIEW */}
      <section className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-7 sm:space-y-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h2
              className="text-2xl sm:text-4xl font-bold text-[#151412]"
              style={{ fontFamily: isAr ? '"Amiri", serif' : '"Cormorant Garamond", serif' }}
            >
              {isAr ? 'مكتبة القوالب الفاخرة (٧ فئات متكاملة)' : 'Curated Atelier Templates'}
            </h2>
            <p className="text-sm sm:text-base text-[#524B40] max-w-2xl">
              {isAr
                ? 'تشكيلة مدروسة تغطي الذوق الملكي، الكلاسيكي، المودرن، الإسلامي، البسيط Minimal، السينمائي المتحرك، والذهبي الفاخر.'
                : 'Eight bespoke themes spanning Royal, Classic, Modern, Islamic, Minimal, Cinematic, and Gold Luxury.'}
            </p>
          </div>
          <Link
            to="/templates"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#B89246]/45 bg-white text-sm font-bold text-[#151412] hover:bg-[#F2EADB] transition-colors"
          >
            <span>{isAr ? 'عرض جميع القوالب' : 'Browse All Templates'}</span>
            <ArrowIcon className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {templates.map((tpl) => (
            <article
              key={tpl.id}
              className="group rounded-2xl border border-[#B89246]/25 bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col"
            >
              <div
                className="relative h-48 p-5 flex flex-col items-center justify-center text-center overflow-hidden"
                style={{
                  backgroundColor: tpl.config.darkSurface ? tpl.config.surfaceColor : tpl.config.bgColor,
                  color: tpl.config.textColor,
                }}
              >
                <CornerFiligree
                  color={tpl.config.accentColor}
                  position="tl"
                  styleVariant={tpl.config.ornamentStyle}
                />
                <CornerFiligree
                  color={tpl.config.accentColor}
                  position="br"
                  styleVariant={tpl.config.ornamentStyle}
                />
                <span
                  className="px-3 py-1 rounded-full text-[11px] font-bold mb-2 border"
                  style={{
                    borderColor: `${tpl.config.accentColor}66`,
                    color: tpl.config.accentColor,
                  }}
                >
                  {tpl.config.layoutMode === 'stage_poster' || tpl.config.layoutMode === 'split_poster'
                    ? isAr
                      ? 'بوستر ليلتين'
                      : '2-Night Poster'
                    : categoryLabel(tpl.category)}
                </span>
                <h3
                  className="text-2xl font-bold leading-snug"
                  style={{
                    fontFamily: isAr ? `"${tpl.config.fontAr}", serif` : `"${tpl.config.fontEn}", serif`,
                    color: tpl.config.accentColor,
                  }}
                >
                  {tpl.config.poster?.headlineAr
                    ? isAr
                      ? tpl.config.poster.headlineAr
                      : tpl.config.poster.headlineEn
                    : isAr
                      ? 'أفراح العروسين'
                      : 'Royal Union'}
                </h3>
                <p className="text-xs opacity-75 mt-1">
                  {isAr ? tpl.name_ar : tpl.name_en}
                </p>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-base text-[#151412]">
                      {isAr ? tpl.name_ar : tpl.name_en}
                    </h4>
                    {tpl.is_premium && (
                      <span className="px-2 py-0.5 rounded-full bg-[#F2EADB] text-[#7C5F21] text-[11px] font-bold">
                        {isAr ? 'ملكي' : 'VIP'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#524B40] mt-1.5 line-clamp-2">
                    {isAr ? tpl.description_ar : tpl.description_en}
                  </p>
                </div>

                <Link
                  to={`/studio?template=${tpl.slug}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#151412] text-[#FAF6EE] text-xs font-bold hover:bg-[#32402E] transition-colors"
                >
                  <PenTool className="w-3.5 h-3.5 text-[#D8B86F]" aria-hidden="true" />
                  <span>{isAr ? 'صمّم بهذا القالب' : 'Use Template'}</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* FEATURES ARCHITECTURE */}
      <section className="bg-[#151412] text-[#FAF6EE] py-16 border-y border-[#B89246]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2
              className="text-3xl sm:text-4xl font-bold text-[#D8B86F]"
              style={{ fontFamily: isAr ? '"Amiri", serif' : '"Cormorant Garamond", serif' }}
            >
              {isAr ? 'تجربة متكاملة للمضيفين والمدعوين' : 'Crafted for Both Hosts & Honored Guests'}
            </h2>
            <p className="text-sm sm:text-base text-[#CFC6B4]">
              {isAr
                ? 'كل دعوة تعمل كصفحة زفاف متكاملة بجميع الأدوات التفاعلية والطباعية دون تعقيد.'
                : 'Every invitation operates as a complete digital concierge with exportable keepsakes.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.titleEn}
                  className="rounded-2xl border border-[#B89246]/25 bg-[#1D1B17] p-6 space-y-3"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#32402E] text-[#D8B86F] flex items-center justify-center">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-bold text-[#FAF6EE]">
                    {isAr ? feat.titleAr : feat.titleEn}
                  </h3>
                  <p className="text-sm text-[#CFC6B4] leading-relaxed">
                    {isAr ? feat.descAr : feat.descEn}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* LIVE PUBLISHED INVITATIONS SHOWCASE */}
      {featuredInvites.length > 0 && (
        <section className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-6 sm:space-y-8">
          <div className="space-y-2">
            <h2
              className="text-2xl sm:text-4xl font-bold text-[#151412]"
              style={{ fontFamily: isAr ? '"Amiri", serif' : '"Cormorant Garamond", serif' }}
            >
              {isAr ? 'دعوات حية منشورة على المنصة' : 'Live Published Showcase Invitations'}
            </h2>
            <p className="text-sm sm:text-base text-[#524B40]">
              {isAr
                ? 'افتح أي دعوة لتجربة المغلف التفاعلي، الموسيقى، العد التنازلي، خريطة الموقع، وتأكيد الحضور RSVP.'
                : 'Open any live invitation to experience the wax-seal gate, audio, countdown, map, and RSVP.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {featuredInvites.map((inv) => (
              <div
                key={inv.id}
                className="rounded-2xl border border-[#B89246]/30 bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col"
              >
                <div className="p-2.5 sm:p-4">
                  <InvitationRenderer invitation={inv} compactPreview />
                </div>
                <div className="px-5 py-4 border-t border-[#B89246]/20 bg-[#FAF6EE] flex items-center justify-between gap-3">
                  <div className="text-xs text-[#524B40] flex items-center gap-1.5">
                    <CalendarClock className="w-4 h-4 text-[#7C5F21]" aria-hidden="true" />
                    <span>{inv.view_count} {isAr ? 'مشاهدة' : 'views'}</span>
                  </div>
                  <Link
                    to={`/i/${inv.slug}`}
                    className="inline-flex items-center gap-1.5 min-h-10 px-4 py-2 rounded-full bg-[#151412] text-[#FAF6EE] text-xs font-bold hover:bg-[#32402E] transition-colors"
                  >
                    <span>{isAr ? 'فتح الدعوة' : 'Open Live'}</span>
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* PACKAGES SECTION */}
      {packages.length > 0 && (
        <section className="bg-[#F2EADB] border-t border-[#B89246]/25 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <h2
                className="text-3xl sm:text-4xl font-bold text-[#151412]"
                style={{ fontFamily: isAr ? '"Amiri", serif' : '"Cormorant Garamond", serif' }}
              >
                {isAr ? 'باقات مرنة لحفلاتكم' : 'Atelier Packages & Subscriptions'}
              </h2>
              <p className="text-sm text-[#524B40]">
                {isAr
                  ? 'ابدأ مجاناً أو فعّل الباقة الملكية لإطلاق العنان لجميع القوالب والمزايا.'
                  : 'Start free or request an upgrade directly from your dashboard.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {packages.map((pkg) => {
                const isRoyal = pkg.id === 'royal';
                const feats = isAr ? pkg.features_ar : pkg.features_en;
                return (
                  <div
                    key={pkg.id}
                    className={`rounded-3xl p-7 flex flex-col justify-between gap-6 border ${
                      isRoyal
                        ? 'bg-[#151412] text-[#FAF6EE] border-[#D8B86F] shadow-2xl'
                        : 'bg-white text-[#151412] border-[#B89246]/30 shadow-sm'
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xl font-bold">{isAr ? pkg.name_ar : pkg.name_en}</h3>
                        {isRoyal && (
                          <span className="px-3 py-1 rounded-full bg-[#D8B86F] text-[#151412] text-xs font-bold">
                            {isAr ? 'الأكثر طلباً' : 'Popular'}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${isRoyal ? 'text-[#CFC6B4]' : 'text-[#524B40]'}`}>
                        {isAr ? pkg.description_ar : pkg.description_en}
                      </p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl font-extrabold tabular-nums">
                          {pkg.price_sar === 0 ? (isAr ? 'مجاناً' : 'Free') : pkg.price_sar}
                        </span>
                        {pkg.price_sar > 0 && (
                          <span className="text-xs font-semibold opacity-75">
                            {isAr ? 'ر.س' : 'SAR'}
                          </span>
                        )}
                      </div>

                      <ul className="space-y-2.5 pt-2">
                        {feats.map((f) => (
                          <li key={f} className="flex items-start gap-2.5 text-sm">
                            <Check
                              className={`w-4 h-4 shrink-0 mt-1 ${
                                isRoyal ? 'text-[#D8B86F]' : 'text-[#32402E]'
                              }`}
                              aria-hidden="true"
                            />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      disabled={orderingPkgId === pkg.id}
                      onClick={() => handleOrderPackage(pkg)}
                      className={`w-full min-h-12 rounded-full font-bold text-sm transition-colors ${
                        isRoyal
                          ? 'bg-[#D8B86F] text-[#151412] hover:bg-[#e4c67f]'
                          : 'bg-[#151412] text-[#FAF6EE] hover:bg-[#32402E]'
                      }`}
                    >
                      {orderingPkgId === pkg.id
                        ? isAr
                          ? 'جارٍ الإرسال...'
                          : 'Submitting...'
                        : isAr
                          ? 'اختر هذه الباقة'
                          : 'Select Package'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </main>
  );
};
