import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const clientId = searchParams.get('client_id');
  const clientSecret = searchParams.get('client_secret');
  
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'client_id and client_secret are required' },
      { status: 400 }
    );
  }
  
  const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/api/callback';
  
  const authUrl = new URL('https://www.strava.com/oauth/authorize');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('approval_prompt', 'force');
  authUrl.searchParams.append('scope', 'activity:read_all,profile:read_all');
  authUrl.searchParams.append('state', clientId); // client_idを保持
  
  // client_secretをCookieに保存（セキュアに）
  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set('strava_client_secret', clientSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10分
  });
  
  return response;
}
