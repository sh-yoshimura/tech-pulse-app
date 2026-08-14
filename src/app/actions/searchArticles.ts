'use server';

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface SearchResultArticle {
  id: string;
  title: string;
  url: string;
  snippet: string;
  source: string;
  tags: string[];
  likesCount: number;
  createdAt: string;
  author: string;
  relevanceScore?: number;
}

export async function searchArticlesByQuery(naturalLanguageQuery: string): Promise<{
  success: boolean;
  articles?: SearchResultArticle[];
  refinedQuery?: string;
  error?: string;
}> {
  try {
    if (!naturalLanguageQuery.trim()) {
      throw new Error('検索キーワードまたは質問を入力してください');
    }

    // 1. Convert natural language prompt to optimized search query focused on usage/tutorials
    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `ユーザーの自然言語による検索要求から、最も知りたい中心となる対象技術・単語（例: tmux, Docker, React）を特定してください。
単にその単語が含まれるだけの記事ではなく、その技術の「使い方」「入門」「基本」「解説」「設定」を解説した記事がヒットするように、最適な検索キーワード（例: "tmux 使い方" や "Docker 入門"）を出力してください。
出力はキーワード文字列のみとし、余計な説明や記号は含めないでください。`,
        },
        {
          role: 'user',
          content: naturalLanguageQuery,
        },
      ],
      temperature: 0.2,
    });

    const refinedQuery =
      aiResponse.choices[0]?.message?.content?.trim() || naturalLanguageQuery;

    // Extract core target tech term for scoring
    const primaryTech = refinedQuery.split(/\s+/)[0]?.toLowerCase() || naturalLanguageQuery.toLowerCase();

    // 2. Fetch candidates from Qiita API and Zenn API in parallel
    const qiitaApiUrl = `https://qiita.com/api/v2/items?query=${encodeURIComponent(
      refinedQuery
    )}&per_page=15`;

    const zennApiUrl = `https://zenn.dev/api/search?q=${encodeURIComponent(
      refinedQuery
    )}&source=articles`;

    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    const [qiitaRes, zennRes] = await Promise.allSettled([
      fetch(qiitaApiUrl, { headers, next: { revalidate: 60 } }),
      fetch(zennApiUrl, { headers, next: { revalidate: 60 } }),
    ]);

    const rawArticles: SearchResultArticle[] = [];

    // Parse Qiita items
    if (qiitaRes.status === 'fulfilled' && qiitaRes.value.ok) {
      try {
        const items = await qiitaRes.value.json();
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            const bodyText = (item.body || '')
              .replace(/```[\s\S]*?```/g, '')
              .replace(/[#*`_~[\]()]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            const snippet = bodyText.slice(0, 140) + (bodyText.length > 140 ? '...' : '');

            rawArticles.push({
              id: `qiita-${item.id}`,
              title: item.title || '無題の記事',
              url: item.url,
              snippet,
              source: 'Qiita',
              tags: item.tags ? item.tags.map((t: any) => t.name) : [],
              likesCount: item.likes_count || 0,
              createdAt: item.created_at ? item.created_at.split('T')[0] : '',
              author: item.user?.id || '匿名',
            });
          });
        }
      } catch (err) {
        console.error('Qiita parse error:', err);
      }
    }

    // Parse Zenn items
    if (zennRes.status === 'fulfilled' && zennRes.value.ok) {
      try {
        const zennData = await zennRes.value.json();
        if (Array.isArray(zennData.articles)) {
          zennData.articles.forEach((item: any) => {
            const title = item.title || '無題の記事';
            const url = `https://zenn.dev${item.path}`;
            const likes = item.liked_count || 0;

            rawArticles.push({
              id: `zenn-${item.id}`,
              title,
              url,
              snippet: `Zenn技術記事: ${title}`,
              source: 'Zenn',
              tags: item.article_type ? [item.article_type] : [],
              likesCount: likes,
              createdAt: item.published_at ? item.published_at.split('T')[0] : '',
              author: item.user?.username || item.user?.name || '匿名',
            });
          });
        }
      } catch (err) {
        console.error('Zenn parse error:', err);
      }
    }

    if (rawArticles.length === 0) {
      return {
        success: true,
        articles: [],
        refinedQuery,
      };
    }

    // Keywords indicating guide, tutorial, or usage explanation
    const guideKeywords = ['使い方', '入門', '解説', '基本', 'まとめ', '設定', 'ハンズオン', 'チートシート', 'ガイド', '導入', '基礎'];

    // 3. Calculate Relevance Score for all items (Qiita + Zenn)
    const articlesWithScore = rawArticles.map((article) => {
      const title = article.title;
      const titleLower = title.toLowerCase();

      const itemTagsLower = article.tags.map((t) => t.toLowerCase());

      let score = 0;

      // A. Tag exact match (e.g. tag is "tmux" or "docker") -> High priority (+100)
      if (itemTagsLower.some((t) => t === primaryTech || (primaryTech === 'java' && t === 'java'))) {
        score += 100;
      }

      // B. Title contains target technology -> (+80)
      if (titleLower.includes(primaryTech)) {
        score += 80;
      }

      // C. Title contains usage/guide intent keywords ("使い方", "入門", "解説", etc.) -> (+60)
      const matchesGuideTitle = guideKeywords.some((kw) => title.includes(kw));
      if (matchesGuideTitle) {
        score += 60;
      }

      // D. Snippet contains guide keywords -> (+20)
      if (guideKeywords.some((kw) => article.snippet.includes(kw))) {
        score += 20;
      }

      // E. High quality / Likes count boost (up to +50)
      score += Math.min(article.likesCount, 50);

      article.relevanceScore = score;
      return article;
    });

    // 4. Sort articles by Relevance Score in descending order
    articlesWithScore.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    return {
      success: true,
      articles: articlesWithScore,
      refinedQuery,
    };
  } catch (error: any) {
    console.error('searchArticlesByQuery Error:', error);
    return {
      success: false,
      error: error.message || '検索処理中にエラーが発生しました',
    };
  }
}
