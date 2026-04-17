import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path') ?? '';

  const qs = new URLSearchParams();
  searchParams.forEach((value, key) => {
    if (key !== 'path') qs.set(key, value);
  });
  qs.set('serviceKey', process.env.SEMAS_API_KEY ?? '');

  const queryString = qs.toString();
  const url = `http://apis.data.go.kr/B553077/api/open/sdsc2${path}?${queryString}`;

  const upstream = await fetch(url);
  const data = await upstream.json();
  return Response.json(data, { status: upstream.status });
}
