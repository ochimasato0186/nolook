/**
 * 感情ログ解析API サービス - 修正版
 */

import { analyzeText } from "../nolookApi";

// API URL設定（今は ask には使っていないが他で使う可能性があるので残しておく）
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

// 型定義
export interface EmotionLogRequest {
  text: string;
  timestamp?: string;
  user_id?: string;
}

export interface EmotionAnalysisResult {
  emotion: string;
  confidence: number;
  suggestion?: string;
  timestamp: string;
}

export interface SummaryRequest {
  start_date?: string;
  end_date?: string;
  user_id?: string;
}

export interface SummaryResponse {
  total_entries: number;
  emotion_breakdown: Record<string, number>;
  insights: string[];
  period: {
    start: string;
    end: string;
  };
}

export interface WeeklyReportResponse {
  week_start: string;
  week_end: string;
  emotion_summary: {
    [emotion: string]: number;
  };
  insights: string[];
  recommendations: string[];
}

export interface AiResponseData {
  timestamp: string;
  student_id: string;
  class_id: string;
  user_input: string;
  ai_response: string;
  emotion: string;
  emotion_labels: Record<string, number>;
  used_llm: boolean;
  session_info: {
    date: string;
    time: string;
    day_of_week: string;
  };
}

export interface AiResponsesData {
  responses: AiResponseData[];
}

// チャットメッセージ型
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AskRequest {
  messages?: ChatMessage[];  // ✅ 新: 履歴を含む会話
  prompt?: string;           // 後方互換用（deprecated）
  student_id?: string;
  class_id?: string;
  selected_emotion?: string;
  style?: string;
  followup?: boolean;
}

export interface AskResponse {
  reply: string;
  emotion: string;
  labels: Record<string, number>;
  used_llm: boolean;
  llm_reason?: string;
  style: string;
  followup: boolean;
}

/**
 * 1. ローカル感情判定（フォールバック用）
 */
function detectLocalEmotion(text: string): string {
  const lower = text.toLowerCase();

  // ✅ 改善版：正規表現で語幹を拾う（バックエンド版と同じロジック）

  // ポジティブ（楽しい）
  if (
    /楽しい|楽しかっ|楽しく|楽しくなって/.test(lower) ||
    /嬉しい|うれし/.test(lower) ||
    /幸せ|しあわせ/.test(lower) ||
    /最高|サイコー/.test(lower) ||
    /よかった|良かった/.test(lower) ||
    /ワクワク|わくわく/.test(lower) ||
    /好き|大好き/.test(lower) ||
    /はまってる|ハマってる/.test(lower) ||
    /楽しみ|面白い|おもしろい/.test(lower)
  ) {
    return "楽しい";
  }

  // 悲しい
  if (
    /悲しい|かなしい|悲しかっ/.test(lower) ||
    /辛い|つらい/.test(lower) ||
    /寂し|さみし/.test(lower) ||
    /落ち込|萎え|萎えた/.test(lower) ||
    /泣きたい|泣いた|泣いて|涙/.test(lower) ||
    /ショック|へこむ|へこんだ/.test(lower)
  ) {
    return "悲しい";
  }

  // 怒り
  if (
    /怒|ムカつく|むかつく/.test(lower) ||
    /腹立|イライラ|いらいら/.test(lower) ||
    /うざい|ウザい/.test(lower) ||
    /許せない|キレた|キレそう/.test(lower)
  ) {
    return "怒り";
  }

  // 不安
  if (
    /不安|心配|しんぱい/.test(lower) ||
    /怖い|こわい/.test(lower) ||
    /緊張|ドキドキ|どきどき/.test(lower) ||
    /やばい|ヤバい/.test(lower) ||
    /どうしよう/.test(lower) ||
    /テスト|試験|受験|発表|面接/.test(lower)
  ) {
    return "不安";
  }

  // しんどい
  if (
    /疲れ|つかれ|疲れた/.test(lower) ||
    /しんどい/.test(lower) ||
    /大変|たいへん/.test(lower) ||
    /きつい|きつかった/.test(lower) ||
    /だるい|だるかった/.test(lower) ||
    /眠い|ねむい/.test(lower) ||
    /分からん|わからん|分かんない|わかんない/.test(lower) ||
    /難しい|むずかしい/.test(lower) ||
    /困った|めんどくさい|めんどう|面倒|苦しい|無理|疲弊/.test(lower)
  ) {
    return "しんどい";
  }

  // 挨拶系は中立扱い
  if (
    /こんにちは|おはよう|こんばんは|お疲れ|おつかれ/.test(lower)
  ) {
    return "中立";
  }

  return "中立";
}

