import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromDB, saveStatsToDB, saveFetchStatusToDB } from '@/lib/database';
import { fetchStravaData } from '@/lib/stravaDataFetcher';

export const maxDuration = 60; // Vercel Pro以上で60秒まで延長可能（Hobbyでは10秒が上限）

export async function POST(request: NextRequest) {
  try {
    const { client_id, athlete_id } = await request.json();

    if (!client_id || !athlete_id) {
      return NextResponse.json(
        { error: 'client_id and athlete_id are required' },
        { status: 400 }
      );
    }

    // トークンを取得
    const tokens = await getTokensFromDB();
    const token = tokens.find(
      (t) => t.client_id === client_id && t.athlete_id === athlete_id
    );

    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    const startedAt = new Date().toISOString();

    // 取得開始状態を記録
    await saveFetchStatusToDB(client_id, athlete_id, {
      status: 'fetching',
      started_at: startedAt,
    });

    // 2025年のデータを取得（8秒でタイムアウト）
    const startDate = new Date('2025-01-01');
    const endDate = new Date();
    
    const timeoutMs = 8000; // 8秒でタイムアウト
    let timeoutId: NodeJS.Timeout;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('timeout'));
      }, timeoutMs);
    });

    try {
      const stats = await Promise.race([
        fetchStravaData(token, startDate, endDate, async (current, total) => {
          // 進捗を更新
          try {
            await saveFetchStatusToDB(client_id, athlete_id, {
              status: 'fetching',
              started_at: startedAt,
              progress: { current, total },
            });
          } catch (progressError) {
            console.error('進捗更新エラー:', progressError);
          }
        }),
        timeoutPromise,
      ]);

      clearTimeout(timeoutId!);

      // 統計データを保存
      await saveStatsToDB(client_id, athlete_id, stats);

      // 完了状態を記録
      await saveFetchStatusToDB(client_id, athlete_id, {
        status: 'completed',
        started_at: startedAt,
        completed_at: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, completed: true });
    } catch (error) {
      clearTimeout(timeoutId!);
      
      if (error instanceof Error && error.message === 'timeout') {
        // タイムアウト時は継続中として返す
        return NextResponse.json({ success: true, timeout: true, continue: true });
      }
      throw error;
    }
  } catch (error) {
    console.error('データ取得エラー:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
