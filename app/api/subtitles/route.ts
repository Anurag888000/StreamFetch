import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { validateVideoUrl } from '@/lib/validators';
import { sanitizeFilename } from '@/lib/utils';
import { getCookieArgs } from '@/lib/ytdlp';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const YTDLP_BIN = process.env.YTDLP_PATH || 'yt-dlp';
const DOWNLOAD_DIR = path.resolve(process.cwd(), process.env.DOWNLOAD_DIR || '.tmp/downloads');

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const rawUrl = searchParams.get('url');
  const lang = searchParams.get('lang') || 'en';
  const customTitle = searchParams.get('title');

  if (!rawUrl) {
    return new NextResponse('URL parameter is required', { status: 400 });
  }

  const validation = validateVideoUrl(rawUrl);
  if (!validation.valid) {
    return new NextResponse(validation.error || 'Invalid video link', { status: 400 });
  }

  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }

  const jobId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const outTemplate = path.join(DOWNLOAD_DIR, `${jobId}.%(ext)s`);

  const args = [
    '--skip-download',
    '--write-sub',
    '--write-auto-sub',
    '--sub-lang', lang,
    '--convert-subs', 'srt',
    '--no-warnings',
    '--no-check-certificates',
    '--js-runtimes', 'node',
    ...getCookieArgs(),
    '-o', outTemplate,
    validation.cleanUrl,
  ];

  logger.info('API:SUBTITLES', `Fetching subtitles for ${validation.cleanUrl} [${lang}]`);

  return new Promise<Response>((resolve) => {
    const child = spawn(YTDLP_BIN, args, { windowsHide: true });
    let stderr = '';

    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    child.on('error', (err) => {
      logger.error('API:SUBTITLES', 'Failed to launch subtitle process', err);
      resolve(new NextResponse('Failed to process subtitles: ' + err.message, { status: 500 }));
    });

    child.on('close', (code) => {
      try {
        const files = fs.readdirSync(DOWNLOAD_DIR);
        const match = files.find((f) => f.startsWith(jobId) && (f.endsWith('.srt') || f.endsWith('.vtt')));

        if (!match) {
          logger.info('API:SUBTITLES', `No subtitle file generated for ${validation.cleanUrl} [${lang}]`);
          return resolve(new NextResponse('No subtitles available in ' + lang.toUpperCase(), { status: 404 }));
        }

        const subFilePath = path.join(DOWNLOAD_DIR, match);
        const content = fs.readFileSync(subFilePath, 'utf-8');
        try {
          fs.unlinkSync(subFilePath);
        } catch {}

        const safeTitle = sanitizeFilename(customTitle || 'subtitles');
        const filename = `${safeTitle}.${lang}.srt`;

        return resolve(new NextResponse(content, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
            'Cache-Control': 'no-cache, no-transform',
          },
        }));
      } catch (err: any) {
        logger.error('API:SUBTITLES', 'Error reading subtitle file', err);
        return resolve(new NextResponse('Failed to retrieve subtitles', { status: 500 }));
      }
    });
  });
}
