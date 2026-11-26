import React from 'react';
import { Calendar, MapPin, Sparkles } from 'lucide-react';
import type { Invitation, PosterConfig } from '../types/database';
import { useI18n } from '../lib/i18n';
import {
  FloralBouquetSvg,
  HangingLanternSvg,
  HangingMedallionSvg,
  HennaHandsIconSvg,
  WeddingRingsIconSvg,
} from './PosterOrnaments';

export const DEFAULT_POSTER_CONFIG: PosterConfig = {
  topRibbonAr: 'بأحلى فرحة وبحضوركم تتم الفرح',
  topRibbonEn: 'With Your Presence Our Joy Is Complete',
  badgeTextAr: 'الدعوة عامة',
  badgeTextEn: 'Open Invitation',
  headlineAr: 'الفرحة المنتظرة',
  headlineEn: 'The Awaited Joy',
  subHeadlineAr: 'ليلتين من الفرح والسعادة',
  subHeadlineEn: 'Two Nights of Joy & Celebration',
  rightTitleAr: 'أفراح بلدنا',
  rightSubAr: 'فرحتنا إللي جنكم يا أحلى ناس',
  leftTitleAr: 'فرحة العمر',
  leftSubAr: 'ليلة من الفرح والسرور بحضوركم',
  footerBadgeAr: 'ليلتين من الفرح والسعادة',
  cornerRightAr: 'دعوة القلب',
  cornerLeftAr: 'وجودكم يزيد الفرح',
  monogramText: 'M & S',
  showSpotlights: true,
  showFloralCorners: true,
  showLantern: true,
  showMedallions: true,
  twoNightsEnabled: true,
  night1: {
    labelAr: 'الليلة الأولى',
    labelEn: 'First Night',
    eventTitleAr: 'حفل الحناء',
    eventTitleEn: 'Henna Night',
    dateLabel: '07/10/2026',
    subDateLabel: 'الأربعاء',
    venueAr: 'أمام منزل الداعي',
    venueEn: 'At the Family Residence',
    icon: 'henna',
  },
  night2: {
    labelAr: 'الليلة الثانية',
    labelEn: 'Second Night',
    eventTitleAr: 'حفل الزفاف',
    eventTitleEn: 'Wedding Ceremony',
    dateLabel: '09/10/2026',
    subDateLabel: 'الجمعة',
    venueAr: 'بقاعة البوليفارد الكبرى',
    venueEn: 'Boulevard Grand Hall',
    icon: 'rings',
  },
};

interface PosterRendererProps {
  invitation: Omit<Invitation, 'id' | 'created_at' | 'updated_at' | 'view_count'>;
  guestName?: string;
  compactPreview?: boolean;
  exportCardRef?: React.RefObject<HTMLDivElement | null>;
}

