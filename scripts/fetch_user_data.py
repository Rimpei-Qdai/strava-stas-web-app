"""
管理者用: ローカル環境でStravaデータを取得してSupabaseに保存するスクリプト

使い方:
1. .env.localファイルにSupabase認証情報が設定されていることを確認
2. python scripts/fetch_user_data.py

全ユーザーのデータを自動取得します。
Client Secretがないユーザーはスキップされます。
"""

import sys
import os
import json
from datetime import datetime, timezone
from pathlib import Path

try:
    from dotenv import load_dotenv
    from supabase import create_client, Client
    import requests
except ImportError:
    print("必要なパッケージがインストールされていません。")
    print("以下のコマンドを実行してください:")
    print("pip install python-dotenv supabase requests")
    sys.exit(1)

# .env.localから環境変数を読み込み
env_path = Path(__file__).parent.parent / '.env.local'
load_dotenv(env_path)

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("エラー: SUPABASE_URLまたはSUPABASE_KEYが設定されていません")
    print(f".env.localファイルを確認してください: {env_path}")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def get_all_tokens_from_db():
    """データベースから全トークン情報を取得"""
    try:
        response = supabase.table('tokens').select('*').execute()
        if response.data:
            return response.data
        return []
    except Exception as e:
        print(f"トークン取得エラー: {e}")
        return []


