import { NextRequest, NextResponse } from 'next/server';
import { saveTokenToDB } from '@/lib/database';
import type { TokenResponse, StravaToken } from '@/lib/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');
  
  if (error) {
    return NextResponse.redirect(new URL(`/?error=${error}`, request.url));
  }
  
  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', request.url));
  }
  
  if (!state) {
    return NextResponse.redirect(new URL('/?error=missing_client_info', request.url));
  }
  
  // stateからClient IDとClient Secretを取得
  const [clientId, clientSecret] = state.split(':');
  
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/?error=invalid_state', request.url));
  }
  
  const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/api/callback';
  
  try {
    // Stravaからトークンを取得
    const tokenResponse = await fetch('https://www.strava.com/api/v3/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
      }),
    });
    
    if (!tokenResponse.ok) {
      throw new Error('Failed to get token from Strava');
    }
    
    const tokenData: TokenResponse = await tokenResponse.json();
    
    // トークン情報を保存（client_secretも含む）
    const token: StravaToken = {
      client_id: clientId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_at,
      client_secret: clientSecret,
      created_at: new Date().toISOString(),
      athlete_profile: tokenData.athlete,
    };
    
    await saveTokenToDB(token);
    
    // Cookieをクリア（使用済み）
    const response = NextResponse.redirect(
      new URL(`/?success=true&athlete=${encodeURIComponent(token.athlete_name)}`, request.url)
    );
    response.cookies.delete('strava_client_secret');
    
    return response;
  } catch (error) {
    console.error('Error in callback:', error);
    return NextResponse.redirect(new URL('/?error=token_error', request.url));
  }
}
