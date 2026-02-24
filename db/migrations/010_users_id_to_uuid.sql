-- Convert users.id from TEXT to UUID, along with all foreign key columns that reference it.

-- 1. Drop FK constraints on dependent columns
ALTER TABLE student_profiles DROP CONSTRAINT IF EXISTS student_profiles_user_id_fkey;
ALTER TABLE scholarships DROP CONSTRAINT IF EXISTS scholarships_created_by_fkey;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_student_user_id_fkey;
ALTER TABLE application_status_history DROP CONSTRAINT IF EXISTS application_status_history_changed_by_user_id_fkey;
ALTER TABLE password_reset_tokens DROP CONSTRAINT IF EXISTS password_reset_tokens_user_id_fkey;

-- 2. Convert users.id to UUID
ALTER TABLE users ALTER COLUMN id TYPE UUID USING id::uuid;

-- 3. Convert all FK columns to UUID
ALTER TABLE student_profiles ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE scholarships ALTER COLUMN created_by TYPE UUID USING created_by::uuid;
ALTER TABLE applications ALTER COLUMN student_user_id TYPE UUID USING student_user_id::uuid;
ALTER TABLE application_status_history ALTER COLUMN changed_by_user_id TYPE UUID USING changed_by_user_id::uuid;
ALTER TABLE password_reset_tokens ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

-- 4. Re-add FK constraints
ALTER TABLE student_profiles ADD CONSTRAINT student_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE scholarships ADD CONSTRAINT scholarships_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE applications ADD CONSTRAINT applications_student_user_id_fkey FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE application_status_history ADD CONSTRAINT application_status_history_changed_by_user_id_fkey FOREIGN KEY (changed_by_user_id) REFERENCES users(id);
ALTER TABLE password_reset_tokens ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
