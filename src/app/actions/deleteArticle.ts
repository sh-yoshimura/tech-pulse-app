'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { AppError, toClientMessage } from '@/lib/errors';

export async function deleteArticles(ids: string[]): Promise<{
  success: boolean;
  deletedCount?: number;
  error?: string;
}> {
  try {
    if (!ids || ids.length === 0) {
      throw new AppError('削除する記事が選択されていません');
    }

    // Delete dependent commands first in case the DB has no cascading FK.
    const { error: commandsError } = await supabase
      .from('commands')
      .delete()
      .in('article_id', ids);

    if (commandsError) {
      console.error('deleteArticles commands error:', commandsError);
      throw new AppError('コマンドの削除に失敗しました');
    }

    const { error: articlesError, count } = await supabase
      .from('articles')
      .delete({ count: 'exact' })
      .in('id', ids);

    if (articlesError) {
      console.error('deleteArticles articles error:', articlesError);
      throw new AppError('記事の削除に失敗しました');
    }

    revalidatePath('/');

    return { success: true, deletedCount: count ?? ids.length };
  } catch (error) {
    console.error('deleteArticles Error:', error);
    return {
      success: false,
      error: toClientMessage(error, '削除処理中にエラーが発生しました'),
    };
  }
}
