import { NextRequest, NextResponse } from 'next/server';
import { getFetchStatusFromDB, saveFetchStatusToDB, deleteFetchStatusFromDB } from '@/lib/database';

// GET: データ取得状況を確認
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const athleteId = searchParams.get('athlete_id');
    const clientId = searchParams.get('client_id');
    
    if (athleteId && clientId) {
      const status = await getFetchStatusFromDB(clientId, Number(athleteId));
      return NextResponse.json(status || null);
    }
    
    // 全ユーザーの状況を取得
    const statuses = await getFetchStatusFromDB();
    
    // "client_id:athlete_id"をキーにした形式に変換
    const statusMap: Record<string, any> = {};
    if (Array.isArray(statuses)) {
      statuses.forEach((status: any) => {
        const key = `${status.client_id}:${status.athlete_id}`;
        statusMap[key] = status;
      });
    }
    
    return NextResponse.json(statusMap);
  } catch (error) {
    console.error('Error getting fetch status:', error);
    return NextResponse.json({}, { status: 500 });
  }
}

// POST: データ取得状況を更新
export async function POST(request: NextRequest) {
  try {
    const { client_id, athlete_id, status, progress, error: errorMsg } = await request.json();
    
    if (!client_id || !athlete_id) {
      return NextResponse.json({ error: 'client_id and athlete_id are required' }, { status: 400 });
    }
    
    const statusData: any = {
      status: status || 'fetching',
      started_at: new Date().toISOString(),
    };
    
    if (progress) {
      statusData.progress = progress;
    }
    
    if (status === 'completed' || status === 'error') {
      statusData.completed_at = new Date().toISOString();
    }
    
    if (errorMsg) {
      statusData.error = errorMsg;
    }
    
    await saveFetchStatusToDB(client_id, athlete_id, statusData);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating fetch status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}

// DELETE: データ取得状況をクリア
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const athleteId = searchParams.get('athlete_id');
    const clientId = searchParams.get('client_id');
    
    if (!athleteId || !clientId) {
      return NextResponse.json({ error: 'client_id and athlete_id are required' }, { status: 400 });
    }
    
    await deleteFetchStatusFromDB(clientId, Number(athleteId));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting fetch status:', error);
    return NextResponse.json({ error: 'Failed to delete status' }, { status: 500 });
  }
}
