-- ============================================================
-- RAYLANE EXPRESS v2 — COMPLETE DATABASE SCHEMA
-- Idempotent: drops everything and recreates clean.
-- Implements full audit per technical blueprint.
-- ============================================================

-- Drop everything (each table separately, children before parents)
DROP TABLE IF EXISTS audit_log   CASCADE;
DROP TABLE IF EXISTS alerts      CASCADE;
DROP TABLE IF EXISTS payouts     CASCADE;
DROP TABLE IF EXISTS payments    CASCADE;
DROP TABLE IF EXISTS bookings    CASCADE;
DROP TABLE IF EXISTS seats       CASCADE;
DROP TABLE IF EXISTS promotions  CASCADE;
DROP TABLE IF EXISTS parcels     CASCADE;
DROP TABLE IF EXISTS trips       CASCADE;
DROP TABLE IF EXISTS vehicles    CASCADE;
DROP TABLE IF EXISTS users       CASCADE;
DROP TABLE IF EXISTS operators   CASCADE;

DROP TYPE IF EXISTS operator_status, trip_status, booking_status, payment_status,
  parcel_status, promo_status, discount_type, alert_type, vehicle_type,
  user_role, payment_method, vehicle_status, booking_type CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── ENUMS ────────────────────────────────────────────────────────
CREATE TYPE operator_status AS ENUM ('PENDING','ACTIVE','SUSPENDED','REJECTED');
CREATE TYPE trip_status     AS ENUM ('PENDING','APPROVED','LIVE','CANCELLED','COMPLETED','REJECTED');
CREATE TYPE booking_status  AS ENUM ('PENDING_PAYMENT','CONFIRMED','BOARDED','CANCELLED','REFUNDED','NO_SHOW');
CREATE TYPE booking_type    AS ENUM ('FULL','ADVANCE');
CREATE TYPE payment_status  AS ENUM ('PENDING','HELD','PAID_OUT','REFUNDED','FAILED','DISPUTED');
CREATE TYPE payment_method  AS ENUM ('MTN_MOMO','AIRTEL_MOMO','CARD','CASH','BANK');
CREATE TYPE parcel_status   AS ENUM ('BOOKED','PICKUP_REQUESTED','PICKED_UP','VERIFIED','LOADED','IN_TRANSIT','ARRIVED','DELIVERED','FAILED','RETURNED');
CREATE TYPE promo_status    AS ENUM ('PENDING_APPROVAL','APPROVED','REJECTED','DISABLED','EXPIRED');
CREATE TYPE discount_type   AS ENUM ('PERCENTAGE','FIXED');
CREATE TYPE alert_type      AS ENUM ('APPROVAL','FINANCIAL','OPERATOR','BOOKING','PROMO','URGENT','SYSTEM','VEHICLE','PARCEL');
CREATE TYPE vehicle_type    AS ENUM ('COACH','MINI_BUS','TAXI','SHUTTLE','TRUCK','PICKUP');
CREATE TYPE vehicle_status  AS ENUM ('ACTIVE','MAINTENANCE','RETIRED','PENDING_INSPECTION');
CREATE TYPE user_role       AS ENUM ('admin','operator','staff','driver');

