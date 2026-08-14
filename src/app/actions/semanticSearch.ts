'use server';

import OpenAI from 'openai';
import { AppError, toClientMessage } from '@/lib/errors';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Keeps a single pathological input from ballooning OpenAI cost/latency;
// there's no auth or rate limiting in front of this action.
const MAX_QUERY_LENGTH = 500;

interface SemanticExpansion {
  keywords?: string[];
  intentExplanation?: string;
}

export async function expandSemanticQuery(userQuery: string): Promise<{
  success: boolean;
  keywords: string[];
  intentExplanation?: string;
  error?: string;
}> {
  try {
    if (!userQuery.trim()) {
      return { success: true, keywords: [] };
    }

    if (userQuery.length > MAX_QUERY_LENGTH) {
      throw new AppError('検索キーワードが長すぎます');
    }

    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `ユーザーの質問・自然言語によるナレッジ検索クエリから、IT・プログラミング技術の観点での意図、同義語、関連専門用語、英和表記のバリエーションを抽出・推論し、JSONフォーマットのみで返してください。

【例】
入力: "shスクリプトの1行目の!#は何"
出力:
{
  "keywords": ["シェバン", "shebang", "#!", "bin/sh", "bin/bash", "1行目", "スクリプト"],
  "intentExplanation": "シェルスクリプトの1行目の記述(シェバン / shebang)に関する質問"
}

【出力JSONスキーマ】:
{
  "keywords": ["用語1", "用語2", ...],
  "intentExplanation": "推論した質問意図の要約"
}`,
        },
        {
          role: 'user',
          content: userQuery,
        },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const content = aiResponse.choices[0]?.message?.content;
    if (!content) {
      return { success: true, keywords: [userQuery] };
    }

    let parsed: SemanticExpansion;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error('expandSemanticQuery JSON parse error:', parseError, content);
      return { success: true, keywords: [userQuery] };
    }

    return {
      success: true,
      keywords: parsed.keywords || [userQuery],
      intentExplanation: parsed.intentExplanation || '',
    };
  } catch (error) {
    console.error('expandSemanticQuery Error:', error);
    return {
      success: false,
      keywords: [userQuery],
      error: toClientMessage(error, 'キーワード展開中にエラーが発生しました'),
    };
  }
}
