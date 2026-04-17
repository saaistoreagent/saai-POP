import { NextRequest } from 'next/server';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'products.db');

function getDb() {
  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT    NOT NULL,
      category        TEXT    NOT NULL,
      brand           TEXT    NOT NULL,
      imageUrl        TEXT,
      active          INTEGER NOT NULL DEFAULT 1,
      newsletterIssue INTEGER,
      description     TEXT,
      createdAt       TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
  try { db.exec(`ALTER TABLE products ADD COLUMN newsletterIssue INTEGER`); } catch {}
  try { db.exec(`ALTER TABLE products ADD COLUMN description TEXT`); } catch {}
  return db;
}

export async function GET(request: NextRequest) {
  const db = getDb();
  const all = request.nextUrl.searchParams.get('all');
  const rows = all
    ? db.prepare('SELECT * FROM products ORDER BY createdAt DESC').all()
    : db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY newsletterIssue DESC, createdAt DESC').all();
  return Response.json(rows);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const { name, category, brand, imageUrl, active, newsletterIssue, description } = await request.json();
  if (!name || !category || !brand) {
    return Response.json({ error: '상품명, 카테고리, 브랜드는 필수입니다.' }, { status: 400 });
  }
  const stmt = db.prepare(
    'INSERT INTO products (name, category, brand, imageUrl, active, newsletterIssue, description) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const result = stmt.run(name, category, brand, imageUrl ?? null, active ? 1 : 0, newsletterIssue ?? null, description ?? null);
  const created = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  return Response.json(created, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const db = getDb();
  const { id, name, category, brand, imageUrl, active, newsletterIssue, description } = await request.json();
  db.prepare(
    'UPDATE products SET name=?, category=?, brand=?, imageUrl=?, active=?, newsletterIssue=?, description=? WHERE id=?'
  ).run(name, category, brand, imageUrl ?? null, active ? 1 : 0, newsletterIssue ?? null, description ?? null, id);
  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  return Response.json(updated);
}

export async function DELETE(request: NextRequest) {
  const db = getDb();
  const id = request.nextUrl.searchParams.get('id');
  if (id) {
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
  }
  return Response.json({ ok: true });
}