-- ── OPERATORS ────────────────────────────────────────────────────
CREATE TABLE operators (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  email               TEXT UNIQUE NOT NULL,
  phone               TEXT,
  status              operator_status DEFAULT 'PENDING',
  is_raylane_fleet    BOOLEAN DEFAULT false,   -- Raylane's own fleet
  managed_by_raylane  BOOLEAN DEFAULT false,
  merchant_code       TEXT DEFAULT '',
  commission_rate     NUMERIC(5,2) DEFAULT 8.00,
  balance             BIGINT DEFAULT 0,
  modules             TEXT[] DEFAULT ARRAY[]::TEXT[],
  services            TEXT[] DEFAULT ARRAY[]::TEXT[],
  address             TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── VEHICLES ─────────────────────────────────────────────────────
CREATE TABLE vehicles (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator_id         UUID REFERENCES operators(id) ON DELETE CASCADE,
  registration        TEXT NOT NULL UNIQUE,    -- e.g. UAA 123B
  make                TEXT,                    -- e.g. Toyota
  model               TEXT,                    -- e.g. Coaster
  year                INTEGER,
  vehicle_type        vehicle_type DEFAULT 'COACH',
  capacity            INTEGER DEFAULT 49,
  status              vehicle_status DEFAULT 'ACTIVE',
  current_mileage     INTEGER DEFAULT 0,
  last_service_date   DATE,
  next_service_date   DATE,
  insurance_expiry    DATE,
  fitness_expiry      DATE,
  notes               TEXT,
  -- Profitability tracking
  purchase_price      BIGINT DEFAULT 0,
  total_revenue       BIGINT DEFAULT 0,
  total_trips         INTEGER DEFAULT 0,
  maintenance_cost    BIGINT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── USERS ────────────────────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'operator',
  operator_id   UUID REFERENCES operators(id) ON DELETE SET NULL,
  phone         TEXT,
  is_active     BOOLEAN DEFAULT true,
  last_login    TIMESTAMPTZ,
  login_count   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── TRIPS ────────────────────────────────────────────────────────
CREATE TABLE trips (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator_id     UUID REFERENCES operators(id) ON DELETE CASCADE,
  vehicle_id      UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  from_city       TEXT NOT NULL,
  to_city         TEXT NOT NULL,
  departure_time  TIMESTAMPTZ NOT NULL,
  arrival_time    TIMESTAMPTZ,
  price           BIGINT NOT NULL,
  advance_price   BIGINT,                 -- 20% of price if advance booking
  duration        TEXT,
  vehicle         TEXT,                   -- registration (denormalised for speed)
  vehicle_type    vehicle_type DEFAULT 'COACH',
  total_seats     INTEGER DEFAULT 49,
  booked_seats    INTEGER DEFAULT 0,
  status          trip_status DEFAULT 'PENDING',
  amenities       TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes           TEXT,
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── SEATS ────────────────────────────────────────────────────────
CREATE TABLE seats (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id       UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  seat_number   INTEGER NOT NULL,
  status        TEXT DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','LOCKED','BOOKED','OFFLINE')),
  locked_by     TEXT,                  -- session ID
  locked_until  TIMESTAMPTZ,
  booking_id    UUID,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, seat_number)          -- prevents double booking at DB level
);

-- ── BOOKINGS ─────────────────────────────────────────────────────
CREATE TABLE bookings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id           UUID NOT NULL REFERENCES trips(id),
  seat_number       INTEGER NOT NULL,
  passenger_name    TEXT NOT NULL,
  passenger_phone   TEXT NOT NULL,
  passenger_id_num  TEXT,               -- National ID (optional)
  session_id        TEXT,
  booking_type      booking_type DEFAULT 'FULL',
  status            booking_status DEFAULT 'PENDING_PAYMENT',
  amount_total      BIGINT NOT NULL,    -- full trip price
  amount_paid       BIGINT NOT NULL,    -- what was actually paid
  balance_due       BIGINT DEFAULT 0,
  payment_method    payment_method,
  payment_ref       TEXT,               -- MoMo/card transaction reference
  payment_verified  BOOLEAN DEFAULT false,
  ticket_code       TEXT UNIQUE NOT NULL,
  promo_id          UUID,
  promo_discount    BIGINT DEFAULT 0,
  boarded           BOOLEAN DEFAULT false,
  boarded_at        TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, seat_number)          -- DB-level double booking prevention
);

-- ── PAYMENTS ─────────────────────────────────────────────────────
CREATE TABLE payments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id        UUID REFERENCES bookings(id),
  parcel_id         UUID,
  trip_id           UUID REFERENCES trips(id),
  operator_id       UUID REFERENCES operators(id),
  amount            BIGINT NOT NULL,
  commission        BIGINT NOT NULL DEFAULT 0,
  operator_net      BIGINT NOT NULL DEFAULT 0,
  status            payment_status DEFAULT 'HELD',
  method            payment_method,
  reference         TEXT,             -- payment provider reference
  verified          BOOLEAN DEFAULT false,
  idempotency_key   TEXT UNIQUE,      -- prevents duplicate payments
  payout_id         UUID,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── PAYOUTS ──────────────────────────────────────────────────────
