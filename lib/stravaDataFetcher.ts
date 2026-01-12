import type { StravaToken } from './types';

interface Activity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  start_date: string;
  start_date_local: string;
  average_speed: number;
  max_speed: number;
  average_cadence?: number;
  average_temp?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  kudos_count: number;
  comment_count: number;
  achievement_count: number;
}

interface Comment {
  activity_id: number;
  activity_name: string;
  commenter_id: number;
  commenter_name: string;
  comment_text: string;
  created_at: string;
}

interface SegmentEffort {
  segment_id: number;
  segment_name: string;
  activity_id: number;
}

interface ActivityTypeSummary {
  type: string;
  count: number;
  total_distance: number;
  total_moving_time: number;
  total_elevation_gain: number;
}

interface UserStats {
  athlete_id: number;
  athlete_name: string;
  period: string;
  total_distance: number;
  total_activities: number;
  activities: Activity[];
  activities_by_type: ActivityTypeSummary[];
  comments: Comment[];
  total_comments_count: number;
  segments_passed: SegmentEffort[];
  most_passed_segments: Array<{
    segment_id: number;
    segment_name: string;
    pass_count: number;
  }>;
  kom_count: number;
  local_legend_count: number;
  last_updated: string;
}

export async function fetchStravaData(
  token: StravaToken,
  startDate?: Date,
  endDate?: Date,
  onProgress?: (current: number, total: number) => void
): Promise<UserStats> {
  const accessToken = token.access_token;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };

  // デフォルトは2025年全体
  const afterTimestamp = startDate
    ? Math.floor(startDate.getTime() / 1000)
    : Math.floor(new Date('2025-01-01T00:00:00Z').getTime() / 1000);
  const beforeTimestamp = endDate
    ? Math.floor(endDate.getTime() / 1000)
    : Math.floor(new Date('2025-12-31T23:59:59Z').getTime() / 1000); // 2025年末まで

  console.log(
    `📊 ${token.athlete_name} のデータを取得中... (${new Date(afterTimestamp * 1000).toLocaleDateString()} - ${new Date(beforeTimestamp * 1000).toLocaleDateString()})`
  );
  console.log(`   after: ${afterTimestamp}, before: ${beforeTimestamp}`);

  const stats: UserStats = {
    athlete_id: token.athlete_id,
    athlete_name: token.athlete_name,
    period: `${new Date(afterTimestamp * 1000).toISOString().split('T')[0]} to ${new Date(beforeTimestamp * 1000).toISOString().split('T')[0]}`,
    total_distance: 0,
    total_activities: 0,
    activities: [],
    activities_by_type: [],
    comments: [],
    total_comments_count: 0,
    segments_passed: [],
    most_passed_segments: [],
    kom_count: 0,
    local_legend_count: 0,
    last_updated: new Date().toISOString(),
  };

  // アクティビティ一覧を取得（ページネーション対応）
  let page = 1;
  const perPage = 200; // ページあたり最大200件
  let allActivities: any[] = [];

  while (true) {
    const activitiesUrl = `https://www.strava.com/api/v3/athlete/activities?after=${afterTimestamp}&before=${beforeTimestamp}&page=${page}&per_page=${perPage}`;

    console.log(`   APIリクエスト: ${activitiesUrl}`);

    try {
      const response = await fetch(activitiesUrl, { headers });

      if (!response.ok) {
        console.error(`API エラー: ${response.status}`);
        const errorText = await response.text();
        console.error(`エラー詳細: ${errorText}`);
        break;
      }

      const activities = await response.json();
      console.log(`   レスポンス: ${activities.length} アクティビティ`);

      if (!activities || activities.length === 0) {
        break;
      }

      allActivities = allActivities.concat(activities);
      console.log(`   ページ ${page}: ${activities.length} アクティビティ取得 (累計: ${allActivities.length})`);

      if (activities.length < perPage) {
        break;
      }

      page++;
    } catch (error) {
      console.error('アクティビティ取得エラー:', error);
      break;
    }
  }

  console.log(`✅ 合計 ${allActivities.length} アクティビティを取得`);
  stats.total_activities = allActivities.length;

  // 各アクティビティの基本情報を一覧データから取得（詳細APIは不要）
  console.log('📝 アクティビティデータを処理中...');

  for (let i = 0; i < allActivities.length; i++) {
    const activity = allActivities[i];

    // 距離を加算
    stats.total_distance += activity.distance || 0;

    // アクティビティ情報を保存（一覧APIに含まれるデータを活用）
    stats.activities.push({
      id: activity.id,
      name: activity.name,
      distance: activity.distance,
      moving_time: activity.moving_time,
      elapsed_time: activity.elapsed_time,
      total_elevation_gain: activity.total_elevation_gain,
      type: activity.type,
      start_date: activity.start_date,
      start_date_local: activity.start_date_local,
      average_speed: activity.average_speed,
      max_speed: activity.max_speed,
      average_cadence: activity.average_cadence,
      average_temp: activity.average_temp,
      average_heartrate: activity.average_heartrate,
      max_heartrate: activity.max_heartrate,
      kudos_count: activity.kudos_count || 0,
      comment_count: activity.comment_count || 0,
      achievement_count: activity.achievement_count || 0,
    });

    if (i % 50 === 0 || i === allActivities.length - 1) {
      console.log(`   基本データ処理: ${i + 1}/${allActivities.length}`);
      if (onProgress) {
        // 進捗: 0-30%の範囲で報告
        const progressPercentage = (i + 1) / allActivities.length;
        const progressCount = Math.floor(progressPercentage * 30);
        onProgress(progressCount, 100);
      }
    }
  }

  // セグメント情報とコメントを並列バッチ処理で取得
  console.log('🏔️ セグメントとコメントをバッチ取得中...');
  const batchSize = 10; // 10件ずつ並列処理
  const activitiesWithDetails = allActivities.filter(a => a.achievement_count > 0 || a.comment_count > 0);
  
  console.log(`   詳細取得が必要なアクティビティ: ${activitiesWithDetails.length}/${allActivities.length}`);

  for (let i = 0; i < activitiesWithDetails.length; i += batchSize) {
    const batch = activitiesWithDetails.slice(i, Math.min(i + batchSize, activitiesWithDetails.length));
    
    // バッチ内のリクエストを並列実行
    const batchPromises = batch.map(async (activity) => {
      const activityId = activity.id;
      
      try {
        // セグメント情報が必要な場合のみ詳細APIを呼ぶ
        if (activity.achievement_count > 0) {
          const detailUrl = `https://www.strava.com/api/v3/activities/${activityId}`;
          const detailResponse = await fetch(detailUrl, { headers });

          if (detailResponse.ok) {
            const detail = await detailResponse.json();

            // セグメントエフォートを取得
            const segmentEfforts = detail.segment_efforts || [];
            for (const effort of segmentEfforts) {
              // KOMのチェック
              if (effort.kom_rank === 1) {
                stats.kom_count++;
              }

              // セグメント通過記録
              const segmentId = effort.segment?.id;
              const segmentName = effort.segment?.name || 'Unknown';
              if (segmentId) {
                stats.segments_passed.push({
                  segment_id: segmentId,
                  segment_name: segmentName,
                  activity_id: activityId,
                });
              }
            }
          }
        }

        // コメントがある場合のみ取得
        if (activity.comment_count > 0) {
          const commentsUrl = `https://www.strava.com/api/v3/activities/${activityId}/comments`;
          const commentsResponse = await fetch(commentsUrl, { headers });

          if (commentsResponse.ok) {
            const comments = await commentsResponse.json();

            for (const comment of comments) {
              const athlete = comment.athlete || {};
              stats.comments.push({
                activity_id: activityId,
                activity_name: activity.name,
                commenter_id: athlete.id,
                commenter_name: `${athlete.firstname || ''} ${athlete.lastname || ''}`.trim(),
                comment_text: comment.text,
                created_at: comment.created_at,
              });
              stats.total_comments_count++;
            }
          }
        }
      } catch (error) {
        console.error(`アクティビティ ${activityId} の取得エラー:`, error);
      }
    });

    // バッチ内の全リクエストを並列実行して完了を待つ
    await Promise.all(batchPromises);

    const processedCount = Math.min(i + batchSize, activitiesWithDetails.length);
    console.log(`   詳細データ取得: ${processedCount}/${activitiesWithDetails.length}`);
    
    // 進捗を報告（30%〜100%の範囲）
    const detailProgress = processedCount / activitiesWithDetails.length;
    const progressCount = Math.floor(30 + detailProgress * 70);
    if (onProgress) {
      onProgress(progressCount, 100);
    }

    // レート制限対策: バッチ間で待機
    if (i + batchSize < activitiesWithDetails.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // セグメント統計を計算
  const segmentCount: Record<string, { name: string; count: number }> = {};

  for (const seg of stats.segments_passed) {
    const key = seg.segment_id.toString();
    if (!segmentCount[key]) {
      segmentCount[key] = { name: seg.segment_name, count: 0 };
    }
    segmentCount[key].count++;
  }

  stats.most_passed_segments = Object.entries(segmentCount)
    .map(([id, data]) => ({
      segment_id: Number.parseInt(id),
      segment_name: data.name,
      pass_count: data.count,
    }))
    .sort((a, b) => b.pass_count - a.pass_count)
    .slice(0, 10);

  // アクティビティタイプ別の統計を計算
  const typeStats: Record<string, ActivityTypeSummary> = {};

  for (const activity of stats.activities) {
    const type = activity.type || 'Unknown';
    if (!typeStats[type]) {
      typeStats[type] = {
        type: type,
        count: 0,
        total_distance: 0,
        total_moving_time: 0,
        total_elevation_gain: 0,
      };
    }
    typeStats[type].count++;
    typeStats[type].total_distance += activity.distance || 0;
    typeStats[type].total_moving_time += activity.moving_time || 0;
    typeStats[type].total_elevation_gain += activity.total_elevation_gain || 0;
  }

  stats.activities_by_type = Object.values(typeStats).sort((a, b) => b.count - a.count);

  console.log(`✅ データ取得完了: ${token.athlete_name}`);
  console.log(`   距離: ${(stats.total_distance / 1000).toFixed(2)} km`);
  console.log(`   アクティビティ: ${stats.total_activities}`);
  console.log(`   コメント: ${stats.total_comments_count}`);
  console.log(`   KOM: ${stats.kom_count}`);
  console.log(`   アクティビティタイプ別:`);
  stats.activities_by_type.forEach(type => {
    console.log(`      ${type.type}: ${type.count}回 (${(type.total_distance / 1000).toFixed(1)}km)`);
  });

  return stats;
}
