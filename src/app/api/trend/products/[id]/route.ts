import { NextRequest } from 'next/server';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'products.db');

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = new DatabaseSync(DB_PATH);
  const { name, category, brand, imageUrl, active, newsletterIssue, description } = await request.json();
  db.prepare(
    'UPDATE products SET name=?, category=?, brand=?, imageUrl=?, active=?, newsletterIssue=?, description=? WHERE id=?'
  ).run(name, category, brand, imageUrl ?? null, active ? 1 : 0, newsletterIssue ?? null, description ?? null, id);
  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  return Response.json(updated);
}

export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = new DatabaseSync(DB_PATH);
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  return Response.json({ ok: true });
}
