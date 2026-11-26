-- Marasim / Invite Cart — Isolated Schema Setup
-- Safe isolation: all tables live inside `invite_cart`, keeping `public` untouched.

CREATE SCHEMA IF NOT EXISTS invite_cart;
CREATE SCHEMA IF NOT EXISTS private;

GRANT USAGE ON SCHEMA invite_cart TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

-- 1. Profiles
CREATE TABLE IF NOT EXISTS invite_cart.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  phone text,
  full_name text NOT NULL DEFAULT '',
  avatar_url text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  plan_tier text NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'royal', 'imperial')),
  is_active boolean NOT NULL DEFAULT true,
  preferred_lang text NOT NULL DEFAULT 'ar' CHECK (preferred_lang IN ('ar', 'en')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique_idx
  ON invite_cart.profiles (phone)
  WHERE phone IS NOT NULL AND phone <> '';

CREATE TABLE IF NOT EXISTS private.user_pins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_normalized text NOT NULL UNIQUE,
  pin_hash text NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Service-role-only PIN management RPCs (never exposed to anon/authenticated)
CREATE OR REPLACE FUNCTION invite_cart.internal_upsert_user_pin(
  p_user_id uuid,
  p_phone text,
  p_pin_hash text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO private.user_pins (user_id, phone_normalized, pin_hash, failed_attempts, locked_until, updated_at)
  VALUES (p_user_id, p_phone, p_pin_hash, 0, null, now())
  ON CONFLICT (user_id) DO UPDATE SET
    phone_normalized = EXCLUDED.phone_normalized,
    pin_hash = EXCLUDED.pin_hash,
    failed_attempts = 0,
    locked_until = null,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION invite_cart.internal_get_pin_record(p_phone text)
RETURNS TABLE (
  user_id uuid,
  pin_hash text,
  failed_attempts integer,
  locked_until timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT u.user_id, u.pin_hash, u.failed_attempts, u.locked_until
  FROM private.user_pins u
  WHERE u.phone_normalized = p_phone
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION invite_cart.internal_record_pin_attempt(p_user_id uuid, p_success boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_success THEN
    UPDATE private.user_pins
    SET failed_attempts = 0, locked_until = null, updated_at = now()
    WHERE user_id = p_user_id;
  ELSE
    UPDATE private.user_pins
    SET
      failed_attempts = failed_attempts + 1,
      locked_until = CASE
        WHEN failed_attempts + 1 >= 5 THEN now() + interval '15 minutes'
        ELSE locked_until
      END,
      updated_at = now()
    WHERE user_id = p_user_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION invite_cart.internal_upsert_user_pin(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION invite_cart.internal_get_pin_record(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION invite_cart.internal_record_pin_attempt(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION invite_cart.internal_upsert_user_pin(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION invite_cart.internal_get_pin_record(text) TO service_role;
GRANT EXECUTE ON FUNCTION invite_cart.internal_record_pin_attempt(uuid, boolean) TO service_role;

-- Security helper functions in unexposed `private` schema
CREATE OR REPLACE FUNCTION private.invite_cart_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM invite_cart.profiles
    WHERE id = (SELECT auth.uid())
      AND role = 'admin'
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION private.invite_cart_is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM invite_cart.profiles
    WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'moderator')
      AND is_active = true
  );
$$;

GRANT EXECUTE ON FUNCTION private.invite_cart_is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.invite_cart_is_staff() TO anon, authenticated, service_role;

-- Updated_at trigger helper
CREATE OR REPLACE FUNCTION invite_cart.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Prevent self-escalation of role / plan_tier / is_active by non-admins
CREATE OR REPLACE FUNCTION private.protect_profile_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  jwt_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  IF jwt_role IN ('service_role', 'supabase_admin') OR current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF NOT private.invite_cart_is_admin() THEN
    NEW.role := OLD.role;
    NEW.plan_tier := OLD.plan_tier;
    NEW.is_active := OLD.is_active;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_touch ON invite_cart.profiles;
CREATE TRIGGER trg_profiles_touch
  BEFORE UPDATE ON invite_cart.profiles
  FOR EACH ROW EXECUTE FUNCTION invite_cart.touch_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_protect ON invite_cart.profiles;
CREATE TRIGGER trg_profiles_protect
  BEFORE UPDATE ON invite_cart.profiles
  FOR EACH ROW EXECUTE FUNCTION private.protect_profile_sensitive_fields();

-- 2. Templates Catalog
CREATE TABLE IF NOT EXISTS invite_cart.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  category text NOT NULL CHECK (category IN ('royal', 'classic', 'modern', 'islamic', 'minimal', 'cinematic', 'gold_luxury')),
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description_ar text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  is_premium boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS templates_category_idx ON invite_cart.templates (category, sort_order);

DROP TRIGGER IF EXISTS trg_templates_touch ON invite_cart.templates;
CREATE TRIGGER trg_templates_touch
  BEFORE UPDATE ON invite_cart.templates
  FOR EACH ROW EXECUTE FUNCTION invite_cart.touch_updated_at();

-- 3. Invitations
CREATE TABLE IF NOT EXISTS invite_cart.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id uuid REFERENCES invite_cart.templates(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_featured boolean NOT NULL DEFAULT false,
  primary_lang text NOT NULL DEFAULT 'ar' CHECK (primary_lang IN ('ar', 'en', 'bilingual')),
  bride_name_ar text NOT NULL DEFAULT '',
  groom_name_ar text NOT NULL DEFAULT '',
  bride_name_en text NOT NULL DEFAULT '',
  groom_name_en text NOT NULL DEFAULT '',
  parents_text_ar text NOT NULL DEFAULT '',
  parents_text_en text NOT NULL DEFAULT '',
  opening_verse text NOT NULL DEFAULT '',
  invitation_title_ar text NOT NULL DEFAULT '',
  invitation_title_en text NOT NULL DEFAULT '',
  invitation_body_ar text NOT NULL DEFAULT '',
  invitation_body_en text NOT NULL DEFAULT '',
  event_date timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  event_time_label text NOT NULL DEFAULT '',
  hijri_date text NOT NULL DEFAULT '',
  venue_name_ar text NOT NULL DEFAULT '',
  venue_name_en text NOT NULL DEFAULT '',
  venue_address text NOT NULL DEFAULT '',
  maps_url text NOT NULL DEFAULT '',
  maps_lat double precision,
  maps_lng double precision,
  cover_image_url text NOT NULL DEFAULT '',
  gallery_urls text[] NOT NULL DEFAULT '{}',
  schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  theme_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  music_enabled boolean NOT NULL DEFAULT true,
  music_preset text NOT NULL DEFAULT 'hijaz_oud',
  music_url text NOT NULL DEFAULT '',
  rsvp_enabled boolean NOT NULL DEFAULT true,
  guestbook_enabled boolean NOT NULL DEFAULT true,
  notes_ar text NOT NULL DEFAULT '',
  notes_en text NOT NULL DEFAULT '',
  view_count bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invitations_user_id_idx ON invite_cart.invitations (user_id);
CREATE INDEX IF NOT EXISTS invitations_template_id_idx ON invite_cart.invitations (template_id);
CREATE INDEX IF NOT EXISTS invitations_status_idx ON invite_cart.invitations (status);
CREATE INDEX IF NOT EXISTS invitations_created_at_idx ON invite_cart.invitations (created_at DESC);

DROP TRIGGER IF EXISTS trg_invitations_touch ON invite_cart.invitations;
CREATE TRIGGER trg_invitations_touch
  BEFORE UPDATE ON invite_cart.invitations
  FOR EACH ROW EXECUTE FUNCTION invite_cart.touch_updated_at();

-- 4. RSVPs & Guestbook Wishes
CREATE TABLE IF NOT EXISTS invite_cart.rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES invite_cart.invitations(id) ON DELETE CASCADE,
  guest_name text NOT NULL CHECK (char_length(trim(guest_name)) >= 1 AND char_length(guest_name) <= 120),
  guest_phone text NOT NULL DEFAULT '' CHECK (char_length(guest_phone) <= 40),
  guest_email text NOT NULL DEFAULT '' CHECK (char_length(guest_email) <= 120),
  attendance text NOT NULL DEFAULT 'attending' CHECK (attendance IN ('attending', 'declined', 'maybe')),
  guests_count integer NOT NULL DEFAULT 1 CHECK (guests_count >= 1 AND guests_count <= 20),
  wishes_message text NOT NULL DEFAULT '' CHECK (char_length(wishes_message) <= 600),
  dietary_or_note text NOT NULL DEFAULT '' CHECK (char_length(dietary_or_note) <= 300),
  is_wish_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rsvps_invitation_id_idx ON invite_cart.rsvps (invitation_id, created_at DESC);

-- Public wishes view (with security_invoker + strips phone/email!)
CREATE OR REPLACE VIEW invite_cart.public_wishes
WITH (security_invoker = false)
AS
  SELECT
    r.id,
    r.invitation_id,
    r.guest_name,
    r.attendance,
    r.wishes_message,
    r.created_at
  FROM invite_cart.rsvps r
  JOIN invite_cart.invitations i ON i.id = r.invitation_id
  WHERE i.status = 'published'
    AND i.guestbook_enabled = true
    AND r.is_wish_public = true
    AND char_length(trim(r.wishes_message)) > 0;

-- 5. Invitation Views Analytics
CREATE TABLE IF NOT EXISTS invite_cart.invitation_views (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  invitation_id uuid NOT NULL REFERENCES invite_cart.invitations(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'direct',
  viewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invitation_views_inv_idx ON invite_cart.invitation_views (invitation_id, viewed_at DESC);

-- Safe view recorder RPC
CREATE OR REPLACE FUNCTION invite_cart.record_invitation_view(p_slug text, p_source text DEFAULT 'direct')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_inv_id uuid;
BEGIN
  SELECT id INTO v_inv_id
  FROM invite_cart.invitations
  WHERE slug = p_slug AND status = 'published'
  LIMIT 1;

  IF v_inv_id IS NOT NULL THEN
    UPDATE invite_cart.invitations
    SET view_count = view_count + 1
    WHERE id = v_inv_id;

    INSERT INTO invite_cart.invitation_views (invitation_id, source)
    VALUES (v_inv_id, COALESCE(NULLIF(left(p_source, 40), ''), 'direct'));
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION invite_cart.record_invitation_view(text, text) TO anon, authenticated;

-- 6. Subscription Packages & Orders
CREATE TABLE IF NOT EXISTS invite_cart.packages (
  id text PRIMARY KEY,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description_ar text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  price_sar numeric(10, 2) NOT NULL DEFAULT 0,
  max_invitations integer NOT NULL DEFAULT 3,
  features_ar text[] NOT NULL DEFAULT '{}',
  features_en text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS invite_cart.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id text NOT NULL REFERENCES invite_cart.packages(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled')),
  amount numeric(10, 2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SAR',
  payment_method text NOT NULL DEFAULT 'card',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON invite_cart.orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_package_id_idx ON invite_cart.orders (package_id);

DROP TRIGGER IF EXISTS trg_orders_touch ON invite_cart.orders;
CREATE TRIGGER trg_orders_touch
  BEFORE UPDATE ON invite_cart.orders
  FOR EACH ROW EXECUTE FUNCTION invite_cart.touch_updated_at();

-- 7. Fonts Catalog & Media/Content Assets
CREATE TABLE IF NOT EXISTS invite_cart.fonts_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_name text NOT NULL UNIQUE,
  display_name_ar text NOT NULL,
  display_name_en text NOT NULL,
  script_type text NOT NULL CHECK (script_type IN ('arabic', 'latin', 'both')),
  category text NOT NULL DEFAULT 'serif' CHECK (category IN ('calligraphy', 'serif', 'sans', 'kufi')),
  css_stack text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS invite_cart.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('verse', 'music_preset', 'background', 'photo', 'announcement')),
  title_ar text NOT NULL,
  title_en text NOT NULL,
  value text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS media_assets_kind_idx ON invite_cart.media_assets (kind, is_active);
CREATE INDEX IF NOT EXISTS media_assets_uploaded_by_idx ON invite_cart.media_assets (uploaded_by);

-- 8. Explicit Table Grants
GRANT SELECT, INSERT, UPDATE ON invite_cart.profiles TO authenticated;
GRANT SELECT ON invite_cart.templates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON invite_cart.templates TO authenticated;
GRANT SELECT ON invite_cart.invitations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON invite_cart.invitations TO authenticated;
GRANT INSERT ON invite_cart.rsvps TO anon, authenticated;
GRANT SELECT, DELETE ON invite_cart.rsvps TO authenticated;
GRANT SELECT ON invite_cart.public_wishes TO anon, authenticated;
GRANT SELECT ON invite_cart.invitation_views TO authenticated;
GRANT SELECT ON invite_cart.packages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON invite_cart.packages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON invite_cart.orders TO authenticated;
GRANT SELECT ON invite_cart.fonts_catalog TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON invite_cart.fonts_catalog TO authenticated;
GRANT SELECT ON invite_cart.media_assets TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON invite_cart.media_assets TO authenticated;

-- 9. Enable Row Level Security Everywhere
ALTER TABLE invite_cart.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_cart.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_cart.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_cart.rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_cart.invitation_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_cart.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_cart.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_cart.fonts_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_cart.media_assets ENABLE ROW LEVEL SECURITY;

-- Policies: Profiles
DROP POLICY IF EXISTS profiles_select ON invite_cart.profiles;
CREATE POLICY profiles_select ON invite_cart.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT private.invite_cart_is_staff()));

DROP POLICY IF EXISTS profiles_insert ON invite_cart.profiles;
CREATE POLICY profiles_insert ON invite_cart.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()) AND role = 'user' AND plan_tier = 'free');

DROP POLICY IF EXISTS profiles_update ON invite_cart.profiles;
CREATE POLICY profiles_update ON invite_cart.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT private.invite_cart_is_admin()))
  WITH CHECK (id = (SELECT auth.uid()) OR (SELECT private.invite_cart_is_admin()));

-- Policies: Templates
DROP POLICY IF EXISTS templates_public_select ON invite_cart.templates;
CREATE POLICY templates_public_select ON invite_cart.templates
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR (SELECT private.invite_cart_is_staff()));

DROP POLICY IF EXISTS templates_admin_insert ON invite_cart.templates;
CREATE POLICY templates_admin_insert ON invite_cart.templates
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.invite_cart_is_staff()));

DROP POLICY IF EXISTS templates_admin_update ON invite_cart.templates;
CREATE POLICY templates_admin_update ON invite_cart.templates
  FOR UPDATE TO authenticated
  USING ((SELECT private.invite_cart_is_staff()))
  WITH CHECK ((SELECT private.invite_cart_is_staff()));

DROP POLICY IF EXISTS templates_admin_delete ON invite_cart.templates;
CREATE POLICY templates_admin_delete ON invite_cart.templates
  FOR DELETE TO authenticated
  USING ((SELECT private.invite_cart_is_admin()));

-- Policies: Invitations
DROP POLICY IF EXISTS invitations_select ON invite_cart.invitations;
CREATE POLICY invitations_select ON invite_cart.invitations
  FOR SELECT TO anon, authenticated
  USING (
    status = 'published'
    OR user_id = (SELECT auth.uid())
    OR (SELECT private.invite_cart_is_staff())
  );

DROP POLICY IF EXISTS invitations_insert ON invite_cart.invitations;
CREATE POLICY invitations_insert ON invite_cart.invitations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS invitations_update ON invite_cart.invitations;
CREATE POLICY invitations_update ON invite_cart.invitations
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT private.invite_cart_is_staff()))
  WITH CHECK (user_id = (SELECT auth.uid()) OR (SELECT private.invite_cart_is_staff()));

