import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { VideoFormat, VideoMetadata, PlaylistMetadata } from '@/types/video';
import { validateVideoUrl } from './validators';
import { sanitizeFilename } from './utils';
import { logger } from './logger';

const YTDLP_BIN = process.env.YTDLP_PATH || 'yt-dlp';
const FFMPEG_BIN = process.env.FFMPEG_PATH || 'ffmpeg';
const DOWNLOAD_DIR = path.resolve(process.cwd(), process.env.DOWNLOAD_DIR || '.tmp/downloads');

/**
 * Resolve ffmpeg location for yt-dlp's --ffmpeg-location flag.
 * Returns a directory path when an actual path is configured, otherwise null
 * so yt-dlp falls back to searching PATH (which finds both ffmpeg and ffprobe).
 */
function getFfmpegLocation(): string | null {
  const configured = FFMPEG_BIN.trim();
  const looksLikePath =
    configured.includes('/') ||
    configured.includes('\\') ||
    configured.endsWith('.exe') ||
    configured.startsWith('.');

  if (!looksLikePath) {
    // Bare executable name (e.g. "ffmpeg") — let yt-dlp search PATH
    return null;
  }

  try {
    const absolute = path.resolve(configured);
    return fs.existsSync(absolute) && fs.statSync(absolute).isDirectory()
      ? absolute
      : path.dirname(absolute);
  } catch {
    return null;
  }
}

// Ensure download directory exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

export function getDownloadDirectory(): string {
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }
  return DOWNLOAD_DIR;
}

/**
 * High-performance yt-dlp speed optimization flags:
 * - 8 concurrent fragment connections (--concurrent-fragments 8)
 * - 10MB HTTP chunk size to bypass YouTube rate pacing (--http-chunk-size 10M)
 * - 1024KB I/O buffer to minimize system context switches (--buffer-size 1024K)
 * - Android player client spoofing for uncapped CDN ratebypass (--extractor-args "youtube:player_client=android,web")
 */
export const YTDLP_SPEED_ARGS: string[] = [
  '--concurrent-fragments', '8',
  '--http-chunk-size', '10M',
  '--buffer-size', '1024K',
  '--extractor-args', 'youtube:player_client=android,web',
];

/**
 * Fetch video metadata via yt-dlp --dump-json
 */
export async function fetchVideoMetadata(rawUrl: string): Promise<VideoMetadata> {
  const validation = validateVideoUrl(rawUrl);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid URL');
  }

  const args = [
    '--dump-json',
    '--no-playlist',
    '--no-warnings',
    '--no-check-certificates',
    '--extractor-args', 'youtube:player_client=android,web',
    validation.cleanUrl,
  ];

  logger.engine('YTDLP', `Executing metadata probe for ${validation.cleanUrl}`, {
    binary: YTDLP_BIN,
    args,
  });

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const child = spawn(YTDLP_BIN, args, { windowsHide: true });
    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    child.on('error', (err) => {
      logger.error('ENGINE:YTDLP', `Failed to spawn yt-dlp binary: ${YTDLP_BIN}`, err);
      reject(new Error(`Failed to launch yt-dlp: ${err.message}. Please verify yt-dlp is installed.`));
    });

    child.on('close', (code) => {
      const durationMs = Date.now() - startTime;
      if (code !== 0) {
        logger.error('ENGINE:YTDLP', `Metadata probe failed with exit code ${code} in ${durationMs}ms`, stderrData.trim());
        return reject(new Error(stderrData.trim() || `yt-dlp exited with code ${code}`));
      }

      try {
        const raw = JSON.parse(stdoutData.trim());
        logger.engine('YTDLP', `Metadata parsed successfully in ${durationMs}ms`, {
          title: raw.title,
          uploader: raw.uploader,
          duration: raw.duration,
          rawFormatsCount: raw.formats?.length || 0,
        });
        const formats: VideoFormat[] = (raw.formats || [])
          .filter((f: any) => f.format_id && (f.vcodec !== 'none' || f.acodec !== 'none'))
          .map((f: any) => ({
            formatId: f.format_id,
            ext: f.ext,
            resolution: f.resolution || (f.height ? `${f.height}p` : undefined),
            qualityLabel: f.format_note || (f.height ? `${f.height}p` : undefined),
            filesize: f.filesize || f.filesize_approx,
            hasVideo: f.vcodec && f.vcodec !== 'none',
            hasAudio: f.acodec && f.acodec !== 'none',
            fps: f.fps,
            vcodec: f.vcodec,
            acodec: f.acodec,
          }));

        // Deduplicate & sort formats nicely
        const uniqueFormats = consolidateFormats(formats);

        const metadata: VideoMetadata = {
          id: raw.id,
          title: raw.title || 'Untitled Video',
          description: raw.description,
          thumbnail: raw.thumbnail,
          duration: raw.duration,
          uploader: raw.uploader || raw.channel,
          uploaderUrl: raw.uploader_url,
          viewCount: raw.view_count,
          platform: validation.platform,
          url: validation.cleanUrl,
          formats: uniqueFormats,
        };

        resolve(metadata);
      } catch (err: any) {
        reject(new Error(`Failed to parse video info: ${err.message}`));
      }
    });
  });
}

