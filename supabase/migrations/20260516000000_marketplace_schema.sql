-- AstranoV: full marketplace schema — vendors, orders, invoices, ledger, webrtc signals

-- ── VENDORS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  osm_id          text UNIQUE,
  name            text NOT NULL,
  emoji           text DEFAULT '🎪',
  category        text DEFAULT 'shop',
  lat             double precision NOT NULL,
  lng             double precision NOT NULL,
  address         jsonb DEFAULT '{}',
  tags            jsonb DEFAULT '{}',
  owner_id        uuid REFERENCES auth.users(id),
  items           jsonb DEFAULT '[]',
  reserve_balance float DEFAULT 0,
  is_active       boolean DEFAULT true,
  delivery_enabled boolean DEFAULT true,
  delivery_radius_km float DEFAULT 3,
  min_order_avc   float DEFAULT 5,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vendors_lat_lng_idx ON vendors(lat, lng);
CREATE INDEX IF NOT EXISTS vendors_osm_idx ON vendors(osm_id);
CREATE INDEX IF NOT EXISTS vendors_owner_idx ON vendors(owner_id);
CREATE INDEX IF NOT EXISTS vendors_category_idx ON vendors(category);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon read vendors" ON vendors;
CREATE POLICY "Anon read vendors" ON vendors FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Owner update vendor" ON vendors;
CREATE POLICY "Owner update vendor" ON vendors FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owner insert vendor" ON vendors;
CREATE POLICY "Owner insert vendor" ON vendors FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Service all vendors" ON vendors;
CREATE POLICY "Service all vendors" ON vendors FOR ALL USING (auth.role() = 'service_role');


-- ── ORDERS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id         text UNIQUE DEFAULT 'ORD-' || upper(substring(gen_random_uuid()::text from 1 for 6)),
  vendor_id        uuid REFERENCES vendors(id),
  customer_id      uuid REFERENCES auth.users(id),
  items            jsonb NOT NULL DEFAULT '[]',
  calc             jsonb NOT NULL DEFAULT '{}',
  status           text NOT NULL DEFAULT 'pending',
  driver_name      text,
  driver_emoji     text DEFAULT '🚴',
  delivery_lat     double precision,
  delivery_lng     double precision,
  delivery_address text,
  notes            text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_vendor_idx ON orders(vendor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customer see own orders" ON orders;
CREATE POLICY "Customer see own orders" ON orders FOR SELECT USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Anon insert order" ON orders;
CREATE POLICY "Anon insert order" ON orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service all orders" ON orders;
CREATE POLICY "Service all orders" ON orders FOR ALL USING (auth.role() = 'service_role');


-- ── INVOICES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id            text PRIMARY KEY,
  mark          text,
  order_id      text,
  vendor_name   text,
  buyer_id      uuid REFERENCES auth.users(id),
  items         jsonb DEFAULT '[]',
  subtotal      float DEFAULT 0,
  delivery_fee  float DEFAULT 0,
  platform_fee  float DEFAULT 0,
  total         float DEFAULT 0,
  currency      text DEFAULT 'AVC',
  period_month  text,
  status        text DEFAULT 'issued',
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon insert invoice" ON invoices;
CREATE POLICY "Anon insert invoice" ON invoices FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Customer read own invoices" ON invoices;
CREATE POLICY "Customer read own invoices" ON invoices FOR SELECT USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Service all invoices" ON invoices;
CREATE POLICY "Service all invoices" ON invoices FOR ALL USING (auth.role() = 'service_role');


-- ── BALANCE LEDGER ───────────────────────────────────
CREATE TABLE IF NOT EXISTS balance_ledger (
  id         bigserial PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id),
  balance    float DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE balance_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User read own balance" ON balance_ledger;
CREATE POLICY "User read own balance" ON balance_ledger FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service all balance" ON balance_ledger;
CREATE POLICY "Service all balance" ON balance_ledger FOR ALL USING (auth.role() = 'service_role');


-- ── WEBRTC SIGNALS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS webrtc_signals (
  id         bigserial PRIMARY KEY,
  room       text NOT NULL,
  from_peer  text NOT NULL,
  to_peer    text,
  type       text NOT NULL,
  payload    jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webrtc_signals_room_idx ON webrtc_signals(room, created_at DESC);

ALTER TABLE webrtc_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon insert signal" ON webrtc_signals;
CREATE POLICY "Anon insert signal" ON webrtc_signals FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anon read signal" ON webrtc_signals;
CREATE POLICY "Anon read signal" ON webrtc_signals FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service all signals" ON webrtc_signals;
CREATE POLICY "Service all signals" ON webrtc_signals FOR ALL USING (auth.role() = 'service_role');


-- ── SOCIAL PROFILES ──────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id),
  username   text UNIQUE,
  display_name text,
  avatar_emoji text DEFAULT '👤',
  bio        text DEFAULT '',
  is_owner   boolean DEFAULT false,
  is_vendor  boolean DEFAULT false,
  balance    float DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles readable by all" ON profiles;
CREATE POLICY "Profiles readable by all" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owner update own profile" ON profiles;
CREATE POLICY "Owner update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service all profiles" ON profiles;
CREATE POLICY "Service all profiles" ON profiles FOR ALL USING (auth.role() = 'service_role');

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name)
  VALUES (NEW.id, split_part(NEW.email, '@', 1), split_part(NEW.email, '@', 1))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
