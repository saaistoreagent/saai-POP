import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path') ?? '';
  const url = `https://openapi.naver.com/v1/datalab${path}`;
  const body = await request.json();

  const upstream = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID ?? '',
      'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET ?? '',
    },
    body: JSON.stringify(body),
  });

  const data = await upstream.json();
  return Response.json(data, { status: upstream.status });
}
