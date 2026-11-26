-- Marasim / Invite Cart — Seed Data
-- Run after schema.sql

-- 1. Packages
INSERT INTO invite_cart.packages (id, name_ar, name_en, description_ar, description_en, price_sar, max_invitations, features_ar, features_en, is_active, sort_order)
VALUES
  (
    'free',
    'الباقة الكلاسيكية',
    'Classic Atelier',
    'مثالية لتجربة الاستوديو وإنشاء دعوة أنيقة',
    'Ideal for crafting and sharing your first elegant wedding invitation',
    0,
    3,
    ARRAY['3 دعوات إلكترونية فعالة', 'رابط مستقل ورمز QR', 'تأكيد الحضور RSVP ودفتر التهاني', 'التحميل كصورة PNG وملف PDF'],
    ARRAY['3 active digital invitations', 'Custom share link & QR code', 'RSVP tracker & guestbook wishes', 'High-res PNG & PDF export'],
    true,
    1
  ),
  (
    'royal',
    'الباقة الملكية',
    'Royal Suite',
    'للحفلات الفاخرة مع القوالب الحصرية والموسيقى',
    'Full access to royal templates, custom photos, and ambient audio',
    199,
    15,
    ARRAY['15 دعوة زفاف فعالة', 'جميع القوالب الملكية والسينمائية والذهبية', 'رفع معرض صور خاص وموسيقى مخصصة', 'إحصائيات مشاهدات تفصيلية وتصدير CSV للضيوف'],
    ARRAY['15 active wedding invitations', 'All Royal, Cinematic & Gold Foil templates', 'Custom photo gallery & ambient audio uploads', 'Detailed view analytics & guest CSV export'],
    true,
    2
  ),
  (
    'imperial',
    'الباقة الإمبراطورية',
    'Imperial Concierge',
    'لمنظمي الحفلات والقصور والعائلات الراقية',
    'Built for luxury wedding planners, venues, and grand celebrations',
    499,
    999,
    ARRAY['دعوات غير محدودة', 'أولوية التخصيص وإدارة قائمة الضيوف الخاصة', 'روابط شخصية لكل ضيف مع تتبع كامل', 'دعم استشاري مباشر وتقارير شاملة'],
    ARRAY['Unlimited invitations', 'VIP concierge styling & guest list suite', 'Personalized guest URLs & full analytics', 'Priority support & comprehensive reporting'],
    true,
    3
  )
ON CONFLICT (id) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  description_ar = EXCLUDED.description_ar,
  description_en = EXCLUDED.description_en,
  price_sar = EXCLUDED.price_sar,
  max_invitations = EXCLUDED.max_invitations,
  features_ar = EXCLUDED.features_ar,
  features_en = EXCLUDED.features_en,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- 2. Fonts Catalog
INSERT INTO invite_cart.fonts_catalog (family_name, display_name_ar, display_name_en, script_type, category, css_stack, is_active, sort_order)
VALUES
  ('Amiri', 'الأميري الكلاسيكي', 'Amiri Classical Serif', 'arabic', 'calligraphy', '"Amiri", Georgia, serif', true, 1),
  ('Aref Ruqaa', 'الرقعة الفاخر', 'Aref Ruqaa Calligraphy', 'arabic', 'calligraphy', '"Aref Ruqaa", "Amiri", serif', true, 2),
  ('Reem Kufi', 'ريم كوفي الهندسي', 'Reem Kufi Geometric', 'arabic', 'kufi', '"Reem Kufi", "Cairo", sans-serif', true, 3),
  ('Cairo', 'القاهرة العصري', 'Cairo Modern Sans', 'both', 'sans', '"Cairo", "Plus Jakarta Sans", sans-serif', true, 4),
  ('Tajawal', 'تجوّل الأنيق', 'Tajawal Clean Sans', 'arabic', 'sans', '"Tajawal", "Cairo", sans-serif', true, 5),
  ('Noto Naskh Arabic', 'نوتو نسخ الهادئ', 'Noto Naskh Arabic', 'arabic', 'serif', '"Noto Naskh Arabic", "Amiri", serif', true, 6),
  ('Cormorant Garamond', 'كورمورانت الملكي', 'Cormorant Garamond', 'latin', 'serif', '"Cormorant Garamond", Georgia, serif', true, 7),
  ('Playfair Display', 'بلايفير التحريري', 'Playfair Display', 'latin', 'serif', '"Playfair Display", Georgia, serif', true, 8),
  ('Great Vibes', 'جريت فايبز المخطوط', 'Great Vibes Script', 'latin', 'calligraphy', '"Great Vibes", "Cormorant Garamond", cursive', true, 9),
  ('Plus Jakarta Sans', 'جاكرتا العصري', 'Plus Jakarta Sans', 'latin', 'sans', '"Plus Jakarta Sans", system-ui, sans-serif', true, 10)
