import { NextRequest, NextResponse } from 'next/server';
import { saveTokenToDB, saveStatsToDB, saveFetchStatusToDB } from '@/lib/database';
import { fetchStravaData } from '@/lib/stravaDataFetcher';
import type { TokenResponse, StravaToken } from '@/lib/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state'); // client_id
  
  if (error) {
    return NextResponse.redirect(new URL(`/?error=${error}`, request.url));
  }
  
  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', request.url));
  }
  
  if (!state) {
    return NextResponse.redirect(new URL('/?error=missing_client_id', request.url));
  }
  
  // Cookieからclient_secretを取得
  const clientSecret = request.cookies.get('strava_client_secret')?.value;
  
  if (!clientSecret) {
    return NextResponse.redirect(new URL('/?error=missing_client_secret', request.url));
  }
  
  const clientId = state;
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
    
    // トークン情報を保存
    const token: StravaToken = {
      client_id: clientId,
      athlete_id: tokenData.athlete.id,
      athlete_name: `${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`.trim(),
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_at,
      created_at: new Date().toISOString(),
      athlete_profile: tokenData.athlete,
    };
    
    await saveTokenToDB(token);
    
    // バックグラウンドでデータ取得を開始（非同期）
    // ユーザーを待たせないため、Promise を await しない
    fetchAndSaveData(token).catch((error) => {
      console.error('バックグラウンドデータ取得エラー:', error);
    });
    
    // Cookieをクリア（使用済み）
    const response = NextResponse.redirect(
      new URL(`/?success=true&athlete=${encodeURIComponent(token.athlete_name)}&fetching=true`, request.url)
    );
    response.cookies.delete('strava_client_secret');
    
    return response;
  } catch (error) {
    console.error('Error in callback:', error);
    return NextResponse.redirect(new URL('/?error=token_error', request.url));
  }
}

// バックグラウンドでデータを取得して保存
async function fetchAndSaveData(token: StravaToken) {
  const startedAt = new Date().toISOString();
  
  try {
    console.log(`🚀 バックグラウンドデータ取得開始: ${token.athlete_name}`);
    
    // 取得開始状態を記録
    await saveFetchStatusToDB(token.client_id, token.athlete_id, {
      status: 'fetching',
      started_at: startedAt,
    });
    
    // 2025年のデータを取得（タイムアウトなしでバックグラウンド実行）
    const startDate = new Date('2025-01-01');
    const endDate = new Date(); // 現在時刻を使用
    
    const stats = await fetchStravaData(token, startDate, endDate, async (current, total) => {
      // 進捗を更新（started_atは保持）
      console.log(`📊 進捗更新: ${token.athlete_name} - ${current}/${total}`);
      try {
        await saveFetchStatusToDB(token.client_id, token.athlete_id, {
          status: 'fetching',
          started_at: startedAt,
          progress: { current, total },
        });
        console.log(`✅ 進捗保存成功: ${current}/${total}`);
      } catch (progressError) {
        console.error('進捗更新エラー:', progressError);
      }
    });
    
    // 統計データを保存
    await saveStatsToDB(token.client_id, token.athlete_id, stats);
    
    // 完了状態を記録
    await saveFetchStatusToDB(token.client_id, token.athlete_id, {
      status: 'completed',
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    });
    
    console.log(`✅ データ保存完了: ${token.athlete_name}`);
  } catch (error) {
    console.error('バックグラウンドデータ取得エラー:', error);
    
    // エラー状態を記録（確実に実行）
    try {
      await saveFetchStatusToDB(token.client_id, token.athlete_id, {
        status: 'error',
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (statusError) {
      console.error('ステータス更新エラー:', statusError);
    }
    
    throw error;
  }
}
