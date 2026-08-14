import { ArticleWithCommands } from '@/types/database';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ArticleCardProps {
  article: ArticleWithCommands;
  onSelectTag?: (tag: string) => void;
  activeTag?: string | null;
}

export function ArticleCard({ article, onSelectTag, activeTag }: ArticleCardProps) {
  return (
    <Card className="w-full mb-4 hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-4">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            <CardTitle className="text-xl font-bold text-primary">
              {article.title}
            </CardTitle>
          </a>
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