CREATE TABLE payouts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id         UUID REFERENCES trips(id),
  operator_id     UUID REFERENCES operators(id),
  merchant_code   TEXT NOT NULL,
  amount          BIGINT NOT NULL,
  commission      BIGINT NOT NULL,
  status          TEXT DEFAULT 'RELEASED' CHECK (status IN ('RELEASED','FAILED','PENDING')),
  payout_lock     BOOLEAN DEFAULT false,  -- prevents double payout
  reference       TEXT,
  released_by     UUID REFERENCES users(id),
  released_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── PARCELS ──────────────────────────────────────────────────────
CREATE TABLE parcels (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcel_ref        TEXT UNIQUE NOT NULL,   -- PCL-YYYYMMDD-XXXX
  sender_name       TEXT,
  sender_phone      TEXT NOT NULL,
  recipient_name    TEXT,
  recipient_phone   TEXT NOT NULL,
  destination       TEXT NOT NULL,
  description       TEXT NOT NULL,
  parcel_type       TEXT DEFAULT 'SMALL',   -- ENVELOPE/SMALL/LARGE/HEAVY
  weight            NUMERIC(8,2) DEFAULT 0,
  declared_value    BIGINT DEFAULT 0,
  status            parcel_status DEFAULT 'BOOKED',
  parcel_fee        BIGINT NOT NULL DEFAULT 0,
  rider_fee         BIGINT DEFAULT 0,
  insurance_fee     BIGINT DEFAULT 0,       -- 3% of declared_value
  total_fee         BIGINT NOT NULL DEFAULT 0,
  insured           BOOLEAN DEFAULT false,
  pickup_rider      BOOLEAN DEFAULT false,
  require_id        BOOLEAN DEFAULT false,
  receiver_id_num   TEXT,
  tracking_code     TEXT UNIQUE NOT NULL,
  trip_id           UUID REFERENCES trips(id),
  operator_id       UUID REFERENCES operators(id),
  delivery_pin      TEXT,                   -- 4-digit PIN for delivery confirmation
  delivered_at      TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── PROMOTIONS ───────────────────────────────────────────────────
CREATE TABLE promotions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator_id     UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  promo_name      TEXT,
  route_from      TEXT,
  route_to        TEXT,
  trip_id         UUID REFERENCES trips(id),
  discount_type   discount_type NOT NULL,
  discount_value  NUMERIC(10,2) NOT NULL,
  max_discount    BIGINT,
  min_price       BIGINT,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  conditions      TEXT,
  status          promo_status DEFAULT 'PENDING_APPROVAL',
  rejection_note  TEXT,
  admin_notes     TEXT,
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  uses_count      INTEGER DEFAULT 0,
  max_uses        INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── ALERTS ───────────────────────────────────────────────────────
CREATE TABLE alerts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type        alert_type NOT NULL,
  message     TEXT NOT NULL,
  entity_id   UUID,
  entity_type TEXT,
  operator_id UUID REFERENCES operators(id),  -- null = system/admin alert
  priority    TEXT DEFAULT 'NORMAL' CHECK (priority IN ('LOW','NORMAL','HIGH','CRITICAL')),
  read        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── AUDIT LOG ────────────────────────────────────────────────────
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID REFERENCES users(id),
  actor_email TEXT,
  actor_role  TEXT,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  metadata    JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES ──────────────────────────────────────────────────────
CREATE INDEX ON trips(status);
CREATE INDEX ON trips(operator_id);
CREATE INDEX ON trips(from_city, to_city);
CREATE INDEX ON trips(departure_time);
CREATE INDEX ON trips(vehicle_id);
CREATE INDEX ON bookings(trip_id);
CREATE INDEX ON bookings(ticket_code);
CREATE INDEX ON bookings(passenger_phone);
CREATE INDEX ON seats(trip_id);
CREATE INDEX ON seats(status);
CREATE INDEX ON payments(trip_id);
CREATE INDEX ON payments(operator_id);
CREATE INDEX ON payments(idempotency_key);
CREATE INDEX ON parcels(tracking_code);
CREATE INDEX ON parcels(parcel_ref);
CREATE INDEX ON promotions(status);
CREATE INDEX ON alerts(read, operator_id);
CREATE INDEX ON audit_log(actor_id, created_at);
CREATE INDEX ON audit_log(entity_type, entity_id);
CREATE INDEX ON vehicles(operator_id);
CREATE INDEX ON vehicles(registration);
CREATE INDEX ON vehicles(status);

-- ── AUTO-UPDATE updated_at ────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['operators','users','trips','seats','bookings','payments','parcels','promotions','vehicles'] LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t, t);
  END LOOP;
