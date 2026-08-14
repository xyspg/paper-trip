-- Per-trip settlement currency for the multi-currency ledger (ISO 4217).
-- Existing trips keep USD, the unit the app historically hardcoded.
ALTER TABLE trips ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';
