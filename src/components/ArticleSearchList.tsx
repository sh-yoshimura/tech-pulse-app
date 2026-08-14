'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { ArticleWithCommands } from '@/types/database';
import { ArticleCard } from '@/components/ArticleCard';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, X, Tag, Filter, Loader2, Sparkles, Trash2, CheckSquare, Square } from 'lucide-react';
import { expandSemanticQuery } from '@/app/actions/semanticSearch';
import { deleteArticles } from '@/app/actions/deleteArticle';

interface ArticleSearchListProps {
  articles: ArticleWithCommands[];
}

function matchesTerm(searchableText: string, term: string): boolean {
  {/*
  if (term === 'java') {
    // Explicit word boundary check for "java" so it does not match "javascript"
    return /\bjava\b/i.test(searchableText);
  }
    */}
  return searchableText.includes(term);
}

export function ArticleSearchList({ articles }: ArticleSearchListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [semanticKeywords, setSemanticKeywords] = useState<string[]>([]);
  const [intentExplanation, setIntentExplanation] = useState('');
  const [isExpanding, setIsExpanding] = useState(false);
  const requestIdRef = useRef(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Debounce natural language query expansion via AI (synonyms/related terms).
  // Query changes only ever originate from handleSearchChange below, which
  // already resets keywords/explanation/isExpanding synchronously, so this
  // effect only needs to handle the non-empty "schedule expansion" case.
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      requestIdRef.current += 1;
      return;
    }

    const currentId = ++requestIdRef.current;

    const timer = setTimeout(async () => {
      const res = await expandSemanticQuery(trimmed);
      if (requestIdRef.current !== currentId) return; // stale response, ignore
      setSemanticKeywords(res.keywords || []);
      setIntentExplanation(res.intentExplanation || '');
      setIsExpanding(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // Clear stale expansion results immediately so filtering falls back to
    // raw-term matching until the new AI expansion resolves.
    setSemanticKeywords([]);
    setIntentExplanation('');
    setIsExpanding(value.trim() !== '');
  };

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

  // Filter + rank articles based on natural language search query and selected tag
  const filteredArticles = useMemo(() => {
    const trimmed = searchQuery.trim();

    const withTagFilter = articles.filter((article) => {
      if (selectedTag && !article.tags?.includes(selectedTag)) {
        return false;
      }
      return true;
    });

    if (!trimmed) return withTagFilter;

    const rawTerms = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
    const matchTerms = Array.from(
      new Set([...rawTerms, ...semanticKeywords.map((k) => k.toLowerCase())])
    );

    const scored = withTagFilter
      .map((article) => {
        const searchableText = [
          article.title,
          ...(article.summary || []),
          ...(article.use_cases || []),
          ...(article.tags || []),
          ...(article.commands?.map((c) => `${c.command} ${c.description}`) || []),
        ]
          .join(' ')
          .toLowerCase();

        let score = 0;
        matchTerms.forEach((term) => {
          if (matchesTerm(searchableText, term)) {
            // Raw query terms count for more than AI-expanded synonyms
            score += rawTerms.includes(term) ? 2 : 1;
          }
        });

        return { article, score };
      })
      .filter(({ score }) => score > 0);

    scored.sort((a, b) => b.score - a.score);

    return scored.map(({ article }) => article);
  }, [articles, searchQuery, selectedTag, semanticKeywords]);

  const handleTagClick = (tag: string) => {
    if (selectedTag === tag) {
      setSelectedTag(null);
    } else {
      setSelectedTag(tag);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleClearSelection = () => setSelectedIds(new Set());

  // Selecting "all" only ever applies to the currently filtered/visible
  // articles, not the full unfiltered list.
  const isAllFilteredSelected =
    filteredArticles.length > 0 && filteredArticles.every((a) => selectedIds.has(a.id));

  const handleToggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllFilteredSelected) {
        filteredArticles.forEach((a) => next.delete(a.id));
      } else {
        filteredArticles.forEach((a) => next.add(a.id));
      }
      return next;
    });
  };

  const runDelete = async (ids: string[]) => {
    setDeleteError(null);
    setDeletingIds((prev) => new Set([...prev, ...ids]));

    const res = await deleteArticles(ids);

    if (!res.success) {
      setDeleteError(res.error || '削除に失敗しました');
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }

    setDeletingIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  };

  const handleDeleteOne = (id: string, title: string) => {
    if (!window.confirm(`「${title}」を削除しますか？この操作は取り消せません。`)) return;
    runDelete([id]);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (
      !window.confirm(
        `選択した${selectedIds.size}件の記事を削除しますか？この操作は取り消せません。`
      )
    )
      return;
    runDelete(Array.from(selectedIds));
  };

  const handleClearFilters = () => {
    handleSearchChange('');
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
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="登録済み記事を検索（タイトル・要約・タグ・コマンドなど）"
              className="pl-9 pr-9 text-sm"
            />
            {isExpanding ? (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
            ) : (
              searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="検索キーワードをクリア"
                >
                  <X className="w-4 h-4" />
                </button>
              )
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

        {/* AI Query Interpretation */}
        {searchQuery.trim() && (intentExplanation || semanticKeywords.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
            {intentExplanation && (
              <span className="text-muted-foreground">{intentExplanation}</span>
            )}
            {semanticKeywords.slice(0, 6).map((kw) => (
              <Badge key={kw} variant="outline" className="text-[10px] px-1.5 py-0 bg-background">
                {kw}
              </Badge>
            ))}
          </div>
        )}

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
      <div className="flex flex-wrap justify-between items-center gap-2 px-1">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span>ストックリスト</span>
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {filteredArticles.length} / {articles.length} 件
            </span>
          </h2>
          {filteredArticles.length > 0 && (
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {isAllFilteredSelected ? (
                <CheckSquare className="w-4 h-4 text-primary" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {hasActiveFilter ? '絞り込み結果をすべて選択' : 'すべて選択'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilter && (
            <span className="text-xs text-muted-foreground">
              絞り込み適用中
            </span>
          )}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {selectedIds.size}件選択中
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSelection}
                className="h-7 text-xs px-2.5"
              >
                選択解除
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={deletingIds.size > 0}
                className="h-7 text-xs px-2.5 gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                選択した記事を削除
              </Button>
            </div>
          )}
        </div>
      </div>

      {deleteError && (
        <p className="text-xs text-destructive font-medium bg-destructive/10 p-2.5 rounded-lg">
          {deleteError}
        </p>
      )}

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
              selected={selectedIds.has(article.id)}
              onToggleSelect={handleToggleSelect}
              onDelete={() => handleDeleteOne(article.id, article.title)}
              isDeleting={deletingIds.has(article.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default ArticleSearchList;
