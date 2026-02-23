CREATE TYPE user_role AS ENUM ('student', 'admin');
CREATE TYPE application_status AS ENUM ('draft', 'submitted', 'under_review', 'shortlisted', 'rejected', 'awarded');
CREATE TYPE document_type AS ENUM ('transcript', 'id_document', 'essay');
CREATE TYPE email_notification_status AS ENUM ('queued', 'sent', 'failed');

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE student_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  date_of_birth TEXT,
  institution TEXT NOT NULL,
  program TEXT NOT NULL,
  graduation_year INT NOT NULL,
  gpa NUMERIC(3,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE scholarships (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  education_level TEXT NOT NULL,
  eligibility_text TEXT NOT NULL,
  deadline_at TIMESTAMPTZ NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE applications (
  id TEXT PRIMARY KEY,
  scholarship_id TEXT NOT NULL REFERENCES scholarships(id) ON DELETE CASCADE,
  student_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status application_status NOT NULL,
  submitted_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  reopened_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_application_per_student_per_scholarship UNIQUE (scholarship_id, student_user_id)
);

CREATE TABLE application_form_data (
  application_id TEXT PRIMARY KEY REFERENCES applications(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE application_documents (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  doc_type document_type NOT NULL,
  s3_key TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_doc_type_per_application UNIQUE (application_id, doc_type)
);

CREATE TABLE application_status_history (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_status application_status,
  to_status application_status NOT NULL,
  changed_by_user_id TEXT NOT NULL REFERENCES users(id),
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE email_notifications (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  template_key TEXT NOT NULL,
  status email_notification_status NOT NULL,
  provider_message_id TEXT,
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scholarships_deadline ON scholarships(deadline_at);
CREATE INDEX idx_scholarships_is_published ON scholarships(is_published);
CREATE INDEX idx_applications_student ON applications(student_user_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_application_documents_application ON application_documents(application_id);
CREATE INDEX idx_status_history_application ON application_status_history(application_id);
CREATE INDEX idx_email_notifications_status ON email_notifications(status);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER set_student_profiles_updated_at BEFORE UPDATE ON student_profiles FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER set_scholarships_updated_at BEFORE UPDATE ON scholarships FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER set_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER set_application_form_data_updated_at BEFORE UPDATE ON application_form_data FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER set_email_notifications_updated_at BEFORE UPDATE ON email_notifications FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
