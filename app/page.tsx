'use client';

import { useState } from 'react';
import UrlInput from '@/components/download/url-input';
import VideoCard from '@/components/download/video-card';
import PlaylistCard from '@/components/download/playlist-card';
import BatchCard from '@/components/download/batch-card';
import { useDownload } from '@/hooks/use-download';
import {
  Play,
  Camera,
  MessageCircle,
  Video,
  ThumbsUp,
  Gauge,
  ArrowDownToLine,
  FolderArchive,
  AlertCircle,
} from 'lucide-react';

export default function Home() {
  const {
    loadingInfo,
    downloading,
    metadata,
    playlistMetadata,
    isPlaylist,
    progress,
    error,
    fetchInfo,
    startDownload,
  } = useDownload();

  const [batchUrls, setBatchUrls] = useState<string[] | null>(null);

  const platforms = [
    { id: 'youtube', name: 'YouTube', icon: Play, color: 'text-red-400', badge: 'Videos, Shorts & Playlists' },
    { id: 'instagram', name: 'Instagram', icon: Camera, color: 'text-pink-400', badge: 'Reels & Stories' },
    { id: 'facebook', name: 'Facebook', icon: ThumbsUp, color: 'text-blue-400', badge: 'Watch & Reels' },
  ];

  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Subtle Top Mesh Glow */}
      <div className="absolute top-0 -z-10 h-[380px] w-full max-w-4xl bg-neutral-800/10 blur-3xl pointer-events-none" />

      {/* Hero Section */}
      <section className="mx-auto w-full max-w-4xl px-4 pt-10 pb-14 sm:pt-16 sm:pb-16 text-center">
        {/* Real-world Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/90 px-3 py-1 text-xs font-mono text-neutral-400 mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Multi-Threaded • IDM Native • Direct Browser Stream</span>
        </div>

        {/* Clean, authoritative headline */}
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-3 leading-tight">
          Extract & Download Media <br className="hidden sm:inline" />
          <span className="text-neutral-400 font-normal">Directly at full line speed</span>
        </h1>

        <p className="mx-auto max-w-xl text-xs sm:text-sm text-neutral-400 mb-8 leading-relaxed">
          Pipes high-definition video, audio, and complete playlists straight to your browser or download manager without server buffering.
        </p>

        {/* Input Command Bar */}
        <div className="mx-auto max-w-2xl">
          <UrlInput
            onSubmit={(url) => {
              setBatchUrls(null);
              fetchInfo(url);
            }}
            onBatchSubmit={(urls) => {
              setBatchUrls(urls);
            }}
            isLoading={loadingInfo}
          />
        </div>

        {/* Multi-URL Batch Card */}
        {batchUrls && batchUrls.length > 0 && (
          <div className="mx-auto mt-8 max-w-3xl text-left">
            <BatchCard urls={batchUrls} onReset={() => setBatchUrls(null)} />
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="mx-auto mt-4 max-w-2xl flex items-start gap-3 rounded-xl bg-red-950/30 border border-red-800/50 p-3.5 text-left text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
            <div>
              <div className="font-semibold text-red-200">Unable to Inspect Media</div>
              <div className="text-neutral-400 mt-0.5">{error}</div>
            </div>
          </div>
        )}

        {/* Video Card Results */}
        {!isPlaylist && metadata && (
          <div className="mx-auto mt-8 max-w-3xl text-left">
            <VideoCard
              metadata={metadata}
              downloading={downloading}
              progress={progress}
              onDownload={(formatId, outputFormat) =>
                startDownload(metadata.url, formatId, outputFormat, false)
              }
            />
          </div>
        )}

        {/* Playlist Card Results */}
        {isPlaylist && playlistMetadata && (
          <div className="mx-auto mt-8 max-w-3xl text-left">
            <PlaylistCard
              playlist={playlistMetadata}
              downloading={downloading}
              progress={progress}
              onDownload={(formatId, outputFormat) =>
                startDownload(playlistMetadata.url, formatId, outputFormat, true)
              }
            />
          </div>
        )}

        {/* Supported Sources Bar */}
        <div className="mt-14 pt-8 border-t border-neutral-800/80">
          <p className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-4">
            Supported Media Platforms
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
            {platforms.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.id}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all text-center"
                >
                  <Icon className={`h-5 w-5 ${p.color}`} />
                  <span className="mt-1.5 text-xs font-medium text-white">{p.name}</span>
                  <span className="text-[10px] font-mono text-neutral-500 line-clamp-1">{p.badge}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Professional Technical Features Grid */}
      <section id="features" className="w-full border-t border-neutral-800/80 bg-neutral-950 py-14">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center mb-10">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Engineered For Utility & Speed</h2>
            <p className="mt-1 text-xs sm:text-sm text-neutral-400">Direct binary streaming with zero server-side disk bottlenecking.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 space-y-2.5">
              <div className="h-9 w-9 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-white">
                <Gauge className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">8x Multi-Threaded Streaming</h3>
              <p className="text-xs leading-relaxed text-neutral-400">
                Pipes fragments concurrently with Google CDN ratebypass enabled, maximizing your available ISP bandwidth without artificial caps.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 space-y-2.5">
              <div className="h-9 w-9 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-white">
                <ArrowDownToLine className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">IDM Native & HTTP 206 Resume</h3>
              <p className="text-xs leading-relaxed text-neutral-400">
                Full RFC 7233 Range headers and ETag validation allow Internet Download Manager to detect file types and resume broken connections.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 space-y-2.5">
              <div className="h-9 w-9 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-white">
                <FolderArchive className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Direct Streaming ZIP Archive</h3>
              <p className="text-xs leading-relaxed text-neutral-400">
                Packages multi-track playlists on-the-fly into standardized PKZip archives streamed straight into memory without filling up your server hard drive.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
