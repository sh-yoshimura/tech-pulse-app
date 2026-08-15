'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X, Plus, Pencil, Trash2, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Folder } from '@/types/database';
import { createFolder, renameFolder, deleteFolder } from '@/app/actions/folders';

interface FolderMenuProps {
  folders: Folder[];
  currentFolderId?: string;
}

export function FolderMenu({ folders, currentFolderId }: FolderMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [busyFolderId, setBusyFolderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setIsOpen(false);
    setRenamingId(null);
    setError(null);
  };

  const handleSwitch = (folder: Folder) => {
    router.push(folder.is_default ? '/' : `/?folder=${folder.id}`);
    close();
  };

  const handleCreate = async () => {
    if (!newFolderName.trim()) return;
    setIsCreating(true);
    setError(null);

    const res = await createFolder(newFolderName);

    setIsCreating(false);
    if (!res.success) {
      setError(res.error || 'フォルダの作成に失敗しました');
      return;
    }

    setNewFolderName('');
    if (res.folderId) {
      router.push(`/?folder=${res.folderId}`);
      close();
    }
  };

  const startRename = (folder: Folder) => {
    setRenamingId(folder.id);
    setRenameValue(folder.name);
    setError(null);
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
  };

  const handleRenameSave = async (folderId: string) => {
    if (!renameValue.trim()) return;
    setBusyFolderId(folderId);
    setError(null);

    const res = await renameFolder(folderId, renameValue);

    setBusyFolderId(null);
    if (!res.success) {
      setError(res.error || 'フォルダ名の変更に失敗しました');
      return;
    }
    setRenamingId(null);
  };

  const handleDelete = async (folder: Folder) => {
    if (
      !window.confirm(
        `「${folder.name}」を削除しますか？含まれる記事は「未分類」に移動されます。`
      )
    )
      return;

    setBusyFolderId(folder.id);
    setError(null);

    const res = await deleteFolder(folder.id);

    setBusyFolderId(null);
    if (!res.success) {
      setError(res.error || 'フォルダの削除に失敗しました');
      return;
    }

    if (folder.id === currentFolderId) {
      router.push('/');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="フォルダメニューを開く"
        className="fixed top-4 left-4 z-40 flex items-center justify-center w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border hover:bg-muted transition-colors"
      >
        <Menu className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={close}
        >
          <div
            className="relative w-full max-w-md max-h-[85vh] bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b bg-muted/30 flex items-center justify-between">
              <h3 className="font-bold text-lg">フォルダ</h3>
              <button
                type="button"
                onClick={close}
                aria-label="閉じる"
                className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {folders.map((folder) => {
                const isCurrent = folder.id === currentFolderId;
                const isBusy = busyFolderId === folder.id;
                const isRenamingThis = renamingId === folder.id;

                return (
                  <div
                    key={folder.id}
                    className={`flex items-center gap-2 p-2 rounded-lg ${
                      isCurrent ? 'bg-primary/10' : 'hover:bg-muted'
                    }`}
                  >
                    {isRenamingThis ? (
                      <>
                        <Input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="h-7 text-sm flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSave(folder.id);
                            if (e.key === 'Escape') cancelRename();
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRenameSave(folder.id)}
                          disabled={isBusy}
                          aria-label="保存"
                          className="text-primary hover:text-primary/80 p-1 rounded-md shrink-0"
                        >
                          {isBusy ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={cancelRename}
                          disabled={isBusy}
                          aria-label="キャンセル"
                          className="text-muted-foreground hover:text-foreground p-1 rounded-md shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSwitch(folder)}
                          className={`flex-1 text-left text-sm truncate ${
                            isCurrent ? 'font-semibold text-primary' : 'text-foreground'
                          }`}
                        >
                          {folder.name}
                        </button>
                        {!folder.is_default && (
                          <>
                            <button
                              type="button"
                              onClick={() => startRename(folder)}
                              disabled={isBusy}
                              aria-label="名前を変更"
                              className="text-muted-foreground hover:text-foreground p-1 rounded-md shrink-0"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(folder)}
                              disabled={isBusy}
                              aria-label="削除"
                              className="text-muted-foreground hover:text-destructive p-1 rounded-md shrink-0"
                            >
                              {isBusy ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {error && (
              <p className="mx-3 mb-2 text-xs text-destructive font-medium bg-destructive/10 p-2 rounded-lg">
                {error}
              </p>
            )}

            <div className="p-3 border-t bg-muted/20 flex gap-2">
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="新しいフォルダ名"
                className="h-8 text-sm flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                }}
              />
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={isCreating || !newFolderName.trim()}
                className="h-8 gap-1"
              >
                {isCreating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                作成
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default FolderMenu;
