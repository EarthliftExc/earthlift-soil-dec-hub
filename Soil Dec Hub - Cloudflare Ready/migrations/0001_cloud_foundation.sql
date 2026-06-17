CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS submitters (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 999,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tip_sites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'Webform',
  enabled INTEGER NOT NULL DEFAULT 1,
  sender_status TEXT NOT NULL DEFAULT 'planned',
  login_url TEXT,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 999,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS submission_runs (
  id TEXT PRIMARY KEY,
  job_number TEXT,
  payload_json TEXT,
  status TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS declarations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_number TEXT NOT NULL,
  principal_contractor TEXT,
  job_address TEXT,
  volume TEXT,
  demolition TEXT,
  submitter_id TEXT,
  site_id TEXT NOT NULL,
  site_name TEXT,
  status TEXT NOT NULL,
  urm_job_number TEXT,
  summary TEXT,
  report_key TEXT,
  submitted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS declarations_job_number_idx ON declarations(job_number);
CREATE INDEX IF NOT EXISTS declarations_site_id_idx ON declarations(site_id);
CREATE INDEX IF NOT EXISTS declarations_created_at_idx ON declarations(created_at);

INSERT INTO settings (key, value, updated_at) VALUES
  ('defaultSubmitter', 'chris', datetime('now')),
  ('emailAction', 'send', datetime('now')),
  ('esgSiteId', '85', datetime('now')),
  ('lteDestination', 'LTE Langwarrin - Soil', datetime('now'))
ON CONFLICT(key) DO NOTHING;

INSERT INTO submitters (id, label, name, email, phone, active, sort_order) VALUES
  ('chris', 'Chris Knight', 'Chris Knight', 'chris.knight@earthlift.com.au', '0404817643', 1, 10),
  ('alan', 'Alan Fenner', 'Alan Fenner', 'alan.fenner@earthlift.com.au', '0448517046', 1, 20)
ON CONFLICT(id) DO NOTHING;

INSERT INTO tip_sites (id, name, method, enabled, sender_status, login_url, notes, sort_order) VALUES
  ('harkaway', 'Harkaway', 'Webform', 1, 'planned', '', '', 10),
  ('urm', 'URM', 'Webform', 1, 'planned', '', 'Build this sender first.', 20),
  ('landfix', 'Landfix', 'Webform', 1, 'planned', '', '', 30),
  ('daisys', 'Daisy''s', 'Webform', 1, 'planned', '', '', 40),
  ('esg', 'ESG', 'Webform', 1, 'planned', '', '', 50),
  ('scope', 'Scope', 'Webform', 1, 'planned', '', '', 60),
  ('lte-monk', 'LTE / Monk', 'Google Form', 1, 'planned', '', '', 70),
  ('galcon', 'Galcon', 'Webform', 1, 'planned', '', '', 80),
  ('hanson', 'Hanson / Heidelberg', 'PDF email', 1, 'planned', '', '', 90),
  ('landformx', 'LandformX', 'PDF email', 1, 'planned', '', '', 100),
  ('antech', 'Antech', 'PDF email', 1, 'planned', '', '', 110)
ON CONFLICT(id) DO NOTHING;
