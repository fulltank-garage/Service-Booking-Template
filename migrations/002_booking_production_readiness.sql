ALTER TABLE booking_settings
  ADD COLUMN IF NOT EXISTS buffer_minutes integer NOT NULL DEFAULT 0;