function consolidateFormats(formats: VideoFormat[]): VideoFormat[] {
  const result: VideoFormat[] = [];
  const seen = new Set<string>();

  // Add Best Video + Audio presets
  result.push({
    formatId: 'bestvideo+bestaudio/best',
    ext: 'mp4',
    resolution: 'Best Available',
    qualityLabel: 'Max Quality (Full HD/4K)',
    hasVideo: true,
    hasAudio: true,
  });

  // Common resolutions
  const targetHeights = ['1080p', '720p', '480p', '360p'];
  for (const height of targetHeights) {
    const hNum = height.replace('p', '');
    result.push({
      formatId: `bestvideo[height<=${hNum}]+bestaudio/best[height<=${hNum}]`,
      ext: 'mp4',
      resolution: height,
      qualityLabel: `${height} (MP4)`,
      hasVideo: true,
      hasAudio: true,
    });
  }

  // Audio only preset
  result.push({
    formatId: 'bestaudio/best',
    ext: 'mp3',
    resolution: 'Audio Only',
    qualityLabel: 'MP3 Audio (High Quality)',
    hasVideo: false,
    hasAudio: true,
  });

  return result;
}

/**
 * Fetch YouTube playlist metadata via yt-dlp --flat-playlist --dump-single-json
 */
export async function fetchPlaylistMetadata(rawUrl: string): Promise<PlaylistMetadata> {
  const validation = validateVideoUrl(rawUrl);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid URL');
  }

  const args = [
    '--flat-playlist',
    '--dump-single-json',
    '--no-warnings',
    '--no-check-certificates',
    '--extractor-args', 'youtube:player_client=android,web',
    validation.cleanUrl,
  ];

  logger.engine('YTDLP', `Executing playlist probe for ${validation.cleanUrl}`, {
    binary: YTDLP_BIN,
    args,
  });

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const child = spawn(YTDLP_BIN, args, { windowsHide: true });
    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    child.on('error', (err) => {
      logger.error('ENGINE:YTDLP', `Failed to spawn yt-dlp binary for playlist: ${YTDLP_BIN}`, err);
      reject(new Error(`Failed to launch yt-dlp: ${err.message}. Please verify yt-dlp is installed.`));
    });

    child.on('close', (code) => {
      const durationMs = Date.now() - startTime;
      if (code !== 0) {
        logger.error('ENGINE:YTDLP', `Playlist probe failed with exit code ${code} in ${durationMs}ms`, stderrData.trim());
        return reject(new Error(stderrData.trim() || `yt-dlp exited with code ${code}`));
      }

      try {
        const raw = JSON.parse(stdoutData.trim());
        const rawEntries: any[] = Array.isArray(raw.entries) ? raw.entries : [];
        const videos = rawEntries
          .filter((e) => e && e.title && e.title !== '[Private video]' && e.title !== '[Deleted video]')
          .map((e, idx) => ({
            id: e.id || `video-${idx + 1}`,
            title: e.title || `Video #${idx + 1}`,
            url: e.url || (e.id ? `https://www.youtube.com/watch?v=${e.id}` : validation.cleanUrl),
            duration: typeof e.duration === 'number' ? e.duration : undefined,
            thumbnail: Array.isArray(e.thumbnails) && e.thumbnails.length > 0
              ? e.thumbnails[e.thumbnails.length - 1].url
              : (e.id ? `https://i.ytimg.com/vi/${e.id}/mqdefault.jpg` : undefined),
          }));

        const playlist: PlaylistMetadata = {
          id: raw.id || 'playlist',
          title: raw.title || 'YouTube Playlist',
          platform: 'youtube',
          url: validation.cleanUrl,
          videoCount: videos.length,
          videos,
        };

        logger.engine('YTDLP', `Playlist parsed successfully in ${durationMs}ms`, {
          title: playlist.title,
          videoCount: playlist.videoCount,
        });

        resolve(playlist);
      } catch (err: any) {
        reject(new Error(`Failed to parse playlist data: ${err.message}`));
      }
    });
  });
}

