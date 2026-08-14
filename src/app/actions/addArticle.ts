'use server';

import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { AppError, toClientMessage } from '@/lib/errors';
import { assertPublicHttpUrl } from '@/lib/urlSafety';
import { BROWSER_USER_AGENT } from '@/lib/constants';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

interface ArticleAnalysisResult {
    title?: string;
    summary?: string[];
    use_cases?: string[];
    tags?: string[];
    commands?: { command: string; description?: string }[];
}

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
            throw new AppError('URLを入力してください');
        }

        const safeUrl = await assertPublicHttpUrl(url);

        const response = await fetch(safeUrl, {
            headers: {
                'User-Agent': BROWSER_USER_AGENT,
            },
        });

        if (!response.ok) {
            throw new AppError('記事ページの取得に失敗しました');
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
            throw new AppError('AIによる解析結果の取得に失敗しました');
        }

        let parsedData: ArticleAnalysisResult;
        try {
            parsedData = JSON.parse(aiContent);
        } catch (parseError) {
            console.error('addArticleByUrl JSON parse error:', parseError, aiContent);
            throw new AppError('AIによる解析結果の読み取りに失敗しました');
        }

        const { data: article, error: articleError } = await supabase
            .from('articles')
            .insert({
                url: safeUrl.toString(),
                title: parsedData.title || pageTitle,
                summary: parsedData.summary || [],
                use_cases: parsedData.use_cases || [],
                tags: parsedData.tags || [],
            })
            .select()
            .single();

        if (articleError || !article) {
            if (articleError?.code === '23505') {
                throw new AppError('このURLの記事はすでに登録されています');
            }
            console.error('addArticleByUrl DB insert error:', articleError);
            throw new AppError('記事の保存に失敗しました');
        }

        const createdArticle = article;

        if (parsedData.commands && parsedData.commands.length > 0) {
            const commandsToInsert = parsedData.commands.map((cmd) => ({
                article_id: createdArticle.id,
                command: cmd.command,
                description: cmd.description || '',
            }));

            const { error: commandError } = await supabase
                .from('commands')
                .insert(commandsToInsert);

            if (commandError) {
                console.error('コマンド保存エラー:', commandError.message);
            }
        }

        revalidatePath('/');

        return { success: true, articleId: createdArticle.id };
    } catch (error) {
        console.error('addArticleByUrl Error:', error);
        return { success: false, error: toClientMessage(error, '処理中にエラーが発生しました') };
    }
}