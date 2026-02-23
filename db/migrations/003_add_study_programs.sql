CREATE TABLE study_programs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_study_programs_sort_order ON study_programs(sort_order);

CREATE TRIGGER set_study_programs_updated_at
BEFORE UPDATE ON study_programs
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();

INSERT INTO study_programs (id, name, sort_order) VALUES
  ('a66ca977-e6d6-4546-a4e6-c06c8f47f4ea', 'Bachelor of Computer Science', 1),
  ('e5601364-0e0b-4a7b-8e4d-0d3043b96df0', 'Bachelor of Information Technology', 2),
  ('4ef9e8e4-4d2c-4264-be2f-b76f6d8fd131', 'Bachelor of Software Engineering', 3),
  ('abf1f4e9-9f2f-42b0-9162-6f354f08de8a', 'Bachelor of Business Administration', 4),
  ('2e65e949-602a-4e07-9506-a1642fab8be0', 'Bachelor of Engineering (Electrical)', 5),
  ('fb68dbcf-79ef-41e9-aade-a7c266677ca0', 'Bachelor of Creative Multimedia', 6)
ON CONFLICT (name) DO NOTHING;
