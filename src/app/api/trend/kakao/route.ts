import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path') ?? '';

  const qs = new URLSearchParams();
  searchParams.forEach((value, key) => {
    if (key !== 'path') qs.set(key, value);
  });

  const queryString = qs.toString();
  const url = `https://dapi.kakao.com${path}${queryString ? `?${queryString}` : ''}`;

  const upstream = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `KakaoAK ${process.env.KAKAO_REST_KEY ?? ''}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await upstream.json();
  return Response.json(data, { status: upstream.status });
}

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path') ?? '';

  const qs = new URLSearchParams();
  searchParams.forEach((value, key) => {
    if (key !== 'path') qs.set(key, value);
  });

  const queryString = qs.toString();
  const url = `https://dapi.kakao.com${path}${queryString ? `?${queryString}` : ''}`;
  const body = await request.json();

  const upstream = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `KakaoAK ${process.env.KAKAO_REST_KEY ?? ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await upstream.json();
  return Response.json(data, { status: upstream.status });
}