DROP POLICY IF EXISTS invitations_delete ON invite_cart.invitations;
CREATE POLICY invitations_delete ON invite_cart.invitations
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT private.invite_cart_is_admin()));

-- Policies: RSVPs
DROP POLICY IF EXISTS rsvps_public_insert ON invite_cart.rsvps;
CREATE POLICY rsvps_public_insert ON invite_cart.rsvps
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invite_cart.invitations i
      WHERE i.id = invitation_id
        AND i.status = 'published'
        AND i.rsvp_enabled = true
    )
  );

DROP POLICY IF EXISTS rsvps_owner_select ON invite_cart.rsvps;
CREATE POLICY rsvps_owner_select ON invite_cart.rsvps
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invite_cart.invitations i
      WHERE i.id = invitation_id AND i.user_id = (SELECT auth.uid())
    )
    OR (SELECT private.invite_cart_is_staff())
  );

DROP POLICY IF EXISTS rsvps_owner_delete ON invite_cart.rsvps;
CREATE POLICY rsvps_owner_delete ON invite_cart.rsvps
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invite_cart.invitations i
      WHERE i.id = invitation_id AND i.user_id = (SELECT auth.uid())
    )
    OR (SELECT private.invite_cart_is_admin())
  );

-- Policies: Invitation Views
DROP POLICY IF EXISTS invitation_views_select ON invite_cart.invitation_views;
CREATE POLICY invitation_views_select ON invite_cart.invitation_views
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invite_cart.invitations i
      WHERE i.id = invitation_id AND i.user_id = (SELECT auth.uid())
    )
    OR (SELECT private.invite_cart_is_staff())
  );

