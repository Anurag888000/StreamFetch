import { NextRequest } from 'next/server';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { YTDLP_SPEED_ARGS, getCookieArgs } from '@/lib/ytdlp';
import { validateVideoUrl } from '@/lib/validators';
import { sanitizeFilename } from '@/lib/utils';
import { StreamingZip } from '@/lib/zip-stream';
import { logger } from '@/lib/logger';

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
    return path.dirname(absolute);
  } catch {
    return null;
  }
}

/**
 * Handle IDM's HEAD probe to detect file headers & resume capability
 */
export async function HEAD(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> | { filename: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const rawParamName = decodeURIComponent(resolvedParams.filename || 'Batch_Downloads.zip');
  const baseZipName = sanitizeFilename(path.basename(rawParamName, path.extname(rawParamName)) || 'Batch_Downloads');
  const zipFilename = `${baseZipName}.zip`;

  const searchParams = req.nextUrl.searchParams;
  const customSize = searchParams.get('size');

  const headers: Record<string, string> = {
    'Content-Type': 'application/zip',
    'Accept-Ranges': 'bytes',
    'Content-Disposition': `attachment; filename="${encodeURIComponent(zipFilename)}"`,
    'Cache-Control': 'no-cache, no-transform',
    'ETag': `"${Buffer.from(zipFilename).toString('base64').slice(0, 16)}"`,
    'Last-Modified': 'Mon, 01 Jan 2024 00:00:00 GMT',
  };

  if (customSize && parseInt(customSize, 10) > 0) {
    headers['Content-Length'] = customSize;
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
  const rawParamName = decodeURIComponent(resolvedParams.filename || 'Batch_Downloads.zip');

  const searchParams = req.nextUrl.searchParams;
  const urlsParam = searchParams.get('urls');
  const formatId = searchParams.get('formatId') || 'bestvideo[height<=1080][vcodec^=avc1]+bestaudio[acodec^=mp4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/bestvideo+bestaudio/best';
  const outputFormat = searchParams.get('outputFormat') || 'mp4';

  if (!urlsParam) {
    return new Response('URLs parameter is required for batch ZIP', { status: 400 });
  }

  let urls: string[] = [];
  try {
    const parsed = JSON.parse(urlsParam);
    if (Array.isArray(parsed)) urls = parsed;
  } catch {
    urls = urlsParam.split(',').map((u) => u.trim()).filter(Boolean);
  }

  const validUrls = urls
    .map((u) => validateVideoUrl(u))
    .filter((v) => v.valid)
    .map((v) => v.cleanUrl);

  if (validUrls.length === 0) {
    return new Response('No valid video URLs provided in batch request', { status: 400 });
  }

  const baseZipName = sanitizeFilename(path.basename(rawParamName, path.extname(rawParamName)) || 'Batch_Downloads');
  const zipFilename = `${baseZipName}.zip`;
  const ffmpegLocation = getFfmpegLocation();

  const rangeHeader = req.headers.get('range');
  let startByte = 0;
  let isRangeRequest = false;

  if (rangeHeader) {
    const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (rangeMatch) {
      isRangeRequest = true;
      startByte = parseInt(rangeMatch[1], 10);
    }
  }

  logger.info('API:STREAM_BATCH_ZIP', `Initiating batch ZIP stream for ${validUrls.length} items (${zipFilename})`);

  const responseHeaders: Record<string, string> = {
    'Content-Type': 'application/zip',
    'Accept-Ranges': 'bytes',
    'Content-Disposition': `attachment; filename="${encodeURIComponent(zipFilename)}"`,
    'Cache-Control': 'no-cache, no-transform',
    'ETag': `"${Buffer.from(zipFilename).toString('base64').slice(0, 16)}"`,
    'Last-Modified': 'Mon, 01 Jan 2024 00:00:00 GMT',
  };

  const status = isRangeRequest ? 206 : 200;
  if (isRangeRequest) {
    responseHeaders['Content-Range'] = `bytes ${startByte}-/*`;
  }

  const zip = new StreamingZip();
  let activeChild: ChildProcess | null = null;
  let isAborted = false;

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;
      let bytesSkipped = 0;

      function safeEnqueue(chunk: Uint8Array) {
        if (isClosed || isAborted) return;
        try {
          if (startByte === 0) {
            controller.enqueue(chunk);
            return;
          }
          if (bytesSkipped + chunk.length <= startByte) {
            bytesSkipped += chunk.length;
            return;
          }
          if (bytesSkipped < startByte) {
            const offset = startByte - bytesSkipped;
            bytesSkipped = startByte;
            controller.enqueue(chunk.subarray(offset));
            return;
          }
          controller.enqueue(chunk);
        } catch {
          isClosed = true;
          isAborted = true;
        }
      }

      function safeClose() {
        if (isClosed) return;
        isClosed = true;
        try {
          controller.close();
        } catch {}
      }

      const failedItems: Array<{ url: string; reason: string }> = [];
      let successfulItemCount = 0;

      for (let i = 0; i < validUrls.length; i++) {
        if (isAborted || isClosed) break;

        const targetUrl = validUrls[i];
        const indexStr = String(i + 1).padStart(2, '0');
        const ext = outputFormat === 'mp3' ? 'mp3' : 'mp4';
        const itemFilename = `${indexStr} - Item_${i + 1}.${ext}`;

        const args = [
          '-o', '-',
          '--no-playlist',
          '--no-warnings',
          '--no-check-certificates',
          ...YTDLP_SPEED_ARGS,
          ...getCookieArgs(),
        ];

        if (ffmpegLocation) {
          args.push('--ffmpeg-location', ffmpegLocation);
        }

        if (outputFormat === 'mp3' || formatId === 'bestaudio/best') {
          args.push('-x', '--audio-format', 'mp3', '-f', 'bestaudio/best');
        } else {
          args.push('-f', formatId, '--merge-output-format', outputFormat);
        }

        args.push(targetUrl);

        let fileHeaderWritten = false;
        let stderrOutput = '';
        let bytesReceived = 0;

        await new Promise<void>((resolve) => {
          const child = spawn(YTDLP_BIN, args, { windowsHide: true });
          activeChild = child;

          child.stdout.on('data', (chunk: Buffer) => {
            if (isAborted) return;
            // Defer writing local file header until actual media data arrives
            if (!fileHeaderWritten) {
              fileHeaderWritten = true;
              const localHeader = zip.startFile(itemFilename);
              safeEnqueue(new Uint8Array(localHeader));
            }
            bytesReceived += chunk.length;
            zip.processChunk(chunk);
            safeEnqueue(new Uint8Array(chunk));
          });

          child.stderr.on('data', (errChunk: Buffer) => {
            stderrOutput += errChunk.toString();
          });

          child.on('error', (err) => {
            logger.error('API:STREAM_BATCH_ZIP', `Error streaming item ${i + 1}`, err);
            resolve();
          });

          child.on('close', (code) => {
            activeChild = null;
            if (code !== 0 || bytesReceived === 0) {
              const isBotBlock =
                stderrOutput.includes('Sign in to confirm you') ||
                stderrOutput.includes('bot') ||
                stderrOutput.includes('LOGIN_REQUIRED') ||
                stderrOutput.includes('DPAPI');

              const reason = isBotBlock
                ? 'YouTube Bot/Login Protection: Sign in or browser cookies required'
                : (stderrOutput.trim().split('\n').filter(Boolean).pop() || `Process exited with code ${code}`);

              logger.warn('API:STREAM_BATCH_ZIP', `Batch item stream failed [url=${targetUrl}, code=${code}]: ${reason}`);
              failedItems.push({ url: targetUrl, reason });
            } else {
              successfulItemCount++;
            }
            resolve();
          });
        });

        if (isAborted) break;

        // Only seal and write descriptor if file header was actually emitted
        if (fileHeaderWritten) {
          const descriptor = zip.endFile();
          safeEnqueue(new Uint8Array(descriptor));
        }
      }

      // If any items failed, append a helpful diagnostic README text file inside the ZIP
      if (failedItems.length > 0 && !isAborted && !isClosed) {
        const noticeHeader = zip.startFile('README_DOWNLOAD_NOTICE.txt');
        safeEnqueue(new Uint8Array(noticeHeader));

        const noticeLines = [
          '========================================================================',
          'STREAMFETCH BATCH DOWNLOAD NOTICE',
          '========================================================================',
          `Downloaded: ${successfulItemCount} of ${validUrls.length} items successfully.`,
          `Failed: ${failedItems.length} item(s) could not be downloaded.`,
          '',
          'FAILED ITEMS & REASONS:',
          ...failedItems.map((f, idx) => `  ${idx + 1}. ${f.url}\n     Reason: ${f.reason}`),
          '',
          'HOW TO SOLVE YOUTUBE BOT / LOGIN PROTECTION:',
          '------------------------------------------------------------------------',
          '1. Open StreamFetch in your browser (http://localhost:3000).',
          '2. Click the Cookie / Settings icon (gear/shield) in the top right header.',
          '3. Choose one of the following methods:',
          '   Method A (Recommended for Chrome / Edge):',
          '     - Install the free "Get cookies.txt LOCALLY" extension in Chrome/Edge.',
          '     - Open YouTube.com and ensure you are logged in.',
          '     - Click the extension icon and click "Export" to copy/download cookies.',
          '     - Paste the cookies into StreamFetch Settings and save.',
          '   Method B (Using Firefox):',
          '     - Open Mozilla Firefox, log into YouTube.',
          '     - In StreamFetch Settings, select "Mozilla Firefox".',
          '4. Click Download again to retrieve all protected items in Full HD.',
          '========================================================================',
        ];

        const noticeBuffer = Buffer.from(noticeLines.join('\r\n'), 'utf-8');
        zip.processChunk(noticeBuffer);
        safeEnqueue(new Uint8Array(noticeBuffer));

        const noticeDescriptor = zip.endFile();
        safeEnqueue(new Uint8Array(noticeDescriptor));
      }

      if (!isAborted && !isClosed) {
        const eocd = zip.finalize();
        safeEnqueue(new Uint8Array(eocd));
        safeClose();
        logger.info('API:STREAM_BATCH_ZIP', `Batch ZIP stream completed cleanly for ${zipFilename}`);
      }
    },
    cancel() {
      logger.info('API:STREAM_BATCH_ZIP', `Client aborted batch ZIP stream for ${zipFilename}`);
      isAborted = true;
      if (activeChild) {
        try {
          activeChild.kill('SIGTERM');
        } catch {}
      }
    },
  });

  req.signal.addEventListener('abort', () => {
    isAborted = true;
    if (activeChild) {
      try {
        activeChild.kill('SIGTERM');
      } catch {}
    }
  });

  return new Response(stream, {
    status,
    headers: responseHeaders,
  });
}

