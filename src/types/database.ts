export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export interface Database {
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
            };
        };
    };
}

export type ArticleWithCommands = Database['public']['Tables']['articles']['Row'] & {
    commands: Database['public']['Tables']['commands']['Row'][];
};