/**
 * Execute download with progress callbacks
 */
export function downloadMedia({
  jobId,
  url,
  formatId,
  outputFormat = 'mp4',
  onProgress,
  onComplete,
  onError,
}: {
  jobId: string;
  url: string;
  formatId: string;
  outputFormat?: string;
  onProgress: (percent: number, speed?: string, eta?: string) => void;
  onComplete: (filePath: string, filename: string, fileSize: number) => void;
  onError: (error: string) => void;
}) {
  const outDir = getDownloadDirectory();
  const fileTemplate = path.join(outDir, `${jobId}_%(title).50s.%(ext)s`);

  const args = [
    '--newline',
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
    args.push('-f', formatId || 'bestvideo+bestaudio/best', '--merge-output-format', outputFormat);
  }

  args.push('-o', fileTemplate, url);

  logger.engine('YTDLP', `Spawning download process for job ${jobId}`, {
    binary: YTDLP_BIN,
    url,
    outputFormat,
    formatId,
    fileTemplate,
    args,
  });

  const startTime = Date.now();
  const child = spawn(YTDLP_BIN, args, { windowsHide: true });
  let lastError = '';

  child.stdout.on('data', (data) => {
    const text = data.toString();
    // Parse yt-dlp progress: [download]  45.2% of 25.10MiB at  2.45MiB/s ETA 00:06
    const match = text.match(/\[download\]\s+([\d.]+)%\s+of\s+~?([\w.]+)\s+at\s+([\w./]+)\s+ETA\s+([\d:]+)/);
    if (match) {
      const percent = parseFloat(match[1]);
      const speed = match[3];
      const eta = match[4];
      onProgress(percent, speed, eta);
    }
  });

  child.stderr.on('data', (data) => {
    lastError += data.toString();
  });

  child.on('error', (err) => {
    logger.error('ENGINE:YTDLP', `Job ${jobId} failed to launch process`, err);
    onError(`Process error: ${err.message}. Is yt-dlp installed and accessible?`);
  });

  child.on('close', (code) => {
    const durationMs = Date.now() - startTime;
    if (code !== 0) {
      logger.error('ENGINE:YTDLP', `Job ${jobId} exited with error code ${code} in ${durationMs}ms`, lastError.trim());
      return onError(lastError.trim() || `Download process exited with code ${code}`);
    }

    // Locate the downloaded file
    try {
      const files = fs.readdirSync(outDir);
      const matchedFile = files.find((f) => f.startsWith(jobId));

      if (!matchedFile) {
        logger.error('ENGINE:YTDLP', `Job ${jobId} completed code 0 but file was not found in ${outDir}`);
        return onError('Download completed but output file could not be located.');
      }

      const filePath = path.join(outDir, matchedFile);
      const stats = fs.statSync(filePath);
      const originalName = matchedFile.replace(`${jobId}_`, '');

      logger.engine('YTDLP', `Job ${jobId} finalized on disk in ${durationMs}ms`, {
        filePath,
        filename: originalName,
        bytes: stats.size,
      });

      onComplete(filePath, originalName, stats.size);
    } catch (err: any) {
      logger.error('ENGINE:YTDLP', `Job ${jobId} file resolution exception`, err);
      onError(`File resolution error: ${err.message}`);
    }
  });

  return child;
}

/**
 * Execute playlist download with progress tracking and ZIP packaging
 */
