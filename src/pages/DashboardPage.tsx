import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  Copy,
  Crown,
  Download,
  ExternalLink,
  Eye,
  KeyRound,
  PenTool,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { useToast } from '../components/ToastProvider';
import { ModalDialog } from '../components/ModalDialog';
import type { Invitation, OrderRecord, PackagePlan, RsvpRecord } from '../types/database';

interface DashboardPageProps {
  onOpenAuth: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onOpenAuth }) => {
  const { isAr, formatEventDate } = useI18n();
  const { user, profile, loading: authLoading, updateRecoveryPin } = useAuth();
  const { notify } = useToast();

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [packages, setPackages] = useState<PackagePlan[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [pinPhone, setPinPhone] = useState('');
  const [newPin, setNewPin] = useState('');
  const [savingPin, setSavingPin] = useState(false);

  const [rsvpTarget, setRsvpTarget] = useState<Invitation | null>(null);
  const [rsvps, setRsvps] = useState<RsvpRecord[]>([]);
  const [rsvpFilter, setRsvpFilter] = useState<'all' | 'attending' | 'maybe' | 'declined'>('all');
  const [deleteTarget, setDeleteTarget] = useState<Invitation | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [invRes, pkgRes, ordRes] = await Promise.all([
      supabase
        .from('invitations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false }),
      supabase.from('packages').select('*').eq('is_active', true).order('sort_order'),
      supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);
    setInvitations((invRes.data as Invitation[]) ?? []);
    setPackages((pkgRes.data as PackagePlan[]) ?? []);
    setOrders((ordRes.data as OrderRecord[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      void fetchDashboard();
    }
  }, [authLoading, fetchDashboard]);

  const openRsvpManager = async (inv: Invitation) => {
    setRsvpTarget(inv);
    const { data } = await supabase
      .from('rsvps')
      .select('*')
      .eq('invitation_id', inv.id)
      .order('created_at', { ascending: false });
    setRsvps((data as RsvpRecord[]) ?? []);
  };

  const handleDuplicate = async (inv: Invitation) => {
    if (!user) return;
    const copySlug = `${inv.slug}-copy-${Math.random().toString(36).slice(2, 5)}`;
    const { id: _id, created_at: _c, updated_at: _u, view_count: _v, ...rest } = inv;
    const { error } = await supabase.from('invitations').insert({
      ...rest,
      user_id: user.id,
      slug: copySlug,
      status: 'draft',
      is_featured: false,
    });
    if (error) {
      notify(error.message, 'error');
      return;
    }
    notify(isAr ? 'تم نسخ الدعوة إلى المسودات' : 'Invitation duplicated as draft', 'success');
    void fetchDashboard();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('invitations').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    if (error) {
      notify(error.message, 'error');
      return;
    }
    notify(isAr ? 'تم حذف الدعوة' : 'Invitation deleted', 'success');
    void fetchDashboard();
  };

  const handleExportRsvpsCsv = () => {
    if (!rsvpTarget || rsvps.length === 0) return;
    const header = ['Guest Name', 'Phone', 'Attendance', 'Guests Count', 'Note', 'Wishes', 'Date'];
    const rows = rsvps.map((r) =>
      [
        r.guest_name,
        r.guest_phone,
        r.attendance,
        String(r.guests_count),
        r.dietary_or_note,
        r.wishes_message,
        r.created_at,
      ]
        .map((c) => `"${(c || '').replace(/"/g, '""')}"`)
        .join(','),
    );
    const csv = `\uFEFF${header.join(',')}\n${rows.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${rsvpTarget.slug}-guests.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOrderUpgrade = async (pkg: PackagePlan) => {
    if (!user) return;
    const { error } = await supabase.from('orders').insert({
      user_id: user.id,
      package_id: pkg.id,
      status: pkg.price_sar === 0 ? 'active' : 'pending',
      amount: pkg.price_sar,
      currency: 'SAR',
      payment_method: pkg.price_sar === 0 ? 'free' : 'bank_transfer',
      notes: isAr ? `طلب باقة ${pkg.name_ar}` : `Order ${pkg.name_en}`,
    });
    if (error) {
      notify(error.message, 'error');
      return;
    }
    notify(isAr ? 'تم تسجيل طلب الاشتراك بنجاح' : 'Subscription request submitted', 'success');
    void fetchDashboard();
  };

  if (authLoading || loading) {
    return (
      <main id="main-content" className="max-w-7xl mx-auto px-4 py-12">
        <div className="h-96 rounded-3xl bg-[#EFE7D6] animate-pulse" />
      </main>
    );
  }

  if (!user) {
    return (
      <main id="main-content" className="max-w-2xl mx-auto px-4 py-20 text-center space-y-5">
        <h1
          className="text-3xl font-bold text-[#151412]"
          style={{ fontFamily: isAr ? '"Amiri", serif' : '"Cormorant Garamond", serif' }}
        >
          {isAr ? 'لوحة دعواتي وإدارة الضيوف' : 'My Invitations & Guest Manager'}
        </h1>
        <p className="text-sm text-[#524B40]">
          {isAr
            ? 'سجّل الدخول أو أنشئ حساباً مجانياً لحفظ دعواتك وإدارة ردود الضيوف والباقات.'
            : 'Sign in or create a free account to manage your invitations, RSVPs, and packages.'}
        </p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="px-7 py-3 rounded-full bg-[#151412] text-[#FAF6EE] font-bold text-sm"
        >
          {isAr ? 'تسجيل الدخول / إنشاء حساب' : 'Sign In / Create Account'}
        </button>
      </main>
    );
  }

  const totalViews = invitations.reduce((acc, i) => acc + (i.view_count || 0), 0);
  const publishedCount = invitations.filter((i) => i.status === 'published').length;
  const filteredRsvps = rsvps.filter((r) => rsvpFilter === 'all' || r.attendance === rsvpFilter);

  return (
    <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold text-[#151412]"
            style={{ fontFamily: isAr ? '"Amiri", serif' : '"Cormorant Garamond", serif' }}
          >
            {isAr ? 'دعواتي وقائمة الضيوف' : 'My Invitations & Guests'}
          </h1>
          <p className="text-sm text-[#524B40]">
            {isAr ? `أهلاً ${profile?.full_name || user.email}` : `Welcome, ${profile?.full_name || user.email}`} •{' '}
            <span className="font-bold text-[#7C5F21]">
              {isAr ? `الباقة الحالية: ${profile?.plan_tier ?? 'free'}` : `Plan: ${profile?.plan_tier ?? 'free'}`}
            </span>
          </p>
        </div>
        <Link
          to="/studio"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#151412] text-[#FAF6EE] text-sm font-bold hover:bg-[#32402E] transition-colors"
        >
          <Plus className="w-4 h-4 text-[#D8B86F]" aria-hidden="true" />
          <span>{isAr ? 'إنشاء دعوة جديدة' : 'New Invitation'}</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="rounded-2xl border border-[#B89246]/30 bg-white p-5">
          <p className="text-[10px] sm:text-xs font-bold text-[#524B40]">{isAr ? 'الدعوات' : 'Invitations'}</p>
          <p className="text-xl sm:text-3xl font-extrabold text-[#151412] mt-1 tabular-nums">{invitations.length}</p>
        </div>
        <div className="rounded-2xl border border-[#B89246]/30 bg-white p-3 sm:p-5">
          <p className="text-[10px] sm:text-xs font-bold text-[#524B40]">{isAr ? 'المنشورة' : 'Published'}</p>
          <p className="text-xl sm:text-3xl font-extrabold text-[#32402E] mt-1 tabular-nums">{publishedCount}</p>
        </div>
        <div className="rounded-2xl border border-[#B89246]/30 bg-white p-3 sm:p-5">
          <p className="text-[10px] sm:text-xs font-bold text-[#524B40]">{isAr ? 'المشاهدات' : 'Views'}</p>
          <p className="text-xl sm:text-3xl font-extrabold text-[#7C5F21] mt-1 tabular-nums">{totalViews}</p>
        </div>
      </div>

      {/* Invitations List */}
      {invitations.length === 0 ? (
        <div className="rounded-3xl border border-[#B89246]/30 bg-white p-10 text-center space-y-4">
          <p className="text-lg font-bold text-[#151412]">
            {isAr ? 'لم تقم بإنشاء أي دعوة بعد' : 'You have not created any invitations yet'}
          </p>
          <Link
            to="/templates"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#151412] text-[#FAF6EE] text-sm font-bold"
          >
            <span>{isAr ? 'استعراض القوالب والبدء' : 'Browse Templates'}</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {invitations.map((inv) => {
            const liveUrl = `${window.location.origin}/i/${inv.slug}`;
            return (
              <article
                key={inv.id}
                className="rounded-3xl border border-[#B89246]/30 bg-white overflow-hidden shadow-sm flex flex-col justify-between"
              >
                <div
                  className="p-5 border-b border-[#B89246]/20"
                  style={{
                    backgroundColor: inv.theme_config.bgColor,
                    color: inv.theme_config.textColor,
                  }}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                      style={{ borderColor: `${inv.theme_config.accentColor}66`, color: inv.theme_config.accentColor }}
                    >
                      {inv.status === 'published'
                        ? isAr
                          ? 'منشورة'
                          : 'Published'
                        : inv.status === 'draft'
                          ? isAr
                            ? 'مسودة'
                            : 'Draft'
                          : isAr
                            ? 'مؤرشفة'
                            : 'Archived'}
                    </span>
                    <span className="text-xs opacity-80 inline-flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      {inv.view_count}
                    </span>
                  </div>

                  <h2
                    className="text-2xl font-bold leading-snug"
                    style={{
                      fontFamily: isAr ? `"${inv.theme_config.fontAr}", serif` : `"${inv.theme_config.fontEn}", serif`,
                      color: inv.theme_config.accentColor,
                    }}
                  >
                    {isAr
                      ? `${inv.groom_name_ar || inv.groom_name_en} & ${inv.bride_name_ar || inv.bride_name_en}`
                      : `${inv.groom_name_en || inv.groom_name_ar} & ${inv.bride_name_en || inv.bride_name_ar}`}
                  </h2>
                  <p className="text-xs opacity-80 mt-1">{formatEventDate(inv.event_date)}</p>
                </div>

                <div className="p-4 space-y-3">
                  <p className="text-xs text-[#524B40] truncate" dir="ltr">
                    /i/{inv.slug}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to={`/studio/${inv.id}`}
                      className="inline-flex items-center justify-center gap-1.5 min-h-10 rounded-xl bg-[#151412] text-[#FAF6EE] text-xs font-bold"
                    >
                      <PenTool className="w-3.5 h-3.5 text-[#D8B86F]" aria-hidden="true" />
                      <span>{isAr ? 'تعديل' : 'Edit'}</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => openRsvpManager(inv)}
                      className="inline-flex items-center justify-center gap-1.5 min-h-10 rounded-xl bg-[#32402E] text-[#FAF6EE] text-xs font-bold"
                    >
                      <Users className="w-3.5 h-3.5 text-[#D8B86F]" aria-hidden="true" />
                      <span>{isAr ? 'الضيوف RSVP' : 'RSVPs'}</span>
                    </button>

                    {inv.status === 'published' && (
                      <Link
                        to={`/i/${inv.slug}`}
                        className="inline-flex items-center justify-center gap-1.5 min-h-10 rounded-xl border border-[#B89246]/40 text-xs font-bold"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[#7C5F21]" aria-hidden="true" />
                        <span>{isAr ? 'فتح الدعوة' : 'View Live'}</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(liveUrl);
                        notify(isAr ? 'تم نسخ رابط الدعوة' : 'Copied!', 'success');
                      }}
                      className="inline-flex items-center justify-center gap-1.5 min-h-10 rounded-xl border border-[#B89246]/40 text-xs font-bold"
                    >
                      <Copy className="w-3.5 h-3.5 text-[#7C5F21]" aria-hidden="true" />
                      <span>{isAr ? 'نسخ الرابط' : 'Copy URL'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDuplicate(inv)}
                      className="inline-flex items-center justify-center gap-1.5 min-h-10 rounded-xl border border-[#B89246]/30 text-xs font-bold"
                    >
                      <span>{isAr ? 'تكرار' : 'Duplicate'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteTarget(inv)}
                      className="inline-flex items-center justify-center gap-1.5 min-h-10 rounded-xl bg-red-50 text-red-700 text-xs font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{isAr ? 'حذف' : 'Delete'}</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Security: Phone & Recovery PIN */}
      <section className="rounded-3xl border border-[#B89246]/30 bg-white p-6 space-y-4">
        <div className="flex items-center gap-3">
          <KeyRound className="w-6 h-6 text-[#B89246]" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-bold text-[#151412]">
              {isAr ? 'رقم الهاتف ورمز الاسترجاع السري (PIN)' : 'Phone & Recovery PIN Settings'}
            </h2>
            <p className="text-xs text-[#524B40]">
              {isAr
                ? `الرقم المرتبط حالياً: ${profile?.phone || 'غير محدد'} — حدّث رقمك أو رمز الـ PIN لاسترجاع كلمة المرور في أي وقت`
                : `Current phone: ${profile?.phone || 'Not set'} — update your phone or 4–8 digit PIN`}
            </p>
          </div>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSavingPin(true);
            const targetPhone = (pinPhone.trim() || profile?.phone || '').trim();
            const res = await updateRecoveryPin(targetPhone, newPin);
            setSavingPin(false);
            if (res.error) {
              notify(res.error, 'error');
              return;
            }
            setNewPin('');
            notify(isAr ? 'تم حفظ رقم الهاتف ورمز PIN بنجاح' : 'Phone & PIN saved', 'success');
          }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
        >
          <div>
            <label htmlFor="dash-phone" className="block text-xs font-bold mb-1">
              {isAr ? 'رقم الهاتف' : 'Phone Number'}
            </label>
            <input
              id="dash-phone"
              type="text"
              inputMode="tel"
              dir="ltr"
              value={pinPhone || profile?.phone || ''}
              onChange={(e) => setPinPhone(e.target.value)}
              placeholder="01012345678"
              className="w-full min-h-11 px-3 rounded-xl border border-[#B89246]/35 bg-[#FAF6EE] text-sm"
            />
          </div>
          <div>
            <label htmlFor="dash-pin" className="block text-xs font-bold mb-1">
              {isAr ? 'رمز الـ PIN الجديد (4-8 أرقام)' : 'New PIN (4–8 digits)'}
            </label>
            <input
              id="dash-pin"
              type="text"
              inputMode="numeric"
              dir="ltr"
              required
              minLength={4}
              maxLength={8}
              pattern="[0-9٠-٩۰-۹]{4,8}"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="1234"
              className="w-full min-h-11 px-3 rounded-xl border border-[#B89246]/35 bg-[#FAF6EE] text-sm font-mono tracking-widest"
            />
          </div>
          <button
            type="submit"
            disabled={savingPin}
            className="min-h-11 px-5 rounded-xl bg-[#151412] text-[#FAF6EE] text-xs font-bold hover:bg-[#32402E] disabled:opacity-60"
          >
            {savingPin ? '...' : isAr ? 'حفظ رقم الهاتف ورمز PIN' : 'Save Phone & PIN'}
          </button>
        </form>
      </section>

      {/* Packages & My Orders */}
      <section className="rounded-3xl border border-[#B89246]/30 bg-white p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Crown className="w-6 h-6 text-[#B89246]" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-bold text-[#151412]">
              {isAr ? 'الباقات وطلبات الاشتراك' : 'Packages & Subscription Orders'}
            </h2>
            <p className="text-xs text-[#524B40]">
              {isAr ? 'يمكنك الترقية في أي وقت ومتابعة حالة طلباتك' : 'Upgrade anytime and track order approval'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <div key={pkg.id} className="rounded-2xl border border-[#B89246]/25 bg-[#FAF6EE]/60 p-4 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base">{isAr ? pkg.name_ar : pkg.name_en}</h3>
                  <span className="text-sm font-extrabold text-[#7C5F21]">
                    {pkg.price_sar === 0 ? (isAr ? 'مجاناً' : 'Free') : `${pkg.price_sar} SAR`}
                  </span>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-[#524B40]">
                  {(isAr ? pkg.features_ar : pkg.features_en).slice(0, 3).map((f) => (
                    <li key={f} className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#32402E]" aria-hidden="true" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                disabled={profile?.plan_tier === pkg.id}
                onClick={() => handleOrderUpgrade(pkg)}
                className="min-h-10 rounded-xl bg-[#151412] text-[#FAF6EE] text-xs font-bold disabled:opacity-45"
              >
                {profile?.plan_tier === pkg.id
                  ? isAr
                    ? 'باقتك الحالية'
                    : 'Current Plan'
                  : isAr
                    ? 'طلب تفعيل الباقة'
                    : 'Request Package'}
              </button>
            </div>
          ))}
        </div>

        {orders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start border-collapse">
              <caption className="visually-hidden">{isAr ? 'سجل الطلبات' : 'Order history'}</caption>
              <thead>
                <tr className="border-b border-[#B89246]/25 text-xs text-[#524B40]">
                  <th scope="col" className="py-2.5 px-3 text-start">{isAr ? 'الباقة' : 'Package'}</th>
                  <th scope="col" className="py-2.5 px-3 text-start">{isAr ? 'المبلغ' : 'Amount'}</th>
                  <th scope="col" className="py-2.5 px-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                  <th scope="col" className="py-2.5 px-3 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((ord) => (
                  <tr key={ord.id} className="border-b border-[#B89246]/15">
                    <td className="py-2.5 px-3 font-bold">{ord.package_id}</td>
                    <td className="py-2.5 px-3">{ord.amount} {ord.currency}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FAF6EE] border border-[#B89246]/30">
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-[#524B40]">
                      {formatEventDate(ord.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* RSVP Manager Modal */}
      <ModalDialog
        open={Boolean(rsvpTarget)}
        onClose={() => setRsvpTarget(null)}
        title={
          rsvpTarget
            ? isAr
              ? `قائمة الضيوف — ${rsvpTarget.groom_name_ar}`
              : `Guest RSVPs — ${rsvpTarget.groom_name_en}`
            : ''
        }
        maxWidthClass="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'attending', 'maybe', 'declined'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setRsvpFilter(st)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border ${rsvpFilter === st
                      ? 'bg-[#151412] text-[#FAF6EE] border-[#151412]'
                      : 'bg-white border-[#B89246]/30'
                    }`}
                >
                  {st === 'all'
                    ? isAr
                      ? `الكل (${rsvps.length})`
                      : `All (${rsvps.length})`
                    : st === 'attending'
                      ? isAr
                        ? 'حاضر'
                        : 'Attending'
                      : st === 'maybe'
                        ? isAr
                          ? 'محتمل'
                          : 'Maybe'
                        : isAr
                          ? 'معتذر'
                          : 'Declined'}
                </button>
              ))}
            </div>

            {rsvps.length > 0 && (
              <button
                type="button"
                onClick={handleExportRsvpsCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#32402E] text-[#FAF6EE] text-xs font-bold"
              >
                <Download className="w-3.5 h-3.5 text-[#D8B86F]" aria-hidden="true" />
                <span>{isAr ? 'تصدير CSV' : 'Export CSV'}</span>
              </button>
            )}
          </div>

          {filteredRsvps.length === 0 ? (
            <p className="text-sm text-[#524B40] py-6 text-center">
              {isAr ? 'لا توجد ردود ضيوف في هذا التصنيف بعد.' : 'No guest responses yet.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-start border-collapse">
                <caption className="visually-hidden">{isAr ? 'ردود المدعوين' : 'Guest RSVP table'}</caption>
                <thead>
                  <tr className="border-b border-[#B89246]/25 text-xs text-[#524B40]">
                    <th scope="col" className="py-2 px-2 text-start">{isAr ? 'الضيف' : 'Guest'}</th>
                    <th scope="col" className="py-2 px-2 text-start">{isAr ? 'الجوال' : 'Phone'}</th>
                    <th scope="col" className="py-2 px-2 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                    <th scope="col" className="py-2 px-2 text-start">{isAr ? 'العدد' : 'Count'}</th>
                    <th scope="col" className="py-2 px-2 text-start">{isAr ? 'التهنئة' : 'Wish'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRsvps.map((r) => (
                    <tr key={r.id} className="border-b border-[#B89246]/15">
                      <td className="py-2.5 px-2 font-bold">{r.guest_name}</td>
                      <td className="py-2.5 px-2 text-xs" dir="ltr">{r.guest_phone || '—'}</td>
                      <td className="py-2.5 px-2 text-xs font-semibold">{r.attendance}</td>
                      <td className="py-2.5 px-2 tabular-nums">{r.guests_count}</td>
                      <td className="py-2.5 px-2 text-xs text-[#524B40] max-w-xs">{r.wishes_message || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ModalDialog>

      {/* Delete Confirmation Dialog */}
      <ModalDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={isAr ? 'تأكيد حذف الدعوة' : 'Delete Invitation?'}
        maxWidthClass="max-w-md"
      >
        <div className="space-y-5">
          <p className="text-sm text-[#524B40]">
            {isAr
              ? `هل أنت متأكد من حذف دعوة "${deleteTarget?.groom_name_ar}" وجميع ردود الضيوف المرتبطة بها؟ لا يمكن التراجع عن هذا الإجراء.`
              : `Are you sure you want to permanently delete "${deleteTarget?.groom_name_en}" and all associated RSVPs?`}
          </p>
          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              autoFocus
              onClick={() => setDeleteTarget(null)}
              className="px-5 py-2.5 rounded-xl border border-[#B89246]/40 text-sm font-bold"
            >
              {isAr ? 'إلغاء' : 'Keep Invitation'}
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-5 py-2.5 rounded-xl bg-red-700 text-white text-sm font-bold"
            >
              {isAr ? 'حذف نهائي' : 'Delete'}
            </button>
          </div>
        </div>
      </ModalDialog>
    </main>
  );
};
