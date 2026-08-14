'use client';

import { useState } from 'react';
import { SearchResultArticle } from '@/app/actions/searchArticles';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ExternalLink, ThumbsUp, Sparkles, Loader2, BookOpen } from 'lucide-react';

interface ArticleSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  refinedQuery?: string;
  articles: SearchResultArticle[];
  onSelectArticle: (url: string) => Promise<void>;
}

export function ArticleSearchModal({
  isOpen,
  onClose,
  query,
  refinedQuery,
  articles,
  onSelectArticle,
}: ArticleSearchModalProps) {
  const [registeringUrl, setRegisteringUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRegister = async (url: string) => {
    try {
      setRegisteringUrl(url);
      await onSelectArticle(url);
    } finally {
      setRegisteringUrl(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl max-h-[85vh] bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b bg-muted/30 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <h3 className="font-bold text-lg leading-none">記事の検索結果</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              入力された内容から最適な技術記事を探しました。登録したい記事を選択してください。
            </p>
            {refinedQuery && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">検索キーワード:</span>
                <Badge variant="outline" className="font-mono text-xs bg-background">
                  {refinedQuery}
                </Badge>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content - Article Candidates */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {articles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground space-y-2">
              <BookOpen className="w-8 h-8 mx-auto opacity-40 mb-2" />
              <p className="font-medium text-sm">条件に一致する記事が見つかりませんでした</p>
              <p className="text-xs">別の言葉で再度検索をお試しください</p>
            </div>
          ) : (
            articles.map((item, idx) => {
              const isRegistering = registeringUrl === item.url;
              const isDisabled = registeringUrl !== null;
              const isTopGuide = idx === 0 && (item.relevanceScore || 0) >= 150;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all space-y-2.5 shadow-xs ${
                    isTopGuide
                      ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20'
                      : 'bg-background hover:border-primary/50'
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-sm sm:text-base text-foreground hover:text-primary transition-colors flex items-center gap-1.5 group"
                    >
                      {isTopGuide && (
                        <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0 shrink-0">
                          おすすめ解説
                        </Badge>
                      )}
                      <span>{item.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </a>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {item.snippet}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 font-medium ${
                          item.source === 'Zenn'
                            ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {item.source}
                      </Badge>
                      {item.likesCount > 0 && (
                        <span className="flex items-center gap-1 text-amber-500 font-medium">
                          <ThumbsUp className="w-3 h-3" />
                          {item.likesCount}
                        </span>
                      )}
                      {item.author && <span>by @{item.author}</span>}
                      {item.createdAt && <span>• {item.createdAt}</span>}
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleRegister(item.url)}
                      disabled={isDisabled}
                      className="h-7 text-xs px-3"
                    >
                      {isRegistering ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          AI解析・保存中...
                        </>
                      ) : (
                        '解析・登録'
                      )}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t bg-muted/20 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={registeringUrl !== null}>
            閉じる
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ArticleSearchModal;
