import { createClient } from '@supabase/supabase-js';
import type { StravaToken } from './types';

// Supabaseクライアントの初期化
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// トークンを保存
export async function saveTokenToDB(token: StravaToken) {
  const { error } = await supabase
    .from('tokens')
    .upsert({
      client_id: token.client_id,
      athlete_id: token.athlete_id,
      athlete_name: token.athlete_name,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: token.expires_at,
      created_at: token.created_at,
      athlete_profile: token.athlete_profile,
    }, {
      onConflict: 'client_id,athlete_id'
    });

  if (error) {
    console.error('Error saving token:', error);
    throw error;
  }
}

// トークンを取得
export async function getTokensFromDB() {
  const { data, error } = await supabase
    .from('tokens')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tokens:', error);
    throw error;
  }

  return data || [];
}

// 特定のトークンを取得
export async function getTokenByIdFromDB(clientId: string, athleteId: number) {
  const { data, error } = await supabase
    .from('tokens')
    .select('*')
    .eq('client_id', clientId)
    .eq('athlete_id', athleteId)
    .single();

  if (error) {
    console.error('Error fetching token:', error);
    throw error;
  }

  return data;
}

// トークンを削除
export async function deleteTokenFromDB(clientId: string, athleteId: number) {
  const { error } = await supabase
    .from('tokens')
    .delete()
    .eq('client_id', clientId)
    .eq('athlete_id', athleteId);

  if (error) {
    console.error('Error deleting token:', error);
    throw error;
  }
}

// 統計を保存
export async function saveStatsToDB(clientId: string, athleteId: number, stats: any) {
  const { error } = await supabase
    .from('stats')
    .upsert({
      client_id: clientId,
      athlete_id: athleteId,
      data: stats,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'client_id,athlete_id'
    });

  if (error) {
    console.error('Error saving stats:', error);
    throw error;
  }
}

// 統計を取得
export async function getStatsFromDB() {
  const { data, error } = await supabase
    .from('stats')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching stats:', error);
    throw error;
  }

  return data?.map(row => ({
    client_id: row.client_id,
    athlete_id: row.athlete_id,
    ...row.data,
    last_updated: row.updated_at,
  })) || [];
}

// 特定の統計を取得
export async function getStatsByIdFromDB(clientId: string, athleteId: number) {
  const { data, error } = await supabase
    .from('stats')
    .select('*')
    .eq('client_id', clientId)
    .eq('athlete_id', athleteId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    console.error('Error fetching stats:', error);
    throw error;
  }

  if (!data) return null;

  return {
    client_id: data.client_id,
    athlete_id: data.athlete_id,
    ...data.data,
    last_updated: data.updated_at,
  };
}

// 統計を削除
export async function deleteStatsFromDB(clientId: string, athleteId: number) {
  const { error } = await supabase
    .from('stats')
    .delete()
    .eq('client_id', clientId)
    .eq('athlete_id', athleteId);

  if (error) {
    console.error('Error deleting stats:', error);
    throw error;
  }
}

// データ取得状況を保存
export async function saveFetchStatusToDB(clientId: string, athleteId: number, status: any) {
  const { error } = await supabase
    .from('fetch_status')
    .upsert({
      client_id: clientId,
      athlete_id: athleteId,
      status: status.status,
      started_at: status.started_at || new Date().toISOString(),
      completed_at: status.completed_at,
      progress: status.progress,
      error: status.error,
    }, {
      onConflict: 'client_id,athlete_id'
    });

  if (error) {
    console.error('Error saving fetch status:', error);
    throw error;
  }
}

// データ取得状況を取得
export async function getFetchStatusFromDB(clientId?: string, athleteId?: number) {
  let query = supabase.from('fetch_status').select('*');
  
  if (clientId && athleteId) {
    query = query.eq('client_id', clientId).eq('athlete_id', athleteId).single();
  } else if (clientId) {
    query = query.eq('client_id', clientId);
  } else if (athleteId) {
    query = query.eq('athlete_id', athleteId);
  }

  const { data, error } = await query;

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching status:', error);
    throw error;
  }

  return data;
}

// データ取得状況を削除
export async function deleteFetchStatusFromDB(clientId: string, athleteId: number) {
  const { error } = await supabase
    .from('fetch_status')
    .delete()
    .eq('client_id', clientId)
    .eq('athlete_id', athleteId);

  if (error) {
    console.error('Error deleting fetch status:', error);
    throw error;
  }
}
