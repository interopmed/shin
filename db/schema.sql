CREATE TABLE IF NOT EXISTS patient (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(100) DEFAULT '',
  address VARCHAR(100) DEFAULT '',
  email VARCHAR(254),
  sex VARCHAR(100) DEFAULT '',
  birthdate VARCHAR(100) DEFAULT '',
  ebirthdate VARCHAR(20) DEFAULT '',
  age VARCHAR(100) DEFAULT '',
  bloodgroup VARCHAR(100) DEFAULT '',
  assigned_doctor_id BIGINT REFERENCES doctor(id) ON DELETE SET NULL,
  doctor VARCHAR(100) DEFAULT '',
  user_id VARCHAR(100) DEFAULT '',
  patient_id VARCHAR(100) DEFAULT '',
  img_url VARCHAR(100) DEFAULT '',
  note VARCHAR(250) DEFAULT '',
  moa VARCHAR(100) DEFAULT '',
  editted_time VARCHAR(100) DEFAULT '',
  date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patient_name_idx ON patient (name);
CREATE INDEX IF NOT EXISTS patient_patient_id_idx ON patient (patient_id);
CREATE INDEX IF NOT EXISTS patient_assigned_doctor_id_idx ON patient (assigned_doctor_id);
CREATE INDEX IF NOT EXISTS patient_updated_at_idx ON patient (updated_at DESC);

CREATE TABLE IF NOT EXISTS patient_consent_preferences (
  id BIGSERIAL PRIMARY KEY,
  patient_id BIGINT NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  group_name TEXT NOT NULL,
  grant_access BOOLEAN NOT NULL DEFAULT true,
  limit_access TEXT NOT NULL DEFAULT 'Restrictive',
  details TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (patient_id, category, group_name)
);

CREATE INDEX IF NOT EXISTS patient_consent_preferences_patient_id_idx
  ON patient_consent_preferences (patient_id);

CREATE TABLE IF NOT EXISTS identity_role (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  scope VARCHAR(80) NOT NULL DEFAULT 'system',
  description TEXT NOT NULL DEFAULT '',
  is_system BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS identity_group (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_system BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS identity_permission (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(120) NOT NULL UNIQUE,
  module VARCHAR(80) NOT NULL DEFAULT 'core',
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS identity_role_permission (
  id BIGSERIAL PRIMARY KEY,
  role_id BIGINT NOT NULL REFERENCES identity_role(id) ON DELETE CASCADE,
  permission_id BIGINT NOT NULL REFERENCES identity_permission(id) ON DELETE CASCADE,
  UNIQUE (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS provider_organization (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  provider_kind VARCHAR(40) NOT NULL DEFAULT 'external',
  organization_type VARCHAR(40) NOT NULL DEFAULT 'other',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_person (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  organization_id BIGINT NOT NULL REFERENCES provider_organization(id) ON DELETE CASCADE,
  full_name VARCHAR(160) NOT NULL,
  specialty VARCHAR(120) NOT NULL DEFAULT '',
  provider_category VARCHAR(40) NOT NULL DEFAULT 'doctor',
  registration_no VARCHAR(80) NOT NULL DEFAULT '',
  is_external BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS identity_user (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(120) NOT NULL UNIQUE,
  display_name VARCHAR(160) NOT NULL,
  email VARCHAR(254) NOT NULL DEFAULT '',
  title VARCHAR(160) NOT NULL DEFAULT '',
  status VARCHAR(40) NOT NULL DEFAULT 'Active',
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  is_external BOOLEAN NOT NULL DEFAULT false,
  provider_person_id BIGINT REFERENCES provider_person(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS identity_user_role (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES identity_user(id) ON DELETE CASCADE,
  role_id BIGINT NOT NULL REFERENCES identity_role(id) ON DELETE CASCADE,
  UNIQUE (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS identity_user_group (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES identity_user(id) ON DELETE CASCADE,
  group_id BIGINT NOT NULL REFERENCES identity_group(id) ON DELETE CASCADE,
  UNIQUE (user_id, group_id)
);

CREATE INDEX IF NOT EXISTS identity_user_provider_person_id_idx ON identity_user (provider_person_id);
CREATE INDEX IF NOT EXISTS identity_user_role_role_id_idx ON identity_user_role (role_id);
CREATE INDEX IF NOT EXISTS identity_user_group_group_id_idx ON identity_user_group (group_id);
CREATE INDEX IF NOT EXISTS identity_role_permission_role_id_idx ON identity_role_permission (role_id);
CREATE INDEX IF NOT EXISTS identity_role_permission_permission_id_idx ON identity_role_permission (permission_id);
CREATE INDEX IF NOT EXISTS provider_person_organization_id_idx ON provider_person (organization_id);

CREATE TABLE IF NOT EXISTS employee (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  user_id BIGINT REFERENCES identity_user(id) ON DELETE SET NULL,
  employee_number VARCHAR(80) NOT NULL UNIQUE,
  full_name VARCHAR(160) NOT NULL,
  job_title VARCHAR(160) NOT NULL DEFAULT '',
  staff_type VARCHAR(40) NOT NULL DEFAULT 'non_clinical',
  employment_type VARCHAR(40) NOT NULL DEFAULT 'full_time',
  department VARCHAR(120) NOT NULL DEFAULT '',
  facility VARCHAR(120) NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS employee_user_id_idx ON employee (user_id);
CREATE INDEX IF NOT EXISTS employee_department_idx ON employee (department);

CREATE TABLE IF NOT EXISTS lab_request (
  id BIGSERIAL PRIMARY KEY,
  request_no VARCHAR(80) NOT NULL UNIQUE,
  patient_id BIGINT NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  requested_by_employee_id BIGINT REFERENCES employee(id) ON DELETE SET NULL,
  requested_by_provider_person_id BIGINT REFERENCES provider_person(id) ON DELETE SET NULL,
  requested_by_organization_id BIGINT REFERENCES provider_organization(id) ON DELETE SET NULL,
  request_source VARCHAR(40) NOT NULL DEFAULT 'internal',
  status VARCHAR(40) NOT NULL DEFAULT 'draft',
  is_self_requested BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lab_request_patient_id_idx ON lab_request (patient_id);
CREATE INDEX IF NOT EXISTS lab_request_employee_id_idx ON lab_request (requested_by_employee_id);
CREATE INDEX IF NOT EXISTS lab_request_provider_id_idx ON lab_request (requested_by_provider_person_id);
CREATE INDEX IF NOT EXISTS lab_request_organization_id_idx ON lab_request (requested_by_organization_id);

CREATE TABLE IF NOT EXISTS system_setting (
  id BIGSERIAL PRIMARY KEY,
  section VARCHAR(120) NOT NULL,
  key VARCHAR(120) NOT NULL UNIQUE,
  label VARCHAR(160) NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  kind VARCHAR(40) NOT NULL DEFAULT 'text',
  tone VARCHAR(40) NOT NULL DEFAULT 'default',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_editable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS system_setting_section_idx ON system_setting (section);
CREATE INDEX IF NOT EXISTS system_setting_sort_order_idx ON system_setting (section, sort_order);

CREATE TABLE IF NOT EXISTS shin_module_migrations (
  module_id TEXT NOT NULL,
  migration_path TEXT NOT NULL,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (module_id, migration_path)
);

CREATE TABLE IF NOT EXISTS audit_event (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  object_type VARCHAR(200) NOT NULL,
  source_system VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  trace_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_event_timestamp_idx ON audit_event (timestamp DESC);
CREATE INDEX IF NOT EXISTS audit_event_user_id_idx ON audit_event (user_id);

CREATE TABLE IF NOT EXISTS threat_alert (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  confidence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