/**
 * 2. ラベルの生成（6分類のスコア）
 */
function buildLabels(emotion: string): Record<string, number> {
  return {
    楽しい: emotion === "楽しい" ? 1.0 : 0.0,
    悲しい: emotion === "悲しい" ? 1.0 : 0.0,
    怒り: emotion === "怒り" ? 1.0 : 0.0,
    不安: emotion === "不安" ? 1.0 : 0.0,
    しんどい: emotion === "しんどい" ? 1.0 : 0.0,
    中立: emotion === "中立" ? 1.0 : 0.0,
  };
}

/**
 * 3. 感情に応じた返答文の生成
 */
function buildReply(emotion: string, text: string): string {
  switch (emotion) {
    case "楽しい": {
      const positiveResponses = [
        "それは本当に素晴らしいですね！その楽しい気持ちが伝わってきます。",
        "とても良い気分ですね！そのポジティブなエネルギーを大切にしてください。",
        "楽しそうで何よりです！良いことがあったようですね。",
        "嬉しい気持ちが伝わってきます！素敵な一日を過ごされているようですね。",
      ];
      return positiveResponses[Math.floor(Math.random() * positiveResponses.length)];
    }
    case "悲しい": {
      const sadResponses = [
        "つらい気持ちを話してくれてありがとう。一人で抱え込まず、誰かに話すことは大切です。",
        "そういう日もありますね。無理をせず、自分のペースで大丈夫ですよ。",
        "大変な気持ちを理解します。時間が解決してくれることもあるので、焦らずに。",
        "辛い状況ですね。でも、あなたは一人ではありませんよ。",
      ];
      return sadResponses[Math.floor(Math.random() * sadResponses.length)];
    }
    case "怒り": {
      const angryResponses = [
        "その気持ち、よく分かります。怒りを感じるのは自然な反応です。",
        "イライラしますよね。そんな時は深呼吸して、少し落ち着く時間を取ってみてください。",
        "腹立たしい気持ち、理解できます。何がそんなに嫌だったのか、話してみませんか？",
        "怒りの感情は大切なサインです。無理に抑え込まず、適切に表現していきましょう。",
      ];
      return angryResponses[Math.floor(Math.random() * angryResponses.length)];
    }
    case "不安": {
      const lower = text.toLowerCase();
      if (
        lower.includes("テスト") ||
        lower.includes("試験") ||
        lower.includes("発表") ||
        lower.includes("面接")
      ) {
        const testResponses = [
          "テストお疲れ様です。緊張するのは自然なことですよ。準備した分、きっと大丈夫です。",
          "試験前は不安になりますね。でも、その不安は真剣に取り組んでいる証拠でもあります。",
          "発表は緊張しますが、きっとうまくいきますよ。深呼吸して、自分らしく頑張ってください。",
          "面接は誰でも緊張するものです。あなたの良さがきっと伝わります。",
        ];
        return testResponses[Math.floor(Math.random() * testResponses.length)];
      } else {
        const anxiousResponses = [
          "不安な気持ち、よく分かります。心配事について詳しく聞かせてもらえますか？",
          "緊張したり不安になったりするのは誰にでもあることです。一歩ずつ解決していきましょう。",
          "心配になるのは自然なことです。まずは深呼吸して、今できることから始めてみませんか？",
          "不安を感じているのですね。その気持ちを受け止めつつ、一緒に考えていきましょう。",
        ];
        return anxiousResponses[Math.floor(Math.random() * anxiousResponses.length)];
      }
    }
    case "しんどい": {
      const tiredResponses = [
        "本当にお疲れ様です。無理をしないで、休むことも大切ですよ。",
        "大変そうですね。一人で抱え込まず、周りの人に助けを求めても大丈夫です。",
        "しんどい時は無理をしないことが一番です。今日は少しゆっくりしませんか？",
        "お疲れのようですね。勉強や日常のことで疲れた時は、適度な休憩を取ってくださいね。",
      ];
      return tiredResponses[Math.floor(Math.random() * tiredResponses.length)];
    }
    default: {
      const neutralResponses = [
        "お話しを聞かせてくれてありがとう。どんなことでも気軽に話してくださいね。",
        "なるほど、そういうことなんですね。もう少し詳しく聞かせてもらえますか？",
        "お疲れ様です。今日はどんな一日でしたか？",
        "こんにちは！今の気持ちや状況について、お聞かせください。",
      ];
      return neutralResponses[Math.floor(Math.random() * neutralResponses.length)];
    }
  }
}

