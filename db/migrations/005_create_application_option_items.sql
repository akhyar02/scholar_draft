CREATE TYPE application_option_kind AS ENUM ('campus', 'faculty', 'course', 'support_provider');

CREATE TABLE application_option_items (
  id TEXT PRIMARY KEY,
  kind application_option_kind NOT NULL,
  label TEXT NOT NULL,
  parent_id TEXT REFERENCES application_option_items(id) ON DELETE CASCADE,
  sort_order INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_application_option_items_kind ON application_option_items(kind);
CREATE INDEX idx_application_option_items_parent ON application_option_items(parent_id);
CREATE INDEX idx_application_option_items_sort ON application_option_items(sort_order);

CREATE TRIGGER set_application_option_items_updated_at
BEFORE UPDATE ON application_option_items
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();
