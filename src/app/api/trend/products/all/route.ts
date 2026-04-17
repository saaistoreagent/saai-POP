import { DatabaseSync } from 'node:sqlite';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'products.db');

export async function GET() {
  const db = new DatabaseSync(DB_PATH);
  const rows = db.prepare('SELECT * FROM products ORDER BY createdAt DESC').all();
  return Response.json(rows);
}
