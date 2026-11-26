import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, PenTool, Search } from 'lucide-react';
import { createDraftInvitationFromTemplate, supabase } from '../lib/supabase';
import { useI18n } from '../lib/i18n';
import { CornerFiligree } from '../components/Ornaments';
import { ModalDialog } from '../components/ModalDialog';
import { InvitationRenderer } from '../components/InvitationRenderer';
import type { Template, TemplateCategory } from '../types/database';

const CATEGORIES: Array<'all' | TemplateCategory> = [
  'all',
  'royal',
  'classic',
  'modern',
  'islamic',
  'minimal',
  'cinematic',
  'gold_luxury',
];

export const TemplatesPage: React.FC = () => {
  const { isAr, categoryLabel } = useI18n();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'all' | TemplateCategory>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [previewTpl, setPreviewTpl] = useState<Template | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase
      .from('templates')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (!mounted) return;
        setTemplates((data as Template[]) ?? []);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return templates.filter((tpl) => {
      const catOk = activeCategory === 'all' || tpl.category === activeCategory;
      const textOk =
        !q ||
        tpl.name_ar.toLowerCase().includes(q) ||
        tpl.name_en.toLowerCase().includes(q) ||
        tpl.description_ar.toLowerCase().includes(q) ||
        tpl.description_en.toLowerCase().includes(q);
      return catOk && textOk;
    });
  }, [templates, activeCategory, searchTerm]);

  return (
    <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-2">
        <h1
          className="text-3xl sm:text-5xl font-bold text-[#151412]"
          style={{ fontFamily: isAr ? '"Amiri", serif' : '"Cormorant Garamond", serif' }}
        >
          {isAr ? 'مكتبة قوالب دعوات الزفاف' : 'Wedding Invitation Templates'}
        </h1>
        <p className="text-sm sm:text-base text-[#524B40] max-w-2xl">
          {isAr
            ? 'اختر من بين 7 فئات تصميمية متقنة، وعاين كل قالب بشكل كامل قبل البدء في التخصيص داخل الاستوديو.'
            : 'Filter across 7 curated wedding styles, inspect any template live, and open it in the studio.'}
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex overflow-x-auto gap-2 no-scrollbar" role="group" aria-label={isAr ? 'تصفية الفئات' : 'Filter categories'}>
          {CATEGORIES.map((cat) => {
            const selected = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                aria-pressed={selected}
                className={`shrink-0 px-3.5 py-2 rounded-full text-xs sm:text-sm font-bold border transition-colors ${
                  selected
                    ? 'bg-[#151412] text-[#FAF6EE] border-[#151412]'
                    : 'bg-white text-[#3A352C] border-[#B89246]/30 hover:border-[#B89246]'
                }`}
              >
                {cat === 'all' ? (isAr ? 'الكل' : 'All Styles') : categoryLabel(cat)}
              </button>
            );
          })}
        </div>

        <search className="relative w-full lg:w-80">
          <label htmlFor="template-search" className="visually-hidden">
            {isAr ? 'ابحث في القوالب' : 'Search templates'}
          </label>
          <Search className="w-4 h-4 text-[#7C5F21] absolute top-3.5 start-3.5" aria-hidden="true" />
          <input
            id="template-search"
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isAr ? 'ابحث باسم القالب أو النمط...' : 'Search by template name...'}
            className="w-full min-h-11 ps-10 pe-4 rounded-full border border-[#B89246]/35 bg-white text-sm"
          />
        </search>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-80 rounded-2xl bg-[#EFE7D6] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#B89246]/30 bg-white p-10 text-center space-y-3">
          <p className="font-bold text-base text-[#151412]">
            {isAr ? 'لا توجد قوالب مطابقة لبحثك' : 'No matching templates found'}
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveCategory('all');
              setSearchTerm('');
            }}
            className="px-5 py-2.5 rounded-full bg-[#151412] text-[#FAF6EE] text-xs font-bold"
          >
            {isAr ? 'إعادة ضبط الفلترة' : 'Reset Filters'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((tpl) => (
            <article
              key={tpl.id}
              className="rounded-3xl border border-[#B89246]/30 bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col"
            >
              <div
                className="relative h-56 p-6 flex flex-col items-center justify-center text-center"
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
                  position="tr"
                  styleVariant={tpl.config.ornamentStyle}
                />
                <CornerFiligree
                  color={tpl.config.accentColor}
                  position="bl"
                  styleVariant={tpl.config.ornamentStyle}
                />
                <CornerFiligree
                  color={tpl.config.accentColor}
                  position="br"
                  styleVariant={tpl.config.ornamentStyle}
                />

                {(tpl.config.layoutMode === 'stage_poster' || tpl.config.layoutMode === 'split_poster') && (
                  <img
                    src={
                      tpl.config.layoutMode === 'stage_poster'
                        ? '/images/sample-groom-stage.jpg'
                        : '/images/sample-groom-classic.jpg'
                    }
                    alt=""
                    className="w-16 h-16 rounded-full object-cover object-top border-2 mb-2 shadow-md"
                    style={{ borderColor: tpl.config.accentColor }}
                  />
                )}
                <span
                  className="px-3 py-1 rounded-full text-[11px] font-bold mb-3 border"
                  style={{
                    borderColor: `${tpl.config.accentColor}66`,
                    color: tpl.config.accentColor,
                  }}
                >
                  {tpl.config.layoutMode === 'stage_poster' || tpl.config.layoutMode === 'split_poster'
                    ? isAr
                      ? `${categoryLabel(tpl.category)} • بوستر ليلتين`
                      : `${categoryLabel(tpl.category)} • 2-Night Poster`
                    : categoryLabel(tpl.category)}
                </span>
                <h2
                  className="text-3xl font-bold"
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
                      ? 'طارق & نورة'
                      : 'Tariq & Noura'}
                </h2>
                <p className="text-xs opacity-80 mt-1">
                  {isAr ? tpl.name_ar : tpl.name_en}
                </p>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-[#151412]">
                      {isAr ? tpl.name_ar : tpl.name_en}
                    </h3>
                    {tpl.is_premium && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#F2EADB] text-[#7C5F21] text-xs font-bold">
                        {isAr ? 'فاخر' : 'Premium'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#524B40] mt-1.5 leading-relaxed">
                    {isAr ? tpl.description_ar : tpl.description_en}
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPreviewTpl(tpl)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-11 rounded-xl border border-[#B89246]/45 text-xs font-bold text-[#151412] hover:bg-[#FAF6EE] transition-colors"
                  >
                    <Eye className="w-4 h-4 text-[#7C5F21]" aria-hidden="true" />
                    <span>{isAr ? 'معاينة' : 'Preview'}</span>
                  </button>
                  <Link
                    to={`/studio?template=${tpl.slug}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-11 rounded-xl bg-[#151412] text-[#FAF6EE] text-xs font-bold hover:bg-[#32402E] transition-colors"
                  >
                    <PenTool className="w-3.5 h-3.5 text-[#D8B86F]" aria-hidden="true" />
                    <span>{isAr ? 'استخدم القالب' : 'Customize'}</span>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Quick Live Preview Modal */}
      <ModalDialog
        open={Boolean(previewTpl)}
        onClose={() => setPreviewTpl(null)}
        title={previewTpl ? (isAr ? previewTpl.name_ar : previewTpl.name_en) : ''}
        maxWidthClass="max-w-3xl"
      >
        {previewTpl && (
          <div className="space-y-5">
            <InvitationRenderer
              invitation={createDraftInvitationFromTemplate(previewTpl)}
              compactPreview
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPreviewTpl(null)}
                className="px-5 py-2.5 rounded-full border border-[#B89246]/40 text-sm font-bold"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
              <Link
                to={`/studio?template=${previewTpl.slug}`}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#151412] text-[#FAF6EE] text-sm font-bold"
              >
                <PenTool className="w-4 h-4 text-[#D8B86F]" aria-hidden="true" />
                <span>{isAr ? 'فتح في الاستوديو' : 'Open in Studio'}</span>
              </Link>
            </div>
          </div>
        )}
      </ModalDialog>
    </main>
  );
};
