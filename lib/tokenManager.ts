import fs from 'fs';
import path from 'path';
import type { StravaToken } from './types';

const DATA_DIR = path.join(process.cwd(), 'data', 'tokens');

// データディレクトリの作成
export function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// トークンの保存
export function saveToken(token: StravaToken): string {
  ensureDataDir();
  
  const athleteName = `${token.athlete_profile.firstname} ${token.athlete_profile.lastname}`.trim();
  const filename = `${token.athlete_profile.id}_${athleteName.replace(/\s+/g, '_')}.json`;
  const filepath = path.join(DATA_DIR, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(token, null, 2));
  
  return filename;
}

// 全トークンの取得
export function getAllTokens(): StravaToken[] {
  ensureDataDir();
  
  const files = fs.readdirSync(DATA_DIR);
  const tokens: StravaToken[] = [];
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      try {
        const filepath = path.join(DATA_DIR, file);
        const content = fs.readFileSync(filepath, 'utf-8');
        tokens.push(JSON.parse(content));
      } catch (error) {
        console.error(`Failed to read token file ${file}:`, error);
      }
    }
  }
  
  return tokens;
}

// トークンの削除
export function deleteToken(filename: string): boolean {
  const filepath = path.join(DATA_DIR, filename);
  
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
    return true;
  }
  
  return false;
}

// トークンの有効期限チェック
export function isTokenExpired(token: StravaToken): boolean {
  return Date.now() / 1000 >= token.expires_at;
}

// トークンのリフレッシュ
export async function refreshToken(
  token: StravaToken,
  clientId: string,
  clientSecret: string
): Promise<StravaToken> {
  const response = await fetch('https://www.strava.com/api/v3/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }
  
  const data = await response.json();
  
  const updatedToken: StravaToken = {
    ...token,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
  };
  
  // 更新したトークンを保存
  saveToken(updatedToken);
  
  return updatedToken;
}
