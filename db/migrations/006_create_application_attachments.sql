CREATE TABLE application_attachments (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  slot_key TEXT NOT NULL,
  s3_key TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_slot_per_application UNIQUE (application_id, slot_key)
);

CREATE INDEX idx_application_attachments_application ON application_attachments(application_id);
CREATE INDEX idx_application_attachments_slot ON application_attachments(slot_key);
