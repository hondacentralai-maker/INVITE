import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Heart,
  Image as ImageIcon,
  MessageSquareHeart,
  QrCode,
  Send,
  Share2,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { recordInvitationView, supabase } from '../lib/supabase';
import { useI18n } from '../lib/i18n';
import { useToast } from '../components/ToastProvider';
import { LuxuryAudioPlayer } from '../lib/audioSynth';
import {
  buildWhatsAppShareUrl,
  downloadSvgQrCode,
  exportElementAsPdf,
  exportElementAsPng,
} from '../lib/exportCard';
import { InvitationRenderer } from '../components/InvitationRenderer';
import { ModalDialog } from '../components/ModalDialog';
import type { Invitation, PublicWish, RsvpAttendance } from '../types/database';

export const PublicInvitePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const guestNameParam = searchParams.get('to')?.trim() || '';

  const { isAr, lang, formatEventDate } = useI18n();
  const { notify } = useToast();

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [wishes, setWishes] = useState<PublicWish[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpened, setIsOpened] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [customGuestInput, setCustomGuestInput] = useState(guestNameParam);
  const [exporting, setExporting] = useState<'png' | 'pdf' | null>(null);

  // RSVP state
  const [rsvpName, setRsvpName] = useState(guestNameParam);
  const [rsvpPhone, setRsvpPhone] = useState('');
  const [rsvpAttendance, setRsvpAttendance] = useState<RsvpAttendance>('attending');
  const [rsvpCount, setRsvpCount] = useState(1);
  const [rsvpWishes, setRsvpWishes] = useState('');
  const [rsvpNote, setRsvpNote] = useState('');
  const [rsvpPublicWish, setRsvpPublicWish] = useState(true);
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false);
  const [rsvpSubmitted, setRsvpSubmitted] = useState(false);

  const exportCardRef = useRef<HTMLDivElement | null>(null);
  const qrSvgRef = useRef<SVGSVGElement | null>(null);
  const audioRef = useRef<LuxuryAudioPlayer | null>(null);
  const viewRecordedRef = useRef<string | null>(null);

  useEffect(() => {
    audioRef.current = new LuxuryAudioPlayer();
    return () => {
      audioRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    setIsOpened(false);

    supabase
      .from('invitations')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!active) return;
        const inv = (data as Invitation | null) ?? null;
        setInvitation(inv);
        setLoading(false);

        if (inv) {
          document.title = `${inv.groom_name_ar || inv.groom_name_en} & ${inv.bride_name_ar || inv.bride_name_en} | مَراسِم`;
          if (viewRecordedRef.current !== slug) {
            viewRecordedRef.current = slug;
            void recordInvitationView(slug, guestNameParam ? 'personalized_link' : 'direct');
          }
          const { data: wishData } = await supabase
            .from('public_wishes')
            .select('*')
            .eq('invitation_id', inv.id)
            .order('created_at', { ascending: false })
            .limit(30);
          if (active && wishData) {
            setWishes(wishData as PublicWish[]);
          }
        }
      });

    return () => {
      active = false;
      audioRef.current?.stop();
      setMusicPlaying(false);
    };
  }, [slug, guestNameParam]);

  const currentShareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/i/${slug ?? ''}${
          customGuestInput.trim() ? `?to=${encodeURIComponent(customGuestInput.trim())}` : ''
        }`
      : '';

  const handleOpenEnvelope = async () => {
    setIsOpened(true);
    if (invitation?.music_enabled && audioRef.current) {
      const started = await audioRef.current.start(invitation.music_preset, invitation.music_url);
      setMusicPlaying(started);
    }
  };

  const handleToggleMusic = async () => {
    if (!invitation || !audioRef.current) return;
    if (musicPlaying) {
      audioRef.current.stop();
      setMusicPlaying(false);
    } else {
      const started = await audioRef.current.start(invitation.music_preset, invitation.music_url);
      setMusicPlaying(started);
    }
  };

  const handleDownloadPng = async () => {
    if (!exportCardRef.current || !invitation) return;
    setExporting('png');
    try {
      await exportElementAsPng(exportCardRef.current, `${invitation.slug}-invite`);
      notify(isAr ? 'تم تحميل بطاقة الدعوة كصورة PNG' : 'Invitation PNG downloaded', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Export failed', 'error');
    } finally {
      setExporting(null);
    }
  };

  const handleDownloadPdf = async () => {
    if (!exportCardRef.current || !invitation) return;
    setExporting('pdf');
    try {
      await exportElementAsPdf(
        exportCardRef.current,
        `${invitation.slug}-invite`,
        invitation.theme_config.bgColor || '#FAF6EE',
      );
      notify(isAr ? 'تم تصدير الدعوة كملف PDF' : 'Invitation PDF exported', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'PDF export failed', 'error');
    } finally {
      setExporting(null);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentShareUrl);
      notify(isAr ? 'تم نسخ رابط الدعوة' : 'Invitation link copied', 'success');
    } catch {
      notify(currentShareUrl, 'info');
    }
  };

  const handleSubmitRsvp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;
    setRsvpSubmitting(true);

    const { error } = await supabase.from('rsvps').insert({
      invitation_id: invitation.id,
      guest_name: rsvpName.trim(),
      guest_phone: rsvpPhone.trim(),
      attendance: rsvpAttendance,
      guests_count: rsvpAttendance === 'declined' ? 1 : rsvpCount,
      wishes_message: rsvpWishes.trim(),
      dietary_or_note: rsvpNote.trim(),
      is_wish_public: rsvpPublicWish,
    });

    setRsvpSubmitting(false);

    if (error) {
      notify(error.message, 'error');
      return;
    }

    setRsvpSubmitted(true);
    notify(
      isAr ? 'شكراً لك! تم تسجيل ردك وتهنئتك بنجاح' : 'Thank you! Your RSVP has been recorded.',
      'success',
    );

    if (rsvpPublicWish && rsvpWishes.trim()) {
      setWishes((prev) => [
        {
          id: `local-${Date.now()}`,
          invitation_id: invitation.id,
          guest_name: rsvpName.trim(),
          attendance: rsvpAttendance,
          wishes_message: rsvpWishes.trim(),
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    }

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReduced && rsvpAttendance === 'attending') {
      try {
        confetti({ particleCount: 45, spread: 60, origin: { y: 0.7 } });
      } catch {
        // Optional
      }
    }
  };

  if (loading) {
    return (
      <main id="main-content" className="max-w-4xl mx-auto px-4 py-16">
        <div className="h-[520px] rounded-3xl bg-[#EFE7D6] animate-pulse" />
      </main>
    );
  }

  if (!invitation) {
    return (
      <main id="main-content" className="max-w-2xl mx-auto px-4 py-20 text-center space-y-5">
        <h1 className="text-3xl font-bold text-[#151412]">
          {isAr ? 'الدعوة غير موجودة أو لم تُنشر بعد' : 'Invitation Not Found'}
        </h1>
        <p className="text-sm text-[#524B40]">
          {isAr
            ? 'تأكد من صحة رابط الدعوة، أو أنشئ دعوة زفاف جديدة من استوديو مراسم.'
            : 'Check the URL or create a new invitation in Marasim Studio.'}
        </p>
        <div className="flex justify-center gap-3">
          <Link
            to="/studio"
            className="px-6 py-3 rounded-full bg-[#151412] text-[#FAF6EE] text-sm font-bold"
          >
            {isAr ? 'تصميم دعوة جديدة' : 'Create Invitation'}
          </Link>
          <Link
            to="/i/tariq-noura"
            className="px-6 py-3 rounded-full border border-[#B89246]/45 text-sm font-bold"
          >
            {isAr ? 'عرض دعوة نموذجية' : 'View Sample'}
          </Link>
        </div>
      </main>
    );
  }

  const whatsAppHref = buildWhatsAppShareUrl({
    url: currentShareUrl,
    groomAr: invitation.groom_name_ar,
    brideAr: invitation.bride_name_ar,
    groomEn: invitation.groom_name_en,
    brideEn: invitation.bride_name_en,
    dateLabel: formatEventDate(invitation.event_date),
    venue: isAr
      ? invitation.venue_name_ar || invitation.venue_name_en
      : invitation.venue_name_en || invitation.venue_name_ar,
    guestName: customGuestInput.trim() || undefined,
    lang,
  });

  return (
    <main id="main-content" className="max-w-4xl mx-auto px-2.5 sm:px-6 py-4 sm:py-12 space-y-6 sm:space-y-8">
      {/* Main Invitation Card & Gate */}
      <InvitationRenderer
        invitation={invitation}
        guestName={guestNameParam || customGuestInput.trim() || undefined}
        showEnvelopeGate
        isOpened={isOpened}
        onOpenEnvelope={handleOpenEnvelope}
        musicPlaying={musicPlaying}
        onToggleMusic={handleToggleMusic}
        shareUrl={currentShareUrl}
        exportCardRef={exportCardRef}
      />

      {/* Interactive Share, Download & RSVP Section (shown once opened) */}
      {isOpened && (
        <div className="space-y-8 animate-envelope-reveal">
          {/* Action & Export Toolbar */}
          <section className="rounded-3xl border border-[#B89246]/30 bg-white p-5 sm:p-7 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#151412]">
                  {isAr ? 'مشاركة وتحميل الدعوة' : 'Share & Save Keepsake'}
                </h2>
                <p className="text-xs text-[#524B40]">
                  {isAr
                    ? 'احفظ البطاقة كصورة أو ملف PDF، أو شاركها مع ضيف محدد عبر واتساب'
                    : 'Download as high-res PNG or PDF, scan QR, or share personalized links'}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF6EE] border border-[#B89246]/30 text-xs font-bold text-[#7C5F21]">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{invitation.view_count} {isAr ? 'مشاهدة' : 'views'}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              <button
                type="button"
                disabled={exporting !== null}
                onClick={handleDownloadPng}
                className="inline-flex items-center justify-center gap-2 min-h-11 px-3 rounded-xl bg-[#151412] text-[#FAF6EE] text-xs font-bold hover:bg-[#32402E] disabled:opacity-60 transition-colors"
              >
                <ImageIcon className="w-4 h-4 text-[#D8B86F]" aria-hidden="true" />
                <span>{exporting === 'png' ? '...' : isAr ? 'تحميل PNG' : 'Save PNG'}</span>
              </button>

              <button
                type="button"
                disabled={exporting !== null}
                onClick={handleDownloadPdf}
                className="inline-flex items-center justify-center gap-2 min-h-11 px-3 rounded-xl border border-[#B89246]/45 bg-[#FAF6EE] text-[#151412] text-xs font-bold hover:bg-[#F2EADB] disabled:opacity-60 transition-colors"
              >
                <FileText className="w-4 h-4 text-[#7C5F21]" aria-hidden="true" />
                <span>{exporting === 'pdf' ? '...' : isAr ? 'تحميل PDF' : 'Save PDF'}</span>
              </button>

              <a
                href={whatsAppHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 min-h-11 px-3 rounded-xl bg-[#32402E] text-[#FAF6EE] text-xs font-bold hover:bg-[#243020] transition-colors"
              >
                <Share2 className="w-4 h-4 text-[#D8B86F]" aria-hidden="true" />
                <span>{isAr ? 'مشاركة واتساب' : 'WhatsApp'}</span>
              </a>

              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center justify-center gap-2 min-h-11 px-3 rounded-xl border border-[#B89246]/45 bg-white text-[#151412] text-xs font-bold hover:bg-[#FAF6EE] transition-colors"
              >
                <Copy className="w-4 h-4 text-[#7C5F21]" aria-hidden="true" />
                <span>{isAr ? 'نسخ الرابط' : 'Copy Link'}</span>
              </button>

              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 min-h-11 px-3 rounded-xl border border-[#B89246]/45 bg-white text-[#151412] text-xs font-bold hover:bg-[#FAF6EE] transition-colors"
              >
                <QrCode className="w-4 h-4 text-[#7C5F21]" aria-hidden="true" />
                <span>{isAr ? 'رمز QR' : 'QR Pass'}</span>
              </button>
            </div>

            {/* Personalized Guest Link Helper */}
            <div className="pt-2 border-t border-[#B89246]/20 flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
              <div className="flex-1">
                <label htmlFor="personal-guest-name" className="block text-xs font-bold text-[#524B40] mb-1">
                  {isAr ? 'تخصيص اسم الضيف في رابط الدعوة (?to=)' : 'Personalize Link for a Guest (?to=)'}
                </label>
                <input
                  id="personal-guest-name"
                  type="text"
                  value={customGuestInput}
                  onChange={(e) => setCustomGuestInput(e.target.value)}
                  placeholder={isAr ? 'مثال: الأستاذ فهد السبيعي' : 'e.g. Mr. Fahad Al-Subaie'}
                  className="w-full min-h-11 px-3.5 rounded-xl border border-[#B89246]/35 bg-[#FAF6EE] text-sm"
                />
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="min-h-11 px-5 rounded-xl bg-[#FAF6EE] border border-[#B89246]/45 text-xs font-bold text-[#151412] hover:bg-[#F2EADB]"
              >
                {isAr ? 'نسخ الرابط المخصص' : 'Copy Custom Link'}
              </button>
            </div>
          </section>

          {/* RSVP FORM */}
          {invitation.rsvp_enabled && (
            <section
              id="rsvp-section"
              className="rounded-3xl border border-[#B89246]/30 bg-white p-6 sm:p-8 shadow-sm space-y-6"
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-[#32402E] text-[#D8B86F] flex items-center justify-center">
                  <UserCheck className="w-5 h-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-[#151412]">
                    {isAr ? 'تأكيد الحضور والتهنئة (RSVP)' : 'Confirm Attendance & Wishes'}
                  </h2>
                  <p className="text-xs text-[#524B40]">
                    {isAr
                      ? 'يسعد العروسان بتأكيد حضوركم أو ترك رسالة تهنئة دافئة'
                      : 'Let the couple know if you can attend and share your blessing'}
                  </p>
                </div>
              </div>

              {rsvpSubmitted ? (
                <div className="rounded-2xl border border-[#32402E]/30 bg-[#FAF6EE] p-6 text-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-[#32402E] mx-auto" aria-hidden="true" />
                  <h3 className="text-lg font-bold text-[#151412]">
                    {isAr ? 'تم استلام ردكم بكل سرور' : 'Your Response Is Confirmed'}
                  </h3>
                  <p className="text-sm text-[#524B40]">
                    {isAr
                      ? 'نسعد بلقائكم ومشاركتكم هذه الليلة المباركة.'
                      : 'Thank you for responding. We look forward to celebrating with you.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setRsvpSubmitted(false)}
                    className="px-4 py-2 rounded-full border border-[#B89246]/40 text-xs font-bold"
                  >
                    {isAr ? 'إرسال رد لضيف آخر' : 'Submit Another Response'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitRsvp} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="rsvp-name" className="block text-sm font-semibold mb-1">
                        {isAr ? 'الاسم الكريم' : 'Guest Full Name'} <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id="rsvp-name"
                        name="guestName"
                        type="text"
                        required
                        minLength={2}
                        autoComplete="name"
                        value={rsvpName}
                        onChange={(e) => setRsvpName(e.target.value)}
                        placeholder={isAr ? 'مثال: خالد الدوسري' : 'Your full name'}
                        className="w-full min-h-12 px-3.5 rounded-xl border border-[#B89246]/35 bg-[#FAF6EE]/60 text-base"
                      />
                    </div>

                    <div>
                      <label htmlFor="rsvp-phone" className="block text-sm font-semibold mb-1">
                        {isAr ? 'رقم الجوال (اختياري وخاص بالمضيف)' : 'Phone (Optional, host only)'}
                      </label>
                      <input
                        id="rsvp-phone"
                        name="guestPhone"
                        type="tel"
                        autoComplete="tel"
                        value={rsvpPhone}
                        onChange={(e) => setRsvpPhone(e.target.value)}
                        placeholder="+966 5X XXX XXXX"
                        className="w-full min-h-12 px-3.5 rounded-xl border border-[#B89246]/35 bg-[#FAF6EE]/60 text-base"
                      />
                    </div>
                  </div>

                  <fieldset className="space-y-2">
                    <legend className="text-sm font-semibold">
                      {isAr ? 'حالة الحضور' : 'Attendance Status'}
                    </legend>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {(
                        [
                          { val: 'attending', ar: 'سأحضر بإذن الله', en: 'Joyfully Attending' },
                          { val: 'maybe', ar: 'ربما أحضر', en: 'Tentative' },
                          { val: 'declined', ar: 'أعتذر عن الحضور', en: 'Regretfully Decline' },
                        ] as const
                      ).map((opt) => (
                        <label
                          key={opt.val}
                          className={`flex items-center justify-center gap-2 min-h-12 px-3 rounded-xl border text-xs sm:text-sm font-bold cursor-pointer transition-colors ${
                            rsvpAttendance === opt.val
                              ? 'bg-[#32402E] text-[#FAF6EE] border-[#32402E]'
                              : 'bg-[#FAF6EE]/60 text-[#151412] border-[#B89246]/30 hover:border-[#B89246]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="attendance"
                            value={opt.val}
                            checked={rsvpAttendance === opt.val}
                            onChange={() => setRsvpAttendance(opt.val)}
                            className="visually-hidden"
                          />
                          <span>{isAr ? opt.ar : opt.en}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {rsvpAttendance !== 'declined' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="rsvp-count" className="block text-sm font-semibold mb-1">
                          {isAr ? 'عدد الأشخاص (شاملاً المرافقين)' : 'Number of Guests'}
                        </label>
                        <select
                          id="rsvp-count"
                          value={rsvpCount}
                          onChange={(e) => setRsvpCount(Number(e.target.value))}
                          className="w-full min-h-12 px-3.5 rounded-xl border border-[#B89246]/35 bg-[#FAF6EE]/60 text-base"
                        >
                          {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                            <option key={num} value={num}>
                              {num}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="rsvp-note" className="block text-sm font-semibold mb-1">
                          {isAr ? 'ملاحظات الضيافة (اختياري)' : 'Dietary / Seating Note'}
                        </label>
                        <input
                          id="rsvp-note"
                          type="text"
                          value={rsvpNote}
                          onChange={(e) => setRsvpNote(e.target.value)}
                          placeholder={isAr ? 'أي ملاحظة خاصة للمنظمين' : 'Optional note for hosts'}
                          className="w-full min-h-12 px-3.5 rounded-xl border border-[#B89246]/35 bg-[#FAF6EE]/60 text-base"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor="rsvp-wishes" className="block text-sm font-semibold mb-1">
                      {isAr ? 'رسالة تهنئة للعروسين' : 'Blessing / Wishes for the Couple'}
                    </label>
                    <textarea
                      id="rsvp-wishes"
                      rows={3}
                      maxLength={500}
                      value={rsvpWishes}
                      onChange={(e) => setRsvpWishes(e.target.value)}
                      placeholder={
                        isAr
                          ? 'بارك الله لكما وبارك عليكما وجمع بينكما في خير...'
                          : 'Write a warm blessing for the bride and groom...'
                      }
                      className="w-full p-3.5 rounded-xl border border-[#B89246]/35 bg-[#FAF6EE]/60 text-base"
                    />
                  </div>

                  <div className="flex items-center gap-2.5">
                    <input
                      id="rsvp-public-wish"
                      type="checkbox"
                      checked={rsvpPublicWish}
                      onChange={(e) => setRsvpPublicWish(e.target.checked)}
                      className="w-5 h-5 accent-[#32402E]"
                    />
                    <label htmlFor="rsvp-public-wish" className="text-sm text-[#524B40]">
                      {isAr
                        ? 'عرض التهنئة في دفتر تهاني الضيوف على صفحة الدعوة'
                        : 'Display my wish on the public guestbook wall'}
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={rsvpSubmitting}
                    className="w-full min-h-12 rounded-full bg-[#151412] text-[#FAF6EE] font-bold text-sm inline-flex items-center justify-center gap-2 hover:bg-[#32402E] disabled:opacity-60 transition-colors"
                  >
                    <Send className="w-4 h-4 text-[#D8B86F]" aria-hidden="true" />
                    <span>
                      {rsvpSubmitting
                        ? isAr
                          ? 'جارٍ الإرسال...'
                          : 'Submitting...'
                        : isAr
                          ? 'تأكيد الرد وإرسال التهنئة'
                          : 'Send RSVP & Blessing'}
                    </span>
                  </button>
                </form>
              )}
            </section>
          )}

          {/* GUESTBOOK WISHES WALL */}
          {invitation.guestbook_enabled && wishes.length > 0 && (
            <section className="rounded-3xl border border-[#B89246]/30 bg-white p-6 sm:p-8 shadow-sm space-y-5">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-[#FAF6EE] border border-[#B89246]/35 text-[#7C5F21] flex items-center justify-center">
                  <MessageSquareHeart className="w-5 h-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-[#151412]">
                    {isAr ? 'دفتر تهاني الأحبة' : 'Guestbook Wishes'}
                  </h2>
                  <p className="text-xs text-[#524B40]">
                    {wishes.length} {isAr ? 'تهنئة مباركة' : 'warm blessings'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {wishes.map((w) => (
                  <blockquote
                    key={w.id}
                    className="rounded-2xl border border-[#B89246]/25 bg-[#FAF6EE]/70 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-[#151412] flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-[#B89246]" aria-hidden="true" />
                        {w.guest_name}
                      </span>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white border border-[#B89246]/25 text-[#32402E]">
                        {w.attendance === 'attending'
                          ? isAr
                            ? 'حاضر'
                            : 'Attending'
                          : w.attendance === 'maybe'
                            ? isAr
                              ? 'محتمل'
                              : 'Maybe'
                            : isAr
                              ? 'معتذر'
                              : 'Declined'}
                      </span>
                    </div>
                    <p className="text-sm text-[#3A352C] leading-relaxed">{w.wishes_message}</p>
                  </blockquote>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* QR Code Modal */}
      <ModalDialog
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title={isAr ? 'رمز الاستجابة السريعة للدعوة (QR Code)' : 'Invitation QR Code'}
        maxWidthClass="max-w-sm"
      >
        <div className="text-center space-y-5">
          <div className="inline-block p-4 bg-white rounded-2xl border border-[#B89246]/30 shadow-sm">
            <QRCodeSVG
              ref={qrSvgRef}
              value={currentShareUrl}
              size={220}
              bgColor="#FFFFFF"
              fgColor="#151412"
              level="M"
            />
          </div>
          <p className="text-xs text-[#524B40] break-all" dir="ltr">
            {currentShareUrl}
          </p>
          <button
            type="button"
            onClick={() => downloadSvgQrCode(qrSvgRef.current, invitation.slug)}
            className="w-full min-h-11 rounded-full bg-[#151412] text-[#FAF6EE] text-sm font-bold inline-flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 text-[#D8B86F]" aria-hidden="true" />
            <span>{isAr ? 'تحميل رمز QR كصورة PNG' : 'Download QR PNG'}</span>
          </button>
        </div>
      </ModalDialog>
    </main>
  );
};
