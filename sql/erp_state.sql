CREATE TABLE IF NOT EXISTS erp_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