ON CONFLICT (family_name) DO UPDATE SET
  display_name_ar = EXCLUDED.display_name_ar,
  display_name_en = EXCLUDED.display_name_en,
  css_stack = EXCLUDED.css_stack,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- 3. Templates (All 7 requested categories + curated olive palace edition)
INSERT INTO invite_cart.templates (slug, category, name_ar, name_en, description_ar, description_en, is_premium, is_active, sort_order, config)
VALUES
  (
    'royal-obsidian-crest',
    'royal',
    'الديوان الملكي الأسود',
    'Royal Obsidian Crest',
    'فخامة مخملية داكنة بإطار ذهبي مزدوج وشعار ملكي متوج للأمسيات الراقية',
    'Deep obsidian velvet surface framed in burnished gold filigree with royal crest medallion',
    false,
    true,
    1,
    '{"bgColor":"#0F0E0C","surfaceColor":"#191714","textColor":"#FAF4E8","accentColor":"#D4AF37","secondaryColor":"#8F6E2B","fontAr":"Aref Ruqaa","fontEn":"Cormorant Garamond","ornamentStyle":"royal_crest","animationPreset":"curtain","envelopeStyle":"obsidian_wax","borderStyle":"double_filigree","darkSurface":true}'::jsonb
  ),
  (
    'classic-ivory-seal',
    'classic',
    'الأصالة العاجية الكلاسيكية',
    'Classic Ivory Seal',
    'ورق قطني عاجي دافئ مع ختم شمعي ذهبي وزخارف نباتية كلاسيكية خالدة',
    'Warm heirloom cotton ivory with antique gold wax seal and timeless botanical flourishes',
    false,
    true,
    2,
    '{"bgColor":"#FAF6EE","surfaceColor":"#FFFFFF","textColor":"#1E1A15","accentColor":"#A67C37","secondaryColor":"#32402E","fontAr":"Amiri","fontEn":"Cormorant Garamond","ornamentStyle":"botanical_arch","animationPreset":"envelope","envelopeStyle":"ivory_wax","borderStyle":"hairline_gold","darkSurface":false}'::jsonb
  ),
  (
    'modern-olive-atelier',
    'modern',
    'أتيليه الزيتون العصري',
    'Modern Olive Atelier',
    'توازن هندسي معاصر يجمع بين الأخضر الزيتي الملكي والبيج الحريري وخطوط ريم كوفي',
    'Contemporary architectural split layout pairing royal olive green with silk cream and geometric type',
    false,
    true,
    3,
    '{"bgColor":"#F3EFE6","surfaceColor":"#2C3828","textColor":"#FAF7F0","accentColor":"#D9B973","secondaryColor":"#F3EFE6","fontAr":"Reem Kufi","fontEn":"Playfair Display","ornamentStyle":"geometric_frame","animationPreset":"slide_reveal","envelopeStyle":"olive_linen","borderStyle":"architectural","darkSurface":true}'::jsonb
  ),
  (
    'islamic-khatam-andalus',
    'islamic',
    'نجمة الأندلس الإسلامية',
    'Andalusian Khatam',
    'زخارف إسلامية هندسية ثمانية ناعمة مع ترويسة البسملة والتاريخ الهجري المذهب',
    'Fine 8-point Islamic geometric rosette filigree with Bismillah medallion and Hijri date showcase',
    false,
    true,
    4,
    '{"bgColor":"#FBF8F1","surfaceColor":"#FFFFFF","textColor":"#192118","accentColor":"#B38B3D","secondaryColor":"#2E4231","fontAr":"Amiri","fontEn":"Cormorant Garamond","ornamentStyle":"islamic_khatam","animationPreset":"envelope","envelopeStyle":"andalus_gold","borderStyle":"mashrabiya","darkSurface":false}'::jsonb
  ),
  (
    'minimal-alabaster-silk',
    'minimal',
    'صفاء المرمر البسيط',
    'Alabaster Minimal',
    'بساطة راقية بمساحات بيضاء تنفسية وخطوط رفيعة تبرز الأسماء بأناقة صامتة',
    'Whisper-quiet luxury with generous white space, crisp hairline framing, and restrained typography',
    false,
    true,
    5,
    '{"bgColor":"#FFFFFF","surfaceColor":"#FCFBF8","textColor":"#171717","accentColor":"#8C7242","secondaryColor":"#52524E","fontAr":"Tajawal","fontEn":"Plus Jakarta Sans","ornamentStyle":"minimal_hairline","animationPreset":"fade_quiet","envelopeStyle":"pure_white","borderStyle":"single_thin","darkSurface":false}'::jsonb
  ),
  (
    'cinematic-starlight-palace',
    'cinematic',
    'قصر النجوم السينمائي',
    'Starlight Palace Cinema',
    'بوابة قصر تفاعلية تفتح بستائر مخملية وبريق ذهبي متطاير مع تأثيرات سينمائية',
    'Interactive palace doors reveal with shimmering gold starlight particles and choreographed motion',
    true,
    true,
    6,
    '{"bgColor":"#121318","surfaceColor":"#1B1D24","textColor":"#F9F4EA","accentColor":"#E2C175","secondaryColor":"#3E4C3A","fontAr":"Aref Ruqaa","fontEn":"Great Vibes","ornamentStyle":"starlight_arch","animationPreset":"cinematic_doors","envelopeStyle":"royal_doors","borderStyle":"filigree_glow","darkSurface":true}'::jsonb
  ),
  (
    'gold-foil-imperial',
    'gold_luxury',
    'الذهب الإمبراطوري المصقول',
    'Imperial Gold Foil',
    'تدرجات الشامبين الذهبي مع نقوش فويل لامعة وتاج زفاف إمبراطوري فاخر',
    'Burnished champagne-gold gradients, metallic foil accents, and imperial wedding crest detailing',
    true,
    true,
    7,
    '{"bgColor":"#EFE4CE","surfaceColor":"#FFFDF7","textColor":"#21190F","accentColor":"#B9892C","secondaryColor":"#7C5B1A","fontAr":"Amiri","fontEn":"Great Vibes","ornamentStyle":"imperial_foil","animationPreset":"shimmer_reveal","envelopeStyle":"champagne_foil","borderStyle":"ornate_gold","darkSurface":false}'::jsonb
  ),
  (
    'olive-gold-heritage',
    'royal',
    'تراث الزيتون والذهب',
    'Olive & Gold Heritage',
    'تصميم عربي تراثي بعمق الزيتي الداكن وحواف مذهبة متناغمة مع الخط الكوفي والنسخ',
    'Deep olive heritage palette gilded with gold leaf geometry and refined Naskh calligraphy',
    false,
    true,
    8,
    '{"bgColor":"#222D1F","surfaceColor":"#293625","textColor":"#FAF5E8","accentColor":"#DFBC70","secondaryColor":"#F3E8CE","fontAr":"Noto Naskh Arabic","fontEn":"Playfair Display","ornamentStyle":"islamic_khatam","animationPreset":"envelope","envelopeStyle":"olive_wax","borderStyle":"double_filigree","darkSurface":true}'::jsonb
  ),
  (
    'stage-poster-night',
    'cinematic',
    'بوستر السهرة والأضواء الذهبية (ليلتين)',
    'Golden Stage Spotlight Poster',
    'بوستر أفراح فاخر بصورة العريس وإضاءة ستيج ذهبية وخط 3D بارز مع شارات جانبية وتواريخ الليلتين',
    'Dramatic concert-stage spotlight poster with 3D metallic gold headline, side medallions, and two-night date boxes',
    false,
    true,
    9,
    '{"bgColor":"#0D0905","surfaceColor":"#140E07","textColor":"#FFF6E5","accentColor":"#F5B041","secondaryColor":"#8F5216","fontAr":"Cairo","fontEn":"Cormorant Garamond","ornamentStyle":"starlight_arch","animationPreset":"cinematic_doors","envelopeStyle":"obsidian_wax","borderStyle":"filigree_glow","darkSurface":true,"layoutMode":"stage_poster","poster":{"topRibbonAr":"بأحلى فرحة وبحضوركم تتم الفرح","topRibbonEn":"With Your Presence Our Joy Is Complete","badgeTextAr":"أفراح","badgeTextEn":"Celebration","headlineAr":"الفرحة المنتظرة","headlineEn":"The Awaited Joy","subHeadlineAr":"ليلتين من الفرح والسعادة","subHeadlineEn":"Two Nights of Joy","rightTitleAr":"أفراح بلدنا","rightSubAr":"فرحتنا إللي جنكم يا أحلى ناس","leftTitleAr":"فرحة العمر","leftSubAr":"ليلة من الفرح والسرور بحضوركم","footerBadgeAr":"ليلتين من الفرح والسعادة","cornerRightAr":"دعوة القلب","cornerLeftAr":"وجودكم يزيد الفرح","monogramText":"A H","showSpotlights":true,"showFloralCorners":false,"showLantern":false,"showMedallions":true,"twoNightsEnabled":true,"night1":{"labelAr":"الليلة الأولى","labelEn":"First Night","eventTitleAr":"حفل الحناء والسهرة","eventTitleEn":"Henna Night","dateLabel":"6/9","subDateLabel":"2026","venueAr":"أمام منزل الداعي","venueEn":"Family Pavilion","icon":"henna"},"night2":{"labelAr":"الليلة الثانية","labelEn":"Second Night","eventTitleAr":"حفل الزفاف","eventTitleEn":"Wedding Night","dateLabel":"7/9","subDateLabel":"2026","venueAr":"القاعة الملكية الكبرى","venueEn":"Grand Ballroom","icon":"rings"}}}'::jsonb
  ),
  (
    'arab-heritage-poster',
    'classic',
    'بوستر أفراح العرب الكلاسيكي (الحناء والزفاف)',
    'Arab Heritage Split Poster',
    'بوستر كريمي راقي بصورة كاملة للعريس مع باقات الزهور والفانوس وتفاصيل ليلة الحناء وليلة الزفاف',
    'Warm ivory split-portrait poster featuring floral corner bouquets, hanging lantern, and structured Henna & Wedding cards',
    false,
    true,
    10,
    '{"bgColor":"#F3ECE0","surfaceColor":"#FBF6EC","textColor":"#1C1812","accentColor":"#B89246","secondaryColor":"#8B6220","fontAr":"Cairo","fontEn":"Cormorant Garamond","ornamentStyle":"botanical_arch","animationPreset":"envelope","envelopeStyle":"ivory_wax","borderStyle":"hairline_gold","darkSurface":false,"layoutMode":"split_poster","poster":{"topRibbonAr":"الدعوة عامة","topRibbonEn":"Open Invitation","badgeTextAr":"الدعوة عامة","badgeTextEn":"Open Invitation","headlineAr":"أفراح العرب","headlineEn":"Arab Heritage Wedding","subHeadlineAr":"الدعوة عامة","subHeadlineEn":"Warmly Invited","rightTitleAr":"أفراح بلدنا","rightSubAr":"بحضوركم تكتمل فرحتنا","leftTitleAr":"فرحة العمر","leftSubAr":"ليلة العمر السعيدة","footerBadgeAr":"","cornerRightAr":"أهلاً بكم","cornerLeftAr":"مرحباً بالجميع","monogramText":"M","showSpotlights":false,"showFloralCorners":true,"showLantern":true,"showMedallions":false,"twoNightsEnabled":true,"night1":{"labelAr":"الليلة الأولى","labelEn":"First Night","eventTitleAr":"حفل الحناء","eventTitleEn":"Henna Ceremony","dateLabel":"07/10/2026","subDateLabel":"الأربعاء","venueAr":"أمام منزل الداعي","venueEn":"At Family Home","icon":"henna"},"night2":{"labelAr":"الليلة الثانية","labelEn":"Second Night","eventTitleAr":"حفل الزفاف","eventTitleEn":"Wedding Gala","dateLabel":"09/10/2026","subDateLabel":"الجمعة","venueAr":"قاعة البوليفارد الكبرى","venueEn":"Boulevard Grand Hall","icon":"rings"}}}'::jsonb
  )
