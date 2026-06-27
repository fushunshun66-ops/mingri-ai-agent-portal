import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  user_id TEXT,
  flow_key TEXT NOT NULL,
  agent_sn TEXT,
  version_sn TEXT,
  external_session_sn TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  blocks TEXT NOT NULL,
  run_id TEXT,
  run_status TEXT,
  raw_response TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS traces (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  message_id TEXT,
  step_index INTEGER NOT NULL,
  step_type TEXT NOT NULL,
  node_id TEXT,
  payload TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_traces_session ON traces(session_id);
CREATE INDEX IF NOT EXISTS idx_traces_message ON traces(message_id);
`;

function now() {
  return new Date().toISOString();
}

export class Repository {
  constructor(dbPath) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec(SCHEMA);
  }

  createSession({ title, userId, flowKey, agentSn, versionSn, externalSessionSn }) {
    const id = randomUUID();
    const ts = now();
    this.db
      .prepare(
        `INSERT INTO sessions (id, title, user_id, flow_key, agent_sn, version_sn, external_session_sn, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, title, userId ?? null, flowKey, agentSn ?? null, versionSn ?? null, externalSessionSn ?? null, ts, ts);
    return this.getSession(id);
  }

  getSession(id) {
    return this.db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(id) || null;
  }

  listSessions() {
    return this.db
      .prepare(
        `SELECT s.* FROM sessions s
         WHERE EXISTS (SELECT 1 FROM messages m WHERE m.session_id = s.id)
         ORDER BY s.updated_at DESC`,
      )
      .all();
  }

  touchSession(id, patch = {}) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(patch)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    fields.push(`updated_at = ?`);
    values.push(now(), id);
    this.db.prepare(`UPDATE sessions SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    return this.getSession(id);
  }

  addMessage({ sessionId, role, blocks, runId, runStatus, rawResponse }) {
    const id = randomUUID();
    const ts = now();
    this.db
      .prepare(
        `INSERT INTO messages (id, session_id, role, blocks, run_id, run_status, raw_response, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        sessionId,
        role,
        JSON.stringify(blocks ?? []),
        runId ?? null,
        runStatus ?? null,
        rawResponse ? JSON.stringify(rawResponse) : null,
        ts,
      );
    this.touchSession(sessionId);
    return this.getMessage(id);
  }

  getMessage(id) {
    const row = this.db.prepare(`SELECT * FROM messages WHERE id = ?`).get(id);
    return row ? this._hydrateMessage(row) : null;
  }

  listMessages(sessionId) {
    return this.db
      .prepare(`SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC`)
      .all(sessionId)
      .map((row) => this._hydrateMessage(row));
  }

  countUserMessages(sessionId) {
    const row = this.db
      .prepare(`SELECT COUNT(*) AS c FROM messages WHERE session_id = ? AND role = 'user'`)
      .get(sessionId);
    return row?.c ?? 0;
  }

  addTraces(sessionId, messageId, steps = []) {
    if (!steps.length) return;
    const stmt = this.db.prepare(
      `INSERT INTO traces (id, session_id, message_id, step_index, step_type, node_id, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const ts = now();
    steps.forEach((step, index) => {
      stmt.run(
        randomUUID(),
        sessionId,
        messageId ?? null,
        step.stepIndex ?? index,
        step.stepType || "node_output",
        step.nodeId ?? null,
        step.payload ? JSON.stringify(step.payload) : null,
        ts,
      );
    });
  }

  listTraces(sessionId) {
    return this.db
      .prepare(`SELECT * FROM traces WHERE session_id = ? ORDER BY step_index ASC, created_at ASC`)
      .all(sessionId)
      .map((row) => ({ ...row, payload: row.payload ? JSON.parse(row.payload) : null }));
  }

  _hydrateMessage(row) {
    return {
      ...row,
      blocks: row.blocks ? JSON.parse(row.blocks) : [],
      raw_response: row.raw_response ? JSON.parse(row.raw_response) : null,
    };
  }
}
