'use client';

import { useState, useMemo } from 'react';
import { ArticleWithCommands } from '@/types/database';
import { ArticleCard } from '@/components/ArticleCard';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, X, Tag, Filter } from 'lucide-react';

interface ArticleSearchListProps {
  articles: ArticleWithCommands[];
}

export function ArticleSearchList({ articles }: ArticleSearchListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Extract all unique tags and count frequencies
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    articles.forEach((article) => {
      article.tags?.forEach((tag) => {
        if (tag) {
          counts[tag] = (counts[tag] || 0) + 1;
        }
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [articles]);

  // Filter articles based on search query and selected tag
  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      // 1. Tag filter
      if (selectedTag && !article.tags?.includes(selectedTag)) {
        return false;
      }

      // 2. Keyword/Natural language filter
      if (!searchQuery.trim()) return true;

      const terms = searchQuery.toLowerCase().trim().split(/\s+/);

      // Collect all searchable text from article
      const searchableText = [
        article.title,
        ...(article.summary || []),
        ...(article.use_cases || []),
        ...(article.tags || []),
        ...(article.commands?.map((c) => `${c.command} ${c.description}`) || []),
      ]
        .join(' ')
        .toLowerCase();

      // Ensure all search terms match somewhere in the article content
      return terms.every((term) => {
        if (term === 'java') {
          // Explicit word boundary check for "java" so it does not match "javascript"
          return /\bjava\b/i.test(searchableText);
        }
        return searchableText.includes(term);
      });
    });
  }, [articles, searchQuery, selectedTag]);

  const handleTagClick = (tag: string) => {
    if (selectedTag === tag) {
      setSelectedTag(null);
    } else {
      setSelectedTag(tag);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedTag(null);
  };

  const hasActiveFilter = searchQuery.trim() !== '' || selectedTag !== null;

  return (
    <section className="mt-8 space-y-6">
      {/* Search & Filter Header */}
      <div className="space-y-4 bg-card border p-4 sm:p-5 rounded-xl shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="キーワードや技術名・要約内容で検索..."
              className="pl-9 pr-9 text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="検索キーワードをクリア"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {hasActiveFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-xs text-muted-foreground hover:text-foreground self-end sm:self-auto shrink-0 gap-1"
            >
              <X className="w-3.5 h-3.5" />
              フィルター解除
            </Button>
          )}
        </div>

        {/* Dynamic Tag Filter Bar */}
        {tagCounts.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
              <Tag className="w-3.5 h-3.5" />
              <span>タグ絞り込み:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge
                variant={selectedTag === null ? 'default' : 'outline'}
                className="cursor-pointer text-xs transition-all"
                onClick={() => setSelectedTag(null)}
              >
                すべて ({articles.length})
              </Badge>
              {tagCounts.map(([tag, count]) => {
                const isSelected = selectedTag === tag;
                return (
                  <Badge
                    key={tag}
                    variant={isSelected ? 'default' : 'secondary'}
                    className={`cursor-pointer text-xs transition-all ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => handleTagClick(tag)}
                  >
                    #{tag} ({count})
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* List Header and Counter */}
      <div className="flex justify-between items-center px-1">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <span>ストック一覧</span>
          <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {filteredArticles.length} / {articles.length} 件
          </span>
        </h2>
        {hasActiveFilter && (
          <span className="text-xs text-muted-foreground">
            絞り込み適用中
          </span>
        )}
      </div>

      {/* Articles List or Empty State */}
      {filteredArticles.length === 0 ? (
        <div className="text-center py-12 px-4 border rounded-xl border-dashed bg-card/50">
          <Filter className="w-8 h-8 mx-auto text-muted-foreground/50 mb-3" />
          <p className="font-medium text-foreground text-sm mb-1">
            {hasActiveFilter
              ? '該当する記事が見つかりませんでした'
              : 'まだ記事が登録されていません'}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            {hasActiveFilter
              ? '検索キーワードやタグの条件を変更してお試しください'
              : '上のフォームから記事URLを入力して解析登録してください'}
          </p>
          {hasActiveFilter && (
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              検索条件をクリア
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredArticles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              activeTag={selectedTag}
              onSelectTag={handleTagClick}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default ArticleSearchList;