export const PosterRenderer: React.FC<PosterRendererProps> = ({
  invitation,
  guestName,
  compactPreview = false,
  exportCardRef,
}) => {
  const { isAr } = useI18n();
  const cfg = invitation.theme_config;
  const poster = cfg.poster ?? DEFAULT_POSTER_CONFIG;
  const arFont = `"${cfg.fontAr || 'Cairo'}", "Cairo", "Amiri", sans-serif`;
  const layoutMode = cfg.layoutMode ?? 'stage_poster';

  const portraitSrc =
    invitation.cover_image_url ||
    (layoutMode === 'stage_poster'
      ? '/images/sample-groom-stage.jpg'
      : '/images/sample-groom-classic.jpg');

  const groomLine = isAr
    ? invitation.groom_name_ar || invitation.groom_name_en
    : invitation.groom_name_en || invitation.groom_name_ar;

  const renderNightIcon = (icon: 'henna' | 'rings' | 'sparkles' | 'crown', color: string) => {
    if (icon === 'henna') return <HennaHandsIconSvg color={color} className="w-10 h-10 mx-auto" />;
    if (icon === 'rings') return <WeddingRingsIconSvg color={color} className="w-10 h-10 mx-auto" />;
    return <Sparkles className="w-7 h-7 mx-auto" style={{ color }} aria-hidden="true" />;
  };

  /* =========================================================================
     LAYOUT A: STAGE SPOTLIGHT POSTER (Poster 1 style - Golden Stage & 3D Title)
     ========================================================================= */
  if (layoutMode === 'stage_poster') {
    return (
      <div
        ref={exportCardRef}
        className={`relative rounded-3xl overflow-hidden text-center shadow-2xl border-2 ${
          compactPreview ? 'p-3 sm:p-6' : 'p-3.5 sm:p-8'
        }`}
        style={{
          backgroundColor: cfg.bgColor || '#0D0905',
          color: cfg.textColor || '#FFF6E5',
          borderColor: `${cfg.accentColor}99`,
          backgroundImage: poster.showSpotlights
            ? `radial-gradient(circle at 50% 24%, ${cfg.accentColor}55 0%, rgba(160,92,16,0.28) 38%, ${cfg.bgColor || '#0D0905'} 78%)`
            : undefined,
        }}
      >
        {/* Golden stage spotlight beams */}
        {poster.showSpotlights && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div
              className="absolute -top-16 left-1/4 w-36 sm:w-44 h-[420px] -rotate-12 opacity-25 blur-2xl"
              style={{ background: `linear-gradient(180deg, ${cfg.accentColor}, transparent)` }}
            />
            <div
              className="absolute -top-16 right-1/4 w-36 sm:w-44 rotate-12 opacity-25 blur-2xl"
              style={{ background: `linear-gradient(180deg, ${cfg.accentColor}, transparent)` }}
            />
            {[10, 22, 36, 65, 78, 90].map((pct, i) => (
              <span
                key={pct}
                className="petal-particle absolute top-8 w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full"
                style={{
                  left: `${pct}%`,
                  backgroundColor: cfg.accentColor,
                  animationDelay: `${i * 0.9}s`,
                  boxShadow: `0 0 12px ${cfg.accentColor}`,
                }}
              />
            ))}
          </div>
        )}

        <div className="relative z-10 space-y-3 sm:space-y-4">
          {/* Top Ribbon Banner */}
          <div className="flex justify-center">
            <div
              className="px-4 sm:px-6 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-sm font-extrabold shadow-lg border"
              style={{
                background: `linear-gradient(90deg, #8F5216, ${cfg.accentColor}, #8F5216)`,
                color: '#151412',
                borderColor: '#FFF3D1',
              }}
            >
              {isAr ? poster.topRibbonAr : poster.topRibbonEn}
            </div>
          </div>

          {guestName && (
            <div className="inline-block px-3.5 py-0.5 sm:py-1 rounded-full bg-black/55 border border-[#D8B86F]/60 text-[11px] sm:text-xs font-bold text-[#FDE68A]">
              {isAr ? `دعوة خاصة إلى: ${guestName}` : `Special Guest: ${guestName}`}
            </div>
          )}

          {/* Main 3-Column Stage Zone: Right Callout + Center Portrait + Left Callout */}
          <div className="grid grid-cols-12 items-center gap-1.5 sm:gap-2 pt-1">
            {/* Start Column (Always visible on mobile & desktop) */}
            <div className="col-span-3 flex flex-col items-center gap-1 sm:gap-2 text-center">
              <p className="text-xs sm:text-base font-extrabold leading-tight text-[#FFF6E5]" style={{ fontFamily: arFont }}>
                {poster.rightTitleAr}
              </p>
              <span className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg bg-[#FFF6E5] text-[#151412] text-[9px] sm:text-[10px] font-bold leading-tight shadow">
                {poster.rightSubAr}
              </span>
              {poster.showMedallions && (
                <div className="scale-75 sm:scale-100 origin-top">
                  <HangingMedallionSvg
                    monogram={poster.monogramText || 'M&S'}
                    color={cfg.accentColor}
                    className="w-10 h-20 sm:w-14 sm:h-28"
                  />
                </div>
              )}
            </div>

            {/* Center Stage Portrait */}
            <div className="col-span-6 flex justify-center relative">
              <div
                className="relative w-36 h-48 sm:w-64 sm:h-80 rounded-t-[4.5rem] sm:rounded-t-[7rem] rounded-b-2xl sm:rounded-b-3xl overflow-hidden border-2 shadow-2xl"
                style={{
                  borderColor: `${cfg.accentColor}88`,
                  boxShadow: `0 0 40px -6px ${cfg.accentColor}99`,
                }}
              >
                <img
                  src={portraitSrc}
                  alt={groomLine}
                  className="w-full h-full object-cover object-top"
                />
                <div
                  className="absolute inset-x-0 bottom-0 h-16 sm:h-24"
                  style={{
                    background: `linear-gradient(to top, ${cfg.bgColor || '#0D0905'}, transparent)`,
                  }}
                />
              </div>
            </div>

            {/* End Column (Always visible on mobile & desktop) */}
            <div className="col-span-3 flex flex-col items-center gap-1 sm:gap-2 text-center">
              <p className="text-xs sm:text-base font-extrabold leading-tight text-[#FFF6E5]" style={{ fontFamily: arFont }}>
                {poster.leftTitleAr}
              </p>
              <span className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg bg-[#FFF6E5] text-[#151412] text-[9px] sm:text-[10px] font-bold leading-tight shadow">
                {poster.leftSubAr}
              </span>
              {poster.showMedallions && (
                <div className="scale-75 sm:scale-100 origin-top">
                  <HangingMedallionSvg
                    monogram={poster.monogramText || 'M&S'}
                    color={cfg.accentColor}
                    className="w-10 h-20 sm:w-14 sm:h-28"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 3D Metallic Gold Display Block */}
          <div className="-mt-3 sm:-mt-6 relative z-20 space-y-1.5 sm:space-y-2">
            <div className="inline-block px-3 sm:px-4 py-0.5 rounded-full bg-black/75 border border-[#D8B86F]/60 text-[11px] sm:text-xs font-bold text-[#F7D788]">
              {invitation.invitation_title_ar || (isAr ? 'أفراح' : 'Wedding of')}
            </div>

            <div>
              <span className="inline-block px-4 sm:px-5 py-0.5 sm:py-1 rounded-xl bg-black/80 border border-[#D8B86F]/55 text-sm sm:text-xl font-bold text-white">
                {groomLine}
              </span>
            </div>

            {/* Giant 3D Metallic Headline */}
            <h2
              className="text-3xl sm:text-6xl font-black leading-tight sm:leading-none tracking-tight py-0.5 sm:py-1"
              style={{
                fontFamily: arFont,
                background: `linear-gradient(180deg, #FFF7DC 0%, ${cfg.accentColor} 52%, #9A5B13 100%)`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.85))',
              }}
            >
              {isAr ? poster.headlineAr : poster.headlineEn}
            </h2>

            {poster.footerBadgeAr && (
              <div className="inline-block px-3.5 sm:px-5 py-1 sm:py-1.5 rounded-full bg-[#A84D18] text-white text-[11px] sm:text-sm font-bold shadow">
                {isAr ? poster.footerBadgeAr : poster.subHeadlineEn}
              </div>
            )}
          </div>

          {/* Two-Night Date Split Boxes + Side Corner Callouts */}
          <div className="grid grid-cols-12 items-center gap-1.5 sm:gap-3 pt-2">
            <div className="col-span-2 sm:col-span-3 text-center text-[10px] sm:text-sm font-bold text-[#FDE68A] leading-tight">
              {poster.cornerRightAr}
            </div>

            <div className={`${poster.twoNightsEnabled ? 'col-span-8 sm:col-span-6 grid grid-cols-2 gap-2 sm:gap-3' : 'col-span-8 sm:col-span-6'}`}>
              {/* Night 1 */}
              <div
                className="rounded-xl sm:rounded-2xl border p-2 sm:p-3 bg-black/75 backdrop-blur-sm space-y-0.5 sm:space-y-1"
                style={{ borderColor: `${cfg.accentColor}99` }}
              >
                <span className="block text-[10px] sm:text-[11px] font-bold text-[#FFF6E5]/85">
                  {isAr ? poster.night1.labelAr : poster.night1.labelEn}
                </span>
                <span
                  className="block text-xl sm:text-3xl font-black tabular-nums leading-tight"
                  style={{ color: cfg.accentColor }}
                  dir="ltr"
                >
                  {poster.night1.dateLabel}
                </span>
                <span className="block text-[10px] sm:text-[11px] font-semibold text-white/85 truncate">
                  {isAr ? poster.night1.eventTitleAr : poster.night1.eventTitleEn}
                </span>
                <span className="block text-[9px] sm:text-[10px] text-[#FDE68A]/85 truncate">
                  {isAr ? poster.night1.venueAr : poster.night1.venueEn}
                </span>
              </div>

              {/* Night 2 */}
              {poster.twoNightsEnabled && (
                <div
                  className="rounded-xl sm:rounded-2xl border p-2 sm:p-3 bg-black/75 backdrop-blur-sm space-y-0.5 sm:space-y-1"
                  style={{ borderColor: `${cfg.accentColor}99` }}
                >
                  <span className="block text-[10px] sm:text-[11px] font-bold text-[#FFF6E5]/85">
                    {isAr ? poster.night2.labelAr : poster.night2.labelEn}
                  </span>
                  <span
                    className="block text-xl sm:text-3xl font-black tabular-nums leading-tight"
                    style={{ color: cfg.accentColor }}
                    dir="ltr"
                  >
                    {poster.night2.dateLabel}
                  </span>
                  <span className="block text-[10px] sm:text-[11px] font-semibold text-white/85 truncate">
                    {isAr ? poster.night2.eventTitleAr : poster.night2.eventTitleEn}
                  </span>
                  <span className="block text-[9px] sm:text-[10px] text-[#FDE68A]/85 truncate">
                    {isAr ? poster.night2.venueAr : poster.night2.venueEn}
                  </span>
                </div>
              )}
            </div>

            <div className="col-span-2 sm:col-span-3 text-center text-[10px] sm:text-sm font-bold text-[#FDE68A] leading-tight">
              {poster.cornerLeftAr}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================================
     LAYOUT B: ARAB HERITAGE SPLIT POSTER (Poster 2 style - Cream, Roses & 2 Nights)
     ========================================================================= */
  return (
    <div
      ref={exportCardRef}
      className={`relative rounded-3xl overflow-hidden shadow-2xl border-2 ${
        compactPreview ? 'p-3 sm:p-6' : 'p-3.5 sm:p-8'
      }`}
      style={{
        backgroundColor: cfg.surfaceColor || '#F7F0E3',
        color: cfg.textColor || '#1C1812',
        borderColor: cfg.accentColor || '#B89246',
        backgroundImage:
          'radial-gradient(circle at 25% 35%, rgba(255,255,255,0.85), transparent 65%)',
      }}
    >
      {/* Inner Hairline Frame */}
      <div
        className="pointer-events-none absolute inset-2 sm:inset-2.5 rounded-2xl border"
        style={{ borderColor: `${cfg.accentColor}77` }}
        aria-hidden="true"
      />

      {/* Corner Floral Bouquets & Hanging Lantern */}
      {poster.showFloralCorners && (
        <>
          <FloralBouquetSvg className="pointer-events-none absolute -top-2 -start-2 w-20 h-20 sm:w-32 sm:h-32 opacity-95 z-10" />
          <FloralBouquetSvg
            flip
            className="pointer-events-none absolute -bottom-2 -end-2 w-20 h-20 sm:w-32 sm:h-32 opacity-95 z-10"
          />
        </>
      )}

      {poster.showLantern && (
        <HangingLanternSvg
          color={cfg.accentColor || '#B89246'}
          className="pointer-events-none absolute top-0 end-4 sm:end-6 w-7 h-16 sm:w-9 sm:h-20 z-10"
        />
      )}

      <div className="relative z-20 space-y-3 sm:space-y-4">
        {/* Top Header Block: Headline + Badge + Groom Nameplate */}
        <div className="space-y-1 sm:space-y-2 text-center pt-1">
          {guestName && (
            <div className="inline-block px-3.5 py-0.5 rounded-full border border-[#B89246]/50 bg-white/80 text-[11px] sm:text-xs font-bold text-[#7C5F21]">
              {isAr ? `دعوة خاصة إلى: ${guestName}` : `Honored Guest: ${guestName}`}
            </div>
          )}

          <h2
            className="text-3xl sm:text-5xl font-bold leading-tight"
            style={{ fontFamily: `"Aref Ruqaa", ${arFont}`, color: '#5A4117' }}
          >
            {isAr ? poster.headlineAr : poster.headlineEn}
          </h2>

          <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm font-bold text-[#3E2E14]">
            <span className="h-px w-6 sm:w-10 bg-[#B89246]/60" aria-hidden="true" />
            <span>{isAr ? poster.badgeTextAr : poster.badgeTextEn}</span>
            <span className="h-px w-6 sm:w-10 bg-[#B89246]/60" aria-hidden="true" />
          </div>

          {/* Dark & Gold Nameplate Banner */}
          <div className="pt-0.5">
            <div
              className="inline-block px-5 sm:px-7 py-1 sm:py-2 rounded-full bg-[#1C1915] text-[#FAF5E8] border-2 text-base sm:text-2xl font-bold shadow-md"
              style={{ borderColor: cfg.accentColor }}
            >
              {groomLine}
            </div>
          </div>
        </div>

        {/* Poster Body: Side-by-Side Groom & 2-Night Cards */}
        <div className="grid grid-cols-12 gap-2 sm:gap-6 items-center pt-1">
          {/* Two-Night Schedule Cards Column */}
          <div className="col-span-7 space-y-2.5 sm:space-y-3.5">
            {/* Night 1 Card */}
            <div
              className="rounded-xl sm:rounded-2xl border bg-white/85 backdrop-blur-sm p-2.5 sm:p-4 text-center space-y-1 sm:space-y-2 shadow-sm"
              style={{ borderColor: `${cfg.accentColor}88` }}
            >
              <div className="-mt-5 sm:-mt-7 mb-0.5 sm:mb-1">
                <span
                  className="inline-block px-3 sm:px-5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-sm font-bold text-white shadow"
                  style={{ backgroundColor: '#8B6220' }}
                >
                  {isAr ? poster.night1.labelAr : poster.night1.labelEn}
                </span>
              </div>

              <div className="flex items-center justify-center gap-1 sm:gap-2 text-[11px] sm:text-sm font-bold text-[#1C1812]">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-[#8B6220]" aria-hidden="true" />
                <span>{poster.night1.subDateLabel}</span>
                <span dir="ltr">{poster.night1.dateLabel}</span>
              </div>

              <div className="scale-75 sm:scale-100 origin-center py-0.5">
                {renderNightIcon(poster.night1.icon, '#8B6220')}
              </div>

              <h3 className="text-sm sm:text-xl font-extrabold text-[#1C1812] leading-tight" style={{ fontFamily: arFont }}>
                {isAr ? poster.night1.eventTitleAr : poster.night1.eventTitleEn}
              </h3>

              <p className="text-[10px] sm:text-sm font-semibold text-[#524B40] flex items-center justify-center gap-1 truncate">
                <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#8B6220] shrink-0" aria-hidden="true" />
                <span className="truncate">{isAr ? poster.night1.venueAr : poster.night1.venueEn}</span>
              </p>
            </div>

            {/* Night 2 Card */}
            {poster.twoNightsEnabled && (
              <div
                className="rounded-xl sm:rounded-2xl border bg-white/85 backdrop-blur-sm p-2.5 sm:p-4 text-center space-y-1 sm:space-y-2 shadow-sm mt-3 sm:mt-4"
                style={{ borderColor: `${cfg.accentColor}88` }}
              >
                <div className="-mt-5 sm:-mt-7 mb-0.5 sm:mb-1">
                  <span
                    className="inline-block px-3 sm:px-5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-sm font-bold text-white shadow"
                    style={{ backgroundColor: '#8B6220' }}
                  >
                    {isAr ? poster.night2.labelAr : poster.night2.labelEn}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-1 sm:gap-2 text-[11px] sm:text-sm font-bold text-[#1C1812]">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-[#8B6220]" aria-hidden="true" />
                  <span>{poster.night2.subDateLabel}</span>
                  <span dir="ltr">{poster.night2.dateLabel}</span>
                </div>

                <div className="scale-75 sm:scale-100 origin-center py-0.5">
                  {renderNightIcon(poster.night2.icon, '#8B6220')}
                </div>

                <h3 className="text-sm sm:text-xl font-extrabold text-[#1C1812] leading-tight" style={{ fontFamily: arFont }}>
                  {isAr ? poster.night2.eventTitleAr : poster.night2.eventTitleEn}
                </h3>

                <p className="text-[10px] sm:text-sm font-semibold text-[#524B40] flex items-center justify-center gap-1 truncate">
                  <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#8B6220] shrink-0" aria-hidden="true" />
                  <span className="truncate">{isAr ? poster.night2.venueAr : poster.night2.venueEn}</span>
                </p>
              </div>
            )}
          </div>

          {/* Full-Length Portrait Column (Flanking on mobile and desktop) */}
          <div className="col-span-5 flex justify-center h-full">
            <div
              className="relative w-full max-w-[220px] sm:max-w-[300px] h-full min-h-[220px] sm:min-h-[360px] rounded-t-full rounded-b-2xl sm:rounded-b-3xl overflow-hidden border-2 shadow-xl bg-[#EFE6D4]"
              style={{ borderColor: `${cfg.accentColor}99` }}
            >
              <img
                src={portraitSrc}
                alt={groomLine}
                className="w-full h-full object-cover object-top"
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  boxShadow: 'inset 0 0 20px rgba(184,146,70,0.22)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
