import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  ExternalLink,
  Heart,
  MapPin,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import type { Invitation, TemplateConfig } from '../types/database';
import { useI18n } from '../lib/i18n';
import { parseMapsCoordinates } from '../lib/exportCard';
import {
  ArabesqueDivider,
  CornerFiligree,
  KhatamRosette,
  OliveSprig,
  WaxSealEmblem,
} from './Ornaments';
import { CountdownClock } from './CountdownClock';
import { ModalDialog } from './ModalDialog';
import { PosterRenderer } from './PosterRenderer';

interface InvitationRendererProps {
  invitation: Omit<Invitation, 'id' | 'created_at' | 'updated_at' | 'view_count'> & {
    id?: string;
    view_count?: number;
  };
  guestName?: string;
  compactPreview?: boolean;
  showEnvelopeGate?: boolean;
  isOpened?: boolean;
  onOpenEnvelope?: () => void;
  musicPlaying?: boolean;
  onToggleMusic?: () => void;
  shareUrl?: string;
  exportCardRef?: React.RefObject<HTMLDivElement | null>;
}

function getBorderBoxStyle(config: TemplateConfig): React.CSSProperties {
  switch (config.borderStyle) {
    case 'double_filigree':
      return {
        border: `2px solid ${config.accentColor}`,
        boxShadow: `inset 0 0 0 6px ${config.surfaceColor}, inset 0 0 0 7px ${config.accentColor}88`,
      };
    case 'ornate_gold':
      return {
        border: `2px solid ${config.accentColor}`,
        boxShadow: `0 24px 60px -16px ${config.accentColor}55, inset 0 0 0 8px ${config.surfaceColor}, inset 0 0 0 9px ${config.accentColor}`,
      };
    case 'mashrabiya':
      return {
        border: `1.5px solid ${config.accentColor}aa`,
        boxShadow: `inset 0 0 0 10px ${config.surfaceColor}, inset 0 0 0 11px ${config.accentColor}44`,
      };
    case 'architectural':
      return {
        border: `1px solid ${config.accentColor}66`,
        borderTop: `6px solid ${config.accentColor}`,
      };
    case 'filigree_glow':
      return {
        border: `1.5px solid ${config.accentColor}`,
        boxShadow: `0 0 42px -10px ${config.accentColor}66, inset 0 0 0 6px ${config.surfaceColor}, inset 0 0 0 7px ${config.accentColor}55`,
      };
    case 'single_thin':
      return {
        border: `1px solid ${config.accentColor}38`,
      };
    default:
      return {
        border: `1.5px solid ${config.accentColor}77`,
        boxShadow: `inset 0 0 0 7px ${config.surfaceColor}, inset 0 0 0 8px ${config.accentColor}33`,
      };
  }
}

