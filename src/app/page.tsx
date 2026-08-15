import { supabase } from '@/lib/supabase';
import { ArticleWithCommands, Folder } from '@/types/database';
import { UrlInputForm } from '@/components/UrlInputForm';
import { ArticleSearchList } from '@/components/ArticleSearchList';
import { FolderMenu } from '@/components/FolderMenu';

export const revalidate = 0;

export default async function HomePage(props: PageProps<'/'>) {
    const searchParams = await props.searchParams;
    const requestedFolderId =
        typeof searchParams.folder === 'string' ? searchParams.folder : undefined;

    const { data: folders, error: foldersError } = await supabase
        .from('folders')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

    if (foldersError) {
        console.error('Folders fetch error:', foldersError);
    }

    const folderList = (folders as Folder[]) || [];
    const defaultFolder = folderList.find((f) => f.is_default) ?? folderList[0];
    const currentFolder =
        (requestedFolderId && folderList.find((f) => f.id === requestedFolderId)) ||
        defaultFolder;
    const currentFolderId = currentFolder?.id;

    let articleList: ArticleWithCommands[] = [];
    if (currentFolderId) {
        const { data: articles, error } = await supabase
            .from('articles')
            .select(`*,commands (*)`)
            .eq('folder_id', currentFolderId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Data fetch error:', error);
        }

        articleList = (articles as ArticleWithCommands[]) || [];
    }

    return (
        <main className="min-h-screen bg-background py-10 px-4 max-w-4xl mx-auto">
            {/*
            <header className="text-center mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight">
                    TechPulse Dashboard
                </h1>
                <p className="text-muted-foreground mt-2 text-sm">
                    技術記事の要約・参照シーン・主要コードをナレッジとして自動整理
                </p>
            </header>
            */}
            <FolderMenu folders={folderList} currentFolderId={currentFolderId} />

            <UrlInputForm folders={folderList} currentFolderId={currentFolderId} />

            <ArticleSearchList articles={articleList} folders={folderList} />
        </main>
    );
}