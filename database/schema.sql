CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE payment_provider AS ENUM ('stripe', 'binance_pay');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE pool_status AS ENUM ('draft', 'funding', 'locked', 'distributed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE payout_status AS ENUM ('pending', 'released', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  contact_email VARCHAR(255) NOT NULL UNIQUE,
  logo_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prize_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL,
  name VARCHAR(120) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  target_amount NUMERIC(14,2),
  funded_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status pool_status NOT NULL DEFAULT 'funding',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prize_pool_id UUID NOT NULL REFERENCES prize_pools(id),
  sponsor_id UUID NOT NULL REFERENCES sponsors(id),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(10) NOT NULL,
  provider payment_provider NOT NULL,
  provider_reference TEXT NOT NULL UNIQUE,
  status payment_status NOT NULL DEFAULT 'pending',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS distribution_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prize_pool_id UUID NOT NULL REFERENCES prize_pools(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position > 0),
  percentage NUMERIC(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  UNIQUE (prize_pool_id, position)
);

CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prize_pool_id UUID NOT NULL REFERENCES prize_pools(id),
  recipient_id UUID NOT NULL,
  position INTEGER NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(10) NOT NULL,
  destination TEXT NOT NULL,
  status payout_status NOT NULL DEFAULT 'released',
  receipt_code VARCHAR(40) NOT NULL UNIQUE,
  released_by UUID NOT NULL,
  released_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (prize_pool_id, position)
);

CREATE INDEX IF NOT EXISTS idx_prize_pools_tournament ON prize_pools(tournament_id);
CREATE INDEX IF NOT EXISTS idx_contributions_pool ON contributions(prize_pool_id);
CREATE INDEX IF NOT EXISTS idx_payouts_recipient ON payouts(recipient_id);
