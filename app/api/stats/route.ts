import { NextRequest, NextResponse } from 'next/server';
import { getStatsFromDB, getStatsByIdFromDB, getTokenByIdFromDB, saveStatsToDB, saveFetchStatusToDB } from '@/lib/database';
import { fetchStravaData } from '@/lib/stravaDataFetcher';

// GET: 全ユーザーの統計データ一覧を取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const athleteId = searchParams.get('athlete_id');
    const clientId = searchParams.get('client_id');
    
    // 特定のアスリートのデータを取得
    if (athleteId && clientId) {
      const stats = await getStatsByIdFromDB(clientId, Number(athleteId));
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

// POST: 手動でデータ再取得
export async function POST(request: NextRequest) {
  try {
    const { client_id, athlete_id } = await request.json();
    
    if (!client_id || !athlete_id) {
      return NextResponse.json({ error: 'client_id and athlete_id are required' }, { status: 400 });
    }
    
    // トークンを読み込む
    const tokenData = await getTokenByIdFromDB(client_id, athlete_id);
    
    if (!tokenData) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }
    
    const startDate = new Date('2025-01-01');
    const endDate = new Date(); // 現在時刻を使用
    
    // 取得開始状態を記録
    await saveFetchStatusToDB(client_id, athlete_id, {
      status: 'fetching',
      started_at: new Date().toISOString(),
    });
    
    // バックグラウンドでデータ取得
    fetchStravaData(tokenData, startDate, endDate, async (current, total) => {
      // 進捗を更新
      await saveFetchStatusToDB(client_id, athlete_id, {
        status: 'fetching',
        started_at: new Date().toISOString(),
        progress: { current, total },
      });
    })
      .then(async stats => {
        // 統計データを保存
        await saveStatsToDB(client_id, athlete_id, stats);
        
        // 完了状態を記録
        await saveFetchStatusToDB(client_id, athlete_id, {
          status: 'completed',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });
        
        console.log(`✅ データ更新完了: ${tokenData.athlete_name}`);
      })
      .catch(async error => {
        console.error('データ取得エラー:', error);
        
        // エラー状態を記録
        await saveFetchStatusToDB(client_id, athlete_id, {
          status: 'error',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Data fetching started in background' 
    });
  } catch (error) {
    console.error('Error starting data fetch:', error);
    return NextResponse.json({ error: 'Failed to start data fetch' }, { status: 500 });
  }
}