ON CONFLICT (slug) DO UPDATE SET
  category = EXCLUDED.category,
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  description_ar = EXCLUDED.description_ar,
  description_en = EXCLUDED.description_en,
  is_premium = EXCLUDED.is_premium,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  config = EXCLUDED.config;

-- 4. Media & Content Presets (Verses + Audio Presets)
INSERT INTO invite_cart.media_assets (kind, title_ar, title_en, value, metadata, is_active)
SELECT * FROM (
  VALUES
    ('verse', 'آية المودة والرحمة (الروم ٢١)', 'Quranic Verse (Ar-Rum 30:21)', '﴿ وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً ﴾', '{"sub":"سورة الروم - آية ٢١"}'::jsonb, true),
    ('verse', 'البسملة والدعاء المبارك', 'Bismillah & Blessing', 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ • بارك الله لهما وبارك عليهما وجمع بينهما في خير', '{"sub":"دعاء مأثور"}'::jsonb, true),
    ('verse', 'دعوة ملكية راقية', 'Royal Poetic Opening', 'في ليلةٍ يزدانُ فيها الفرح، وتتعانقُ فيها أسمى مشاعر المودة، يتشرفُ الأهلُ بدعوتكم لحضور حفل زفاف', '{"sub":"صياغة شعرية"}'::jsonb, true),
    ('music_preset', 'نغمات العود الحجازي الهادئة', 'Hijaz Oud Serenity', 'hijaz_oud', '{"tempo":"calm","mode":"synthesized"}'::jsonb, true),
    ('music_preset', 'بيانو القصر الكلاسيكي', 'Palace Classical Piano', 'palace_piano', '{"tempo":"gentle","mode":"synthesized"}'::jsonb, true),
    ('music_preset', 'أوتار القيثارة الذهبية', 'Golden Harp Reverie', 'golden_harp', '{"tempo":"dreamy","mode":"synthesized"}'::jsonb, true),
    ('music_preset', 'زفة شرقية ناعمة (بدون إيقاع صاخب)', 'Soft Oriental Zaffa Pad', 'oriental_pad', '{"tempo":"majestic","mode":"synthesized"}'::jsonb, true)
) AS v(kind, title_ar, title_en, value, metadata, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM invite_cart.media_assets m WHERE m.kind = v.kind AND m.value = v.value
);
