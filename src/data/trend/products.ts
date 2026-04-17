import { Product } from '@/lib/trend/types';

export const CATEGORY_EMOJI: Record<string, string> = {
  '주류': '🥃',
  '음료': '🥤',
  '스낵': '🍿',
  '디저트': '🍰',
  '즉석식품': '🍜',
  '라면': '🍜',
  '도시락': '🍱',
  '삼각김밥': '🍙',
};

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch('/api/trend/products');
  if (!res.ok) return [];
  return res.json();
}

export async function fetchProductById(id: number | string): Promise<Product | null> {
  const products = await fetchProducts();
  return products.find((p) => String(p.id) === String(id)) ?? null;
}
