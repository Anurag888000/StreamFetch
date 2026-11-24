import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { validateVideoUrl } from '@/lib/validators';
import { sanitizeFilename } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { YTDLP_SPEED_ARGS, getCookieArgs } from '@/lib/ytdlp';

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

/**
 * Handle IDM's HEAD probe to detect file size & resume capability
 */
export async function HEAD(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> | { filename: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const rawParamName = decodeURIComponent(resolvedParams.filename || 'video.mp4');
  const searchParams = req.nextUrl.searchParams;
  const customSize = searchParams.get('size');
  const durationParam = searchParams.get('duration');
  const parsedExt = path.extname(rawParamName).toLowerCase().replace('.', '');
  const ext = searchParams.get('outputFormat') || parsedExt || 'mp4';
  const contentType = ext === 'mp3' ? 'audio/mpeg' : 'video/mp4';

  let computedSize = customSize ? parseInt(customSize, 10) : 0;
  if (!computedSize && durationParam) {
    const dur = parseInt(durationParam, 10);
    if (dur > 0) {
      const bytesPerSec = ext === 'mp3' ? 16000 : 320000;
      computedSize = Math.round(dur * bytesPerSec);
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
    'Content-Disposition': `attachment; filename="${encodeURIComponent(rawParamName)}"`,
    'Cache-Control': 'no-cache, no-transform',
    'ETag': `"${Buffer.from(rawParamName).toString('base64').slice(0, 16)}"`,
    'Last-Modified': 'Mon, 01 Jan 2024 00:00:00 GMT',
  };

  if (computedSize > 0) {
    headers['Content-Length'] = String(computedSize);
  }

  return new Response(null, {
    status: 200,
    headers,
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> | { filename: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const rawParamName = decodeURIComponent(resolvedParams.filename || 'video.mp4');

  const searchParams = req.nextUrl.searchParams;
  const rawUrl = searchParams.get('url');
  const formatId = searchParams.get('formatId') || 'bestvideo[height<=1080][vcodec^=avc1]+bestaudio[acodec^=mp4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/bestvideo+bestaudio/best';
  const customOutputFormat = searchParams.get('outputFormat');
  const customSizeStr = searchParams.get('size');
  const durationParam = searchParams.get('duration');

  const parsedExt = path.extname(rawParamName).toLowerCase().replace('.', '');
  const ext = customOutputFormat || parsedExt || 'mp4';

  let totalFileSize = customSizeStr ? parseInt(customSizeStr, 10) : 0;
  if (!totalFileSize && durationParam) {
    const dur = parseInt(durationParam, 10);
    if (dur > 0) {
      const bytesPerSec = ext === 'mp3' ? 16000 : 320000;
      totalFileSize = Math.round(dur * bytesPerSec);
    }
  }

  if (!rawUrl) {
    return new Response('URL parameter is required', { status: 400 });
  }

  const validation = validateVideoUrl(rawUrl);
  if (!validation.valid) {
    return new Response(validation.error || 'Invalid video link', { status: 400 });
  }

  const baseName = sanitizeFilename(path.basename(rawParamName, path.extname(rawParamName)));
  const finalFilename = `${baseName}.${ext}`;

  // Check Range request from IDM / browser
  const rangeHeader = req.headers.get('range');
  let startByte = 0;
  let endByte = totalFileSize > 0 ? totalFileSize - 1 : 0;
  let isRangeRequest = false;

  if (rangeHeader) {
    const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (rangeMatch) {
      isRangeRequest = true;
      startByte = parseInt(rangeMatch[1], 10);
      if (rangeMatch[2]) {
        endByte = parseInt(rangeMatch[2], 10);
      }
    }
  }

  logger.info('API:STREAM', `IDM-compatible stream request [range=${rangeHeader || 'none'}, startByte=${startByte}] -> ${finalFilename}`);

  const args = [
    '-o', '-',
    '--no-playlist',
    '--no-warnings',
    '--no-check-certificates',
    ...YTDLP_SPEED_ARGS,
    ...getCookieArgs(),
  ];

  const ffmpegLocation = getFfmpegLocation();
  if (ffmpegLocation) {
    args.push('--ffmpeg-location', ffmpegLocation);
  }

  if (ext === 'mp3' || formatId === 'bestaudio/best') {
    args.push('-x', '--audio-format', 'mp3', '-f', 'bestaudio/best');
  } else {
    args.push('-f', formatId, '--merge-output-format', ext);
  }

  args.push(validation.cleanUrl);

  const child = spawn(YTDLP_BIN, args, { windowsHide: true });

  const stream = new ReadableStream({
    start(controller) {
      let bytesSkipped = 0;
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
        if (startByte === 0) {
          safeEnqueue(new Uint8Array(chunk));
          return;
        }
        if (bytesSkipped + chunk.length <= startByte) {
          bytesSkipped += chunk.length;
          return;
        }
        if (bytesSkipped < startByte) {
          const offset = startByte - bytesSkipped;
          bytesSkipped = startByte;
          safeEnqueue(new Uint8Array(chunk.subarray(offset)));
          return;
        }
        safeEnqueue(new Uint8Array(chunk));
      });

      let stderrOutput = '';

      child.stderr.on('data', (chunk: Buffer) => {
        stderrOutput += chunk.toString();
      });

      child.stdout.on('end', () => {
        safeClose();
      });

      child.on('error', (err) => {
        logger.error('API:STREAM', 'Process error during IDM streaming', err);
        safeError(err);
      });

      child.on('close', (code) => {
        safeClose();
        if (code !== 0) {
          const isBotBlock =
            stderrOutput.includes('Sign in to confirm you') ||
            stderrOutput.includes('bot') ||
            stderrOutput.includes('LOGIN_REQUIRED');
          const cleanErr = stderrOutput.trim().split('\n').filter(Boolean).pop() || `Process exited with code ${code}`;
          logger.error('API:STREAM', `Process exited non-zero (${code}) during IDM stream: ${cleanErr}`, {
            isBotBlock,
            stderr: stderrOutput.slice(-500),
          });
        } else {
          logger.info('API:STREAM', `IDM stream finished cleanly for ${finalFilename}`);
        }
      });
    },
    cancel() {
      logger.info('API:STREAM', `IDM client cancelled stream for ${finalFilename}. Killing process.`);
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

  const contentType = ext === 'mp3' ? 'audio/mpeg' : 'video/mp4';
  const etag = `"${Buffer.from(finalFilename).toString('base64').slice(0, 16)}"`;
  const lastModified = 'Mon, 01 Jan 2024 00:00:00 GMT';

  const responseHeaders: Record<string, string> = {
    'Content-Type': contentType,
    'Content-Disposition': `attachment; filename="${encodeURIComponent(finalFilename)}"`,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-cache, no-transform',
    'ETag': etag,
    'Last-Modified': lastModified,
  };

  // If Range header requested, respond with 206 Partial Content so IDM enables Resume
  if (isRangeRequest) {
    const totalDisplay = totalFileSize > 0 ? String(totalFileSize) : '*';
    const endDisplay = endByte > startByte ? endByte : (totalFileSize > 0 ? totalFileSize - 1 : '*');
    const contentLength = endByte > startByte ? endByte - startByte + 1 : (totalFileSize > startByte ? totalFileSize - startByte : 0);

    responseHeaders['Content-Range'] = `bytes ${startByte}-${endDisplay}/${totalDisplay}`;
    if (contentLength > 0) {
      responseHeaders['Content-Length'] = String(contentLength);
    }

    return new Response(stream, {
      status: 206,
      headers: responseHeaders,
    });
  }

  if (totalFileSize > 0) {
    responseHeaders['Content-Length'] = String(totalFileSize);
  }

  return new Response(stream, {
    status: 200,
    headers: responseHeaders,
  });
}
