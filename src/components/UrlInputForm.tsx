'use client';

import { useState } from 'react';
import { addArticleByUrl } from '@/app/actions/addArticle';
import { searchArticlesByQuery, SearchResultArticle } from '@/app/actions/searchArticles';
import { ArticleSearchModal } from '@/components/ArticleSearchModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Folder } from '@/types/database';
import { Link2, Sparkles, Loader2, Search } from 'lucide-react';

interface UrlInputFormProps {
  folders: Folder[];
  currentFolderId?: string;
}

export function UrlInputForm({ folders, currentFolderId }: UrlInputFormProps) {
  const [mode, setMode] = useState<'url' | 'search'>('url');

  // Destination folder for either registration path below. Tracks
  // currentFolderId (switched via FolderMenu) while still letting the user
  // locally override the select — adjusted during render rather than in an
  // effect, per React's guidance for resetting state when a prop changes.
  const [folderId, setFolderId] = useState(currentFolderId ?? folders[0]?.id ?? '');
  const [prevCurrentFolderId, setPrevCurrentFolderId] = useState(currentFolderId);
  if (currentFolderId !== prevCurrentFolderId) {
    setPrevCurrentFolderId(currentFolderId);
    if (currentFolderId) setFolderId(currentFolderId);
  }

  // URL Direct Registration State
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Natural Language Search & Modal State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultArticle[]>([]);
  const [refinedQuery, setRefinedQuery] = useState<string | undefined>(undefined);

  // Direct URL submission handler
  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    if (!folderId) {
      setError('登録先のフォルダを選択してください');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await addArticleByUrl(url, folderId);

    if (!result.success) {
      setError(result.error || '登録に失敗しました');
    } else {
      setUrl('');
    }
    setLoading(false);
  };

  // Natural Language Search submission handler
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);

    const res = await searchArticlesByQuery(searchQuery);

    setIsSearching(false);

    if (!res.success) {
      setError(res.error || '記事の検索中にエラーが発生しました');
      return;
    }

    setSearchResults(res.articles || []);
    setRefinedQuery(res.refinedQuery);
    setModalOpen(true);
  };

  // Callback when user selects an article in modal
  const handleSelectArticleFromModal = async (selectedUrl: string) => {
    setError(null);
    if (!folderId) {
      const message = '登録先のフォルダを選択してください';
      setError(message);
      throw new Error(message);
    }

    const result = await addArticleByUrl(selectedUrl, folderId);

    if (!result.success) {
      setError(result.error || '登録に失敗しました');
      throw new Error(result.error || '登録に失敗しました');
    }

    // Successfully added
    setModalOpen(false);
    setSearchQuery('');
  };

  return (
    <>
      <div className="w-full max-w-2xl mx-auto my-6 p-4 sm:p-5 border rounded-2xl shadow-sm bg-card space-y-4">
        {/* Destination Folder — applies to both registration modes below */}
        <div className="flex items-center gap-2">
          <label htmlFor="folder-select" className="text-xs font-medium text-muted-foreground shrink-0">
            登録先フォルダ
          </label>
          <select
            id="folder-select"
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            disabled={folders.length === 0}
            className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 dark:bg-input/30"
          >
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-border pb-3 gap-2">
          <button
            type="button"
            onClick={() => {
              setMode('url');
              setError(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              mode === 'url'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>URLで直接登録</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('search');
              setError(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              mode === 'search'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>自然言語で検索して登録</span>
          </button>
        </div>

        {/* Mode 1: URL Input Form */}
        {mode === 'url' ? (
          <form onSubmit={handleUrlSubmit} className="flex gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="URLを入力してください"
              type="url"
              disabled={loading}
              required
              className="flex-1 text-sm"
            />
            <Button disabled={loading} type="submit" className="shrink-0">
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  解析中...
                </>
              ) : (
                '解析・登録'
              )}
            </Button>
          </form>
        ) : (
          /* Mode 2: Natural Language Search Form */
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="〇〇の使い方、〇〇の概要を知りたい など自然言語で検索"
              type="text"
              disabled={isSearching}
              required
              className="flex-1 text-sm"
            />
            <Button disabled={isSearching} type="submit" className="shrink-0 gap-1">
              {isSearching ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  検索中...
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  記事を検索
                </>
              )}
            </Button>
          </form>
        )}

        {error && (
          <p className="text-xs text-destructive font-medium bg-destructive/10 p-2.5 rounded-lg">
            {error}
          </p>
        )}
      </div>

      {/* Candidate Search Modal */}
      <ArticleSearchModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        refinedQuery={refinedQuery}
        articles={searchResults}
        onSelectArticle={handleSelectArticleFromModal}
      />
    </>
  );
}

export default UrlInputForm;