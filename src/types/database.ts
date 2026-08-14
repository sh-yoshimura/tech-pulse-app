export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

// @supabase/postgrest-js only infers real (non-`never`) Insert/Update
// argument types when each table also declares `Relationships`, and the
// schema declares `Views`/`Functions` — without these, `Schema` collapses
// to `never` and every `.insert()`/`.update()` call silently requires a
// type-widening cast (`as any`) to compile.
export interface Database {
    __InternalSupabase: {
        PostgrestVersion: '12';
    };
    public: {
        Tables: {
            articles: {
                Row: {
                    id: string;
                    url: string;
                    title: string;
                    summary: string[];
                    use_cases: string[];
                    tags: string[];
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    url: string;
                    title: string;
                    summary?: string[];
                    use_cases?: string[];
                    tags?: string[];
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    url?: string;
                    title?: string;
                    summary?: string[];
                    use_cases?: string[];
                    tags?: string[];
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            commands: {
                Row: {
                    id: string;
                    article_id: string;
                    command: string;
                    description: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    article_id: string;
                    command: string;
                    description?: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    article_id?: string;
                    command?: string;
                    description?: string;
                    created_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'commands_article_id_fkey';
                        columns: ['article_id'];
                        isOneToOne: false;
                        referencedRelation: 'articles';
                        referencedColumns: ['id'];
                    },
                ];
            };
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
    };
}

export type ArticleWithCommands = Database['public']['Tables']['articles']['Row'] & {
    commands: Database['public']['Tables']['commands']['Row'][];
};