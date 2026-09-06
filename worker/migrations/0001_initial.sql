PRAGMA foreign_keys = ON;

CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  client_mark TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE client_invites (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE auth_sessions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE chat_sessions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '新会话',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (id, client_id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (session_id, client_id) REFERENCES chat_sessions(id, client_id)
);

CREATE TABLE consents (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  save_history INTEGER NOT NULL CHECK (save_history IN (0, 1)),
  allow_staff_followup INTEGER NOT NULL CHECK (allow_staff_followup IN (0, 1)),
  policy_version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (session_id, client_id) REFERENCES chat_sessions(id, client_id)
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  client_id TEXT,
  session_id TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_invites_token_active ON client_invites(token_hash, expires_at, used_at);
CREATE INDEX idx_auth_sessions_token_active ON auth_sessions(token_hash, expires_at, revoked_at);
CREATE INDEX idx_chat_sessions_client_updated ON chat_sessions(client_id, updated_at DESC);
CREATE INDEX idx_messages_client_session_created ON messages(client_id, session_id, created_at);
CREATE INDEX idx_consents_client_session_created ON consents(client_id, session_id, created_at DESC);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

PRAGMA optimize;
