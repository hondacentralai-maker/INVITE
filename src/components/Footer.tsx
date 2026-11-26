import React from 'react';
import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { useI18n } from '../lib/i18n';

export const Footer: React.FC = () => {
  const { isAr } = useI18n();

  return (
    <footer className="border-t border-[#B89246]/25 bg-[#151412] text-[#FAF6EE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="w-9 h-9 rounded-lg bg-[#25221C] border border-[#D8B86F]/40 flex items-center justify-center text-[#D8B86F]">
              <Crown className="w-5 h-5" aria-hidden="true" />
            </span>
            <span
              className="text-2xl font-bold text-[#FAF6EE]"
              style={{ fontFamily: '"Amiri", "Cormorant Garamond", serif' }}
            >
              {isAr ? 'مَراسِم' : 'MARASIM'}
            </span>
          </div>
          <p className="text-sm text-[#CFC6B4] max-w-sm leading-relaxed">
            {isAr
              ? 'منصة عربية فاخرة لتصميم ومشاركة دعوات الزفاف الإلكترونية التفاعلية، بتناغم بين الأصالة الإسلامية والحداثة الرقمية.'
              : 'An editorial digital wedding atelier blending Arabesque heritage, kinetic elegance, and real-time guest management.'}
          </p>
        </div>

        <div>
          <h2 className="text-sm font-bold text-[#D8B86F] mb-3">
            {isAr ? 'روابط سريعة' : 'Explore'}
          </h2>
          <ul className="space-y-2 text-sm text-[#CFC6B4]">
            <li>
              <Link to="/templates" className="hover:text-[#D8B86F] transition-colors">
                {isAr ? 'مكتبة قوالب الزفاف' : 'Wedding Templates'}
              </Link>
            </li>
            <li>
              <Link to="/studio" className="hover:text-[#D8B86F] transition-colors">
                {isAr ? 'استوديو التصميم المباشر' : 'Interactive Studio'}
              </Link>
            </li>
            <li>
              <Link to="/i/tariq-noura" className="hover:text-[#D8B86F] transition-colors">
                {isAr ? 'معاينة دعوة زفاف حية' : 'Live Sample Invitation'}
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className="hover:text-[#D8B86F] transition-colors">
                {isAr ? 'إدارة الدعوات والضيوف' : 'Invitations & RSVP Manager'}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold text-[#D8B86F] mb-3">
            {isAr ? 'نماذج حية من المنصة' : 'Featured Live Invitations'}
          </h2>
          <ul className="space-y-2 text-sm text-[#CFC6B4]">
            <li>
              <Link to="/i/tariq-noura" className="hover:text-[#D8B86F] transition-colors">
                {isAr ? 'زفاف طارق ونورة (ملكي أسود)' : 'Tariq & Noura (Royal Obsidian)'}
              </Link>
            </li>
            <li>
              <Link to="/i/abuzaid-poster" className="hover:text-[#D8B86F] transition-colors">
                {isAr ? 'بوستر السهرة الذهبية (ليلتين 3D)' : 'Stage Spotlight Poster (2 Nights)'}
              </Link>
            </li>
            <li>
              <Link to="/i/mustafa-arab-poster" className="hover:text-[#D8B86F] transition-colors">
                {isAr ? 'بوستر أفراح العرب (الحناء والزفاف)' : 'Arab Heritage Poster (Henna & Wedding)'}
              </Link>
            </li>
            <li>
              <Link to="/i/yusuf-salma" className="hover:text-[#D8B86F] transition-colors">
                {isAr ? 'عقد قران يوسف وسلمى (أندلسي إسلامي)' : 'Yusuf & Salma (Andalusian Islamic)'}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-4 px-4 text-center text-xs text-[#A89E8B]">
        {isAr
          ? '© 2026 مَراسِم — منصة دعوات الزفاف الإلكترونية الفاخرة'
          : '© 2026 Marasim Studio — Luxury Digital Wedding Invitations'}
      </div>
    </footer>
  );
};
