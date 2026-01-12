import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromDB, deleteTokenFromDB, deleteStatsFromDB, deleteFetchStatusFromDB } from '@/lib/database';

// GET: 全トークンの取得
export async function GET() {
  try {
    const tokens = await getTokensFromDB();
    
    // 機密情報を除外して返す
    const safeTokens = tokens.map(token => ({
      client_id: token.client_id,
      athlete_id: token.athlete_profile.id,
      athlete_name: `${token.athlete_profile.firstname} ${token.athlete_profile.lastname}`.trim(),
      created_at: token.created_at,
      expires_at: token.expires_at,
      athlete_profile: {
        firstname: token.athlete_profile.firstname,
        lastname: token.athlete_profile.lastname,
        profile: token.athlete_profile.profile,
        city: token.athlete_profile.city,
        state: token.athlete_profile.state,
        country: token.athlete_profile.country,
      },
    }));
    
    return NextResponse.json(safeTokens);
  } catch (error) {
    console.error('Error getting tokens:', error);
    return NextResponse.json({ error: 'Failed to get tokens' }, { status: 500 });
  }
}

// DELETE: トークンの削除
export async function DELETE(request: NextRequest) {
  try {
    const { client_id } = await request.json();
    
    if (!client_id) {
      return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
    }
    
    // トークン、統計データ、fetch statusを削除
    await deleteTokenFromDB(client_id);
    await deleteStatsFromDB(client_id);
    await deleteFetchStatusFromDB(client_id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting token:', error);
    return NextResponse.json({ error: 'Failed to delete token' }, { status: 500 });
  }
}
