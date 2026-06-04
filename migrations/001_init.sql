CREATE TABLE IF NOT EXISTS admin_users (
  id varchar(36) PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  name varchar(180) NOT NULL,
  email varchar(180) NOT NULL UNIQUE,
  password_hash varchar(120) NOT NULL,
  role varchar(40) NOT NULL DEFAULT 'owner',
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS admin_session_records (
  id varchar(36) PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  admin_user_id varchar(36) NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash varchar(96) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);

CREATE TABLE IF NOT EXISTS services (
  id varchar(36) PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  name_th varchar(180) NOT NULL,
  name_en varchar(180) NOT NULL,
  description_th varchar(600),
  duration_minutes integer NOT NULL,
  price_cents bigint NOT NULL DEFAULT 0,
  accent_color varchar(24) NOT NULL DEFAULT '#0F766E',
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS staff (
  id varchar(36) PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  display_name varchar(180) NOT NULL,
  role varchar(120) NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS bookings (
  id varchar(36) PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  booking_code varchar(32) NOT NULL UNIQUE,
  service_id varchar(36) NOT NULL REFERENCES services(id),
  customer_name varchar(180) NOT NULL,
  phone varchar(40) NOT NULL,
  line_user_id varchar(128),
  notes varchar(1000),
  booking_date varchar(10) NOT NULL,
  slot_time varchar(5) NOT NULL,
  status varchar(32) NOT NULL
);

CREATE TABLE IF NOT EXISTS booking_settings (
  id varchar(36) PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  open_time varchar(5) NOT NULL DEFAULT '09:00',
  close_time varchar(5) NOT NULL DEFAULT '17:00',
  slot_interval_minutes integer NOT NULL DEFAULT 30,
  slot_capacity integer NOT NULL DEFAULT 1,
  closed_weekdays varchar(32) NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS notifications (
  id varchar(36) PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  type varchar(80) NOT NULL,
  title varchar(180) NOT NULL,
  body varchar(600) NOT NULL,
  url varchar(240) NOT NULL DEFAULT '/',
  is_read boolean NOT NULL DEFAULT false,
  booking_id varchar(36)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id varchar(36) PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  endpoint varchar(900) NOT NULL UNIQUE,
  p256dh varchar(255) NOT NULL,
  auth varchar(255) NOT NULL,
  user_agent varchar(255),
  admin_profile_id varchar(120)
);

CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(service_id, booking_date, slot_time);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(is_read, created_at);
