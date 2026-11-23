import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { validateVideoUrl } from '@/lib/validators';
import { sanitizeFilename } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { YTDLP_SPEED_ARGS } from '@/lib/ytdlp';

export const dynamic = 'force-dynamic';

const YTDLP_BIN = process.env.YTDLP_PATH || 'yt-dlp';
const FFMPEG_BIN = process.env.FFMPEG_PATH || 'ffmpeg';

function getFfmpegLocation(): string | null {
  const configured = FFMPEG_BIN.trim();
  const looksLikePath =
    configured.includes('/') ||
    configured.includes('\\') ||
    configured.endsWith('.exe') ||
    configured.startsWith('.');

  if (!looksLikePath) return null;

  try {
    const absolute = path.resolve(configured);
    return fs.existsSync(absolute) && fs.statSync(absolute).isDirectory()
      ? absolute
      : path.dirname(absolute);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const rawUrl = searchParams.get('url');
  const formatId = searchParams.get('formatId') || 'bestvideo+bestaudio/best';
  const outputFormat = searchParams.get('outputFormat') || 'mp4';
  const customTitle = searchParams.get('title');

  if (!rawUrl) {
    return new Response('URL parameter is required', { status: 400 });
  }

  const validation = validateVideoUrl(rawUrl);
  if (!validation.valid) {
    return new Response(validation.error || 'Invalid video link', { status: 400 });
  }

  const title = sanitizeFilename(customTitle || 'video');
  const ext = outputFormat === 'mp3' ? 'mp3' : outputFormat;
  const filename = `${title}.${ext}`;

  logger.info('API:STREAM', `Direct stream request for ${validation.cleanUrl} [${filename}]`);

  const args = [
    '-o', '-',
    '--no-playlist',
    '--no-warnings',
    '--no-check-certificates',
    ...YTDLP_SPEED_ARGS,
  ];

  const ffmpegLocation = getFfmpegLocation();
  if (ffmpegLocation) {
    args.push('--ffmpeg-location', ffmpegLocation);
  }

  if (outputFormat === 'mp3' || formatId === 'bestaudio/best') {
    args.push('-x', '--audio-format', 'mp3', '-f', 'bestaudio/best');
  } else {
    args.push('-f', formatId, '--merge-output-format', outputFormat);
  }

  args.push(validation.cleanUrl);

  const child = spawn(YTDLP_BIN, args, { windowsHide: true });

  const stream = new ReadableStream({
    start(controller) {
      let isClosed = false;

      const safeEnqueue = (chunk: Uint8Array) => {
        if (isClosed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          isClosed = true;
        }
      };

      const safeClose = () => {
        if (isClosed) return;
        isClosed = true;
        try {
          controller.close();
        } catch {}
      };

      const safeError = (err: any) => {
        if (isClosed) return;
        isClosed = true;
        try {
          controller.error(err);
        } catch {}
      };

      child.stdout.on('data', (chunk: Buffer) => {
        safeEnqueue(new Uint8Array(chunk));
      });

      child.stdout.on('end', () => {
        safeClose();
      });

      child.on('error', (err) => {
        logger.error('API:STREAM', 'Process error during streaming', err);
        safeError(err);
      });

      child.on('close', (code) => {
        safeClose();
        if (code !== 0) {
          logger.error('API:STREAM', `Process exited non-zero (${code}) during stream`);
        } else {
          logger.info('API:STREAM', `Stream finished cleanly for ${filename}`);
        }
      });
    },
    cancel() {
      logger.info('API:STREAM', `Client cancelled stream for ${filename}. Killing process.`);
      try {
        child.kill('SIGTERM');
      } catch {}
    },
  });

  req.signal.addEventListener('abort', () => {
    try {
      child.kill('SIGTERM');
    } catch {}
  });

  const contentType = outputFormat === 'mp3' ? 'audio/mpeg' : 'video/mp4';

  return new Response(stream, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}

