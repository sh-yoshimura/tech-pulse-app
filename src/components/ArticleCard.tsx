'use client';

import { useState } from 'react';
import { ArticleWithCommands } from '@/types/database';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Square, Trash2, Loader2, Globe } from 'lucide-react';

interface ArticleCardProps {
  article: ArticleWithCommands;
  onSelectTag?: (tag: string) => void;
  activeTag?: string | null;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}

function SiteFavicon({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);

  let hostname: string | null = null;
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = null;
  }

  if (!hostname || failed) {
    return (
      <div className="w-5 h-5 rounded flex items-center justify-center bg-muted shrink-0 mt-0.5">
        <Globe className="w-3 h-3 text-muted-foreground" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?sz=64&domain=${hostname}`}
      alt=""
      width={20}
      height={20}
      className="w-5 h-5 rounded shrink-0 mt-0.5"
      onError={() => setFailed(true)}
    />
  );
}

export function ArticleCard({
  article,
  onSelectTag,
  activeTag,
  selected = false,
  onToggleSelect,
  onDelete,
  isDeleting = false,
}: ArticleCardProps) {
  return (
    <Card
      className={`w-full mb-4 transition-shadow ${
        isDeleting ? 'opacity-50 pointer-events-none' : 'hover:shadow-md'
      } ${selected ? 'ring-1 ring-primary/50 border-primary/40' : ''}`}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-start gap-2 min-w-0">
            {onToggleSelect && (
              <button
                type="button"
                onClick={() => onToggleSelect(article.id)}
                aria-label={selected ? '選択を解除' : '選択する'}
                className="mt-1 text-muted-foreground hover:text-primary transition-colors shrink-0"
              >
                {selected ? (
                  <CheckSquare className="w-4 h-4 text-primary" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </button>
            )}
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline min-w-0 flex items-start gap-2"
            >
              <SiteFavicon url={article.url} />
              <CardTitle className="text-xl font-bold text-primary">
                {article.title}
              </CardTitle>
            </a>
          </div>
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(article.id)}
              disabled={isDeleting}
              aria-label="この記事を削除"
              className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-1 rounded-md disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {article.tags.map((tag, idx) => {
            const isSelected = activeTag === tag;
            return (
              <Badge
                className={`text-xs cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'hover:bg-accent hover:text-accent-foreground'
                }`}
                key={idx}
                variant={isSelected ? 'default' : 'secondary'}
                onClick={() => onSelectTag?.(tag)}
              >
                #{tag}
              </Badge>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 text-sm">
        {article.summary.length > 0 && (
          <div className="bg-muted/40 p-3.5 rounded-lg border border-border/60">
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              要約
            </h4>
            <ul className="list-disc list-inside space-y-1 text-foreground/90 leading-relaxed">
              {article.summary.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {article.use_cases.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              参照シーン
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              {article.use_cases.join(' / ')}
            </p>
          </div>
        )}

        {article.commands && article.commands.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              主要コード・引用
            </h4>
            <div className="space-y-2.5">
              {article.commands.map((cmd) => (
                <blockquote
                  key={cmd.id}
                  className="border-l-3 border-primary/50 bg-muted/30 p-3 rounded-r-lg font-mono text-xs"
                >
                  {cmd.description && (
                    <div className="text-[11px] text-muted-foreground font-sans mb-1 font-medium">
                      // {cmd.description}
                    </div>
                  )}
                  <code className="block whitespace-pre-wrap break-all text-foreground/90 leading-relaxed">
                    {cmd.command}
                  </code>
                </blockquote>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ArticleCard;