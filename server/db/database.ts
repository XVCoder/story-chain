import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

let _require: ReturnType<typeof createRequire>;
let currentDir: string;
try {
  currentDir = path.dirname(__filename);
  _require = createRequire(__filename);
} catch {
  currentDir = process.cwd();
  _require = createRequire(currentDir + '/');
}
const sqlJsMainPath = _require.resolve('sql.js');
const sqlJsPackagePath = path.resolve(sqlJsMainPath, '../..');
const wasmDir = path.join(sqlJsPackagePath, 'dist');
const dbPath = path.join(currentDir, 'story_chain.db');

export let db: any = null;

export interface QueryResult {
  columns: string[];
  values: any[][];
}

export function queryAll(sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

export function queryOne(sql: string, params: any[] = []): any | null {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function execute(sql: string, params: any[] = []): void {
  db.run(sql, params);
}

export const initDatabase = async (): Promise<void> => {
  const SQL = await initSqlJs({
    locateFile: file => path.join(wasmDir, file)
  });

  let data: Uint8Array | undefined;
  if (fs.existsSync(dbPath)) {
    data = new Uint8Array(fs.readFileSync(dbPath));
  }
  
  db = new SQL.Database(data);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT UNIQUE,
      points INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      content TEXT NOT NULL,
      author_id INTEGER NOT NULL,
      mode TEXT DEFAULT 'free',
      max_nodes INTEGER DEFAULT 5,
      current_nodes INTEGER DEFAULT 1,
      status TEXT DEFAULT 'draft',
      likes INTEGER DEFAULT 0,
      favorites INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      published_at TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS story_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id INTEGER NOT NULL,
      parent_id INTEGER,
      content TEXT NOT NULL,
      author_id INTEGER NOT NULL,
      coins INTEGER DEFAULT 0,
      is_selected BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      story_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, story_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      story_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, story_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS coins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      node_id INTEGER NOT NULL,
      amount INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, node_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      item_type TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      UNIQUE(user_id, item_type)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT DEFAULT 'member',
      UNIQUE(team_id, user_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS competitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      end_time TIMESTAMP,
      status TEXT DEFAULT 'active'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS competition_teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL,
      team_id INTEGER NOT NULL,
      score INTEGER DEFAULT 0,
      UNIQUE(competition_id, team_id)
    )
  `);

  const saveInterval = setInterval(() => {
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  }, 5000);

  process.on('exit', () => {
    clearInterval(saveInterval);
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
    db.close();
  });
};
