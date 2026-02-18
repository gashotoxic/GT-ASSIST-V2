CREATE TABLE IF NOT EXISTS paystack_event_ledger (
  paystack_event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  reference TEXT,
  user_id TEXT,
  amount_kes NUMERIC,
  payload JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paystack_event_ledger_user_id_created_at
  ON paystack_event_ledger(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_paystack_event_ledger_reference
  ON paystack_event_ledger(reference);
