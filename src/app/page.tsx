import { supabase } from '@/lib/supabase';
import { ArticleWithCommands } from '@/types/database';
import { UrlInputForm } from '@/components/UrlInputForm';
import { ArticleSearchList } from '@/components/ArticleSearchList';

export const revalidate = 0;

export default async function HomePage() {
    const { data: articles, error } = await supabase
        .from('articles')
        .select(`
      *,
      commands (*)
    `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Data fetch error:', error);
    }

    const articleList = (articles as ArticleWithCommands[]) || [];

    return (
        <main className="min-h-screen bg-background py-10 px-4 max-w-4xl mx-auto">
            <header className="text-center mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight">
                    TechPulse Dashboard
                </h1>
                <p className="text-muted-foreground mt-2 text-sm">
                    技術記事の要約・参照シーン・主要コードをナレッジとして自動整理
                </p>
            </header>

            <UrlInputForm />

            <ArticleSearchList articles={articleList} />
        </main>
    );
}