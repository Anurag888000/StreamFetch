import { NextRequest } from 'next/server';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fetchPlaylistMetadata, YTDLP_SPEED_ARGS, getCookieArgs } from '@/lib/ytdlp';
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
  const rawParamName = decodeURIComponent(resolvedParams.filename || 'Playlist.zip');
  const baseZipName = sanitizeFilename(path.basename(rawParamName, path.extname(rawParamName)) || 'Playlist');
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
  const rawParamName = decodeURIComponent(resolvedParams.filename || 'Playlist.zip');

  const searchParams = req.nextUrl.searchParams;
  const rawUrl = searchParams.get('url');
  const formatId = searchParams.get('formatId') || 'bestvideo[height<=1080][vcodec^=avc1]+bestaudio[acodec^=mp4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/best';
  const outputFormat = searchParams.get('outputFormat') || 'mp4';
  const selectedIdsParam = searchParams.get('selectedIds');

  if (!rawUrl) {
    return new Response('URL parameter is required', { status: 400 });
  }

  const validation = validateVideoUrl(rawUrl);
  if (!validation.valid) {
    return new Response(validation.error || 'Invalid playlist link', { status: 400 });
  }

  let playlist;
  try {
    playlist = await fetchPlaylistMetadata(validation.cleanUrl);
  } catch (err: any) {
    logger.error('API:STREAM_ZIP', 'Failed to fetch playlist metadata for IDM ZIP stream', err);
    return new Response('Failed to read playlist metadata: ' + err.message, { status: 500 });
  }

  const selectedSet = selectedIdsParam ? new Set(selectedIdsParam.split(',').filter(Boolean)) : null;
  const targetVideos = selectedSet && selectedSet.size > 0
    ? playlist.videos.filter((v) => selectedSet.has(v.id))
    : playlist.videos;

  if (targetVideos.length === 0) {
    return new Response('No videos selected in playlist', { status: 400 });
  }

  const baseZipName = sanitizeFilename(path.basename(rawParamName, path.extname(rawParamName)) || playlist.title || 'Playlist');
  const zipFilename = `${baseZipName}.zip`;
  const ffmpegLocation = getFfmpegLocation();

  // Parse Range header for IDM / browser resume support
  const rangeHeader = req.headers.get('range');
  let startByte = 0;
  let endByte = 0;
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

  const customSizeStr = searchParams.get('size');
  const totalFileSize = customSizeStr ? parseInt(customSizeStr, 10) : 0;

  logger.info('API:STREAM_ZIP', `IDM-compatible ZIP stream initiated [range=${rangeHeader || 'none'}, startByte=${startByte}] for ${zipFilename} (${targetVideos.length} videos)`);

  let activeChild: ChildProcess | null = null;
  let isAborted = false;

  const stream = new ReadableStream({
    async start(controller) {
      const zip = new StreamingZip();
      let bytesSkipped = 0;
      let isClosed = false;

      function safeEnqueue(chunk: Uint8Array) {
        if (isAborted || isClosed) return;
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

      const failedVideos: Array<{ title: string; reason: string }> = [];
      let successfulVideoCount = 0;

      for (let i = 0; i < targetVideos.length; i++) {
        if (isAborted || isClosed) break;

        const video = targetVideos[i];
        const indexStr = String(i + 1).padStart(2, '0');
        const ext = outputFormat === 'mp3' ? 'mp3' : 'mp4';
        const videoFilename = `${indexStr} - ${sanitizeFilename(video.title)}.${ext}`;

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

        args.push(video.url);

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
              const localHeader = zip.startFile(videoFilename);
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
            logger.error('API:STREAM_ZIP', `Error streaming video ${video.id}`, err);
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

              logger.warn('API:STREAM_ZIP', `Video stream failed [id=${video.id}, code=${code}]: ${reason}`);
              failedVideos.push({ title: video.title, reason });
            } else {
              successfulVideoCount++;
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

      // If any videos failed, append a helpful diagnostic README text file inside the ZIP
      if (failedVideos.length > 0 && !isAborted && !isClosed) {
        const noticeHeader = zip.startFile('README_DOWNLOAD_NOTICE.txt');
        safeEnqueue(new Uint8Array(noticeHeader));

        const noticeLines = [
          '========================================================================',
          'STREAMFETCH DOWNLOAD NOTICE',
          '========================================================================',
          `Downloaded: ${successfulVideoCount} of ${targetVideos.length} items successfully.`,
          `Failed: ${failedVideos.length} item(s) could not be downloaded.`,
          '',
          'FAILED ITEMS & REASONS:',
          ...failedVideos.map((f, idx) => `  ${idx + 1}. ${f.title}\n     Reason: ${f.reason}`),
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
          '4. Click Download again to retrieve all protected videos in Full 1080p.',
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
        logger.info('API:STREAM_ZIP', `IDM ZIP stream completed cleanly for ${zipFilename}`);
      }
    },
    cancel() {
      logger.info('API:STREAM_ZIP', `Client aborted IDM ZIP stream for ${zipFilename}. Aborting processes.`);
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

  const etag = `"${Buffer.from(zipFilename).toString('base64').slice(0, 16)}"`;
  const lastModified = 'Mon, 01 Jan 2024 00:00:00 GMT';

  const responseHeaders: Record<string, string> = {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${encodeURIComponent(zipFilename)}"`,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-cache, no-transform',
    'ETag': etag,
    'Last-Modified': lastModified,
  };

  if (isRangeRequest) {
    const totalDisplay = totalFileSize > 0 ? String(totalFileSize) : '*';
    const endDisplay = endByte > startByte ? String(endByte) : (totalFileSize > 0 ? String(totalFileSize - 1) : '*');
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

