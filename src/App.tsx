import React, { Suspense, lazy, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { I18nProvider, useI18n } from './lib/i18n';
import { AuthProvider } from './lib/auth';
import { ToastProvider } from './components/ToastProvider';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { HomePage } from './pages/HomePage';

const TemplatesPage = lazy(() =>
  import('./pages/TemplatesPage').then((m) => ({ default: m.TemplatesPage })),
);
const StudioPage = lazy(() =>
  import('./pages/StudioPage').then((m) => ({ default: m.StudioPage })),
);
const PublicInvitePage = lazy(() =>
  import('./pages/PublicInvitePage').then((m) => ({ default: m.PublicInvitePage })),
);
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const AdminPage = lazy(() =>
  import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })),
);

const RouteFallback: React.FC = () => (
  <div className="max-w-7xl mx-auto px-4 py-16">
    <div className="h-96 rounded-3xl bg-[#EFE7D6] animate-pulse" />
  </div>
);

const AppShell: React.FC = () => {
  const [authOpen, setAuthOpen] = useState(false);
  const { isAr } = useI18n();
  const location = useLocation();
  const isPublicInvite = location.pathname.startsWith('/i/');

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF6EE] text-[#151412]">
      <a
        href="#main-content"
        className="visually-hidden focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-full focus:bg-[#151412] focus:text-[#FAF6EE] focus:text-sm focus:font-bold"
      >
        {isAr ? 'تخطي إلى المحتوى الرئيسي' : 'Skip to main content'}
      </a>

      <Navbar onOpenAuth={() => setAuthOpen(true)} />

      <div className="flex-1">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomePage onOpenAuth={() => setAuthOpen(true)} />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/studio" element={<StudioPage onOpenAuth={() => setAuthOpen(true)} />} />
            <Route path="/studio/:id" element={<StudioPage onOpenAuth={() => setAuthOpen(true)} />} />
            <Route path="/i/:slug" element={<PublicInvitePage />} />
            <Route path="/dashboard" element={<DashboardPage onOpenAuth={() => setAuthOpen(true)} />} />
            <Route path="/admin" element={<AdminPage onOpenAuth={() => setAuthOpen(true)} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>

      {!isPublicInvite && <Footer />}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <I18nProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppShell />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </I18nProvider>
  );
};

export default App;
