'use client';

import { useState, useEffect } from 'react';
import { PlaylistMetadata } from '@/types/video';
import { ProgressPayload } from '@/types/download';
import { formatDuration, sanitizeFilename } from '@/lib/utils';
import {
  Video,
  Music,
  CheckSquare,
  Square,
  Copy,
  Check,
  ArrowDownToLine,
  FolderArchive,
  LayoutList,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Search,
  X,
} from 'lucide-react';
import ProgressBar from './progress-bar';
import { saveToHistory } from '@/components/history/history-drawer';

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
  const [formatQuality, setFormatQuality] = useState(
    'bestvideo[height<=1080][vcodec^=avc1]+bestaudio[acodec^=mp4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/best'
  );
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const allSelected = selectedIds.size === playlist.videos.length && playlist.videos.length > 0;

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

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

  const getSingleVideoStreamUrl = (video: PlaylistMetadata['videos'][0]) => {
    const safeName = sanitizeFilename(video.title || 'Video');
    const ext = outputFormat === 'mp3' ? 'mp3' : 'mp4';
    return `/api/stream/${encodeURIComponent(`${safeName}.${ext}`)}?url=${encodeURIComponent(video.url)}&formatId=${encodeURIComponent(formatQuality)}&outputFormat=${encodeURIComponent(ext)}&duration=${video.duration || 0}`;
  };

  const recordDownload = () => {
    saveToHistory({
      id: playlist.id || `playlist_${Date.now()}`,
      title: playlist.title,
      thumbnail: playlist.videos[0]?.thumbnail,
      platform: 'youtube',
      format: outputFormat === 'mp3' ? '320kbps MP3' : '1080p FHD',
      outputFormat: 'zip',
      downloadUrl: getZipStreamUrl(),
    });
  };

  const recordSingleDownload = (video: PlaylistMetadata['videos'][0]) => {
    saveToHistory({
      id: video.id || `video_${Date.now()}`,
      title: video.title,
      thumbnail: video.thumbnail,
      platform: 'youtube',
      format: outputFormat === 'mp3' ? '320kbps MP3' : '1080p FHD',
      outputFormat: outputFormat,
      downloadUrl: getSingleVideoStreamUrl(video),
    });
  };

  const copyZipLink = () => {
    recordDownload();
    const zipUrl = `${window.location.origin}${getZipStreamUrl()}`;
    navigator.clipboard.writeText(zipUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const filteredVideos = playlist.videos.filter((v) =>
    searchQuery.trim() === '' ? true : v.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderTracklist = (isExpanded: boolean = false) => {
    if (viewMode === 'grid') {
      return (
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto p-2 ${
            isExpanded ? 'max-h-full' : 'max-h-96'
          } rounded-xl border border-neutral-800 bg-neutral-950/60`}
        >
          {filteredVideos.map((video, index) => {
            const isChecked = selectedIds.has(video.id);
            return (
              <div
                key={video.id}
                onClick={() => !downloading && toggleVideo(video.id)}
                className={`flex flex-col justify-between rounded-xl border p-3 transition-all cursor-pointer select-none ${
                  isChecked
                    ? 'border-neutral-700 bg-neutral-850/90 text-white shadow-md'
                    : 'border-neutral-850 bg-neutral-900/40 text-neutral-400 hover:border-neutral-750 hover:bg-neutral-850/40'
                }`}
              >
                {/* Thumbnail & Badges */}
                <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800/80 mb-2.5">
                  {video.thumbnail ? (
                    <img src={video.thumbnail} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-neutral-600">
                      <Video className="h-6 w-6" />
                    </div>
                  )}

                  {/* Number Badge */}
                  <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-md border border-white/10 text-white font-mono text-[10px] px-1.5 py-0.5 rounded-md">
                    #{String(index + 1).padStart(2, '0')}
                  </div>

                  {/* Selection Indicator */}
                  <div className="absolute top-2 right-2">
                    {isChecked ? (
                      <CheckSquare className="h-5 w-5 text-white drop-shadow-md" />
                    ) : (
                      <Square className="h-5 w-5 text-white/50 drop-shadow-md" />
                    )}
                  </div>

                  {/* Duration Badge */}
                  {video.duration ? (
                    <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md text-white font-mono text-[10px] px-1.5 py-0.5 rounded-md border border-white/10">
                      {formatDuration(video.duration)}
                    </div>
                  ) : null}
                </div>

                {/* Title */}
                <h3 className="text-xs font-medium text-white line-clamp-2 leading-relaxed mb-3">
                  {video.title}
                </h3>

                {/* Action Footer */}
                <div className="flex items-center justify-between border-t border-neutral-800/60 pt-2.5 mt-auto">
                  <span className="text-[10px] font-mono text-neutral-400">
                    {isChecked ? 'Selected for ZIP' : 'Excluded'}
                  </span>

                  <a
                    href={getSingleVideoStreamUrl(video)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      recordSingleDownload(video);
                    }}
                    title={`Download individual ${outputFormat.toUpperCase()} in IDM / Chrome`}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-black bg-white hover:bg-neutral-200 px-2.5 py-1 rounded-lg shadow-sm transition-all active:scale-95"
                  >
                    <ArrowDownToLine className="h-3 w-3 stroke-[2.2]" />
                    <span>{outputFormat.toUpperCase()}</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // List View (Default)
    return (
      <div
        className={`overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-950/60 p-2 space-y-1 divide-y divide-neutral-800/30 ${
          isExpanded ? 'max-h-full' : 'max-h-80'
        }`}
      >
        {filteredVideos.map((video, index) => {
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

                {/* Individual Download Action Button */}
                <a
                  href={getSingleVideoStreamUrl(video)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation();
                    recordSingleDownload(video);
                  }}
                  title={`Download this video as ${outputFormat.toUpperCase()} in IDM / Chrome`}
                  className="flex items-center gap-1 text-[11px] font-medium text-neutral-200 hover:text-black bg-neutral-800 hover:bg-white px-2.5 py-1 rounded-lg border border-neutral-700/60 transition-all shrink-0 ml-1 active:scale-95"
                >
                  <ArrowDownToLine className="h-3 w-3" />
                  <span className="hidden sm:inline">{outputFormat.toUpperCase()}</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
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

            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-700/80 p-2 sm:px-3 rounded-xl border border-neutral-700/60 transition-colors"
              title="Expand playlist into full screen studio view"
            >
              <Maximize2 className="h-3.5 w-3.5 text-neutral-300" />
              <span className="hidden sm:inline">Fullscreen</span>
            </button>
          </div>
        </div>

        {/* Format & Quality Presets for ZIP Archive */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="font-medium tracking-wide text-neutral-300">Output Format for ZIP Archive & Single Downloads</span>
            <span className="text-[11px] font-mono text-neutral-500">Applies to ZIP and single tracks</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              type="button"
              disabled={downloading}
              onClick={() => {
                setOutputFormat('mp4');
                setFormatQuality(
                  'bestvideo[height<=1080][vcodec^=avc1]+bestaudio[acodec^=mp4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/best'
                );
              }}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                outputFormat === 'mp4' && (formatQuality.includes('1080') || formatQuality === 'bestvideo+bestaudio/best')
                  ? 'border-neutral-400 bg-neutral-800 text-white shadow-sm ring-1 ring-white/10'
                  : 'border-neutral-800/80 bg-neutral-900/60 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800/40'
              }`}
            >
              <div className={`p-1.5 rounded-lg border ${outputFormat === 'mp4' && (formatQuality.includes('1080') || formatQuality === 'bestvideo+bestaudio/best') ? 'bg-white text-black border-white' : 'bg-neutral-800 text-neutral-300 border-neutral-700/60'}`}>
                <Video className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="text-xs font-medium">Best Video</div>
                <div className="text-[10px] font-mono text-neutral-400">1080p FHD MP4</div>
              </div>
            </button>

            <button
              type="button"
              disabled={downloading}
              onClick={() => {
                setOutputFormat('mp4');
                setFormatQuality(
                  'bestvideo[height<=720][vcodec^=avc1]+bestaudio[acodec^=mp4a]/bestvideo[height<=720]+bestaudio/best[height<=720]/best'
                );
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
                setFormatQuality(
                  'bestvideo[height<=480][vcodec^=avc1]+bestaudio[acodec^=mp4a]/bestvideo[height<=480]+bestaudio/best[height<=480]/best'
                );
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

        {/* Videos Tracklist Toolbar */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-neutral-400">
            <span className="font-medium tracking-wide text-neutral-300">
              Playlist Tracks ({playlist.videos.length})
            </span>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <div className="flex items-center bg-neutral-950/80 border border-neutral-800 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    viewMode === 'list'
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="List View"
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  <span>List</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    viewMode === 'grid'
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Grid</span>
                </button>
              </div>
            </div>
          </div>

          {/* Render In-Page Tracklist */}
          {renderTracklist(false)}
        </div>

        {/* Primary Action Button: Single Streaming ZIP Download */}
        <div className="pt-2 space-y-2">
          <a
            href={getZipStreamUrl()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={recordDownload}
            className={`w-full h-12 sm:h-14 rounded-xl bg-white text-black hover:bg-neutral-200 active:scale-[0.98] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-sm transition-all ${
              selectedIds.size === 0 ? 'pointer-events-none opacity-40' : ''
            }`}
          >
            <ArrowDownToLine className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.2]" />
            <span>
              Download {selectedIds.size} Videos as ZIP in IDM / Chrome ({outputFormat.toUpperCase()})
            </span>
          </a>
          <p className="text-[11px] text-center text-neutral-400 font-mono">
            💡 If YouTube triggers bot verification, open <span className="text-neutral-300 font-medium">Settings (top right)</span> to connect cookies.
          </p>
        </div>

        {downloading && (
          <div className="space-y-2">
            <ProgressBar progress={progress} />
          </div>
        )}
      </div>

      {/* Fullscreen Playlist Studio Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-[#09090b]/98 backdrop-blur-2xl flex flex-col overflow-hidden">
          {/* Studio Header */}
          <div className="flex items-center justify-between border-b border-neutral-800/80 px-4 sm:px-6 py-3.5 shrink-0 bg-[#09090b]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black shrink-0">
                <FolderArchive className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-semibold text-white truncate">
                  {playlist.title}
                </h2>
                <p className="text-[11px] font-mono text-neutral-400">
                  {selectedIds.size} of {playlist.videos.length} tracks selected for ZIP
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Quick Search */}
              <div className="relative hidden md:block w-48 lg:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter tracks..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-neutral-500"
                />
              </div>

              {/* View Switcher */}
              <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'list'
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="List View"
                >
                  <LayoutList className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'grid'
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Select All */}
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-850 px-3 py-1.5 rounded-lg border border-neutral-750 transition-colors"
              >
                {allSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{allSelected ? 'Deselect All' : 'Select All'}</span>
              </button>

              {/* Exit Fullscreen */}
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                title="Exit Fullscreen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Studio Content Body */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
            {renderTracklist(true)}
          </div>

          {/* Studio Sticky Footer */}
          <div className="border-t border-neutral-800/80 px-4 sm:px-6 py-3.5 shrink-0 bg-[#09090b]/95 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs font-mono text-neutral-400">
              Format: <span className="text-white font-medium">{outputFormat.toUpperCase()}</span> ({outputFormat === 'mp3' ? '320kbps Audio' : '1080p FHD Video'})
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="px-4 py-2 rounded-xl border border-neutral-800 bg-neutral-900 text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors"
              >
                Close Studio
              </button>

              <a
                href={getZipStreamUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={recordDownload}
                className={`flex-1 sm:flex-initial h-10 px-5 rounded-xl bg-white text-black hover:bg-neutral-200 active:scale-[0.98] font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all ${
                  selectedIds.size === 0 ? 'pointer-events-none opacity-40' : ''
                }`}
              >
                <ArrowDownToLine className="h-4 w-4 stroke-[2.2]" />
                <span>
                  Download {selectedIds.size} Videos as ZIP
                </span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
