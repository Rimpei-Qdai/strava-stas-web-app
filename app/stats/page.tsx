'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

// Chart.jsの登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface StatsSummary {
  client_id: string;
  athlete_id: number;
  athlete_name: string;
  period: string;
  total_distance: number;
  total_activities: number;
  total_comments_count: number;
  kom_count: number;
  local_legend_count: number;
  last_updated: string;
  activities_by_type?: Array<{
    type: string;
    count: number;
    total_distance: number;
    total_moving_time: number;
    total_elevation_gain: number;
  }>;
  most_passed_segments?: Array<{
    segment_id: number;
    segment_name: string;
    pass_count: number;
  }>;
  comments?: Array<{
    activity_id: number;
    activity_name: string;
    commenter_id: number;
    commenter_name: string;
    comment_text: string;
    created_at: string;
  }>;
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'activities' | 'comments' | 'segments'>('overview');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateCommentsGiven = (stat: StatsSummary) => {
    if (!stat.comments || !Array.isArray(stat.comments)) return 0;
    return stat.comments.filter(c => c.commenter_id === stat.athlete_id).length;
  };

  // グラフデータの準備
  const athleteNames = stats.map(s => s.athlete_name);
  const colors = [
    'rgba(59, 130, 246, 0.8)',  // blue
    'rgba(16, 185, 129, 0.8)',  // green
    'rgba(249, 115, 22, 0.8)',  // orange
    'rgba(168, 85, 247, 0.8)',  // purple
    'rgba(236, 72, 153, 0.8)',  // pink
    'rgba(14, 165, 233, 0.8)',  // sky
  ];

  // 走行距離比較グラフ
  const distanceChartData = {
    labels: athleteNames,
    datasets: [
      {
        label: '走行距離 (km)',
        data: stats.map(s => (s.total_distance / 1000).toFixed(1)),
        backgroundColor: colors,
        borderColor: colors.map(c => c.replace('0.8', '1')),
        borderWidth: 2,
      },
    ],
  };

  // アクティビティ数比較グラフ
  const activitiesChartData = {
    labels: athleteNames,
    datasets: [
      {
        label: 'アクティビティ数',
        data: stats.map(s => s.total_activities),
        backgroundColor: colors,
        borderColor: colors.map(c => c.replace('0.8', '1')),
        borderWidth: 2,
      },
    ],
  };

  // KOM & Local Legend比較グラフ
  const komChartData = {
    labels: athleteNames,
    datasets: [
      {
        label: 'KOM',
        data: stats.map(s => s.kom_count),
        backgroundColor: 'rgba(249, 115, 22, 0.8)',
        borderColor: 'rgba(249, 115, 22, 1)',
        borderWidth: 2,
      },
      {
        label: 'Local Legend',
        data: stats.map(s => s.local_legend_count),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 2,
      },
    ],
  };

  // コメント比較グラフ
  const commentsChartData = {
    labels: athleteNames,
    datasets: [
      {
        label: '受け取ったコメント',
        data: stats.map(s => s.total_comments_count),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 2,
      },
      {
        label: 'したコメント',
        data: stats.map(s => calculateCommentsGiven(s)),
        backgroundColor: 'rgba(168, 85, 247, 0.8)',
        borderColor: 'rgba(168, 85, 247, 1)',
        borderWidth: 2,
      },
    ],
  };

  // アクティビティタイプ別集計
  const activityTypes = new Set<string>();
  stats.forEach(stat => {
    if (Array.isArray(stat.activities_by_type)) {
      stat.activities_by_type.forEach(type => {
        activityTypes.add(type.type);
      });
    }
  });

  const activityTypeChartData = {
    labels: Array.from(activityTypes),
    datasets: stats.map((stat, index) => ({
      label: stat.athlete_name,
      data: Array.from(activityTypes).map(type => {
        const typeData = Array.isArray(stat.activities_by_type) 
          ? stat.activities_by_type.find(t => t.type === type)
          : undefined;
        return typeData ? (typeData.total_distance / 1000).toFixed(1) : 0;
      }),
      backgroundColor: colors[index % colors.length],
      borderColor: colors[index % colors.length].replace('0.8', '1'),
      borderWidth: 2,
    })),
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const barChartOptions = {
    ...chartOptions,
    indexAxis: 'y' as const,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-800 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-8 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 mb-1 sm:mb-2">
                📊 統計ダッシュボード
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">2025年のStravaアクティビティ統計比較</p>
            </div>
            <Link
              href="/"
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-sm sm:text-base text-center"
            >
              ← ホームに戻る
            </Link>
          </div>

          {/* タブナビゲーション */}
          <div className="flex gap-1 sm:gap-2 border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setSelectedTab('overview')}
              className={`px-3 sm:px-6 py-2 sm:py-3 font-semibold transition-all text-xs sm:text-base whitespace-nowrap ${
                selectedTab === 'overview'
                  ? 'border-b-4 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📊 総合比較
            </button>
            <button
              onClick={() => setSelectedTab('activities')}
              className={`px-3 sm:px-6 py-2 sm:py-3 font-semibold transition-all text-xs sm:text-base whitespace-nowrap ${
                selectedTab === 'activities'
                  ? 'border-b-4 border-green-500 text-green-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              🏃 アクティビティ
            </button>
            <button
              onClick={() => setSelectedTab('comments')}
              className={`px-3 sm:px-6 py-2 sm:py-3 font-semibold transition-all text-xs sm:text-base whitespace-nowrap ${
                selectedTab === 'comments'
                  ? 'border-b-4 border-purple-500 text-purple-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              💬 コメント
            </button>
            <button
              onClick={() => setSelectedTab('segments')}
              className={`px-3 sm:px-6 py-2 sm:py-3 font-semibold transition-all text-xs sm:text-base whitespace-nowrap ${
                selectedTab === 'segments'
                  ? 'border-b-4 border-orange-500 text-orange-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              🏔️ セグメント
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-white mb-4"></div>
            <p className="text-white text-base sm:text-lg">データを読み込み中...</p>
          </div>
        ) : stats.length === 0 ? (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-6 sm:p-12 text-center">
            <div className="text-4xl sm:text-6xl mb-4">📊</div>
            <p className="text-gray-800 text-lg sm:text-xl font-bold mb-2">統計データがありません</p>
            <p className="text-gray-600 mb-4 text-sm sm:text-base">
              トークンを登録した後、Pythonスクリプトを実行してデータを取得してください
            </p>
            <div className="bg-blue-50 p-4 rounded-lg mb-6 text-left max-w-md mx-auto">
              <p className="font-semibold text-blue-800 mb-2 text-sm">📝 データ取得手順：</p>
              <ol className="list-decimal list-inside text-blue-700 space-y-1 text-xs sm:text-sm">
                <li>ホームページでStravaアカウントを登録</li>
                <li>ターミナルで <code className="bg-blue-100 px-2 py-1 rounded">cd scripts</code></li>
                <li><code className="bg-blue-100 px-2 py-1 rounded">python fetch_user_data.py</code> を実行</li>
                <li>このページをリロード</li>
              </ol>
            </div>
            <Link
              href="/"
              className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-sm sm:text-base"
            >
              ホームに戻る
            </Link>
          </div>
        ) : (
          <>
            {/* 総合サマリー */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl p-4 sm:p-6 text-white shadow-lg">
                <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">🚴</div>
                <div className="text-xs sm:text-sm opacity-90 mb-1">総走行距離</div>
                <div className="text-xl sm:text-3xl font-bold">
                  {(stats.reduce((sum, s) => sum + s.total_distance, 0) / 1000).toFixed(1)} km
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg sm:rounded-xl p-4 sm:p-6 text-white shadow-lg">
                <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">📝</div>
                <div className="text-xs sm:text-sm opacity-90 mb-1">総アクティビティ数</div>
                <div className="text-xl sm:text-3xl font-bold">
                  {stats.reduce((sum, s) => sum + s.total_activities, 0)}
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg sm:rounded-xl p-4 sm:p-6 text-white shadow-lg">
                <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">🏆</div>
                <div className="text-xs sm:text-sm opacity-90 mb-1">KOM総数</div>
                <div className="text-xl sm:text-3xl font-bold">
                  {stats.reduce((sum, s) => sum + s.kom_count, 0)}
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg sm:rounded-xl p-4 sm:p-6 text-white shadow-lg">
                <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">💬</div>
                <div className="text-xs sm:text-sm opacity-90 mb-1">コメント総数</div>
                <div className="text-xl sm:text-3xl font-bold">
                  {stats.reduce((sum, s) => sum + s.total_comments_count, 0)}
                </div>
              </div>
            </div>

            {/* タブコンテンツ */}
            {selectedTab === 'overview' && (
              <div className="space-y-4 sm:space-y-6">
                {/* 走行距離比較 */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-8">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">🚴 走行距離ランキング</h2>
                  <div className="h-64 sm:h-96">
                    <Bar data={distanceChartData} options={barChartOptions} />
                  </div>
                </div>

                {/* アクティビティ数比較 */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-8">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">📝 アクティビティ数ランキング</h2>
                  <div className="h-64 sm:h-96">
                    <Bar data={activitiesChartData} options={barChartOptions} />
                  </div>
                </div>

                {/* KOM & Local Legend比較 */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-8">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">🏆 KOM & Local Legend比較</h2>
                  <div className="h-64 sm:h-96">
                    <Bar data={komChartData} options={chartOptions} />
                  </div>
                </div>
              </div>
            )}

            {selectedTab === 'activities' && (
              <div className="space-y-4 sm:space-y-6">
                {/* アクティビティタイプ別比較 */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-8">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">🏃 アクティビティタイプ別走行距離</h2>
                  <div className="h-64 sm:h-96">
                    <Bar data={activityTypeChartData} options={chartOptions} />
                  </div>
                </div>

                {/* ユーザー別詳細テーブル */}
                {stats.map((stat) => (
                  <div key={`${stat.client_id}-${stat.athlete_id}`} className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-8">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">{stat.athlete_name} の詳細</h3>
                    {stat.activities_by_type && stat.activities_by_type.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {stat.activities_by_type.map((type) => (
                          <div key={type.type} className="bg-gray-50 p-3 sm:p-4 rounded-lg border-2 border-gray-200">
                            <div className="font-bold text-gray-800 mb-2 text-sm sm:text-base">{type.type}</div>
                            <div className="space-y-1 text-xs sm:text-sm text-gray-700">
                              <div>回数: {type.count}</div>
                              <div>距離: {(type.total_distance / 1000).toFixed(1)} km</div>
                              <div>
                                時間: {Math.floor(type.total_moving_time / 3600)}h{' '}
                                {Math.floor((type.total_moving_time % 3600) / 60)}m
                              </div>
                              <div>獲得標高: {type.total_elevation_gain.toFixed(0)} m</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600">アクティビティデータがありません</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {selectedTab === 'comments' && (
              <div className="space-y-4 sm:space-y-6">
                {/* コメント比較グラフ */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-8">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">💬 コメント送受信比較</h2>
                  <div className="h-64 sm:h-96">
                    <Bar data={commentsChartData} options={chartOptions} />
                  </div>
                </div>

                {/* コメント詳細テーブル */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-8">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">📋 コメント詳細</h2>
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <table className="w-full min-w-max">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700 text-xs sm:text-base">ユーザー</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-center font-semibold text-gray-700 text-xs sm:text-base">受取</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-center font-semibold text-gray-700 text-xs sm:text-base">送信</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-center font-semibold text-gray-700 text-xs sm:text-base">差分</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.map((stat) => {
                          const given = calculateCommentsGiven(stat);
                          const received = stat.total_comments_count;
                          const diff = received - given;
                          return (
                            <tr key={`${stat.client_id}-${stat.athlete_id}`} className="border-b hover:bg-gray-50">
                              <td className="px-2 sm:px-4 py-2 sm:py-3 font-semibold text-gray-800 text-xs sm:text-base">{stat.athlete_name}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-center text-green-600 font-bold text-xs sm:text-base">{received}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-center text-blue-600 font-bold text-xs sm:text-base">{given}</td>
                              <td className={`px-2 sm:px-4 py-2 sm:py-3 text-center font-bold text-xs sm:text-base ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                {diff > 0 ? '+' : ''}{diff}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {selectedTab === 'segments' && (
              <div className="space-y-4 sm:space-y-6">
                {stats.map((stat) => (
                  <div key={`${stat.client_id}-${stat.athlete_id}`} className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{stat.athlete_name}</h2>
                      <div className="flex gap-2 sm:gap-4">
                        <div className="bg-orange-100 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg">
                          <span className="text-xs sm:text-sm text-orange-800 font-semibold">KOM: </span>
                          <span className="text-base sm:text-xl font-bold text-orange-900">{stat.kom_count}</span>
                        </div>
                        <div className="bg-red-100 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg">
                          <span className="text-xs sm:text-sm text-red-800 font-semibold">Local Legend: </span>
                          <span className="text-base sm:text-xl font-bold text-red-900">{stat.local_legend_count}</span>
                        </div>
                      </div>
                    </div>

                    {stat.most_passed_segments && stat.most_passed_segments.length > 0 ? (
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-3 sm:mb-4">🏔️ 最も通過したセグメント</h3>
                        <div className="space-y-2">
                          {stat.most_passed_segments.slice(0, 10).map((segment, index) => (
                            <div key={segment.segment_id} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                              <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                                <div className="text-lg sm:text-2xl font-bold text-gray-400 flex-shrink-0">#{index + 1}</div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-gray-800 text-sm sm:text-base truncate">{segment.segment_name}</div>
                                  <div className="text-xs sm:text-sm text-gray-600">ID: {segment.segment_id}</div>
                                </div>
                              </div>
                              <div className="bg-blue-100 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg flex-shrink-0 ml-2">
                                <span className="text-base sm:text-xl font-bold text-blue-900">{segment.pass_count}</span>
                                <span className="text-xs sm:text-sm text-blue-700 ml-1">回</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-600 text-sm sm:text-base">セグメントデータがありません</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
