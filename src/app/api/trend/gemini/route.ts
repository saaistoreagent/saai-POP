import { NextRequest } from 'next/server';

const MODEL = 'gemini-2.5-flash';

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY ?? '';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const body = await request.json();

  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await upstream.json();
  return Response.json(data, { status: upstream.status });
}
