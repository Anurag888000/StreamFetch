import { NextRequest } from 'next/server';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fetchPlaylistMetadata, YTDLP_SPEED_ARGS } from '@/lib/ytdlp';
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

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const rawUrl = searchParams.get('url');
  const formatId = searchParams.get('formatId') || 'bestvideo+bestaudio/best';
  const outputFormat = searchParams.get('outputFormat') || 'mp4';
  const customTitle = searchParams.get('title');
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
    logger.error('API:STREAM_ZIP', 'Failed to fetch playlist metadata for ZIP stream', err);
    return new Response('Failed to read playlist metadata: ' + err.message, { status: 500 });
  }

  // Filter selected videos if specified
  const selectedSet = selectedIdsParam ? new Set(selectedIdsParam.split(',').filter(Boolean)) : null;
  const targetVideos = selectedSet && selectedSet.size > 0
    ? playlist.videos.filter((v) => selectedSet.has(v.id))
    : playlist.videos;

  if (targetVideos.length === 0) {
    return new Response('No videos selected in playlist', { status: 400 });
  }

  const zipTitle = sanitizeFilename(customTitle || playlist.title || 'Playlist');
  const zipFilename = `${zipTitle}.zip`;
  const ffmpegLocation = getFfmpegLocation();

  logger.info('API:STREAM_ZIP', `Initiating direct ZIP stream for ${zipFilename} (${targetVideos.length} videos)`);

  let activeChild: ChildProcess | null = null;
  let isAborted = false;

  const stream = new ReadableStream({
    async start(controller) {
      const zip = new StreamingZip();
      let isClosed = false;

      const safeEnqueue = (chunk: Uint8Array) => {
        if (isClosed || isAborted) return;
        try {
          controller.enqueue(chunk);
        } catch {
          isClosed = true;
          isAborted = true;
        }
      };

      const safeClose = () => {
        if (isClosed) return;
        isClosed = true;
        try {
          controller.close();
        } catch {}
      };

      for (let i = 0; i < targetVideos.length; i++) {
        if (isAborted || isClosed) break;

        const video = targetVideos[i];
        const indexStr = String(i + 1).padStart(2, '0');
        const ext = outputFormat === 'mp3' ? 'mp3' : 'mp4';
        const videoFilename = `${indexStr} - ${sanitizeFilename(video.title)}.${ext}`;

        logger.info('API:STREAM_ZIP', `[${i + 1}/${targetVideos.length}] Streaming "${videoFilename}" into ZIP`);

        // Emit local file header for this video
        const localHeader = zip.startFile(videoFilename);
        safeEnqueue(new Uint8Array(localHeader));

        // Spawn yt-dlp to stream this specific video
        const args = [
          '-o', '-',
          '--no-playlist',
          '--no-warnings',
          '--no-check-certificates',
          ...YTDLP_SPEED_ARGS,
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

        await new Promise<void>((resolve) => {
          const child = spawn(YTDLP_BIN, args, { windowsHide: true });
          activeChild = child;

          child.stdout.on('data', (chunk: Buffer) => {
            if (isAborted || isClosed) return;
            zip.processChunk(chunk);
            safeEnqueue(new Uint8Array(chunk));
          });

          child.on('error', (err) => {
            logger.error('API:STREAM_ZIP', `Error streaming video ${video.id}`, err);
            resolve();
          });

          child.on('close', () => {
            activeChild = null;
            resolve();
          });
        });

        if (isAborted || isClosed) break;

        // Emit Data Descriptor after video data is written
        const descriptor = zip.endFile();
        safeEnqueue(new Uint8Array(descriptor));
      }

      if (!isAborted && !isClosed) {
        // Emit Central Directory and End of Central Directory
        const eocd = zip.finalize();
        safeEnqueue(new Uint8Array(eocd));
        safeClose();
        logger.info('API:STREAM_ZIP', `ZIP stream completed cleanly for ${zipFilename}`);
      }
    },
    cancel() {
      logger.info('API:STREAM_ZIP', `Client aborted ZIP stream for ${zipFilename}. Aborting processes.`);
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
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(zipFilename)}"`,
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}

