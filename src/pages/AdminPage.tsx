import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Crown,
  ExternalLink,
  FileImage,
  Layers,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { DEFAULT_TEMPLATE_CONFIG, supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { useToast } from '../components/ToastProvider';
import { ModalDialog } from '../components/ModalDialog';
import type {
  FontCatalogItem,
  Invitation,
  InvitationViewEvent,
  MediaAssetItem,
  OrderRecord,
  PackagePlan,
  PlanTier,
  Profile,
  RsvpRecord,
  Template,
  TemplateCategory,
  UserRole,
} from '../types/database';

type AdminTab = 'analytics' | 'invitations' | 'templates' | 'users' | 'orders' | 'content';

interface AdminPageProps {
  onOpenAuth: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onOpenAuth }) => {
  const { isAr, categoryLabel } = useI18n();
  const { user, isStaff, isAdmin, loading: authLoading, signOut } = useAuth();
  const { notify } = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');
  const [loading, setLoading] = useState(true);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [rsvps, setRsvps] = useState<RsvpRecord[]>([]);
  const [views, setViews] = useState<InvitationViewEvent[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [packages, setPackages] = useState<PackagePlan[]>([]);
  const [fonts, setFonts] = useState<FontCatalogItem[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAssetItem[]>([]);

  // Template Modal state
  const [tplModalOpen, setTplModalOpen] = useState(false);
  const [editingTpl, setEditingTpl] = useState<Template | null>(null);
  const [tplForm, setTplForm] = useState({
    slug: '',
    category: 'royal' as TemplateCategory,
    name_ar: '',
    name_en: '',
    description_ar: '',
    description_en: '',
    is_premium: false,
    is_active: true,
    config: { ...DEFAULT_TEMPLATE_CONFIG },
  });

  // New Asset / Font quick add
  const [newVerseTitleAr, setNewVerseTitleAr] = useState('');
  const [newVerseTitleEn, setNewVerseTitleEn] = useState('');
  const [newVerseText, setNewVerseText] = useState('');
  const [newFontFamily, setNewFontFamily] = useState('');
  const [newFontAr, setNewFontAr] = useState('');

  const fetchAllAdminData = useCallback(async () => {
    if (!isStaff) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [pRes, iRes, tRes, rRes, vRes, oRes, pkgRes, fRes, mRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('invitations').select('*').order('created_at', { ascending: false }),
      supabase.from('templates').select('*').order('sort_order', { ascending: true }),
      supabase.from('rsvps').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('invitation_views').select('*').order('viewed_at', { ascending: false }).limit(500),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('packages').select('*').order('sort_order', { ascending: true }),
      supabase.from('fonts_catalog').select('*').order('sort_order', { ascending: true }),
      supabase.from('media_assets').select('*').order('created_at', { ascending: false }),
    ]);

    setProfiles((pRes.data as Profile[]) ?? []);
    setInvitations((iRes.data as Invitation[]) ?? []);
    setTemplates((tRes.data as Template[]) ?? []);
    setRsvps((rRes.data as RsvpRecord[]) ?? []);
    setViews((vRes.data as InvitationViewEvent[]) ?? []);
    setOrders((oRes.data as OrderRecord[]) ?? []);
    setPackages((pkgRes.data as PackagePlan[]) ?? []);
    setFonts((fRes.data as FontCatalogItem[]) ?? []);
    setMediaAssets((mRes.data as MediaAssetItem[]) ?? []);
    setLoading(false);
  }, [isStaff]);

  useEffect(() => {
    if (!authLoading) {
      void fetchAllAdminData();
    }
  }, [authLoading, fetchAllAdminData]);

  const totalViewsCount = useMemo(
    () => invitations.reduce((sum, inv) => sum + (inv.view_count || 0), 0),
    [invitations],
  );

  const rsvpStats = useMemo(() => {
    const attending = rsvps.filter((r) => r.attendance === 'attending').length;
    const maybe = rsvps.filter((r) => r.attendance === 'maybe').length;
    const declined = rsvps.filter((r) => r.attendance === 'declined').length;
    return { attending, maybe, declined, total: rsvps.length };
  }, [rsvps]);

  const dailyViewBars = useMemo(() => {
    const days: Array<{ label: string; count: number }> = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(Date.now() - i * 86400000);
      const dayKey = d.toISOString().slice(0, 10);
      const count = views.filter((v) => v.viewed_at.slice(0, 10) === dayKey).length;
      days.push({ label: dayKey.slice(5), count });
    }
    return days;
  }, [views]);

  const handleUpdateUser = async (
    targetProfile: Profile,
    patch: Partial<{ role: UserRole; plan_tier: PlanTier; is_active: boolean }>,
  ) => {
    const { error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', targetProfile.id);
    if (error) {
      notify(error.message, 'error');
      return;
    }
    notify(isAr ? 'تم تحديث صلاحيات المستخدم' : 'User updated', 'success');
    void fetchAllAdminData();
  };

  const handleToggleInvitation = async (
    inv: Invitation,
    patch: Partial<Pick<Invitation, 'status' | 'is_featured'>>,
  ) => {
    const { error } = await supabase.from('invitations').update(patch).eq('id', inv.id);
    if (error) {
      notify(error.message, 'error');
      return;
    }
    notify(isAr ? 'تم تحديث الدعوة' : 'Invitation updated', 'success');
    void fetchAllAdminData();
  };

  const handleDeleteInvitation = async (inv: Invitation) => {
    const { error } = await supabase.from('invitations').delete().eq('id', inv.id);
    if (error) {
      notify(error.message, 'error');
      return;
    }
    notify(isAr ? 'تم حذف الدعوة' : 'Invitation deleted', 'success');
    void fetchAllAdminData();
  };

  const openCreateTemplate = () => {
    setEditingTpl(null);
    setTplForm({
      slug: `custom-${Math.random().toString(36).slice(2, 6)}`,
      category: 'royal',
      name_ar: '',
      name_en: '',
      description_ar: '',
      description_en: '',
      is_premium: false,
      is_active: true,
      config: { ...DEFAULT_TEMPLATE_CONFIG },
    });
    setTplModalOpen(true);
  };

  const openEditTemplate = (tpl: Template) => {
    setEditingTpl(tpl);
    setTplForm({
      slug: tpl.slug,
      category: tpl.category,
      name_ar: tpl.name_ar,
      name_en: tpl.name_en,
      description_ar: tpl.description_ar,
      description_en: tpl.description_en,
      is_premium: tpl.is_premium,
      is_active: tpl.is_active,
      config: { ...tpl.config },
    });
    setTplModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTpl) {
      const { error } = await supabase
        .from('templates')
        .update(tplForm)
        .eq('id', editingTpl.id);
      if (error) {
        notify(error.message, 'error');
        return;
      }
      notify(isAr ? 'تم تحديث القالب' : 'Template updated', 'success');
    } else {
      const { error } = await supabase.from('templates').insert({
        ...tplForm,
        sort_order: templates.length + 1,
      });
      if (error) {
        notify(error.message, 'error');
        return;
      }
      notify(isAr ? 'تمت إضافة القالب الجديد' : 'Template created', 'success');
    }
    setTplModalOpen(false);
    void fetchAllAdminData();
  };

  const handleApproveOrder = async (ord: OrderRecord, status: 'active' | 'cancelled') => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', ord.id);
    if (error) {
      notify(error.message, 'error');
      return;
    }
    if (status === 'active') {
      await supabase
        .from('profiles')
        .update({ plan_tier: ord.package_id })
        .eq('id', ord.user_id);
    }
    notify(isAr ? 'تم تحديث حالة الطلب' : 'Order status updated', 'success');
    void fetchAllAdminData();
  };

  const handleAddVerse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVerseText.trim() || !user) return;
    const { error } = await supabase.from('media_assets').insert({
      uploaded_by: user.id,
      kind: 'verse',
      title_ar: newVerseTitleAr.trim() || 'آية / ترويسة',
      title_en: newVerseTitleEn.trim() || 'Custom Verse',
      value: newVerseText.trim(),
      is_active: true,
    });
    if (error) {
      notify(error.message, 'error');
      return;
    }
    setNewVerseTitleAr('');
    setNewVerseTitleEn('');
    setNewVerseText('');
    notify(isAr ? 'تمت إضافة النص الترحيبي' : 'Verse preset added', 'success');
    void fetchAllAdminData();
  };

  const handleAddFont = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFontFamily.trim()) return;
    const { error } = await supabase.from('fonts_catalog').insert({
      family_name: newFontFamily.trim(),
      display_name_ar: newFontAr.trim() || newFontFamily.trim(),
      display_name_en: newFontFamily.trim(),
      script_type: 'both',
      category: 'serif',
      css_stack: `"${newFontFamily.trim()}", serif`,
      is_active: true,
      sort_order: fonts.length + 1,
    });
    if (error) {
      notify(error.message, 'error');
      return;
    }
    setNewFontFamily('');
    setNewFontAr('');
    notify(isAr ? 'تمت إضافة الخط' : 'Font added', 'success');
    void fetchAllAdminData();
  };

  if (authLoading || loading) {
    return (
      <main id="main-content" className="max-w-7xl mx-auto px-4 py-12">
        <div className="h-96 rounded-3xl bg-[#EFE7D6] animate-pulse" />
      </main>
    );
  }

  if (!user || !isStaff) {
    return (
      <main id="main-content" className="max-w-xl mx-auto px-4 py-20 text-center space-y-5">
        <ShieldCheck className="w-12 h-12 text-[#B89246] mx-auto" aria-hidden="true" />
        <h1 className="text-3xl font-bold text-[#151412]">
          {isAr ? 'منطقة إدارة المنصة' : 'Admin Access Required'}
        </h1>
        <p className="text-sm text-[#524B40]">
          {isAr
            ? 'هذه اللوحة مخصصة لمديري ومشرفي منصة مراسم فقط. يرجى تسجيل الدخول بحساب إداري.'
            : 'This control center is restricted to Marasim administrators and moderators.'}
        </p>
        {!user ? (
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-7 py-3 rounded-full bg-[#151412] text-[#FAF6EE] font-bold text-sm"
          >
            {isAr ? 'تسجيل دخول الإدارة' : 'Admin Sign In'}
          </button>
        ) : (
          <button
            type="button"
            onClick={async () => {
              await signOut();
              onOpenAuth();
            }}
            className="px-7 py-3 rounded-full bg-[#151412] text-[#FAF6EE] font-bold text-sm"
          >
            {isAr ? 'تبديل الحساب وتسجيل دخول الإدارة' : 'Switch to Admin Account'}
          </button>
        )}
      </main>
    );
  }

  const adminTabs: Array<{ id: AdminTab; icon: React.ComponentType<{ className?: string }>; ar: string; en: string }> = [
    { id: 'analytics', icon: BarChart3, ar: 'الإحصائيات والمشاهدات', en: 'Analytics' },
    { id: 'invitations', icon: Sparkles, ar: 'الدعوات المنشأة', en: 'Invitations' },
    { id: 'templates', icon: Layers, ar: 'القوالب والتصميمات', en: 'Templates' },
    { id: 'users', icon: Users, ar: 'المستخدمون والصلاحيات', en: 'Users & Roles' },
    { id: 'orders', icon: ShoppingBag, ar: 'الطلبات والباقات', en: 'Orders & Plans' },
    { id: 'content', icon: FileImage, ar: 'المحتوى والخطوط', en: 'Content & Fonts' },
  ];

  const maxDayCount = Math.max(1, ...dailyViewBars.map((b) => b.count));

  return (
    <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-[#151412] text-[#D8B86F] flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5" aria-hidden="true" />
          </span>
          <div>
            <h1
              className="text-2xl sm:text-3xl font-bold text-[#151412]"
              style={{ fontFamily: isAr ? '"Amiri", serif' : '"Cormorant Garamond", serif' }}
            >
              {isAr ? 'لوحة تحكم إدارة منصة مراسم' : 'Marasim Platform Admin'}
            </h1>
            <p className="text-xs text-[#524B40]">
              {isAr
                ? 'إدارة شاملة للمستخدمين، الصلاحيات، القوالب، الدعوات، المشاهدات، الطلبات والمحتوى'
                : 'Manage users, roles, templates, invitations, analytics, orders, and fonts'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-1 no-scrollbar" role="tablist">
        {adminTabs.map((t) => {
          const Icon = t.icon;
          const selected = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(t.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-[11px] sm:text-sm font-bold border transition-colors ${
                selected
                  ? 'bg-[#151412] text-[#FAF6EE] border-[#151412]'
                  : 'bg-white text-[#3A352C] border-[#B89246]/30 hover:border-[#B89246]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D8B86F]" aria-hidden="true" />
              <span className="hidden sm:inline">{isAr ? t.ar : t.en}</span>
              <span className="sm:hidden">{isAr ? t.ar.split(' ')[0] : t.en.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-[#B89246]/30 bg-white p-5">
              <p className="text-xs font-bold text-[#524B40]">{isAr ? 'المستخدمون المسجلون' : 'Registered Users'}</p>
              <p className="text-3xl font-extrabold mt-1 tabular-nums">{profiles.length}</p>
            </div>
            <div className="rounded-2xl border border-[#B89246]/30 bg-white p-5">
              <p className="text-xs font-bold text-[#524B40]">{isAr ? 'الدعوات المنشأة' : 'Total Invitations'}</p>
              <p className="text-3xl font-extrabold mt-1 tabular-nums">{invitations.length}</p>
            </div>
            <div className="rounded-2xl border border-[#B89246]/30 bg-white p-5">
              <p className="text-xs font-bold text-[#524B40]">{isAr ? 'إجمالي المشاهدات' : 'Total Views'}</p>
              <p className="text-3xl font-extrabold text-[#7C5F21] mt-1 tabular-nums">{totalViewsCount}</p>
            </div>
            <div className="rounded-2xl border border-[#B89246]/30 bg-white p-5">
              <p className="text-xs font-bold text-[#524B40]">{isAr ? 'ردود الضيوف RSVP' : 'Total RSVPs'}</p>
              <p className="text-3xl font-extrabold text-[#32402E] mt-1 tabular-nums">{rsvpStats.total}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Views Last 7 Days Bar Chart */}
            <div className="rounded-3xl border border-[#B89246]/30 bg-white p-6 space-y-4">
              <h2 className="font-bold text-base">
                {isAr ? 'نشاط المشاهدات (آخر 7 أيام)' : 'Live View Events (Last 7 Days)'}
              </h2>
              <div className="h-44 flex items-end justify-between gap-2 pt-4" dir="ltr">
                {dailyViewBars.map((b) => (
                  <div key={b.label} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-xs font-bold text-[#7C5F21] tabular-nums">{b.count}</span>
                    <div className="w-full bg-[#FAF6EE] rounded-t-lg h-28 flex items-end overflow-hidden">
                      <div
                        className="w-full rounded-t-lg bg-[#32402E] transition-all"
                        style={{ height: `${Math.max(8, (b.count / maxDayCount) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-[#524B40] tabular-nums">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* RSVP Distribution + Top Invitations */}
            <div className="rounded-3xl border border-[#B89246]/30 bg-white p-6 space-y-5">
              <h2 className="font-bold text-base">
                {isAr ? 'توزيع تأكيد الحضور والاكثر مشاهدة' : 'RSVP Breakdown & Top Invites'}
              </h2>
              <div className="space-y-2.5 text-sm">
                {[
                  { label: isAr ? 'حاضرون' : 'Attending', val: rsvpStats.attending, color: '#32402E' },
                  { label: isAr ? 'محتمل' : 'Maybe', val: rsvpStats.maybe, color: '#B89246' },
                  { label: isAr ? 'معتذرون' : 'Declined', val: rsvpStats.declined, color: '#8C3B3B' },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span>{item.label}</span>
                      <span>{item.val}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-[#FAF6EE] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${rsvpStats.total ? (item.val / rsvpStats.total) * 100 : 0}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-[#B89246]/20 space-y-2">
                <p className="text-xs font-bold text-[#524B40]">{isAr ? 'الأكثر مشاهدة:' : 'Top Viewed:'}</p>
                {invitations
                  .slice()
                  .sort((a, b) => b.view_count - a.view_count)
                  .slice(0, 3)
                  .map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between text-xs">
                      <Link to={`/i/${inv.slug}`} className="font-bold hover:underline">
                        {inv.groom_name_ar || inv.groom_name_en} &amp; {inv.bride_name_ar || inv.bride_name_en}
                      </Link>
                      <span className="font-bold text-[#7C5F21] tabular-nums">{inv.view_count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVITATIONS */}
      {activeTab === 'invitations' && (
        <div className="rounded-2xl sm:rounded-3xl border border-[#B89246]/30 bg-white p-3.5 sm:p-6 overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm text-start border-collapse">
            <caption className="visually-hidden">{isAr ? 'إدارة الدعوات' : 'Invitations management'}</caption>
            <thead>
              <tr className="border-b border-[#B89246]/25 text-xs text-[#524B40]">
                <th scope="col" className="py-3 px-3 text-start">{isAr ? 'العروسان' : 'Couple'}</th>
                <th scope="col" className="py-3 px-3 text-start">{isAr ? 'الرابط' : 'Slug'}</th>
                <th scope="col" className="py-3 px-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                <th scope="col" className="py-3 px-3 text-start">{isAr ? 'مميزة' : 'Featured'}</th>
                <th scope="col" className="py-3 px-3 text-start">{isAr ? 'المشاهدات' : 'Views'}</th>
                <th scope="col" className="py-3 px-3 text-start">{isAr ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id} className="border-b border-[#B89246]/15">
                  <td className="py-3 px-3 font-bold">
                    {inv.groom_name_ar || inv.groom_name_en} &amp; {inv.bride_name_ar || inv.bride_name_en}
                  </td>
                  <td className="py-3 px-3 text-xs" dir="ltr">/i/{inv.slug}</td>
                  <td className="py-3 px-3">
                    <select
                      aria-label="Status"
                      value={inv.status}
                      onChange={(e) =>
                        handleToggleInvitation(inv, { status: e.target.value as Invitation['status'] })
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-[#B89246]/35 text-xs font-bold"
                    >
                      <option value="published">{isAr ? 'منشورة' : 'Published'}</option>
                      <option value="draft">{isAr ? 'مسودة' : 'Draft'}</option>
                      <option value="archived">{isAr ? 'مؤرشفة' : 'Archived'}</option>
                    </select>
                  </td>
                  <td className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => handleToggleInvitation(inv, { is_featured: !inv.is_featured })}
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        inv.is_featured ? 'bg-[#32402E] text-[#FAF6EE]' : 'bg-[#FAF6EE] text-[#524B40]'
                      }`}
                    >
                      {inv.is_featured ? (isAr ? 'مميزة' : 'Featured') : isAr ? 'عادي' : 'Standard'}
                    </button>
                  </td>
                  <td className="py-3 px-3 tabular-nums font-bold">{inv.view_count}</td>
                  <td className="py-3 px-3 flex items-center gap-2">
                    <Link
                      to={`/i/${inv.slug}`}
                      className="p-2 rounded-lg border border-[#B89246]/30 hover:bg-[#FAF6EE]"
                      aria-label="Open live invitation"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteInvitation(inv)}
                        className="p-2 rounded-lg bg-red-50 text-red-700"
                        aria-label="Delete invitation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={openCreateTemplate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#151412] text-[#FAF6EE] text-xs font-bold"
            >
              <Plus className="w-4 h-4 text-[#D8B86F]" aria-hidden="true" />
              <span>{isAr ? 'إضافة قالب جديد' : 'Add New Template'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="rounded-2xl border border-[#B89246]/30 bg-white p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-8 h-8 rounded-lg border border-black/15"
                      style={{ backgroundColor: tpl.config.bgColor }}
                    />
                    <div>
                      <h3 className="font-bold text-sm">{isAr ? tpl.name_ar : tpl.name_en}</h3>
                      <p className="text-[11px] text-[#524B40]">{categoryLabel(tpl.category)}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${tpl.is_active ? 'bg-green-50 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {tpl.is_active ? (isAr ? 'نشط' : 'Active') : isAr ? 'معطل' : 'Hidden'}
                  </span>
                </div>
                <p className="text-xs text-[#524B40] line-clamp-2">
                  {isAr ? tpl.description_ar : tpl.description_en}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEditTemplate(tpl)}
                    className="flex-1 py-2 rounded-xl bg-[#FAF6EE] border border-[#B89246]/40 text-xs font-bold"
                  >
                    {isAr ? 'تعديل القالب' : 'Edit Template'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: USERS & PERMISSIONS */}
      {activeTab === 'users' && (
        <div className="rounded-2xl sm:rounded-3xl border border-[#B89246]/30 bg-white p-3.5 sm:p-6 overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm text-start border-collapse">
            <caption className="visually-hidden">{isAr ? 'إدارة المستخدمين والصلاحيات' : 'Users and permissions'}</caption>
            <thead>
              <tr className="border-b border-[#B89246]/25 text-xs text-[#524B40]">
                <th scope="col" className="py-3 px-3 text-start">{isAr ? 'الاسم' : 'Name'}</th>
                <th scope="col" className="py-3 px-3 text-start">{isAr ? 'الهاتف / البريد' : 'Phone / Email'}</th>
                <th scope="col" className="py-3 px-3 text-start">{isAr ? 'الصلاحية' : 'Role'}</th>
                <th scope="col" className="py-3 px-3 text-start">{isAr ? 'الباقة' : 'Plan'}</th>
                <th scope="col" className="py-3 px-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-b border-[#B89246]/15">
                  <td className="py-3 px-3 font-bold">{p.full_name || '—'}</td>
                  <td className="py-3 px-3 text-xs" dir="ltr">
                    {p.phone ? <span className="font-bold block">{p.phone}</span> : null}
                    <span className="opacity-70">{p.email || '—'}</span>
                  </td>
                  <td className="py-3 px-3">
                    <select
                      aria-label={`Role for ${p.email}`}
                      disabled={!isAdmin}
                      value={p.role}
                      onChange={(e) => handleUpdateUser(p, { role: e.target.value as UserRole })}
                      className="px-2.5 py-1.5 rounded-lg border border-[#B89246]/35 text-xs font-bold disabled:opacity-60"
                    >
                      <option value="user">{isAr ? 'مستخدم' : 'User'}</option>
                      <option value="moderator">{isAr ? 'مشرف' : 'Moderator'}</option>
                      <option value="admin">{isAr ? 'مدير النظام' : 'Admin'}</option>
                    </select>
                  </td>
                  <td className="py-3 px-3">
                    <select
                      aria-label={`Plan for ${p.email}`}
                      disabled={!isAdmin}
                      value={p.plan_tier}
                      onChange={(e) => handleUpdateUser(p, { plan_tier: e.target.value as PlanTier })}
                      className="px-2.5 py-1.5 rounded-lg border border-[#B89246]/35 text-xs font-bold disabled:opacity-60"
                    >
                      <option value="free">Free</option>
                      <option value="royal">Royal</option>
                      <option value="imperial">Imperial</option>
                    </select>
                  </td>
                  <td className="py-3 px-3">
                    <button
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => handleUpdateUser(p, { is_active: !p.is_active })}
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        p.is_active ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {p.is_active ? (isAr ? 'مفعل' : 'Active') : isAr ? 'موقوف' : 'Suspended'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 5: ORDERS & PACKAGES */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="rounded-2xl sm:rounded-3xl border border-[#B89246]/30 bg-white p-3.5 sm:p-6 overflow-x-auto">
            <h2 className="font-bold text-base mb-4">{isAr ? 'طلبات الاشتراكات' : 'Subscription Orders'}</h2>
            <table className="w-full min-w-[540px] text-sm text-start border-collapse">
              <caption className="visually-hidden">{isAr ? 'طلبات الاشتراكات' : 'Subscription orders'}</caption>
              <thead>
                <tr className="border-b border-[#B89246]/25 text-xs text-[#524B40]">
                  <th scope="col" className="py-2.5 px-3 text-start">{isAr ? 'المستخدم' : 'User'}</th>
                  <th scope="col" className="py-2.5 px-3 text-start">{isAr ? 'الباقة' : 'Package'}</th>
                  <th scope="col" className="py-2.5 px-3 text-start">{isAr ? 'المبلغ' : 'Amount'}</th>
                  <th scope="col" className="py-2.5 px-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                  <th scope="col" className="py-2.5 px-3 text-start">{isAr ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((ord) => {
                  const owner = profiles.find((u) => u.id === ord.user_id);
                  return (
                    <tr key={ord.id} className="border-b border-[#B89246]/15">
                      <td className="py-2.5 px-3 text-xs font-bold">{owner?.email || ord.user_id.slice(0, 8)}</td>
                      <td className="py-2.5 px-3 font-bold">{ord.package_id}</td>
                      <td className="py-2.5 px-3">{ord.amount} {ord.currency}</td>
                      <td className="py-2.5 px-3">{ord.status}</td>
                      <td className="py-2.5 px-3 flex gap-2">
                        {isAdmin && ord.status !== 'active' && (
                          <button
                            type="button"
                            onClick={() => handleApproveOrder(ord, 'active')}
                            className="px-3 py-1 rounded-lg bg-[#32402E] text-[#FAF6EE] text-xs font-bold"
                          >
                            {isAr ? 'تفعيل' : 'Approve'}
                          </button>
                        )}
                        {isAdmin && ord.status !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => handleApproveOrder(ord, 'cancelled')}
                            className="px-3 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-bold"
                          >
                            {isAr ? 'إلغاء' : 'Cancel'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <div key={pkg.id} className="rounded-2xl border border-[#B89246]/30 bg-white p-4 space-y-2">
                <h3 className="font-bold">{isAr ? pkg.name_ar : pkg.name_en}</h3>
                <p className="text-xs text-[#524B40]">
                  {pkg.price_sar} SAR • {isAr ? `حتى ${pkg.max_invitations} دعوة` : `Up to ${pkg.max_invitations} invites`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: CONTENT, MEDIA & FONTS */}
      {activeTab === 'content' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Verses & Content */}
          <div className="rounded-3xl border border-[#B89246]/30 bg-white p-6 space-y-4">
            <h2 className="font-bold text-base">{isAr ? 'إدارة الآيات والعبارات الترحيبية' : 'Verses & Content Presets'}</h2>
            <form onSubmit={handleAddVerse} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={newVerseTitleAr}
                  onChange={(e) => setNewVerseTitleAr(e.target.value)}
                  placeholder={isAr ? 'العنوان (عربي)' : 'Title (Arabic)'}
                  className="min-h-10 px-3 rounded-xl border border-[#B89246]/35 text-xs"
                />
                <input
                  type="text"
                  value={newVerseTitleEn}
                  onChange={(e) => setNewVerseTitleEn(e.target.value)}
                  placeholder="Title (English)"
                  className="min-h-10 px-3 rounded-xl border border-[#B89246]/35 text-xs"
                />
              </div>
              <textarea
                rows={2}
                required
                value={newVerseText}
                onChange={(e) => setNewVerseText(e.target.value)}
                placeholder={isAr ? 'نص الآية أو العبارة...' : 'Verse or welcome copy...'}
                className="w-full p-3 rounded-xl border border-[#B89246]/35 text-xs"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#151412] text-[#FAF6EE] text-xs font-bold"
              >
                {isAr ? 'إضافة إلى المكتبة' : 'Add Content Preset'}
              </button>
            </form>

            <ul className="space-y-2 pt-2">
              {mediaAssets.map((m) => (
                <li
                  key={m.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-[#B89246]/20 bg-[#FAF6EE]/60 p-3 text-xs"
                >
                  <div>
                    <p className="font-bold">{isAr ? m.title_ar : m.title_en}</p>
                    <p className="text-[#524B40] mt-0.5 line-clamp-2">{m.value}</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await supabase
                        .from('media_assets')
                        .update({ is_active: !m.is_active })
                        .eq('id', m.id);
                      void fetchAllAdminData();
                    }}
                    className={`shrink-0 px-2.5 py-1 rounded-full font-bold ${
                      m.is_active ? 'bg-green-50 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {m.is_active ? (isAr ? 'مفعل' : 'Active') : isAr ? 'مخفي' : 'Hidden'}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Fonts Catalog */}
          <div className="rounded-3xl border border-[#B89246]/30 bg-white p-6 space-y-4">
            <h2 className="font-bold text-base">{isAr ? 'إدارة خطوط المنصة' : 'Fonts Catalog'}</h2>
            <form onSubmit={handleAddFont} className="grid grid-cols-1 sm:flex gap-2">
              <input
                type="text"
                required
                value={newFontFamily}
                onChange={(e) => setNewFontFamily(e.target.value)}
                placeholder="Google Font Family (e.g. Scheherazade New)"
                className="flex-1 min-h-11 px-3 rounded-xl border border-[#B89246]/35 text-xs"
              />
              <input
                type="text"
                value={newFontAr}
                onChange={(e) => setNewFontAr(e.target.value)}
                placeholder={isAr ? 'الاسم بالعربي' : 'Arabic display name'}
                className="w-full sm:w-36 min-h-11 px-3 rounded-xl border border-[#B89246]/35 text-xs"
              />
              <button
                type="submit"
                className="min-h-11 px-4 py-2 rounded-xl bg-[#151412] text-[#FAF6EE] text-xs font-bold"
              >
                {isAr ? 'إضافة خط' : 'Add Font'}
              </button>
            </form>

            <ul className="space-y-2">
              {fonts.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between rounded-xl border border-[#B89246]/20 bg-[#FAF6EE]/60 px-3.5 py-2.5 text-xs"
                >
                  <div>
                    <span className="font-bold">{isAr ? f.display_name_ar : f.display_name_en}</span>
                    <span className="mx-2 text-[#524B40]">({f.family_name})</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await supabase
                        .from('fonts_catalog')
                        .update({ is_active: !f.is_active })
                        .eq('id', f.id);
                      void fetchAllAdminData();
                    }}
                    className={`px-2.5 py-1 rounded-full font-bold ${
                      f.is_active ? 'bg-green-50 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {f.is_active ? (isAr ? 'متاح' : 'Active') : isAr ? 'معطل' : 'Disabled'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Template Create/Edit Modal */}
      <ModalDialog
        open={tplModalOpen}
        onClose={() => setTplModalOpen(false)}
        title={
          editingTpl
            ? isAr
              ? 'تعديل القالب'
              : 'Edit Template'
            : isAr
              ? 'إضافة قالب جديد'
              : 'Create New Template'
        }
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleSaveTemplate} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="tpl-slug" className="block text-xs font-bold mb-1">Slug</label>
              <input
                id="tpl-slug"
                type="text"
                required
                dir="ltr"
                value={tplForm.slug}
                onChange={(e) => setTplForm({ ...tplForm, slug: e.target.value })}
                className="w-full min-h-10 px-3 rounded-xl border border-[#B89246]/35 text-xs"
              />
            </div>
            <div>
              <label htmlFor="tpl-cat" className="block text-xs font-bold mb-1">
                {isAr ? 'الفئة' : 'Category'}
              </label>
              <select
                id="tpl-cat"
                value={tplForm.category}
                onChange={(e) => setTplForm({ ...tplForm, category: e.target.value as TemplateCategory })}
                className="w-full min-h-10 px-3 rounded-xl border border-[#B89246]/35 text-xs"
              >
                {(['royal', 'classic', 'modern', 'islamic', 'minimal', 'cinematic', 'gold_luxury'] as const).map(
                  (c) => (
                    <option key={c} value={c}>
                      {categoryLabel(c)}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="tpl-name-ar" className="block text-xs font-bold mb-1">
                {isAr ? 'الاسم (عربي)' : 'Name (Arabic)'}
              </label>
              <input
                id="tpl-name-ar"
                type="text"
                required
                value={tplForm.name_ar}
                onChange={(e) => setTplForm({ ...tplForm, name_ar: e.target.value })}
                className="w-full min-h-10 px-3 rounded-xl border border-[#B89246]/35 text-xs"
              />
            </div>
            <div>
              <label htmlFor="tpl-name-en" className="block text-xs font-bold mb-1">
                {isAr ? 'الاسم (إنجليزي)' : 'Name (English)'}
              </label>
              <input
                id="tpl-name-en"
                type="text"
                required
                dir="ltr"
                value={tplForm.name_en}
                onChange={(e) => setTplForm({ ...tplForm, name_en: e.target.value })}
                className="w-full min-h-10 px-3 rounded-xl border border-[#B89246]/35 text-xs"
              />
            </div>
          </div>

          <div>
            <label htmlFor="tpl-desc-ar" className="block text-xs font-bold mb-1">
              {isAr ? 'الوصف (عربي)' : 'Description (Arabic)'}
            </label>
            <textarea
              id="tpl-desc-ar"
              rows={2}
              value={tplForm.description_ar}
              onChange={(e) => setTplForm({ ...tplForm, description_ar: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-[#B89246]/35 text-xs"
            />
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-[11px] font-bold mb-1">BG</label>
              <input
                type="color"
                value={tplForm.config.bgColor}
                onChange={(e) =>
                  setTplForm({ ...tplForm, config: { ...tplForm.config, bgColor: e.target.value } })
                }
                className="w-full h-9 rounded cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold mb-1">Card</label>
              <input
                type="color"
                value={tplForm.config.surfaceColor}
                onChange={(e) =>
                  setTplForm({
                    ...tplForm,
                    config: { ...tplForm.config, surfaceColor: e.target.value },
                  })
                }
                className="w-full h-9 rounded cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold mb-1">Accent</label>
              <input
                type="color"
                value={tplForm.config.accentColor}
                onChange={(e) =>
                  setTplForm({
                    ...tplForm,
                    config: { ...tplForm.config, accentColor: e.target.value },
                  })
                }
                className="w-full h-9 rounded cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold mb-1">Text</label>
              <input
                type="color"
                value={tplForm.config.textColor}
                onChange={(e) =>
                  setTplForm({ ...tplForm, config: { ...tplForm.config, textColor: e.target.value } })
                }
                className="w-full h-9 rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-5 pt-1">
            <label className="inline-flex items-center gap-2 text-xs font-bold">
              <input
                type="checkbox"
                checked={tplForm.is_active}
                onChange={(e) => setTplForm({ ...tplForm, is_active: e.target.checked })}
              />
              <span>{isAr ? 'مفعل في المكتبة' : 'Active'}</span>
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-bold">
              <input
                type="checkbox"
                checked={tplForm.is_premium}
                onChange={(e) => setTplForm({ ...tplForm, is_premium: e.target.checked })}
              />
              <span>{isAr ? 'باقة ملكية' : 'Premium'}</span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full min-h-11 rounded-full bg-[#151412] text-[#FAF6EE] text-sm font-bold"
          >
            {isAr ? 'حفظ القالب' : 'Save Template'}
          </button>
        </form>
      </ModalDialog>
    </main>
  );
};
