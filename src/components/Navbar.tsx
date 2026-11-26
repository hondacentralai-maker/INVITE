import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Crown,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  PenTool,
  ShieldCheck,
  Sparkles,
  UserCircle2,
  X,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';

interface NavbarProps {
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth }) => {
  const { isAr, toggleLang } = useI18n();
  const { user, profile, isStaff, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3.5 py-2 rounded-full text-sm font-semibold transition-colors ${
      isActive
        ? 'bg-[#151412] text-[#FAF6EE]'
        : 'text-[#3A352C] hover:text-[#151412] hover:bg-[#B89246]/12'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-[#B89246]/25 bg-[#FAF6EE]/92 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-3 shrink-0 group"
          onClick={() => setMobileOpen(false)}
        >
          <span className="w-10 h-10 rounded-xl bg-[#151412] text-[#D8B86F] flex items-center justify-center border border-[#B89246]/50 shadow-sm group-hover:scale-105 transition-transform">
            <Crown className="w-5 h-5" aria-hidden="true" />
          </span>
          <div className="leading-tight">
            <span
              className="block text-xl font-bold text-[#151412]"
              style={{ fontFamily: '"Amiri", "Cormorant Garamond", serif' }}
            >
              {isAr ? 'مَراسِم' : 'MARASIM'}
            </span>
            <span className="block text-[11px] font-medium text-[#7C5F21]">
              {isAr ? 'استوديو الدعوات الفاخرة' : 'Luxury Wedding Atelier'}
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav aria-label={isAr ? 'التنقل الرئيسي' : 'Primary'} className="hidden lg:flex items-center gap-1.5">
          <NavLink to="/" end className={navLinkClass}>
            {isAr ? 'الرئيسية' : 'Home'}
          </NavLink>
          <NavLink to="/templates" className={navLinkClass}>
            {isAr ? 'القوالب' : 'Templates'}
          </NavLink>
          <NavLink to="/studio" className={navLinkClass}>
            <span className="inline-flex items-center gap-1.5">
              <PenTool className="w-3.5 h-3.5" aria-hidden="true" />
              {isAr ? 'مصمم الدعوات' : 'Studio'}
            </span>
          </NavLink>
          <NavLink to="/dashboard" className={navLinkClass}>
            <span className="inline-flex items-center gap-1.5">
              <LayoutDashboard className="w-3.5 h-3.5" aria-hidden="true" />
              {isAr ? 'دعواتي والباقات' : 'My Invites'}
            </span>
          </NavLink>
          {isStaff && (
            <NavLink to="/admin" className={navLinkClass}>
              <span className="inline-flex items-center gap-1.5 text-[#7C5F21]">
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                {isAr ? 'لوحة الإدارة' : 'Admin'}
              </span>
            </NavLink>
          )}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggleLang}
            className="inline-flex items-center gap-1.5 h-10 px-3 rounded-full border border-[#B89246]/35 bg-white/75 text-xs font-bold text-[#151412] hover:bg-white transition-colors"
            aria-label={isAr ? 'التبديل إلى الإنجليزية' : 'Switch to Arabic'}
          >
            <Globe className="w-4 h-4 text-[#7C5F21]" aria-hidden="true" />
            <span>{isAr ? 'EN' : 'عربي'}</span>
          </button>

          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 h-10 px-3.5 rounded-full bg-[#32402E] text-[#FAF6EE] text-xs font-semibold hover:bg-[#243020] transition-colors"
              >
                <UserCircle2 className="w-4 h-4 text-[#D8B86F]" aria-hidden="true" />
                <span className="max-w-[120px] truncate">
                  {profile?.full_name || user.email?.split('@')[0]}
                </span>
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  navigate('/');
                }}
                aria-label={isAr ? 'تسجيل الخروج' : 'Sign out'}
                className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-[#B89246]/30 text-[#524b40] hover:text-red-700 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="hidden sm:inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[#151412] text-[#FAF6EE] text-xs font-bold hover:bg-[#2a2723] transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D8B86F]" aria-hidden="true" />
              <span>{isAr ? 'دخول / تسجيل' : 'Sign In'}</span>
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label={isAr ? 'قائمة التنقل' : 'Toggle menu'}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[#B89246]/30 bg-white/80 text-[#151412]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-[#B89246]/20 bg-[#FAF6EE] px-4 py-4 space-y-2">
          <nav aria-label={isAr ? 'تنقل الجوال' : 'Mobile navigation'} className="flex flex-col gap-1.5">
            <NavLink to="/" end className={navLinkClass} onClick={() => setMobileOpen(false)}>
              {isAr ? 'الرئيسية' : 'Home'}
            </NavLink>
            <NavLink to="/templates" className={navLinkClass} onClick={() => setMobileOpen(false)}>
              {isAr ? 'مكتبة القوالب' : 'Templates Library'}
            </NavLink>
            <NavLink to="/studio" className={navLinkClass} onClick={() => setMobileOpen(false)}>
              {isAr ? 'مصمم الدعوات' : 'Invitation Studio'}
            </NavLink>
            <NavLink to="/dashboard" className={navLinkClass} onClick={() => setMobileOpen(false)}>
              {isAr ? 'دعواتي والضيوف' : 'My Invites & RSVPs'}
            </NavLink>
            {isStaff && (
              <NavLink to="/admin" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                {isAr ? 'لوحة تحكم الإدارة' : 'Admin Dashboard'}
              </NavLink>
            )}
          </nav>

          <div className="pt-3 border-t border-[#B89246]/20 flex items-center justify-between gap-2">
            {user ? (
              <>
                <span className="text-xs font-semibold text-[#32402E] truncate">
                  {profile?.full_name || user.email}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    setMobileOpen(false);
                    navigate('/');
                  }}
                  className="px-3.5 py-2 rounded-full bg-red-50 text-red-800 text-xs font-bold"
                >
                  {isAr ? 'خروج' : 'Sign Out'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onOpenAuth();
                }}
                className="w-full h-11 rounded-full bg-[#151412] text-[#FAF6EE] text-sm font-bold"
              >
                {isAr ? 'تسجيل الدخول / إنشاء حساب' : 'Sign In / Create Account'}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
