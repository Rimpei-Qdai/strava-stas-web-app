import { NextRequest, NextResponse } from 'next/server';
import { getStatsFromDB, getStatsByIdFromDB } from '@/lib/database';

// GET: 全ユーザーの統計データ一覧を取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('client_id');
    
    // 特定のアスリートのデータを取得
    if (clientId) {
      const stats = await getStatsByIdFromDB(clientId);
      if (stats) {
        return NextResponse.json(stats);
      }
      return NextResponse.json({ error: 'Stats not found' }, { status: 404 });
    }
    
    // 全ユーザーの統計サマリーを返す
    const statsSummary = await getStatsFromDB();
    
    return NextResponse.json(statsSummary);
  } catch (error) {
    console.error('Error getting stats:', error);
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 });
  }
}