/**
 * ローカルAIでの応答生成（共通処理） ★ 互換性のため残す
 */
function buildLocalAskResponse(
  emotion: string,
  text: string,
  request: AskRequest
): AskResponse {
  const labels = buildLabels(emotion);
  const reply = buildReply(emotion, text);

  let finalReply = reply;
  if (request.followup) {
    finalReply += " よかったら、もう少し詳しく教えて？";
  }

  return {
    reply: finalReply,
    emotion,
    labels,
    used_llm: true,
    llm_reason: "LOCAL_ENHANCED_AI",
    style: request.style || "buddy",
    followup: request.followup || false,
  };
}

// ========= メインサービス =========

export const emotionService = {
  /**
   * 質問に対する回答を取得 - 履歴対応版
   * 1. まず /api/fb-analyze（Next.js → Python）に履歴を送る
   * 2. 成功したら、その reply / emotion を採用
   * 3. エラー時だけローカルテンプレでフォールバック
   */
  async ask(request: AskRequest): Promise<AskResponse> {
    console.log("📝 Ask request:", request);

    // ✅ 新形式: messages を優先、無ければ prompt から作成
    let messages: ChatMessage[];
    if (request.messages && request.messages.length > 0) {
      messages = request.messages;
    } else if (request.prompt) {
      // 後方互換: prompt だけの場合
      messages = [{ role: "user", content: request.prompt }];
    } else {
      throw new Error("messages or prompt is required");
    }

    // 最後のユーザー発言を取得（フォールバック用）
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const lastText = lastUser?.content ?? messages[messages.length - 1].content;

    // 🔵 フォールバック用：ローカルで感情だけは判定しておく
    const fallbackEmotion = detectLocalEmotion(lastText);
    const fallbackLabels = buildLabels(fallbackEmotion);

    try {
      console.log(`🔄 Calling /api/fb-analyze with ${messages.length} messages...`);

      // ★ 履歴ごとバックエンドに送信
      const res = await fetch("/api/fb-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          student_id: request.student_id ?? "demo-student",
          class_id: request.class_id ?? "demo-class",
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.warn("⚠️ /api/fb-analyze error:", res.status, errorText);
        throw new Error("fb-analyze failed");
      }

      const data = await res.json();
      console.log("✅ /api/fb-analyze response:", data);

      // Python側 /api/analyze のレスポンス想定:
      // { reply, emotion, labels, confidence, used_llm, llm_reason?, data? }
      // ★ トップレベルの emotion / labels を最優先で採用
      // ★ data フィールドは無視（後方互換のため残してるだけ）

      const emotion = data.emotion ?? fallbackEmotion;
      const labels: Record<string, number> =
        data.labels ?? buildLabels(emotion);

      console.log(`📊 [ask] Final emotion: ${emotion}, Confidence: ${data.confidence ?? "unknown"}`);

      // 🔥 重要: reply が返ってきたらそれを最優先で使う
      let reply: string =
        data.reply ?? buildReply(emotion, lastText); // reply 無ければテンプレで補完

      // followup オプションが true のときは、ひと言だけ追記
      if (request.followup) {
        reply += " よかったら、もう少し詳しく教えて？";
      }

      const response: AskResponse = {
        reply,
        emotion,
        labels,
        used_llm: data.used_llm ?? true,
        llm_reason: data.llm_reason ?? "BACKEND_LLM",
        style: request.style || "buddy",
        followup: request.followup ?? false,
      };

      console.log("🎯 Final AskResponse:", response);
      await new Promise((resolve) => setTimeout(resolve, 300)); // 少しだけディレイ
      return response;
    } catch (error) {
      console.warn("⚠️ fb-analyze failed, fallback to local:", error);

      // 🔴 バックエンド死んだときだけ、いままでのテンプレで返す
      const response = buildLocalAskResponse(
        fallbackEmotion,
        lastText,
        request
      );
      await new Promise((resolve) => setTimeout(resolve, 300));
      return response;
    }
  },

  /**
   * テキストの感情解析 (改善版実装)
   */
  async analyze(request: EmotionLogRequest): Promise<EmotionAnalysisResult> {
    console.warn("analyze() called - using enhanced implementation");

    const text = request.text.toLowerCase();
    let emotion = "中立";
    let confidence = 0.7;

    if (
      text.includes("楽しい") ||
      text.includes("嬉しい") ||
      text.includes("幸せ") ||
      text.includes("最高") ||
      text.includes("よかった") ||
      text.includes("素晴らしい")
    ) {
      emotion = "楽しい";
      confidence = 0.9;
    } else if (
      text.includes("悲しい") ||
      text.includes("辛い") ||
      text.includes("寂しい") ||
      text.includes("がっかり") ||
      text.includes("ショック")
    ) {
      emotion = "悲しい";
      confidence = 0.85;
    } else if (
      text.includes("怒") ||
      text.includes("ムカつく") ||
      text.includes("イライラ")
    ) {
      emotion = "怒り";
      confidence = 0.9;
    } else if (
      text.includes("不安") ||
      text.includes("心配") ||
      text.includes("緊張") ||
      text.includes("テスト") ||
      text.includes("試験")
    ) {
      emotion = "不安";
      confidence = 0.8;
    } else if (
      text.includes("疲れ") ||
      text.includes("しんどい") ||
      text.includes("きつい") ||
      text.includes("分からん") ||
      text.includes("困った")
    ) {
      emotion = "しんどい";
      confidence = 0.8;
    }

    return {
      emotion,
      confidence,
      suggestion: `「${emotion}」の感情が検出されました。信頼度: ${(confidence * 100).toFixed(
        0
      )}%`,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * 感情ログのサマリー取得 (モック実装)
   */
  async getSummary(request?: SummaryRequest): Promise<SummaryResponse> {
    console.warn("getSummary() called - using mock implementation");

    return {
      total_entries: 10,
      emotion_breakdown: {
        楽しい: 4,
        中立: 3,
        不安: 2,
        しんどい: 1,
      },
      insights: ["最近は楽しい気分が多いようです"],
      period: {
        start: request?.start_date || "2023-01-01",
        end: request?.end_date || "2023-12-31",
      },
    };
  },

  /**
   * 週報データ取得 (モック実装)
   */
  async getWeeklyReport(
    weekOffset: number = 0
  ): Promise<WeeklyReportResponse> {
    console.warn("getWeeklyReport() called - using mock implementation");

    return {
      week_start: "2023-12-04",
      week_end: "2023-12-10",
      emotion_summary: {
        楽しい: 3,
        中立: 2,
        不安: 1,
      },
      insights: ["今週は比較的ポジティブな感情が多く見られました"],
      recommendations: ["この調子で頑張りましょう"],
    };
  },

  /**
   * 最新のAI応答データを取得 (モック実装)
   */
  async getLatestAiResponse(
    studentId: string
  ): Promise<AiResponseData | null> {
    console.warn("getLatestAiResponse() called - using mock implementation");

    return {
      timestamp: new Date().toISOString(),
      student_id: studentId,
      class_id: "demo-class",
      user_input: "こんにちは",
      ai_response: "こんにちは！元気ですか？",
      emotion: "中立",
      emotion_labels: { 中立: 1.0 },
      used_llm: true,
      session_info: {
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        day_of_week: new Date().toLocaleDateString("ja-JP", {
          weekday: "long",
        }),
      },
    };
  },

  /**
   * エクスポート機能 (モック実装)
   */
  async exportData(format: "json" | "csv" = "json"): Promise<Blob> {
    console.warn("exportData() called - using mock implementation");

    const mockData =
      format === "json"
        ? JSON.stringify({ message: "Mock export data" })
        : "timestamp,emotion,text\n2023-12-11,楽しい,今日は良い日でした";

    return new Blob([mockData], {
      type: format === "json" ? "application/json" : "text/csv",
    });
  },
};

export default emotionService;