-- Policies: Packages
DROP POLICY IF EXISTS packages_select ON invite_cart.packages;
CREATE POLICY packages_select ON invite_cart.packages
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR (SELECT private.invite_cart_is_staff()));

DROP POLICY IF EXISTS packages_admin_write ON invite_cart.packages;
CREATE POLICY packages_admin_write ON invite_cart.packages
  FOR ALL TO authenticated
  USING ((SELECT private.invite_cart_is_admin()))
  WITH CHECK ((SELECT private.invite_cart_is_admin()));

-- Policies: Orders
DROP POLICY IF EXISTS orders_select ON invite_cart.orders;
CREATE POLICY orders_select ON invite_cart.orders
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT private.invite_cart_is_staff()));

DROP POLICY IF EXISTS orders_insert ON invite_cart.orders;
CREATE POLICY orders_insert ON invite_cart.orders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS orders_admin_update ON invite_cart.orders;
CREATE POLICY orders_admin_update ON invite_cart.orders
  FOR UPDATE TO authenticated
  USING ((SELECT private.invite_cart_is_admin()))
  WITH CHECK ((SELECT private.invite_cart_is_admin()));

-- Policies: Fonts Catalog
DROP POLICY IF EXISTS fonts_select ON invite_cart.fonts_catalog;
CREATE POLICY fonts_select ON invite_cart.fonts_catalog
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR (SELECT private.invite_cart_is_staff()));