export function downloadPlaylist({
  jobId,
  url,
  formatId,
  outputFormat = 'mp4',
  onProgress,
  onComplete,
  onError,
}: {
  jobId: string;
  url: string;
  formatId: string;
  outputFormat?: string;
  onProgress: (percent: number, speed?: string, eta?: string, currentItem?: number, totalItems?: number, currentTitle?: string) => void;
  onComplete: (filePath: string, filename: string, fileSize: number) => void;
  onError: (error: string) => void;
}) {
  const outDir = getDownloadDirectory();
  const playlistFolder = path.join(outDir, `${jobId}_playlist`);

  if (!fs.existsSync(playlistFolder)) {
    fs.mkdirSync(playlistFolder, { recursive: true });
  }

  const fileTemplate = path.join(playlistFolder, '%(playlist_index)02d - %(title).50s.%(ext)s');

  const args = [
    '--newline',
    '--yes-playlist',
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
    args.push('-f', formatId || 'bestvideo+bestaudio/best', '--merge-output-format', outputFormat);
  }

  args.push('-o', fileTemplate, url);

  logger.engine('YTDLP', `Spawning playlist download for job ${jobId}`, {
    binary: YTDLP_BIN,
    url,
    outputFormat,
    args,
  });

  const startTime = Date.now();
  const child = spawn(YTDLP_BIN, args, { windowsHide: true });
  let lastError = '';
  let currentItem = 1;
  let totalItems = 1;
  let currentTitle = '';

  child.stdout.on('data', (data) => {
    const text = data.toString();
    const itemMatch = text.match(/\[download\] Downloading (?:item|video) (\d+) of (\d+)/i);
    if (itemMatch) {
      currentItem = parseInt(itemMatch[1], 10);
      totalItems = parseInt(itemMatch[2], 10);
    }

    const titleMatch = text.match(/\[download\] Destination: .*[\\/](.+)/);
    if (titleMatch) {
      currentTitle = titleMatch[1];
    }

    const match = text.match(/\[download\]\s+([\d.]+)%\s+of\s+~?([\w.]+)\s+at\s+([\w./]+)\s+ETA\s+([\d:]+)/);
    if (match) {
      const itemPercent = parseFloat(match[1]);
      const speed = match[3];
      const eta = match[4];
      const overallPercent = totalItems > 0
        ? Math.min(99, (((currentItem - 1) + (itemPercent / 100)) / totalItems) * 100)
        : itemPercent;

      onProgress(overallPercent, speed, eta, currentItem, totalItems, currentTitle);
    }
  });

  child.stderr.on('data', (data) => {
    lastError += data.toString();
  });

  child.on('error', (err) => {
    logger.error('ENGINE:YTDLP', `Playlist job ${jobId} failed to launch`, err);
    onError(`Process error: ${err.message}. Is yt-dlp installed and accessible?`);
  });

  child.on('close', (code) => {
    const durationMs = Date.now() - startTime;
    if (code !== 0) {
      logger.error('ENGINE:YTDLP', `Playlist job ${jobId} exited with error code ${code} in ${durationMs}ms`, lastError.trim());
      return onError(lastError.trim() || `Download process exited with code ${code}`);
    }

    // Now zip the playlist folder
    const zipFilename = `${jobId}_Playlist.zip`;
    const zipPath = path.join(outDir, zipFilename);

    logger.engine('YTDLP', `Packaging playlist files into ${zipFilename}...`);

    const isWindows = process.platform === 'win32';
    const zipCmd = isWindows ? 'powershell.exe' : 'zip';
    const zipArgs = isWindows
      ? ['-NoProfile', '-Command', `Compress-Archive -Path "${playlistFolder}\\*" -DestinationPath "${zipPath}" -Force`]
      : ['-r', zipPath, '.'];

    const zipProcess = spawn(zipCmd, zipArgs, isWindows ? { windowsHide: true } : { cwd: playlistFolder });

    zipProcess.on('close', (zipCode) => {
      if (zipCode === 0 && fs.existsSync(zipPath)) {
        const stats = fs.statSync(zipPath);
        try {
          fs.rmSync(playlistFolder, { recursive: true, force: true });
        } catch {}

        logger.engine('YTDLP', `Playlist zip package completed (${stats.size} bytes) in ${durationMs}ms`);
        onComplete(zipPath, zipFilename, stats.size);
      } else {
        const files = fs.readdirSync(playlistFolder);
        if (files.length > 0) {
          const first = path.join(playlistFolder, files[0]);
          const stats = fs.statSync(first);
          onComplete(first, files[0], stats.size);
        } else {
          onError('Failed to create ZIP package of the downloaded playlist.');
        }
      }
    });

    zipProcess.on('error', (zipErr) => {
      logger.error('ENGINE:YTDLP', `ZIP packaging failed for job ${jobId}`, zipErr);
      onError(`ZIP creation error: ${zipErr.message}`);
    });
  });

  return child;
}

