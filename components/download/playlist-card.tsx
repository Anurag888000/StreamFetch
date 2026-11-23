'use client';

import { useState } from 'react';
import { PlaylistMetadata } from '@/types/video';
import { ProgressPayload } from '@/types/download';
import { formatDuration, sanitizeFilename } from '@/lib/utils';
import {
  ListMusic,
  Video,
  Music,
  CheckSquare,
  Square,
  Copy,
  Check,
  ArrowDownToLine,
  FolderArchive,
} from 'lucide-react';
import ProgressBar from './progress-bar';

interface PlaylistCardProps {
  playlist: PlaylistMetadata;
  downloading: boolean;
  progress: ProgressPayload | null;
  onDownload: (formatId: string, outputFormat: string, selectedVideoIds: string[]) => void;
}

export default function PlaylistCard({
  playlist,
  downloading,
  progress,
}: PlaylistCardProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(playlist.videos.map((v) => v.id))
  );
  const [outputFormat, setOutputFormat] = useState<'mp4' | 'mp3'>('mp4');
  const [formatQuality, setFormatQuality] = useState('bestvideo+bestaudio/best');
  const [copied, setCopied] = useState(false);

  const allSelected = selectedIds.size === playlist.videos.length && playlist.videos.length > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(playlist.videos.map((v) => v.id)));
    }
  };

  const toggleVideo = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const getZipStreamUrl = () => {
    const idsParam = Array.from(selectedIds).join(',');
    const safeZipName = sanitizeFilename(playlist.title || 'Playlist');
    const selectedVideos = playlist.videos.filter((v) => selectedIds.has(v.id));
    const totalDuration = selectedVideos.reduce((sum, v) => sum + (v.duration || 180), 0);
    return `/api/stream-playlist-zip/${encodeURIComponent(`${safeZipName}.zip`)}?url=${encodeURIComponent(playlist.url)}&formatId=${encodeURIComponent(formatQuality)}&outputFormat=${encodeURIComponent(outputFormat)}&selectedIds=${encodeURIComponent(idsParam)}&duration=${totalDuration}`;
  };

  const copyZipLink = () => {
    const zipUrl = `${window.location.origin}${getZipStreamUrl()}`;
    navigator.clipboard.writeText(zipUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="w-full rounded-2xl bg-neutral-900/90 border border-neutral-800 p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-black shadow-sm shrink-0">
            <FolderArchive className="h-5 w-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-neutral-800 border border-neutral-700/60 px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider text-neutral-300">
                YouTube Playlist
              </span>
              <span className="text-xs font-mono text-neutral-400">
                {playlist.videoCount} {playlist.videoCount === 1 ? 'track' : 'tracks'}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-white mt-1 line-clamp-1">
              {playlist.title}
            </h2>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyZipLink}
            className="flex items-center gap-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-700/80 px-3 py-2 rounded-xl border border-neutral-700/60 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-neutral-400" />}
            <span>{copied ? 'Copied' : 'Copy ZIP Link'}</span>
          </button>

          <button
            type="button"
            onClick={toggleSelectAll}
            disabled={downloading}
            className="flex items-center gap-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-700/80 px-3.5 py-2 rounded-xl border border-neutral-700/60 transition-colors disabled:opacity-50"
          >
            {allSelected ? (
              <>
                <CheckSquare className="h-4 w-4 text-white" />
                <span>Deselect All</span>
              </>
            ) : (
              <>
                <Square className="h-4 w-4 text-neutral-400" />
                <span>Select All</span>
              </>
            )}
            <span className="ml-1 text-[11px] text-neutral-400 font-mono">
              ({selectedIds.size}/{playlist.videos.length})
            </span>
          </button>
        </div>
      </div>

      {/* Format & Quality Presets for ZIP Archive */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="font-medium tracking-wide text-neutral-300">Output Format for ZIP Archive</span>
          <span className="text-[11px] font-mono text-neutral-500">All tracks will be packaged in this format</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            disabled={downloading}
            onClick={() => {
              setOutputFormat('mp4');
              setFormatQuality('bestvideo+bestaudio/best');
            }}
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
              outputFormat === 'mp4' && formatQuality === 'bestvideo+bestaudio/best'
                ? 'border-neutral-400 bg-neutral-800 text-white shadow-sm ring-1 ring-white/10'
                : 'border-neutral-800/80 bg-neutral-900/60 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800/40'
            }`}
          >
            <div className={`p-1.5 rounded-lg border ${outputFormat === 'mp4' && formatQuality === 'bestvideo+bestaudio/best' ? 'bg-white text-black border-white' : 'bg-neutral-800 text-neutral-300 border-neutral-700/60'}`}>
              <Video className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-xs font-medium">Best Video</div>
              <div className="text-[10px] font-mono text-neutral-400">Max Quality MP4</div>
            </div>
          </button>

          <button
            type="button"
            disabled={downloading}
            onClick={() => {
              setOutputFormat('mp4');
              setFormatQuality('bestvideo[height<=720]+bestaudio/best[height<=720]');
            }}
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
              outputFormat === 'mp4' && formatQuality.includes('720')
                ? 'border-neutral-400 bg-neutral-800 text-white shadow-sm ring-1 ring-white/10'
                : 'border-neutral-800/80 bg-neutral-900/60 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800/40'
            }`}
          >
            <div className={`p-1.5 rounded-lg border ${outputFormat === 'mp4' && formatQuality.includes('720') ? 'bg-white text-black border-white' : 'bg-neutral-800 text-neutral-300 border-neutral-700/60'}`}>
              <Video className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-xs font-medium">720p HD</div>
              <div className="text-[10px] font-mono text-neutral-400">Standard MP4</div>
            </div>
          </button>

          <button
            type="button"
            disabled={downloading}
            onClick={() => {
              setOutputFormat('mp4');
              setFormatQuality('bestvideo[height<=480]+bestaudio/best[height<=480]');
            }}
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
              outputFormat === 'mp4' && formatQuality.includes('480')
                ? 'border-neutral-400 bg-neutral-800 text-white shadow-sm ring-1 ring-white/10'
                : 'border-neutral-800/80 bg-neutral-900/60 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800/40'
            }`}
          >
            <div className={`p-1.5 rounded-lg border ${outputFormat === 'mp4' && formatQuality.includes('480') ? 'bg-white text-black border-white' : 'bg-neutral-800 text-neutral-300 border-neutral-700/60'}`}>
              <Video className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-xs font-medium">480p SD</div>
              <div className="text-[10px] font-mono text-neutral-400">Smaller Size</div>
            </div>
          </button>

          <button
            type="button"
            disabled={downloading}
            onClick={() => {
              setOutputFormat('mp3');
              setFormatQuality('bestaudio/best');
            }}
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
              outputFormat === 'mp3'
                ? 'border-neutral-400 bg-neutral-800 text-white shadow-sm ring-1 ring-white/10'
                : 'border-neutral-800/80 bg-neutral-900/60 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800/40'
            }`}
          >
            <div className={`p-1.5 rounded-lg border ${outputFormat === 'mp3' ? 'bg-white text-black border-white' : 'bg-neutral-800 text-neutral-300 border-neutral-700/60'}`}>
              <Music className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-xs font-medium">Audio Only</div>
              <div className="text-[10px] font-mono text-neutral-400">320kbps MP3</div>
            </div>
          </button>
        </div>
      </div>

      {/* Videos Tracklist Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="font-medium tracking-wide text-neutral-300">Playlist Tracks ({playlist.videos.length})</span>
          <span className="text-[11px] font-mono text-neutral-500">Toggle track to include or exclude</span>
        </div>

        <div className="max-h-80 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-950/60 p-2 space-y-1 divide-y divide-neutral-800/30">
          {playlist.videos.map((video, index) => {
            const isChecked = selectedIds.has(video.id);

            return (
              <div
                key={video.id}
                onClick={() => !downloading && toggleVideo(video.id)}
                className={`flex items-center justify-between gap-3 p-2.5 rounded-lg transition-colors cursor-pointer select-none ${
                  isChecked
                    ? 'bg-neutral-850 text-white hover:bg-neutral-800/80'
                    : 'text-neutral-500 bg-transparent hover:bg-neutral-900/50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex items-center justify-center w-6 text-xs font-mono text-neutral-500 shrink-0">
                    {String(index + 1).padStart(2, '0')}
                  </div>

                  <div className="shrink-0">
                    {isChecked ? (
                      <CheckSquare className="h-4 w-4 text-white" />
                    ) : (
                      <Square className="h-4 w-4 text-neutral-600" />
                    )}
                  </div>

                  {video.thumbnail && (
                    <div className="h-9 w-14 shrink-0 rounded-md overflow-hidden bg-neutral-900 border border-neutral-800/80 relative">
                      <img src={video.thumbnail} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{video.title}</div>
                  </div>

                  {video.duration ? (
                    <div className="shrink-0 text-[11px] font-mono text-neutral-400 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-md hidden sm:block">
                      {formatDuration(video.duration)}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Primary Action Button: Single Streaming ZIP Download */}
      <div className="pt-2">
        <a
          href={getZipStreamUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className={`w-full h-12 sm:h-14 rounded-xl bg-white text-black hover:bg-neutral-200 active:scale-[0.98] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-sm transition-all ${
            selectedIds.size === 0 ? 'pointer-events-none opacity-40' : ''
          }`}
        >
          <ArrowDownToLine className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.2]" />
          <span>
            Download {selectedIds.size} Videos as ZIP in IDM / Chrome ({outputFormat.toUpperCase()})
          </span>
        </a>
      </div>

      {downloading && (
        <div className="space-y-2">
          <ProgressBar progress={progress} />
        </div>
      )}
    </div>
  );
}
