"use client";

import { useState, useEffect, useRef } from "react";
import SmartphoneFrame from "../../../components/frame/SmartphoneFrame";
import SmartphoneHeader from "../../../components/frame/SmartphoneHeader";
import StudentBell from "../../../components/student/StudentBell";
import StudentFooter from "../../../components/student/StudentFooter";
import Scene from "../../../components/3D/Scene";
import { useNews } from "../../../hooks/useNews";
import { emotionService } from "../../../lib/api";

// チャットメッセージの型定義
interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  emotion?: string;
  timestamp: Date;
  ai_used?: boolean;
}

export default function Home() {
  const [message, setMessage] = useState(""); // 入力テキスト管理
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]); // チャット履歴管理
  const [isLoading, setIsLoading] = useState(false); // 送信中フラグ
  const [error, setError] = useState<string | null>(null); // エラー管理
  const [jsonData, setJsonData] = useState<any>(null); // 取得したJSONデータ
  const [chatAreaBackground, setChatAreaBackground] = useState<string>("white"); // チャットエリア背景
  const [chatBackgroundImage, setChatBackgroundImage] = useState<string | null>(null); // チャット背景画像
  const { newNewsCount } = useNews(); // ニュースカウントを取得
  const chatContainerRef = useRef<HTMLDivElement>(null); // チャットコンテナの参照

  // チャット履歴の最大数を制限（パフォーマンス向上のため）
  const MAX_CHAT_HISTORY = 50;

  // コンポーネントマウント時にチャット背景設定を読み込み
  useEffect(() => {
    const savedChatAreaBackground = localStorage.getItem('chatAreaBackground');
    const savedChatBackgroundImage = localStorage.getItem('chatBackgroundImage');
    if (savedChatAreaBackground) {
      setChatAreaBackground(savedChatAreaBackground);
    }
    if (savedChatBackgroundImage) {
      setChatBackgroundImage(savedChatBackgroundImage);
    }
  }, []);

  // 新しいメッセージが追加されたときに自動スクロール
  useEffect(() => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      // スムーズスクロールで最下部に移動
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatHistory, isLoading]);

  // チャットエリア背景を取得する関数
  const getChatAreaBackgroundStyle = () => {
    const backgroundMap: Record<string, string> = {
      'white': '#f5f5f5',
      'light_blue': '#e6f3ff',
      'light_green': '#e6ffe6',
      'light_pink': '#ffe6f0',
      'light_purple': '#f0e6ff',
      'cream': '#fff5d6',
      'mint': '#e6fff5',
      'light_gray': '#f0f0f0'
    };
    return backgroundMap[chatAreaBackground] || '#f5f5f5';
  };

  // チャットエリアのスタイルを取得する関数
  const getChatAreaStyle = () => {
    if (chatAreaBackground === 'custom' && chatBackgroundImage) {
      return {
        background: `url(${chatBackgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    }
    return {
      background: getChatAreaBackgroundStyle()
    };
  };

  // AI にメッセージを送信する関数
  const handleSend = async () => {
    if (!message.trim() || isLoading) return; // 空またはローディング中は何もしない
    
    setError(null);
    setIsLoading(true);

    // ユーザーメッセージを履歴に追加
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: message.trim(),
      timestamp: new Date(),
    };

    setChatHistory((prev) => {
      const newHistory = [...prev, userMessage];
      // 履歴が最大数を超えた場合、古いメッセージを削除
      return newHistory.length > MAX_CHAT_HISTORY 
        ? newHistory.slice(-MAX_CHAT_HISTORY) 
        : newHistory;
    });
    const currentMessage = message;
    setMessage(""); // 入力欄をクリア

    // AI会話記録を保存（今日の日付）
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    const aiConversationDates = JSON.parse(localStorage.getItem('aiConversationDates') || '{}');
    aiConversationDates[dateKey] = {
      date: dateKey,
      lastConversation: today.toISOString(),
      messageCount: (aiConversationDates[dateKey]?.messageCount || 0) + 1
    };
    localStorage.setItem('aiConversationDates', JSON.stringify(aiConversationDates));

    try {
      // 感情に基づいてフォローアップの必要性を判定
      const needsFollowup = currentMessage.toLowerCase().includes('不安') || 
                           currentMessage.toLowerCase().includes('しんどい') ||
                           currentMessage.toLowerCase().includes('辛い') ||
                           currentMessage.toLowerCase().includes('心配');
      
      // バックエンドAPIにメッセージを送信（ask.pyエンドポイントを使用）
      const response = await emotionService.ask({
        prompt: currentMessage,
        style: "buddy",
        followup: needsFollowup // 必要な場合のみフォローアップを有効化
      });
      
      // AI の返信を履歴に追加
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.reply,
        emotion: response.emotion,
        timestamp: new Date(),
        ai_used: response.used_llm,
      };

      setChatHistory((prev) => {
        const newHistory = [...prev, aiMessage];
        // 履歴が最大数を超えた場合、古いメッセージを削除
        return newHistory.length > MAX_CHAT_HISTORY 
          ? newHistory.slice(-MAX_CHAT_HISTORY) 
          : newHistory;
      });

      // AI応答時にも会話記録を更新
      const updatedAiConversationDates = JSON.parse(localStorage.getItem('aiConversationDates') || '{}');
      if (updatedAiConversationDates[dateKey]) {
        updatedAiConversationDates[dateKey].lastConversation = new Date().toISOString();
        updatedAiConversationDates[dateKey].messageCount += 1;
        localStorage.setItem('aiConversationDates', JSON.stringify(updatedAiConversationDates));
      }

      // JSONデータを取得（デモ用の学生ID "demo-student" を使用）
      try {
        const latestResponse = await emotionService.getLatestAiResponse("demo-student");
        if (latestResponse) {
          setJsonData(latestResponse);
          console.log("Latest AI response JSON:", latestResponse);
        }
      } catch (jsonErr) {
        console.warn("Failed to get JSON data:", jsonErr);
      }

    } catch (err) {
      console.error('🚨 Message send error:', err);
      
      let errorMessageText = 'エラーが発生しました';
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessageText = 'リクエストがタイムアウトしました。もう一度試してください。';
        } else if (err.message.includes('fetch')) {
          errorMessageText = 'サーバーに接続できません。接続を確認してください。';
        } else {
          errorMessageText = `エラー: ${err.message}`;
        }
      }
      
      setError(errorMessageText);
      
      // エラー時のフォールバック応答
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'すみません、現在返信できません。しばらく経ってから再度お試しください。',
        timestamp: new Date(),
      };
      setChatHistory((prev) => {
        const newHistory = [...prev, errorMessage];
        // 履歴が最大数を超えた場合、古いメッセージを削除
        return newHistory.length > MAX_CHAT_HISTORY 
          ? newHistory.slice(-MAX_CHAT_HISTORY) 
          : newHistory;
      });
      
    } finally {
      setIsLoading(false);
    }
  };

  // 感情に応じた色を取得
  const getEmotionColor = (emotion?: string): string => {
    if (!emotion) return '#6B7280';
    const colorMap: Record<string, string> = {
      '楽しい': '#10B981',
      '悲しい': '#3B82F6', 
      '怒り': '#EF4444',
      '不安': '#F59E0B',
      'しんどい': '#8B5CF6',
      '中立': '#6B7280'
    };
    return colorMap[emotion] || '#6B7280';
  };

  // 感情ラベルを翻訳
  const translateEmotion = (emotion?: string): string => {
    if (!emotion) return '';
    const translationMap: Record<string, string> = {
      '楽しい': '楽しい',
      '悲しい': '悲しい',
      '怒り': '怒り',
      '不安': '不安',
      'しんどい': 'しんどい',
      '中立': '中立'
    };
    return translationMap[emotion] || emotion;
  };

  return (
    <>
      {/* アニメーション用のスタイル */}
      <style jsx>{`
        @keyframes bounce {
          0%, 80%, 100% { 
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% { 
            transform: scale(1);
            opacity: 1;
          }
        }
        
        :global(.custom-scrollbar) {
          scrollbar-width: thin;
          scrollbar-color: #ccc #f1f1f1;
        }
        
        :global(.custom-scrollbar::-webkit-scrollbar) {
          width: 6px;
        }
        
        :global(.custom-scrollbar::-webkit-scrollbar-track) {
          background: #f1f1f1;
          border-radius: 3px;
        }
        
        :global(.custom-scrollbar::-webkit-scrollbar-thumb) {
          background: #ccc;
          border-radius: 3px;
        }
        
        :global(.custom-scrollbar::-webkit-scrollbar-thumb:hover) {
          background: #999;
        }
      `}</style>
      
      <div className="flex items-center justify-center w-full h-full">
      <SmartphoneFrame>
        <SmartphoneHeader />
        <div style={{ position: "absolute", top: "25mm", right: "3mm", zIndex: 50 }}>
          <StudentBell count={newNewsCount} color="#fff" />
        </div>

        <main
          className="flex flex-col w-full"
          style={{
            width: "100%",
            height: "100vh", // ビューポート全体の高さを使用
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#001f3f", // ← 紺色
            position: "relative",
            paddingBottom: "60px", // フッター分の余白を追加
            overflow: "hidden", // メインコンテナのスクロールを防ぐ
          }}
        >
          <div style={{ height: "110px", flexShrink: 0 }}></div>
          
          {/* 3Dモデル */}
          <div
            style={{
              width: "100%",
              height: "200px", // 固定高さに変更
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              flexShrink: 0, // 縮小を防ぐ
            }}
          >
            <Scene />
          </div>
          
          {/* チャット履歴 */}
          <div
            style={{
              flex: 1, // 残りの空間を全て使用
              display: "flex",
              flexDirection: "column",
              padding: "0 10px",
              margin: "0",
              minHeight: 0, // フレックスアイテムが縮小可能にする
            }}
          >
            {/* エラー表示 */}
            {error && (
              <div
                style={{
                  background: "#fee",
                  border: "1px solid #fcc",
                  borderRadius: "4px",
                  padding: "6px",
                  marginBottom: "8px",
                  fontSize: "12px",
                  color: "#c33",
                  flexShrink: 0, // エラー表示は縮小しない
                }}
              >
                {error}
              </div>
            )}
            
            <div
              ref={chatContainerRef}
              style={{
                flex: 1, // 親の残り空間を使用
                ...getChatAreaStyle(), // 動的な背景を適用
                borderRadius: "8px",
                border: "1px solid #ccc",
                padding: "8px",
                overflowY: "auto", // 縦スクロールを有効
                fontSize: "14px",
                marginBottom: "8px",
                display: "flex",
                flexDirection: "column",
                minHeight: 0, // 重要: フレックスアイテムの縮小を許可
                scrollBehavior: "smooth", // スムーズスクロール
                // カスタムスクロールバー（Webkit系ブラウザ用）
                WebkitOverflowScrolling: "touch",
              }}
              className="custom-scrollbar"
            >
              {chatHistory.length === 0 ? (
                <div style={{ marginBottom: "5px", color: "#666" }}>
                  🤖 AIアシスタントと会話してみましょう！<br />
                  今日の気持ちや出来事を聞かせてください。
                </div>
              ) : (
                <>
                  {chatHistory.map((msg) => (
                    <div 
                      key={msg.id} 
                      style={{ 
                        marginBottom: "10px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: msg.type === 'user' ? 'flex-end' : 'flex-start',
                        flexShrink: 0, // メッセージは縮小しない
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "80%",
                          padding: "8px 12px",
                          borderRadius: "12px",
                          background: msg.type === 'user' ? '#007bff' : '#f1f1f1',
                          color: msg.type === 'user' ? '#fff' : '#333',
                          fontSize: "13px",
                          wordWrap: "break-word",
                        }}
                      >
                        {msg.content}
                      </div>
                      
                      {/* 感情タグとタイムスタンプ */}
                      <div
                        style={{
                          fontSize: "10px",
                          color: "#888",
                          marginTop: "2px",
                          display: "flex",
                          gap: "6px",
                          alignItems: "center",
                        }}
                      >
                        {msg.emotion && (
                          <span
                            style={{
                              backgroundColor: getEmotionColor(msg.emotion) + '20',
                              color: getEmotionColor(msg.emotion),
                              padding: "2px 6px",
                              borderRadius: "10px",
                              fontSize: "9px",
                            }}
                          >
                            {translateEmotion(msg.emotion)}
                          </span>
                        )}
                        {msg.ai_used && (
                          <span style={{ color: '#007bff', fontSize: '8px' }}>
                            🤖AI
                          </span>
                        )}
                        <span>
                          {msg.timestamp.toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {/* ローディング表示 */}
                  {isLoading && (
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "6px", 
                      color: "#666", 
                      fontSize: "12px",
                      flexShrink: 0,
                      marginTop: "auto", // 自動的に下部に配置
                    }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "2px",
                        }}
                      >
                        <div style={{ width: "4px", height: "4px", background: "#007bff", borderRadius: "50%", animation: "bounce 1.4s infinite" }}></div>
                        <div style={{ width: "4px", height: "4px", background: "#007bff", borderRadius: "50%", animation: "bounce 1.4s infinite 0.2s" }}></div>
                        <div style={{ width: "4px", height: "4px", background: "#007bff", borderRadius: "50%", animation: "bounce 1.4s infinite 0.4s" }}></div>
                      </div>
                      AIが考えています...
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
            
          {/* 入力エリア */}
          <div 
            style={{
              height: "auto", // 自動高さに変更
              minHeight: "80px", // 最小高さを設定
              display: "flex",
              alignItems: "flex-start",
              padding: "10px",
              marginBottom: "5mm",
              flexShrink: 0, // 入力エリアは縮小しない
            }}
          >
            <div style={{ display: "flex", gap: "8px", width: "100%", flexDirection: "column" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  placeholder="今の気持ちや出来事を教えてください..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSend()}
                  disabled={isLoading}
                  maxLength={500}
                  style={{
                    flex: 1,
                    height: "40px",
                    padding: "0 12px",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    background: isLoading ? "#f5f5f5" : "#fff",
                    fontSize: "14px",
                    color: isLoading ? "#999" : "#333",
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !message.trim()}
                  style={{
                    width: "60px",
                    height: "40px",
                    background: isLoading || !message.trim() ? "#ccc" : "#007bff",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    cursor: isLoading || !message.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {isLoading ? "..." : "送信"}
                </button>
              </div>
              
              {/* 文字数カウンター */}
              <div style={{ textAlign: "right", fontSize: "10px", color: message.length > 450 ? "#c33" : "#999" }}>
                {message.length}/500
              </div>
            </div>
          </div>
        </main>

        <StudentFooter />
      </SmartphoneFrame>
    </div>
    </>
  );
}
