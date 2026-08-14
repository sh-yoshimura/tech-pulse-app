'use server';

import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

function getArticlePrompt(title: string, bodyText: string): string {
    const filePath = path.join(process.cwd(), 'src/prompts/articleAnalysis.md');
    const template = fs.readFileSync(filePath, 'utf-8');

    return template
        .replace('{{TITLE}}', title)
        .replace('{{BODY_TEXT}}', bodyText);
}

export async function addArticleByUrl(url: string) {
    try {
        if (!url) {
            throw new Error('URLを入力してください');
        }

        const response = await fetch(url, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
        });

        if (!response.ok) {
            throw new Error('記事ページの取得に失敗しました');
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        $('script, style, nav, footer, header, iframe').remove();
        const pageTitle = $('title').text().trim() || 'タイトル不明';
        const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 4000);

        const prompt = getArticlePrompt(pageTitle, bodyText);

        const aiResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            response_format: { type: 'json_object' },
        });

        const aiContent = aiResponse.choices[0]?.message?.content;
        if (!aiContent) {
            throw new Error('AIによる解析結果の取得に失敗しました');
        }

        const parsedData = JSON.parse(aiContent);

        const { data: article, error: articleError } = await supabase
            .from('articles')
            .insert({
                url,
                title: parsedData.title || pageTitle,
                summary: parsedData.summary || [],
                use_cases: parsedData.use_cases || [],
                tags: parsedData.tags || [],
            } as any)
            .select()
            .single();

        if (articleError || !article) {
            if (articleError?.code === '23505') {
                throw new Error('このURLの記事はすでに登録されています');
            }
            throw new Error(`DB保存エラー: ${articleError?.message || 'データ取得失敗'}`);
        }

        const createdArticle = article as { id: string };

        if (parsedData.commands && parsedData.commands.length > 0) {
            const commandsToInsert = parsedData.commands.map(
                (cmd: { command: string; description: string }) => ({
                    article_id: createdArticle.id,
                    command: cmd.command,
                    description: cmd.description || '',
                })
            );

            const { error: commandError } = await supabase
                .from('commands')
                .insert(commandsToInsert as any);

            if (commandError) {
                console.error('コマンド保存エラー:', commandError.message);
            }
        }

        revalidatePath('/');

        return { success: true, articleId: createdArticle.id };
    } catch (error: any) {
        console.error('addArticleByUrl Error:', error);
        return { success: false, error: error.message || '処理中にエラーが発生しました' };
    }
}