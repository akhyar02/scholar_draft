-- Convert all remaining TEXT id/FK columns to UUID across all tables.
-- (users.id and its FKs were already converted in 010.)

-- ===================================================================
-- 1. scholarships.id  (PK)  +  applications.scholarship_id  (FK)
-- ===================================================================
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_scholarship_id_fkey;

ALTER TABLE scholarships ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE applications ALTER COLUMN scholarship_id TYPE UUID USING scholarship_id::uuid;

ALTER TABLE applications ADD CONSTRAINT applications_scholarship_id_fkey
  FOREIGN KEY (scholarship_id) REFERENCES scholarships(id) ON DELETE CASCADE;

-- ===================================================================
-- 2. applications.id  (PK)  +  all its FK dependents
-- ===================================================================
ALTER TABLE application_form_data DROP CONSTRAINT IF EXISTS application_form_data_application_id_fkey;
ALTER TABLE application_documents DROP CONSTRAINT IF EXISTS application_documents_application_id_fkey;
ALTER TABLE application_status_history DROP CONSTRAINT IF EXISTS application_status_history_application_id_fkey;
ALTER TABLE email_notifications DROP CONSTRAINT IF EXISTS email_notifications_application_id_fkey;
ALTER TABLE application_attachments DROP CONSTRAINT IF EXISTS application_attachments_application_id_fkey;

ALTER TABLE applications ALTER COLUMN id TYPE UUID USING id::uuid;

ALTER TABLE application_form_data ALTER COLUMN application_id TYPE UUID USING application_id::uuid;
ALTER TABLE application_documents ALTER COLUMN application_id TYPE UUID USING application_id::uuid;
ALTER TABLE application_status_history ALTER COLUMN application_id TYPE UUID USING application_id::uuid;
ALTER TABLE email_notifications ALTER COLUMN application_id TYPE UUID USING application_id::uuid;
ALTER TABLE application_attachments ALTER COLUMN application_id TYPE UUID USING application_id::uuid;

ALTER TABLE application_form_data ADD CONSTRAINT application_form_data_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;
ALTER TABLE application_documents ADD CONSTRAINT application_documents_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;
ALTER TABLE application_status_history ADD CONSTRAINT application_status_history_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;
ALTER TABLE email_notifications ADD CONSTRAINT email_notifications_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;
ALTER TABLE application_attachments ADD CONSTRAINT application_attachments_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;

-- ===================================================================
-- 3. Standalone PK columns (no FKs reference them)
-- ===================================================================
ALTER TABLE application_documents ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE application_status_history ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE email_notifications ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE application_attachments ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE study_programs ALTER COLUMN id TYPE UUID USING id::uuid;

-- ===================================================================
-- 4. application_option_items.id  (PK)  +  self-referencing parent_id
-- ===================================================================
ALTER TABLE application_option_items DROP CONSTRAINT IF EXISTS application_option_items_parent_id_fkey;

ALTER TABLE application_option_items ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE application_option_items ALTER COLUMN parent_id TYPE UUID USING parent_id::uuid;

ALTER TABLE application_option_items ADD CONSTRAINT application_option_items_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES application_option_items(id) ON DELETE CASCADE;
