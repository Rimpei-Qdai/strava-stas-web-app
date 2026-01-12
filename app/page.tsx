'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface Token {
  client_id: string;
  created_at: string;
  expires_at: number;
  athlete_profile: {
    id: number;
    firstname: string;
    lastname: string;
    profile: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

interface StatsSummary {
  filename: string;
  client_id: string;
  period: string;
  total_distance: number;
  total_activities: number;
  total_comments_count: number;
  kom_count: number;
  last_updated: string;
  activities_by_type?: Array<{
    type: string;
    count: number;
    total_distance: number;
    total_moving_time: number;
    total_elevation_gain: number;
  }>;
}

function HomeContent() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [stats, setStats] = useState<StatsSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [refreshingStats, setRefreshingStats] = useState<Set<string>>(new Set());
  const searchParams = useSearchParams();
  
  const success = searchParams.get('success');
  const athleteName = searchParams.get('athlete');
  const error = searchParams.get('error');
  
  useEffect(() => {
    fetchTokens();
    fetchStats();
  }, []);
  
  const fetchTokens = async () => {
    try {
      const response = await fetch('/api/tokens');
      const data = await response.json();
      setTokens(data);
    } catch (err) {
      console.error('Failed to fetch tokens:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };
  
  const handleDelete = async (clientId: string, athleteId: number, athleteName: string) => {
    if (!confirm(`${athleteName} のトークンを削除しますか？`)) {
      return;
    }
    
    try {
      const response = await fetch('/api/tokens', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ client_id: clientId, athlete_id: athleteId }),
      });
      
      if (response.ok) {
        fetchTokens();
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to delete token:', err);
      alert('トークンの削除に失敗しました');
    }
  };
  
  const handleRefreshStats = async (clientId: string, athleteId: number) => {
    const key = `${clientId}:${athleteId}`;
    setRefreshingStats(prev => new Set(prev).add(key));
    
    try {
      const response = await fetch('/api/stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ client_id: clientId, athlete_id: athleteId }),
      });
      
      if (response.ok) {
        // ポーリングが自動的に進捗を表示するので、すぐにrefreshingStatsから削除
        setRefreshingStats(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      }
    } catch (err) {
      console.error('Failed to refresh stats:', err);
      alert('データ取得の開始に失敗しました');
      setRefreshingStats(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  };
  
  const handleAuth = async () => {
    setShowAuthForm(true);
  };

  const handleStartAuth = async () => {
    if (!clientId || !clientSecret) {
      alert('Client IDとClient Secretの両方を入力してください');
      return;
    }

    try {
      const response = await fetch(`/api/auth?client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`);
      const data = await response.json();
      
      if (data.error) {
        alert(`エラー: ${data.error}`);
        return;
      }
      
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (err) {
      console.error('Failed to start auth:', err);
      alert('認証の開始に失敗しました');
    }
  };

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'no_code':
        return '認証コードが取得できませんでした。もう一度最初からお試しください。';
      case 'config_error':
        return 'システムの設定に問題があります。管理者に「設定エラー」と伝えてください。';
      case 'token_error':
        return 'Stravaからのデータ取得に失敗しました。しばらく待ってから再度お試しください。';
      case 'missing_client_info':
        return 'Client情報が不足しています。もう一度最初からお試しください。';
      case 'invalid_state':
        return '認証情報が不正です。もう一度最初からお試しください。';
      default:
        return '予期しないエラーが発生しました。ページを再読み込みしてもう一度お試しください。';
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-800 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-5xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-8 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 mb-2 sm:mb-3 text-center">
            🚴 Strava データ取得
          </h1>
          <p className="text-gray-600 text-center mb-4 sm:mb-6 text-sm sm:text-lg">
            下記の設定ガイドを読んで、データ取得をお願いします🙇
          </p>
          
          {/* ステータスバッジ */}
          <div className="flex justify-center gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-blue-100 text-blue-800 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold">
              👥 登録ユーザー: {tokens.length}人
            </div>
          </div>          {/* メインボタンエリア */}
          <div className="flex flex-col items-stretch sm:items-center gap-3 sm:gap-4">
            <button
              onClick={handleAuth}
              className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex items-center justify-center gap-2"
            >
              🔗 Stravaアカウントを登録する（API認証情報を入力）
            </button>

            <a
              href="/stats"
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex items-center justify-center gap-2"
            >
              📊 統計ダッシュボードを見る
            </a>

            <button
              onClick={() => setShowSetupGuide(!showSetupGuide)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              Strava設定ガイド
              <span className="text-sm">{showSetupGuide ? '▲' : '▼'}</span>
            </button>
          
          </div>
        </div>
        {/* 認証情報入力フォーム */}
        {showAuthForm && (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-8 mb-6 sm:mb-8 border-2 sm:border-4 border-orange-400">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-800">
                🔑 Strava API認証情報を入力
              </h2>
              <button
                onClick={() => setShowAuthForm(false)}
                className="text-gray-500 hover:text-gray-700 text-xl sm:text-2xl"
              >
                ✖
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                <p className="text-yellow-700 text-sm">
                  先ほどのページに表示してある、Client IDとClient Secretの両方を入力してください。
                  この情報は、どこにも保存されません。データが取得時に一時的に利用するだけなので、安心してください。 by 畑
                </p>
              </div>
              
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Client ID
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="例: 123456"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none text-lg"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Client Secret
                </label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="例: abc123def456..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none text-lg"
                />
              </div>
              
              <button
                onClick={handleStartAuth}
                disabled={!clientId || !clientSecret}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:shadow-lg hover:-translate-y-1 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                認証を開始
              </button>
            </div>
          </div>
        )}

        {/* Strava設定ガイド（初回セットアップ） */}
        {showSetupGuide && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8 border-4 border-orange-400">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                🛠️ セットアップガイド
              </h2>
              <button
                onClick={() => setShowSetupGuide(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">

              <div className="space-y-6">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    ステップ1: Strava APIアプリケーションの作成
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>
                      <a 
                        href="https://www.strava.com/settings/api" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-semibold"
                      >
                        Strava API設定ページ
                      </a>
                      を開く（Stravaにログインが必要です）
                    </li>
                    <li>「Create an App」ボタンをクリック</li>
                    <li>以下の情報を入力：
                      <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                        <li><strong>Application Name:</strong> 任意の名前（例: My Strava Data Tool）<br /> ※テキトーで大丈夫です。</li>
                        <li><strong>Category:</strong> Data Importer を選択</li>
                        <li><strong>Club:</strong> （空欄でOK）</li>
                        <li><strong>Website:</strong> http://localhost:3000 <br /> ※"test"とかテキトー文字でも問題ないです。 </li>
                        <li><strong>Authorization Callback Domain:</strong> <code className="bg-gray-100 px-2 py-1 rounded">localhost <br /> <span className="text-red-600 font-bold">※ここは必ず「localhost」としてください！</span></code></li>
                      </ul>
                    </li>
                    <li>利用規約に同意して「Create」ボタンをクリック</li>
                    <li>なぜか、アイコン画像の設定が求められるので、適当な画像を設定してください。マジでなんでもいいです笑</li>
                  </ol>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    ステップ2: 認証情報の確認
                  </h3>
                  <p className="text-gray-700 mb-2">
                    アプリ作成後、以下の情報が表示されます：
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 mb-3">
                    <li><strong>Client ID:</strong> 数字6桁（例: 192607）</li>
                    <li><strong>Client Secret:</strong> 長い英数字の文字列</li>
                    この二つの値をあとでコピペして使うので、ページは開いたままにしておいてください。
                  </ul>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    ステップ3: 完了
                  </h3>
                  <p className="text-gray-700">
                    設定が完了したら、上の「Stravaアカウントを登録する」ボタンから認証を開始できます！
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 使い方ガイド（展開式） */}
        {showGuide && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8 border-4 border-blue-400">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                📚 詳しい使い方ガイド
              </h2>
              <button
                onClick={() => setShowGuide(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-bold text-blue-800 mb-2 text-lg">
                  🎯 このツールの目的
                </h3>
                <p className="text-blue-700">
                  このツールは、あなたのStravaアクティビティデータ（走行距離、ペース、ルートなど）を取得するために必要な「鍵」を作成します。
                  一度登録すれば、自動的にデータを取得できるようになります。
                </p>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="text-xl font-bold text-gray-800 mb-3">
                  ステップ1: 「Stravaアカウントを登録する」ボタンをクリック
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 mb-2">オレンジ色の大きなボタンをクリックしてください。</p>
                  <div className="flex justify-center my-4">
                    <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-3 rounded-full font-semibold inline-block">
                      🔐 Stravaアカウントを登録する ← これです！
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-xl font-bold text-gray-800 mb-3">
                  ステップ2: Stravaにログイン
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p className="text-gray-700">Stravaのログイン画面が表示されます。</p>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                    <li>Stravaのメールアドレスとパスワードを入力</li>
                    <li>まだStravaアカウントがない場合は、先に<a href="https://www.strava.com/register" target="_blank" className="text-blue-600 hover:underline">Stravaで新規登録</a>してください</li>
                  </ul>
                </div>
              </div>

              <div className="border-l-4 border-yellow-500 pl-4">
                <h3 className="text-xl font-bold text-gray-800 mb-3">
                  ステップ3: アクセス許可
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p className="text-gray-700">
                    「このアプリがあなたのStravaデータにアクセスすることを許可しますか？」という画面が表示されます。
                  </p>
                  <div className="bg-yellow-50 border border-yellow-300 p-3 rounded mt-2">
                    <p className="text-yellow-800 font-semibold mb-1">✅ 許可される内容：</p>
                    <ul className="list-disc list-inside text-yellow-700 text-sm space-y-1 ml-4">
                      <li>あなたのアクティビティデータの読み取り（走行距離、時間など）</li>
                      <li>プロフィール情報の読み取り（名前、写真など）</li>
                    </ul>
                    <p className="text-yellow-800 font-semibold mt-2 mb-1">❌ 許可されない内容：</p>
                    <ul className="list-disc list-inside text-yellow-700 text-sm space-y-1 ml-4">
                      <li>アクティビティの編集や削除</li>
                      <li>新しいアクティビティの作成</li>
                    </ul>
                  </div>
                  <p className="text-gray-700 mt-2">
                    <strong>「承認」または「Authorize」</strong>ボタンをクリックしてください。
                  </p>
                </div>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="text-xl font-bold text-gray-800 mb-3">
                  ステップ4: 完了！データ自動取得
                </h3>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-green-800 mb-3">
                    ✅ 自動的にこのページに戻り、あなたの名前が「認証済みユーザー」リストに表示されます。
                  </p>
                  <div className="bg-white p-3 rounded border border-green-300 mb-3">
                    <p className="font-semibold text-green-800 mb-2">🚀 自動で実行される処理：</p>
                    <ol className="list-decimal list-inside text-green-700 text-sm space-y-1 ml-4">
                      <li>アクセストークンを自動取得・保存</li>
                      <li>2025年のアクティビティデータを取得（数分かかります）</li>
                      <li>統計情報を自動計算（距離、KOM、コメント数など）</li>
                      <li>画面に統計カードを表示</li>
                    </ol>
                  </div>
                  <p className="text-green-700">
                    ユーザーは何も操作する必要がありません。すべて自動で完了します！
                  </p>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-bold text-purple-800 mb-2 text-lg">
                  🔄 複数人で使用する場合
                </h3>
                <p className="text-purple-700 mb-2">
                  チームやグループで使用する場合、各メンバーがそれぞれ上記の手順を実行してください。
                </p>
                <ul className="list-disc list-inside text-purple-700 ml-4 space-y-1">
                  <li>各自がこのページにアクセス</li>
                  <li>各自が自分のStravaアカウントで認証</li>
                  <li>全員のデータが自動的に統合されます</li>
                </ul>
              </div>

              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h3 className="font-bold text-red-800 mb-2 text-lg">
                  ⚠️ よくある質問
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-red-800">Q: 安全ですか？</p>
                    <p className="text-red-700 text-sm">
                      A: はい。このツールはStravaの公式APIを使用しており、データの読み取りのみを許可します。
                      パスワードは保存されず、いつでも<a href="https://www.strava.com/settings/apps" target="_blank" className="underline">Stravaの設定</a>から許可を取り消せます。
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-red-800">Q: エラーが出ました</p>
                    <p className="text-red-700 text-sm">
                      A: ページを再読み込みして、もう一度最初から試してください。
                      それでも解決しない場合は、管理者に連絡してください。
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-red-800">Q: 登録を解除したい</p>
                    <p className="text-red-700 text-sm">
                      A: 下の「認証済みユーザー」リストから、あなたの名前の横にある「🗑️ 削除」ボタンをクリックしてください。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 成功メッセージ */}
        {success && athleteName && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-6 mb-6 rounded-lg shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🎉</span>
              <p className="font-bold text-xl">認証成功！</p>
            </div>
            <p className="text-lg mb-2">
              {decodeURIComponent(athleteName)} さんの登録が完了しました
            </p>
                <p className="text-sm">
                  2025年のアクティビティデータを取得しています。
                </p>
              <p className="text-xs text-green-700 mt-2">
                完了まで数分かかる場合があります。ページを閉じずに完了までお待ちください。
                ご自身のアイコンの横に年間走行距離が表示されれば完了です！
              </p>
            <p className="text-sm mt-2">
              下の「認証済みユーザー」リストに追加されました。
              データ取得の進捗を下記で確認できます！
            </p>
          </div>
        )}
        
        {/* エラーメッセージ */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 mb-6 rounded-lg shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">❌</span>
              <p className="font-bold text-xl">エラーが発生しました</p>
            </div>
            <p className="text-lg mb-3">{getErrorMessage(error)}</p>
            <div className="bg-red-50 p-4 rounded mt-3">
              <p className="font-semibold mb-2">解決方法：</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>ページを再読み込みしてもう一度試してください</li>
                <li>それでも解決しない場合は、「初めての方へ - 設定ガイド」を確認してください</li>
                <li>問題が続く場合は管理者に連絡してください</li>
              </ol>
            </div>
          </div>
        )}
        
        {/* トークン一覧 */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">📋 認証済みユーザー</h2>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-gray-900 mb-4"></div>
              <p className="text-gray-600 text-lg">データを読み込んでいます...</p>
            </div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-7xl mb-6">👤</div>
              <p className="text-gray-800 text-xl font-bold mb-2">まだ登録されているユーザーがいません</p>
              <p className="text-gray-600 mb-6">
                上の「Stravaアカウントを登録する」ボタンをクリックして、最初のユーザーを登録しましょう
              </p>
              <div className="bg-blue-50 p-6 rounded-lg max-w-md mx-auto">
                <p className="text-blue-800 font-semibold mb-2">💡 ヒント</p>
                <p className="text-blue-700 text-sm">
                  使い方がわからない場合は、上の「使い方がわからない方はこちら」をクリックして、詳しいガイドを確認してください。
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {tokens.map((token) => {
                const isExpired = Date.now() / 1000 >= token.expires_at;
                const expiresDate = new Date(token.expires_at * 1000);
                const userStats = stats.find(s => s.client_id === token.client_id && s.athlete_id === token.athlete_id);
                const key = `${token.client_id}:${token.athlete_id}`;
                const isRefreshing = refreshingStats.has(key);
                
                return (
                  <div
                    key={key}
                    className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 hover:shadow-lg transition-all duration-200 border-2 border-gray-200"
                  >
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div className="flex items-start space-x-4 flex-1">
                        {token.athlete_profile.profile && (
                          <img
                            src={token.athlete_profile.profile}
                            alt={`${token.athlete_profile.firstname} ${token.athlete_profile.lastname}`}
                            className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-gray-800 mb-1">
                            {token.athlete_profile.firstname} {token.athlete_profile.lastname}
                          </h3>
                          <div className="space-y-1">
                            
                            {/* 統計データ表示 */}
                            {userStats && (
                              <div className="mt-3 space-y-3">
                                {/* 全体サマリー */}
                                <div className="bg-blue-50 p-3 rounded-lg">
                                  <p className="text-xs font-semibold text-blue-800 mb-2">📊 2025年の統計データ</p>
                                  <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                                    <div>
                                      <span className="font-semibold">ライド走行距離:</span> {(() => {
                                        const rideData = userStats.activities_by_type?.find((t: any) => t.type === 'Ride');
                                        return rideData ? (rideData.total_distance / 1000).toFixed(1) : '0.0';
                                      })()} km
                                    </div>
                                    <div>
                                      <span className="font-semibold">アクティビティ:</span> {userStats.total_activities}回
                                    </div>
                                    <div>
                                      <span className="font-semibold">コメント:</span> {userStats.total_comments_count}
                                    </div>
                                    <div>
                                      <span className="font-semibold">KOM:</span> {userStats.kom_count}
                                    </div>
                                  </div>
                                  <p className="text-xs text-blue-600 mt-2">
                                    最終更新: {new Date(userStats.last_updated).toLocaleString('ja-JP')}
                                  </p>
                                </div>

                                {/* アクティビティタイプ別の統計（ライド以外） */}
                                {userStats.activities_by_type && userStats.activities_by_type.length > 0 && (
                                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                                    <p className="text-xs font-semibold text-purple-800 mb-2">🏃 その他のアクティビティ</p>
                                    <div className="space-y-2">
                                      {userStats.activities_by_type
                                        .filter((typeData: any) => typeData.type !== 'Ride')
                                        .map((typeData: any) => (
                                        <div key={typeData.type} className="bg-white p-2 rounded border border-purple-100">
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-semibold text-purple-900">{typeData.type}</span>
                                            <span className="text-xs text-purple-600">{typeData.count}回</span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-1 text-xs text-purple-700">
                                            <div>距離: {(typeData.total_distance / 1000).toFixed(1)} km</div>
                                            <div>時間: {Math.floor(typeData.total_moving_time / 3600)}h {Math.floor((typeData.total_moving_time % 3600) / 60)}m</div>
                                            <div className="col-span-2">獲得標高: {typeData.total_elevation_gain.toFixed(0)} m</div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {!userStats && !isRefreshing && (
                              <div className="mt-3 bg-yellow-50 p-3 rounded-lg">
                                <p className="text-xs text-yellow-800">
                                  📊 統計データがまだ取得されていません<br />
                                  管理者がローカル環境でデータ取得を実行する必要があります
                                </p>
                              </div>
                            )}
                            
                            {isRefreshing && (
                              <div className="mt-3 bg-blue-50 p-3 rounded-lg flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
                                <p className="text-xs text-blue-800">
                                  データを取得中...
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
        </div>

      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