END $$;

-- ── RLS ──────────────────────────────────────────────────────────
DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['operators','users','trips','seats','bookings','payments','payouts','parcels','promotions','alerts','audit_log','vehicles'] LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY svc_all ON %s FOR ALL TO service_role USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

CREATE POLICY anon_read_live ON trips FOR SELECT TO anon USING (status IN ('LIVE','APPROVED'));

-- ── PASSWORD VERIFICATION RPC ─────────────────────────────────────
CREATE OR REPLACE FUNCTION verify_password(input_password TEXT, stored_hash TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT stored_hash = crypt(input_password, stored_hash);
$$;
GRANT EXECUTE ON FUNCTION verify_password TO service_role;

-- ── AUDIT LOG INSERT FUNCTION ─────────────────────────────────────
CREATE OR REPLACE FUNCTION log_action(
  p_actor_id UUID, p_actor_email TEXT, p_actor_role TEXT,
  p_action TEXT, p_entity_type TEXT, p_entity_id UUID,
  p_old_data JSONB DEFAULT NULL, p_new_data JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO audit_log(actor_id, actor_email, actor_role, action, entity_type, entity_id, old_data, new_data, metadata)
  VALUES(p_actor_id, p_actor_email, p_actor_role, p_action, p_entity_type, p_entity_id, p_old_data, p_new_data, p_metadata);
END;
$$;
GRANT EXECUTE ON FUNCTION log_action TO service_role;

-- ── VEHICLE PROFITABILITY VIEW ────────────────────────────────────
CREATE OR REPLACE VIEW vehicle_profitability AS
SELECT
  v.id, v.registration, v.make, v.model, v.year, v.vehicle_type,
  v.capacity, v.status, v.current_mileage, v.purchase_price,
  v.last_service_date, v.next_service_date, v.insurance_expiry, v.fitness_expiry,
  o.name AS operator_name, o.is_raylane_fleet,
  COUNT(DISTINCT t.id)                    AS total_trips,
  COALESCE(SUM(p.amount), 0)              AS total_revenue,
  v.maintenance_cost,
  COALESCE(SUM(p.amount), 0) - v.maintenance_cost - v.purchase_price AS net_profit,
  CASE WHEN v.purchase_price > 0
    THEN ROUND((COALESCE(SUM(p.amount), 0) - v.maintenance_cost - v.purchase_price)::NUMERIC / v.purchase_price * 100, 2)
    ELSE 0
  END AS roi_percent,
  -- Alerts
  CASE WHEN v.next_service_date <= CURRENT_DATE + 7  THEN true ELSE false END AS service_due_soon,
  CASE WHEN v.insurance_expiry  <= CURRENT_DATE + 14 THEN true ELSE false END AS insurance_expiring,
  CASE WHEN v.fitness_expiry    <= CURRENT_DATE + 14 THEN true ELSE false END AS fitness_expiring
FROM vehicles v
LEFT JOIN operators o ON v.operator_id = o.id
LEFT JOIN trips t ON t.vehicle_id = v.id AND t.status IN ('LIVE','COMPLETED')
LEFT JOIN payments p ON p.trip_id = t.id AND p.status IN ('HELD','PAID_OUT')
GROUP BY v.id, o.name, o.is_raylane_fleet;

-- ── TRIP SEARCH VIEW WITH PROMOS ─────────────────────────────────
CREATE OR REPLACE VIEW trip_search_view AS
SELECT
  t.id, t.operator_id, t.vehicle_id, t.from_city, t.to_city,
  t.departure_time, t.arrival_time, t.price, t.duration,
  t.vehicle, t.vehicle_type, t.total_seats, t.booked_seats,
  t.status, t.amenities, t.notes, t.created_at, t.updated_at,
  o.name                AS operator_name,
  o.is_raylane_fleet,
  o.merchant_code,
  v.registration        AS vehicle_registration,
  v.make                AS vehicle_make,
  v.model               AS vehicle_model,
  (t.total_seats - t.booked_seats) AS available_seats,
  p.id                  AS promo_id,
  p.promo_name,
  p.discount_type,
  p.discount_value,
  p.conditions          AS promo_conditions,
  CASE
    WHEN p.id IS NOT NULL AND p.status='APPROVED'
      AND p.start_date <= CURRENT_DATE AND p.end_date >= CURRENT_DATE
    THEN CASE
      WHEN p.discount_type='PERCENTAGE'
        THEN t.price - ROUND(t.price * p.discount_value / 100)
      ELSE GREATEST(0, t.price - p.discount_value::BIGINT)
    END
    ELSE t.price
  END AS effective_price,
  CASE
    WHEN p.id IS NOT NULL AND p.status='APPROVED'
      AND p.start_date <= CURRENT_DATE AND p.end_date >= CURRENT_DATE
    THEN t.price ELSE NULL
  END AS promo_original_price
FROM trips t
LEFT JOIN operators o  ON t.operator_id = o.id
LEFT JOIN vehicles v   ON t.vehicle_id  = v.id
LEFT JOIN promotions p ON (
  p.operator_id = t.operator_id
  AND p.route_from = t.from_city AND p.route_to = t.to_city
  AND p.status = 'APPROVED'
  AND p.start_date <= CURRENT_DATE AND p.end_date >= CURRENT_DATE
)
WHERE t.status IN ('LIVE','APPROVED');

-- ── ADMIN STATS VIEW ─────────────────────────────────────────────
CREATE OR REPLACE VIEW admin_stats_view AS
SELECT
  (SELECT COUNT(*) FROM operators)                                            AS total_operators,
  (SELECT COUNT(*) FROM operators WHERE status='ACTIVE')                      AS active_operators,
  (SELECT COUNT(*) FROM operators WHERE status='PENDING')                     AS pending_operators,
  (SELECT COUNT(*) FROM trips WHERE status='LIVE')                            AS live_trips,
  (SELECT COUNT(*) FROM trips WHERE status='PENDING')                         AS pending_trips,
  (SELECT COUNT(*) FROM bookings)                                             AS total_bookings,
  (SELECT COUNT(*) FROM bookings WHERE status='CONFIRMED')                    AS confirmed_bookings,
  (SELECT COUNT(*) FROM bookings WHERE DATE(created_at)=CURRENT_DATE)        AS bookings_today,
  (SELECT COALESCE(SUM(amount_paid),0) FROM bookings WHERE status='CONFIRMED') AS total_revenue,
  (SELECT COALESCE(SUM(commission),0) FROM payments)                          AS total_commission,
  (SELECT COALESCE(SUM(operator_net),0) FROM payments WHERE status='HELD')    AS held_balance,
  (SELECT COUNT(*) FROM alerts WHERE read=false)                              AS unread_alerts,
  (SELECT COUNT(*) FROM promotions WHERE status='PENDING_APPROVAL')           AS pending_promos,
  (SELECT COUNT(*) FROM vehicles WHERE status='ACTIVE')                       AS active_vehicles,
  (SELECT COUNT(*) FROM vehicles WHERE status='MAINTENANCE')                  AS vehicles_in_maintenance,
  (SELECT COUNT(*) FROM vehicles WHERE next_service_date <= CURRENT_DATE+7)   AS service_due_count,
  (SELECT COUNT(*) FROM parcels WHERE status NOT IN ('DELIVERED','FAILED','RETURNED')) AS active_parcels,
  (SELECT COUNT(*) FROM operators WHERE is_raylane_fleet=true)                AS raylane_fleet_count;

SELECT 'Schema v2 created ✅' AS result;
