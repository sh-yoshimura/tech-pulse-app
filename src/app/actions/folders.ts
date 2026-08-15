'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { AppError, toClientMessage } from '@/lib/errors';

const MAX_FOLDER_NAME_LENGTH = 50;

function validateFolderName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new AppError('フォルダ名を入力してください');
  }
  if (trimmed.length > MAX_FOLDER_NAME_LENGTH) {
    throw new AppError(`フォルダ名は${MAX_FOLDER_NAME_LENGTH}文字以内で入力してください`);
  }
  return trimmed;
}

export async function createFolder(name: string): Promise<{
  success: boolean;
  folderId?: string;
  error?: string;
}> {
  try {
    const trimmed = validateFolderName(name);

    const { data, error } = await supabase
      .from('folders')
      .insert({ name: trimmed })
      .select()
      .single();

    if (error || !data) {
      if (error?.code === '23505') {
        throw new AppError('同じ名前のフォルダが既に存在します');
      }
      console.error('createFolder DB insert error:', error);
      throw new AppError('フォルダの作成に失敗しました');
    }

    revalidatePath('/');
    return { success: true, folderId: data.id };
  } catch (error) {
    console.error('createFolder Error:', error);
    return { success: false, error: toClientMessage(error, 'フォルダの作成に失敗しました') };
  }
}

export async function renameFolder(
  folderId: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!folderId) {
      throw new AppError('フォルダを指定してください');
    }

    const { data: folder, error: fetchError } = await supabase
      .from('folders')
      .select('id, is_default')
      .eq('id', folderId)
      .single();

    if (fetchError || !folder) {
      throw new AppError('フォルダが見つかりません');
    }
    if (folder.is_default) {
      throw new AppError('デフォルトフォルダの名前は変更できません');
    }

    const trimmed = validateFolderName(name);

    const { error } = await supabase
      .from('folders')
      .update({ name: trimmed })
      .eq('id', folderId);

    if (error) {
      if (error.code === '23505') {
        throw new AppError('同じ名前のフォルダが既に存在します');
      }
      console.error('renameFolder DB update error:', error);
      throw new AppError('フォルダ名の変更に失敗しました');
    }

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('renameFolder Error:', error);
    return { success: false, error: toClientMessage(error, 'フォルダ名の変更に失敗しました') };
  }
}

export async function deleteFolder(folderId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!folderId) {
      throw new AppError('フォルダを指定してください');
    }

    const { data: folder, error: fetchError } = await supabase
      .from('folders')
      .select('id, is_default')
      .eq('id', folderId)
      .single();

    if (fetchError || !folder) {
      throw new AppError('フォルダが見つかりません');
    }
    if (folder.is_default) {
      throw new AppError('デフォルトフォルダは削除できません');
    }

    const { data: defaultFolder, error: defaultError } = await supabase
      .from('folders')
      .select('id')
      .eq('is_default', true)
      .single();

    if (defaultError || !defaultFolder) {
      console.error('deleteFolder default folder lookup error:', defaultError);
      throw new AppError('デフォルトフォルダが見つかりません');
    }

    // Move the folder's articles to the default folder before deleting it,
    // so a folder deletion never loses data.
    const { error: reassignError } = await supabase
      .from('articles')
      .update({ folder_id: defaultFolder.id })
      .eq('folder_id', folderId);

    if (reassignError) {
      console.error('deleteFolder reassign error:', reassignError);
      throw new AppError('記事の移動に失敗したため、フォルダを削除できませんでした');
    }

    const { error: deleteError } = await supabase.from('folders').delete().eq('id', folderId);

    if (deleteError) {
      console.error('deleteFolder DB delete error:', deleteError);
      throw new AppError('フォルダの削除に失敗しました');
    }

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('deleteFolder Error:', error);
    return { success: false, error: toClientMessage(error, 'フォルダの削除に失敗しました') };
  }
}

export async function moveArticleToFolder(
  articleId: string,
  folderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!articleId || !folderId) {
      throw new AppError('移動先のフォルダを選択してください');
    }

    const { error } = await supabase
      .from('articles')
      .update({ folder_id: folderId })
      .eq('id', articleId);

    if (error) {
      if (error.code === '23503') {
        throw new AppError('移動先のフォルダが見つかりません');
      }
      console.error('moveArticleToFolder DB update error:', error);
      throw new AppError('記事の移動に失敗しました');
    }

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('moveArticleToFolder Error:', error);
    return { success: false, error: toClientMessage(error, '記事の移動に失敗しました') };
  }
}
