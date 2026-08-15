CREATE TABLE IF NOT EXISTS sponsors (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  contact_email VARCHAR(255) NOT NULL UNIQUE,
  logo_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS prize_pools (
  id CHAR(36) PRIMARY KEY,
  tournament_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  target_amount DECIMAL(14,2),
  funded_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  status ENUM('draft', 'funding', 'locked', 'distributed') NOT NULL DEFAULT 'funding',
  created_by CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_prize_pools_tournament (tournament_id)
) ENGINE=InnoDB;

ALTER TABLE prize_pools MODIFY COLUMN status ENUM('draft', 'funding', 'locked', 'distributed', 'cancelled') NOT NULL DEFAULT 'funding';

CREATE TABLE IF NOT EXISTS contributions (
  id CHAR(36) PRIMARY KEY,
  prize_pool_id CHAR(36) NOT NULL,
  sponsor_id CHAR(36) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  provider ENUM('stripe', 'binance_pay') NOT NULL,
  provider_reference VARCHAR(255) NOT NULL UNIQUE,
  status ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  metadata JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_contribution_amount CHECK (amount > 0),
  CONSTRAINT fk_contribution_pool FOREIGN KEY (prize_pool_id) REFERENCES prize_pools(id),
  CONSTRAINT fk_contribution_sponsor FOREIGN KEY (sponsor_id) REFERENCES sponsors(id),
  INDEX idx_contributions_pool (prize_pool_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS distribution_rules (
  id CHAR(36) PRIMARY KEY,
  prize_pool_id CHAR(36) NOT NULL,
  position INT NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  CONSTRAINT chk_distribution_position CHECK (position > 0),
  CONSTRAINT chk_distribution_percentage CHECK (percentage > 0 AND percentage <= 100),
  CONSTRAINT chk_distribution_amount CHECK (amount >= 0),
  CONSTRAINT fk_distribution_pool FOREIGN KEY (prize_pool_id) REFERENCES prize_pools(id) ON DELETE CASCADE,
  UNIQUE KEY uq_distribution_position (prize_pool_id, position)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payouts (
  id CHAR(36) PRIMARY KEY,
  prize_pool_id CHAR(36) NOT NULL,
  recipient_id CHAR(36) NOT NULL,
  position INT NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  status ENUM('pending', 'released', 'failed') NOT NULL DEFAULT 'released',
  receipt_code VARCHAR(40) NOT NULL UNIQUE,
  released_by CHAR(36) NOT NULL,
  released_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_payout_amount CHECK (amount > 0),
  CONSTRAINT fk_payout_pool FOREIGN KEY (prize_pool_id) REFERENCES prize_pools(id),
  UNIQUE KEY uq_payout_position (prize_pool_id, position),
  INDEX idx_payouts_recipient (recipient_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payment_events (
  id CHAR(36) PRIMARY KEY,
  contribution_id CHAR(36) NOT NULL,
  event_type ENUM('created', 'approved', 'failed', 'refunded') NOT NULL,
  previous_status ENUM('pending', 'paid', 'failed', 'refunded'),
  new_status ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL,
  performed_by CHAR(36) NOT NULL,
  notes VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payment_event_contribution FOREIGN KEY (contribution_id) REFERENCES contributions(id),
  INDEX idx_payment_events_contribution (contribution_id),
  INDEX idx_payment_events_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payment_idempotency (
  idempotency_key VARCHAR(100) PRIMARY KEY,
  contribution_id CHAR(36) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_idempotency_contribution FOREIGN KEY (contribution_id) REFERENCES contributions(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reward_items (
  id CHAR(36) PRIMARY KEY,
  sponsor_id CHAR(36),
  prize_pool_id CHAR(36),
  reward_type ENUM('physical', 'game_code', 'gift_card', 'coupon') NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500),
  quantity INT NOT NULL DEFAULT 1,
  milestone VARCHAR(120),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_reward_quantity CHECK (quantity > 0),
  CONSTRAINT fk_reward_sponsor FOREIGN KEY (sponsor_id) REFERENCES sponsors(id),
  CONSTRAINT fk_reward_pool FOREIGN KEY (prize_pool_id) REFERENCES prize_pools(id),
  INDEX idx_rewards_pool (prize_pool_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reward_assignments (
  id CHAR(36) PRIMARY KEY,
  reward_item_id CHAR(36) NOT NULL,
  recipient_id CHAR(36) NOT NULL,
  redemption_code VARCHAR(100),
  status ENUM('assigned', 'redeemed', 'delivered', 'cancelled') NOT NULL DEFAULT 'assigned',
  assigned_by CHAR(36) NOT NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  CONSTRAINT fk_assignment_reward FOREIGN KEY (reward_item_id) REFERENCES reward_items(id),
  UNIQUE KEY uq_reward_code (redemption_code),
  INDEX idx_assignments_recipient (recipient_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tournament_result_imports (
  id CHAR(36) PRIMARY KEY,
  prize_pool_id CHAR(36) NOT NULL UNIQUE,
  tournament_id CHAR(36) NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'api',
  received_by CHAR(36) NOT NULL,
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_result_import_pool FOREIGN KEY (prize_pool_id) REFERENCES prize_pools(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tournament_winners (
  id CHAR(36) PRIMARY KEY,
  result_import_id CHAR(36) NOT NULL,
  recipient_id CHAR(36) NOT NULL,
  recipient_type ENUM('team', 'player') NOT NULL,
  position INT NOT NULL,
  CONSTRAINT chk_winner_position CHECK (position > 0),
  CONSTRAINT fk_winner_import FOREIGN KEY (result_import_id) REFERENCES tournament_result_imports(id),
  UNIQUE KEY uq_import_position (result_import_id, position),
  INDEX idx_winner_recipient (recipient_id)
) ENGINE=InnoDB;