export const InvitationRenderer: React.FC<InvitationRendererProps> = ({
  invitation,
  guestName,
  compactPreview = false,
  showEnvelopeGate = false,
  isOpened = true,
  onOpenEnvelope,
  musicPlaying = false,
  onToggleMusic,
  shareUrl,
  exportCardRef,
}) => {
  const { isAr, formatEventDate } = useI18n();
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const cfg = invitation.theme_config;
  const arFont = `"${cfg.fontAr || 'Amiri'}", "Amiri", serif`;
  const enFont = `"${cfg.fontEn || 'Cormorant Garamond'}", "Cormorant Garamond", serif`;

  const displayBride = isAr
    ? invitation.bride_name_ar || invitation.bride_name_en
    : invitation.bride_name_en || invitation.bride_name_ar;
  const displayGroom = isAr
    ? invitation.groom_name_ar || invitation.groom_name_en
    : invitation.groom_name_en || invitation.groom_name_ar;

  const monogram = `${(invitation.groom_name_en || 'T').trim().charAt(0).toUpperCase()} & ${(invitation.bride_name_en || 'N').trim().charAt(0).toUpperCase()}`;

  const mapsInfo = parseMapsCoordinates(
    invitation.maps_url,
    invitation.maps_lat,
    invitation.maps_lng,
    invitation.venue_address || invitation.venue_name_en || invitation.venue_name_ar,
  );

  const handleTriggerOpen = () => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReduced) {
      try {
        confetti({
          particleCount: 55,
          spread: 75,
          origin: { y: 0.6 },
          colors: [cfg.accentColor, '#F4E5B8', '#FFFFFF', '#32402E'],
        });
      } catch {
        // Confetti optional
      }
    }
    onOpenEnvelope?.();
  };

  if (showEnvelopeGate && !isOpened) {
    return (
      <div
        className="relative min-h-[460px] sm:min-h-[620px] rounded-2xl sm:rounded-3xl overflow-hidden flex items-center justify-center p-4 sm:p-10 text-center shadow-2xl"
        style={{
          backgroundColor: cfg.bgColor,
          color: cfg.textColor,
          ...getBorderBoxStyle(cfg),
        }}
      >
        {/* Ambient starlight particles for cinematic/royal look */}
        {cfg.animationPreset === 'cinematic_doors' && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {[12, 28, 46, 68, 84].map((leftPct, idx) => (
              <span
                key={leftPct}
                className="petal-particle absolute top-0 w-2 h-2 rounded-full"
                style={{
                  left: `${leftPct}%`,
                  backgroundColor: cfg.accentColor,
                  animationDelay: `${idx * 1.1}s`,
                  opacity: 0.55,
                }}
              />
            ))}
          </div>
        )}

        <CornerFiligree color={cfg.accentColor} position="tl" styleVariant={cfg.ornamentStyle} />
        <CornerFiligree color={cfg.accentColor} position="tr" styleVariant={cfg.ornamentStyle} />
        <CornerFiligree color={cfg.accentColor} position="bl" styleVariant={cfg.ornamentStyle} />
        <CornerFiligree color={cfg.accentColor} position="br" styleVariant={cfg.ornamentStyle} />

        <div className="relative z-10 max-w-lg mx-auto space-y-6">
          <div className="flex justify-center">
            {cfg.ornamentStyle === 'islamic_khatam' ? (
              <KhatamRosette color={cfg.accentColor} className="w-16 h-16" />
            ) : cfg.ornamentStyle === 'botanical_arch' ? (
              <OliveSprig color={cfg.accentColor} className="w-24 h-10" />
            ) : (
              <WaxSealEmblem initials={monogram} accentColor={cfg.accentColor} size="lg" />
            )}
          </div>

          {guestName && (
            <div
              className="inline-block px-5 py-2 rounded-full border text-sm font-semibold"
              style={{
                borderColor: `${cfg.accentColor}66`,
                backgroundColor: cfg.darkSurface ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.75)',
              }}
            >
              {isAr ? `دعوة خاصة إلى: ${guestName}` : `Specially Invited: ${guestName}`}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs sm:text-sm font-semibold tracking-wider opacity-85">
              {isAr
                ? invitation.invitation_title_ar || 'دعوة زفاف إلكترونية'
                : invitation.invitation_title_en || 'Wedding Invitation'}
            </p>
            <h2
              className="text-3xl sm:text-4xl font-bold leading-snug flex flex-wrap items-center justify-center gap-x-3 gap-y-1"
              style={{ fontFamily: isAr ? arFont : enFont, color: cfg.accentColor }}
            >
              <span>{displayGroom}</span>
              <span className="text-2xl opacity-75">&amp;</span>
              <span>{displayBride}</span>
            </h2>
            <p className="text-sm opacity-80">
              {formatEventDate(invitation.event_date)}
            </p>
          </div>

          <ArabesqueDivider color={cfg.accentColor} className="mx-auto w-56 h-5" />

          <button
            type="button"
            onClick={handleTriggerOpen}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-bold text-base shadow-xl transition-transform hover:scale-[1.03] active:scale-[0.98]"
            style={{
              backgroundColor: cfg.accentColor,
              color: '#151412',
            }}
          >
            <Sparkles className="w-5 h-5" aria-hidden="true" />
            <span>{isAr ? 'افتح الدعوة' : 'Open Invitation'}</span>
          </button>

          {invitation.music_enabled && (
            <p className="text-xs opacity-70">
              {isAr
                ? 'سيتم تشغيل المقطوعة الموسيقية الهادئة تلقائياً عند فتح الدعوة (يمكنك كتمها في أي وقت)'
                : 'Gentle ambient melody plays upon opening (mute anytime)'}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-3xl overflow-hidden ${compactPreview ? '' : 'animate-envelope-reveal'}`}
      style={{
        backgroundColor: cfg.bgColor,
        color: cfg.textColor,
      }}
    >
      {/* Floating Audio Toggle when active */}
      {invitation.music_enabled && onToggleMusic && (
        <div className="sticky top-3 z-30 flex justify-end px-4 pt-3 pointer-events-none">
          <button
            type="button"
            onClick={onToggleMusic}
            aria-label={
              musicPlaying
                ? isAr
                  ? 'إيقاف الموسيقى'
                  : 'Mute music'
                : isAr
                  ? 'تشغيل الموسيقى'
                  : 'Play music'
            }
            className="pointer-events-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold shadow-lg backdrop-blur-md border transition-transform hover:scale-105"
            style={{
              backgroundColor: cfg.darkSurface ? 'rgba(21,20,18,0.85)' : 'rgba(255,255,255,0.9)',
              color: cfg.accentColor,
              borderColor: `${cfg.accentColor}55`,
            }}
          >
            {musicPlaying ? (
              <Volume2 className="w-4 h-4" aria-hidden="true" />
            ) : (
              <VolumeX className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{musicPlaying ? (isAr ? 'إيقاف الصوت' : 'Sound On') : isAr ? 'تشغيل الصوت' : 'Sound Off'}</span>
          </button>
        </div>
      )}

      <div className={`${compactPreview ? 'p-3 sm:p-5' : 'p-4 sm:p-8 lg:p-10'} space-y-8`}>
        {/* HERO EXPORTABLE CARD OR POSTER MODE */}
        {cfg.layoutMode === 'stage_poster' || cfg.layoutMode === 'split_poster' ? (
          <PosterRenderer
            invitation={invitation}
            guestName={guestName}
            compactPreview={compactPreview}
            exportCardRef={exportCardRef}
          />
        ) : (
        <div
          ref={exportCardRef}
          className={`relative rounded-2xl overflow-hidden text-center ${
            compactPreview ? 'px-3.5 py-6 sm:px-8 sm:py-10' : 'px-4 py-7 sm:px-12 sm:py-14'
          }`}
          style={{
            backgroundColor: cfg.surfaceColor,
            color: cfg.textColor,
            ...getBorderBoxStyle(cfg),
          }}
        >
          {/* Ambient corner ornaments */}
          <CornerFiligree color={cfg.accentColor} position="tl" styleVariant={cfg.ornamentStyle} />
          <CornerFiligree color={cfg.accentColor} position="tr" styleVariant={cfg.ornamentStyle} />
          <CornerFiligree color={cfg.accentColor} position="bl" styleVariant={cfg.ornamentStyle} />
          <CornerFiligree color={cfg.accentColor} position="br" styleVariant={cfg.ornamentStyle} />

          {/* Gold foil shimmer bar for Gold Luxury */}
          {cfg.ornamentStyle === 'imperial_foil' && (
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-1.5 gold-foil-gradient"
              aria-hidden="true"
            />
          )}

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            {/* Top Rosette / Seal / Botanical Sprig */}
            <div className="flex justify-center">
              {cfg.ornamentStyle === 'islamic_khatam' ? (
                <KhatamRosette color={cfg.accentColor} className="w-16 h-16" />
              ) : cfg.ornamentStyle === 'botanical_arch' ? (
                <OliveSprig color={cfg.accentColor} className="w-24 h-10" />
              ) : (
                <WaxSealEmblem initials={monogram} accentColor={cfg.accentColor} size="sm" />
              )}
            </div>

            {guestName && (
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs sm:text-sm font-bold"
                style={{
                  borderColor: `${cfg.accentColor}55`,
                  color: cfg.accentColor,
                  backgroundColor: cfg.darkSurface ? 'rgba(255,255,255,0.05)' : 'rgba(184,146,70,0.08)',
                }}
              >
                <Heart className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isAr ? `ضيفنا الكريم: ${guestName}` : `Honored Guest: ${guestName}`}</span>
              </div>
            )}

            {/* Quranic / Poetic Opening Verse */}
            {invitation.opening_verse && (
              <p
                className="text-sm sm:text-base leading-loose font-medium opacity-95 px-2"
                style={{ fontFamily: arFont, color: cfg.accentColor }}
              >
                {invitation.opening_verse}
              </p>
            )}

            {/* Parents / Families Blessing */}
            <p className="text-xs sm:text-sm opacity-85 max-w-xl mx-auto leading-relaxed">
              {isAr
                ? invitation.parents_text_ar || invitation.parents_text_en
                : invitation.parents_text_en || invitation.parents_text_ar}
            </p>

            {/* Optional Cover Portrait inside card */}
            {invitation.cover_image_url && (
              <div className="flex justify-center">
                <div
                  className="w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden border-2 p-1 shadow-lg"
                  style={{ borderColor: cfg.accentColor }}
                >
                  <img
                    src={invitation.cover_image_url}
                    alt={`${displayGroom} & ${displayBride}`}
                    className="w-full h-full object-cover rounded-full"
                    loading="eager"
                  />
                </div>
              </div>
            )}

            {/* Bride & Groom Calligraphic Names */}
            <div className="space-y-1.5 sm:space-y-2 py-1 sm:py-2">
              <h2
                className={`${compactPreview ? 'text-2xl sm:text-4xl' : 'text-2xl sm:text-4xl lg:text-5xl'} font-bold leading-snug flex flex-wrap items-center justify-center gap-x-3 gap-y-1`}
                style={{ fontFamily: arFont, color: cfg.accentColor }}
              >
                <span>{invitation.groom_name_ar || invitation.groom_name_en}</span>
                <span className="text-xl sm:text-3xl opacity-75">&amp;</span>
                <span>{invitation.bride_name_ar || invitation.bride_name_en}</span>
              </h2>

              {(invitation.groom_name_en || invitation.bride_name_en) && (
                <p
                  className="text-lg sm:text-2xl italic tracking-wide opacity-90"
                  style={{ fontFamily: enFont }}
                  dir="ltr"
                >
                  {invitation.groom_name_en} &amp; {invitation.bride_name_en}
                </p>
              )}
            </div>

            <ArabesqueDivider color={cfg.accentColor} className="mx-auto w-60 h-5" />

            {/* Invitation Message */}
            <p className="text-sm sm:text-base leading-relaxed opacity-90 max-w-xl mx-auto">
              {isAr
                ? invitation.invitation_body_ar || invitation.invitation_body_en
                : invitation.invitation_body_en || invitation.invitation_body_ar}
            </p>

            {/* Date, Hijri & Venue Summary Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-start">
              <div
                className="rounded-xl border p-3.5"
                style={{
                  borderColor: `${cfg.accentColor}40`,
                  backgroundColor: cfg.darkSurface ? 'rgba(255,255,255,0.03)' : 'rgba(250,246,238,0.65)',
                }}
              >
                <div className="flex items-center gap-2 text-xs font-bold mb-1" style={{ color: cfg.accentColor }}>
                  <Calendar className="w-4 h-4" aria-hidden="true" />
                  <span>{isAr ? 'التاريخ' : 'Date'}</span>
                </div>
                <p className="text-xs sm:text-sm font-bold leading-snug">
                  {formatEventDate(invitation.event_date)}
                </p>
                {invitation.hijri_date && (
                  <p className="text-[11px] opacity-75 mt-1">{invitation.hijri_date}</p>
                )}
              </div>

              <div
                className="rounded-xl border p-3.5"
                style={{
                  borderColor: `${cfg.accentColor}40`,
                  backgroundColor: cfg.darkSurface ? 'rgba(255,255,255,0.03)' : 'rgba(250,246,238,0.65)',
                }}
              >
                <div className="flex items-center gap-2 text-xs font-bold mb-1" style={{ color: cfg.accentColor }}>
                  <Clock className="w-4 h-4" aria-hidden="true" />
                  <span>{isAr ? 'الوقت' : 'Time'}</span>
                </div>
                <p className="text-xs sm:text-sm font-bold leading-snug">
                  {invitation.event_time_label || '8:00 PM'}
                </p>
              </div>

              <div
                className="rounded-xl border p-3.5"
                style={{
                  borderColor: `${cfg.accentColor}40`,
                  backgroundColor: cfg.darkSurface ? 'rgba(255,255,255,0.03)' : 'rgba(250,246,238,0.65)',
                }}
              >
                <div className="flex items-center gap-2 text-xs font-bold mb-1" style={{ color: cfg.accentColor }}>
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                  <span>{isAr ? 'المكان' : 'Venue'}</span>
                </div>
                <p className="text-xs sm:text-sm font-bold leading-snug">
                  {isAr
                    ? invitation.venue_name_ar || invitation.venue_name_en
                    : invitation.venue_name_en || invitation.venue_name_ar}
                </p>
              </div>
            </div>

            {/* Embedded Compact QR inside exported card */}
            {shareUrl && (
              <div className="pt-3 flex items-center justify-center gap-3">
                <div className="p-2 rounded-xl bg-white shadow-sm">
                  <QRCodeSVG value={shareUrl} size={62} bgColor="#FFFFFF" fgColor="#151412" />
                </div>
                <span className="text-[11px] opacity-75 max-w-[160px] text-start">
                  {isAr ? 'امسح الرمز للوصول السريع للدعوة والموقع' : 'Scan for live invite & directions'}
                </span>
              </div>
            )}
          </div>
        </div>
        )}

        {/* COUNTDOWN SECTION */}
        <section aria-label={isAr ? 'العد التنازلي' : 'Countdown'} className="space-y-3 text-center">
          <h3
            className="text-lg sm:text-xl font-bold"
            style={{ fontFamily: isAr ? arFont : enFont, color: cfg.accentColor }}
          >
            {isAr ? 'العد التنازلي ليوم الزفاف' : 'Counting Down to Forever'}
          </h3>
          <CountdownClock
            targetIso={invitation.event_date}
            accentColor={cfg.accentColor}
            textColor={cfg.textColor}
            darkSurface={cfg.darkSurface}
          />
        </section>

        {/* PHOTO GALLERY */}
        {invitation.gallery_urls && invitation.gallery_urls.length > 0 && (
          <section className="space-y-4">
            <h3
              className="text-lg sm:text-xl font-bold text-center"
              style={{ fontFamily: isAr ? arFont : enFont, color: cfg.accentColor }}
            >
              {isAr ? 'لحظاتنا المصورة' : 'Captured Moments'}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {invitation.gallery_urls.map((url, idx) => (
                <button
                  key={`${url}-${idx}`}
                  type="button"
                  onClick={() => setLightboxImg(url)}
                  className="group relative aspect-square rounded-2xl overflow-hidden border focus-visible:ring-2"
                  style={{ borderColor: `${cfg.accentColor}44` }}
                >
                  <img
                    src={url}
                    alt={`${displayGroom} & ${displayBride} ${idx + 1}`}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* SCHEDULE TIMELINE */}
        {invitation.schedule && invitation.schedule.length > 0 && (
          <section
            className="rounded-2xl border p-5 sm:p-7 space-y-5"
            style={{
              borderColor: `${cfg.accentColor}35`,
              backgroundColor: cfg.surfaceColor,
            }}
          >
            <h3
              className="text-lg sm:text-xl font-bold text-center"
              style={{ fontFamily: isAr ? arFont : enFont, color: cfg.accentColor }}
            >
              {isAr ? 'البرنامج الزمني للحفل' : 'Evening Schedule'}
            </h3>
            <ol className="space-y-4 max-w-xl mx-auto">
              {invitation.schedule.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-4 pb-4 border-b last:border-b-0 last:pb-0"
                  style={{ borderColor: `${cfg.accentColor}22` }}
                >
                  <span
                    className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold tabular-nums"
                    style={{
                      backgroundColor: `${cfg.accentColor}22`,
                      color: cfg.accentColor,
                    }}
                    dir="ltr"
                  >
                    {item.time}
                  </span>
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-sm sm:text-base">
                      {isAr ? item.titleAr || item.titleEn : item.titleEn || item.titleAr}
                    </h4>
                    <p className="text-xs sm:text-sm opacity-75">
                      {isAr ? item.descAr || item.descEn : item.descEn || item.descAr}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* VENUE & GOOGLE MAPS */}
        <section
          className="rounded-2xl border p-5 sm:p-7 space-y-4"
          style={{
            borderColor: `${cfg.accentColor}35`,
            backgroundColor: cfg.surfaceColor,
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3
                className="text-lg sm:text-xl font-bold"
                style={{ fontFamily: isAr ? arFont : enFont, color: cfg.accentColor }}
              >
                {isAr ? 'موقع الحفل على الخريطة' : 'Venue & Directions'}
              </h3>
              <p className="text-sm opacity-85 mt-1">
                {isAr
                  ? invitation.venue_name_ar || invitation.venue_name_en
                  : invitation.venue_name_en || invitation.venue_name_ar}
                {invitation.venue_address ? ` — ${invitation.venue_address}` : ''}
              </p>
            </div>
            <a
              href={mapsInfo.externalHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-transform hover:scale-105"
              style={{
                backgroundColor: cfg.accentColor,
                color: '#151412',
              }}
            >
              <MapPin className="w-4 h-4" aria-hidden="true" />
              <span>{isAr ? 'فتح في خرائط Google' : 'Open in Google Maps'}</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>

          {!compactPreview && (
            <div className="rounded-2xl overflow-hidden border aspect-[16/9] sm:aspect-[21/9]" style={{ borderColor: `${cfg.accentColor}33` }}>
              <iframe
                title={isAr ? 'خريطة موقع حفل الزفاف' : 'Wedding venue Google Maps location'}
                src={mapsInfo.embedSrc}
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}

          {(invitation.notes_ar || invitation.notes_en) && (
            <p
              className="text-xs sm:text-sm rounded-xl px-4 py-3 border opacity-90"
              style={{
                borderColor: `${cfg.accentColor}30`,
                backgroundColor: cfg.darkSurface ? 'rgba(255,255,255,0.03)' : 'rgba(184,146,70,0.06)',
              }}
            >
              {isAr ? invitation.notes_ar || invitation.notes_en : invitation.notes_en || invitation.notes_ar}
            </p>
          )}
        </section>
      </div>

      {/* Photo Lightbox Dialog (only mounted when gallery exists) */}
      {invitation.gallery_urls && invitation.gallery_urls.length > 0 && (
        <ModalDialog
          open={Boolean(lightboxImg)}
          onClose={() => setLightboxImg(null)}
          title={isAr ? 'معرض الصور' : 'Photo Gallery'}
          maxWidthClass="max-w-3xl"
        >
          {lightboxImg && (
            <img
              src={lightboxImg}
              alt={`${displayGroom} & ${displayBride}`}
              className="w-full max-h-[70dvh] object-contain rounded-xl"
            />
          )}
        </ModalDialog>
      )}
    </div>
  );
};