DROP POLICY IF EXISTS fonts_admin_write ON invite_cart.fonts_catalog;
CREATE POLICY fonts_admin_write ON invite_cart.fonts_catalog
  FOR ALL TO authenticated
  USING ((SELECT private.invite_cart_is_staff()))
  WITH CHECK ((SELECT private.invite_cart_is_staff()));

-- Policies: Media Assets
DROP POLICY IF EXISTS media_assets_select ON invite_cart.media_assets;
CREATE POLICY media_assets_select ON invite_cart.media_assets
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR uploaded_by = (SELECT auth.uid()) OR (SELECT private.invite_cart_is_staff()));

DROP POLICY IF EXISTS media_assets_insert ON invite_cart.media_assets;
CREATE POLICY media_assets_insert ON invite_cart.media_assets
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = (SELECT auth.uid()) OR (SELECT private.invite_cart_is_staff()));

DROP POLICY IF EXISTS media_assets_update ON invite_cart.media_assets;
CREATE POLICY media_assets_update ON invite_cart.media_assets
  FOR UPDATE TO authenticated
  USING (uploaded_by = (SELECT auth.uid()) OR (SELECT private.invite_cart_is_staff()))
  WITH CHECK (uploaded_by = (SELECT auth.uid()) OR (SELECT private.invite_cart_is_staff()));

DROP POLICY IF EXISTS media_assets_delete ON invite_cart.media_assets;
CREATE POLICY media_assets_delete ON invite_cart.media_assets
  FOR DELETE TO authenticated
  USING (uploaded_by = (SELECT auth.uid()) OR (SELECT private.invite_cart_is_admin()));

-- 10. Storage Bucket & Policies (invite-cart-media)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invite-cart-media',
  'invite-cart-media',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "invite_cart_media_public_read" ON storage.objects;
CREATE POLICY "invite_cart_media_public_read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'invite-cart-media');

DROP POLICY IF EXISTS "invite_cart_media_user_insert" ON storage.objects;
CREATE POLICY "invite_cart_media_user_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'invite-cart-media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "invite_cart_media_user_update" ON storage.objects;
CREATE POLICY "invite_cart_media_user_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'invite-cart-media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'invite-cart-media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "invite_cart_media_user_delete" ON storage.objects;
CREATE POLICY "invite_cart_media_user_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'invite-cart-media'
    AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR (SELECT private.invite_cart_is_admin())
    )
  );