def get_token_from_db(client_id: str):
    """データベースから特定のトークン情報を取得"""
    try:
        response = supabase.table('tokens').select('*').eq('client_id', client_id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        print(f"トークン取得エラー: {e}")
        return None


def refresh_access_token(client_id: str, client_secret: str, refresh_token: str):
    """アクセストークンをリフレッシュ"""
    try:
        response = requests.post(
            'https://www.strava.com/api/v3/oauth/token',
            data={
                'client_id': client_id,
                'client_secret': client_secret,
                'grant_type': 'refresh_token',
                'refresh_token': refresh_token
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            return data['access_token'], data['refresh_token'], data['expires_at']
        else:
            print(f"トークンリフレッシュエラー: {response.status_code} - {response.text}")
            return None, None, None
    except Exception as e:
        print(f"トークンリフレッシュ例外: {e}")
        return None, None, None


def update_token_in_db(client_id: str, access_token: str, refresh_token: str, expires_at: int):
    """データベースのトークンを更新"""
    try:
        supabase.table('tokens').update({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'expires_at': expires_at
        }).eq('client_id', client_id).execute()
        print("✅ トークンを更新しました")
    except Exception as e:
        print(f"トークン更新エラー: {e}")


def fetch_activities(access_token: str, after_timestamp: int, before_timestamp: int):
    """Stravaからアクティビティ一覧を取得"""
    all_activities = []
    page = 1
    per_page = 200
    
    headers = {'Authorization': f'Bearer {access_token}'}
    
    while True:
        url = f'https://www.strava.com/api/v3/athlete/activities'
        params = {
            'after': after_timestamp,
            'before': before_timestamp,
            'page': page,
            'per_page': per_page
        }
        
        print(f"📥 ページ {page} を取得中... (1ページあたり最大{per_page}件)")
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code != 200:
            print(f"エラー: {response.status_code} - {response.text}")
            break
        
        activities = response.json()
        if not activities:
            break
        
        all_activities.extend(activities)
        print(f"   {len(activities)}件取得 (累計: {len(all_activities)}件)")
        
        if len(activities) < per_page:
            break
        
        page += 1
    
    return all_activities


def fetch_activity_details(access_token: str, activity_id: int):
    """アクティビティの詳細を取得"""
    headers = {'Authorization': f'Bearer {access_token}'}
    url = f'https://www.strava.com/api/v3/activities/{activity_id}'
    
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json()
    return None


def fetch_comments(access_token: str, activity_id: int):
    """アクティビティのコメントを取得"""
    headers = {'Authorization': f'Bearer {access_token}'}
    url = f'https://www.strava.com/api/v3/activities/{activity_id}/comments'
    
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json()
    return []


def process_activities(activities, access_token: str):
    """アクティビティを処理して統計データを作成"""
    stats = {
        'total_distance': 0,
        'total_moving_time': 0,
        'total_elevation_gain': 0,
        'total_activities': len(activities),
        'total_comments_count': 0,
        'kom_count': 0,
        'activities_by_type': {},
        'comments': [],
        'segments_passed': []
    }
    
    print(f"\n📊 {len(activities)}件のアクティビティを処理中...")
    
    # 基本データ処理
    for i, activity in enumerate(activities):
        if (i + 1) % 50 == 0:
            print(f"   基本処理: {i + 1}/{len(activities)}")
        
        stats['total_distance'] += activity.get('distance', 0)
        stats['total_moving_time'] += activity.get('moving_time', 0)
        stats['total_elevation_gain'] += activity.get('total_elevation_gain', 0)
        
        # アクティビティタイプ別
        activity_type = activity.get('type', 'Unknown')
        if activity_type not in stats['activities_by_type']:
            stats['activities_by_type'][activity_type] = {
                'count': 0,
                'total_distance': 0,
                'total_moving_time': 0,
                'total_elevation_gain': 0
            }
        
        stats['activities_by_type'][activity_type]['count'] += 1
        stats['activities_by_type'][activity_type]['total_distance'] += activity.get('distance', 0)
        stats['activities_by_type'][activity_type]['total_moving_time'] += activity.get('moving_time', 0)
        stats['activities_by_type'][activity_type]['total_elevation_gain'] += activity.get('total_elevation_gain', 0)
    
    # 詳細データが必要なアクティビティを取得
    activities_need_details = [a for a in activities if a.get('achievement_count', 0) > 0 or a.get('comment_count', 0) > 0]
    
    print(f"\n🔍 詳細取得が必要: {len(activities_need_details)}件")
    
    for i, activity in enumerate(activities_need_details):
        if (i + 1) % 10 == 0:
            print(f"   詳細取得: {i + 1}/{len(activities_need_details)}")
        
        activity_id = activity['id']
        
        # KOMとセグメント
        if activity.get('achievement_count', 0) > 0:
            details = fetch_activity_details(access_token, activity_id)
            if details and 'segment_efforts' in details:
                for effort in details['segment_efforts']:
                    if effort.get('achievements'):
                        for achievement in effort['achievements']:
                            if achievement.get('type') == 'overall':
                                stats['kom_count'] += 1
                    
                    segment = effort.get('segment', {})
                    if segment:
                        stats['segments_passed'].append({
                            'segment_id': segment.get('id'),
                            'segment_name': segment.get('name'),
                            'activity_id': activity_id
                        })
        
        # コメント
        if activity.get('comment_count', 0) > 0:
            comments = fetch_comments(access_token, activity_id)
            for comment in comments:
                athlete = comment.get('athlete', {})
                stats['comments'].append({
                    'activity_id': activity_id,
                    'activity_name': activity.get('name'),
                    'commenter_id': athlete.get('id'),
                    'commenter_name': f"{athlete.get('firstname', '')} {athlete.get('lastname', '')}".strip(),
                    'comment_text': comment.get('text'),
                    'created_at': comment.get('created_at')
                })
                stats['total_comments_count'] += 1
    
    return stats


def save_stats_to_db(client_id: str, stats: dict):
    """統計データをSupabaseに保存"""
    try:
        data = {
            'client_id': client_id,
            'data': stats,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        supabase.table('stats').upsert(data).execute()
        print("✅ 統計データを保存しました")
    except Exception as e:
        print(f"統計データ保存エラー: {e}")


def process_user(token_data: dict):
    """個別ユーザーのデータを処理"""
    client_id = token_data['client_id']
    athlete_profile = token_data.get('athlete_profile', {})
    athlete_name = f"{athlete_profile.get('firstname', '')} {athlete_profile.get('lastname', '')}".strip()
    athlete_id = athlete_profile.get('id', 'unknown')
    
    print(f"\n{'='*60}")
    print(f"👤 処理中: {athlete_name} (ID: {athlete_id})")
    print(f"   Client ID: {client_id}")
    print(f"{'='*60}")
    
    # Client Secretの確認
    client_secret = token_data.get('client_secret')
    if not client_secret:
        print("⚠️  Client Secretがありません - スキップします")
        return False
    
    # トークン情報
    access_token = token_data['access_token']
    refresh_token = token_data['refresh_token']
    expires_at = token_data['expires_at']
    
    # トークンを常にリフレッシュ
    print("\n🔄 トークンをリフレッシュ中...")
    new_access_token, new_refresh_token, new_expires_at = refresh_access_token(
        client_id, client_secret, refresh_token
    )
    
    if not new_access_token:
        print("❌ トークンのリフレッシュに失敗しました")
        return False
    
    access_token = new_access_token
    refresh_token = new_refresh_token
    expires_at = new_expires_at
    
    # DBを更新
    update_token_in_db(client_id, access_token, refresh_token, expires_at)
    
    # データ取得期間（2025年）
    start_date = datetime(2025, 1, 1, tzinfo=timezone.utc)
    end_date = datetime.now(timezone.utc)
    after_timestamp = int(start_date.timestamp())
    before_timestamp = int(end_date.timestamp())
    
    print(f"\n📅 取得期間: {start_date.strftime('%Y-%m-%d')} 〜 {end_date.strftime('%Y-%m-%d')}")
    
    # アクティビティ取得
    print("\n📥 アクティビティ一覧を取得中...")
    activities = fetch_activities(access_token, after_timestamp, before_timestamp)
    print(f"✅ 合計 {len(activities)} 件のアクティビティを取得しました")
    
    if len(activities) == 0:
        print("⚠️  アクティビティがありません")
        return True
    
    # 統計処理
    stats = process_activities(activities, access_token)
    
    # 結果表示
    print(f"\n📊 統計サマリー:")
    print(f"   総距離: {stats['total_distance'] / 1000:.1f} km")
    print(f"   アクティビティ数: {stats['total_activities']}")
    print(f"   コメント数: {stats['total_comments_count']}")
    print(f"   KOM数: {stats['kom_count']}")
    print(f"   通過セグメント数: {len(stats['segments_passed'])}")
    
    # データベースに保存
    print("\n💾 データベースに保存中...")
    save_stats_to_db(client_id, stats)
    
    print(f"\n✅ {athlete_name} のデータ取得完了！")
    return True


def main():
    print("🚀 全ユーザーのStravaデータ取得を開始します\n")
    
    # 全トークンを取得
    print("📋 データベースからユーザー一覧を取得中...")
    all_tokens = get_all_tokens_from_db()
    
    if not all_tokens:
        print("❌ ユーザーが見つかりませんでした")
        sys.exit(1)
    
    print(f"✅ {len(all_tokens)} 人のユーザーが見つかりました\n")
    
    # 各ユーザーを処理
    success_count = 0
    skip_count = 0
    error_count = 0
    
    for i, token_data in enumerate(all_tokens, 1):
        print(f"\n[{i}/{len(all_tokens)}]")
        try:
            result = process_user(token_data)
            if result:
                success_count += 1
            else:
                skip_count += 1
        except Exception as e:
            print(f"❌ エラーが発生しました: {e}")
            error_count += 1
    
    # 最終結果
    print(f"\n{'='*60}")
    print("🎉 全ての処理が完了しました！")
    print(f"{'='*60}")
    print(f"✅ 成功: {success_count} 人")
    print(f"⚠️  スキップ: {skip_count} 人")
    print(f"❌ エラー: {error_count} 人")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
