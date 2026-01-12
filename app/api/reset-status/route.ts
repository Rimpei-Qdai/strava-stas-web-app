import { NextRequest, NextResponse } from 'next/server';
import { deleteFetchStatusFromDB } from '@/lib/database';

// スタックした取得状態をリセットするAPI
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { client_id, athlete_id } = body;

    if (!client_id || !athlete_id) {
      return NextResponse.json(
        { error: 'client_id and athlete_id are required' },
        { status: 400 }
      );
    }

    // 取得状態を削除
    await deleteFetchStatusFromDB(client_id, athlete_id);

    return NextResponse.json({
      success: true,
      message: 'Fetch status has been reset',
    });
  } catch (error) {
    console.error('Error resetting fetch status:', error);
    return NextResponse.json(
      { error: 'Failed to reset fetch status' },
      { status: 500 }
    );
  }
}
