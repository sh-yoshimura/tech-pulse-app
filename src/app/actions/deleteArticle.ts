'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function deleteArticles(ids: string[]): Promise<{
  success: boolean;
  deletedCount?: number;
  error?: string;
}> {
  try {
    if (!ids || ids.length === 0) {
      throw new Error('削除する記事が選択されていません');
    }

    // Delete dependent commands first in case the DB has no cascading FK.
    const { error: commandsError } = await supabase
      .from('commands')
      .delete()
      .in('article_id', ids);

    if (commandsError) {
      throw new Error(`コマンド削除エラー: ${commandsError.message}`);
    }

    const { error: articlesError, count } = await supabase
      .from('articles')
      .delete({ count: 'exact' })
      .in('id', ids);

    if (articlesError) {
      throw new Error(`記事削除エラー: ${articlesError.message}`);
    }

    revalidatePath('/');

    return { success: true, deletedCount: count ?? ids.length };
  } catch (error: any) {
    console.error('deleteArticles Error:', error);
    return {
      success: false,
      error: error.message || '削除処理中にエラーが発生しました',
    };
  }
}
