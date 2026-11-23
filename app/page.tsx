'use client';

import { useState } from 'react';
import UrlInput from '@/components/download/url-input';
import VideoCard from '@/components/download/video-card';
import { useDownload } from '@/hooks/use-download';
import {
  Play,
  Camera,
  MessageCircle,
  ThumbsUp,
  ShieldCheck,
  Zap,
  Sliders,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function Home() {
  const {
    loadingInfo,
    downloading,
    metadata,
    progress,
    error,
    fetchInfo,
    startDownload,
    reset,
  } = useDownload();

  const [activePlatformFilter, setActivePlatformFilter] = useState<string>('all');

  const platforms = [
    { id: 'youtube', name: 'YouTube', icon: Play, color: 'text-red-500', badge: 'Videos & Shorts' },
    { id: 'instagram', name: 'Instagram', icon: Camera, color: 'text-pink-500', badge: 'Reels & Stories' },
    { id: 'twitter', name: 'Twitter / X', icon: MessageCircle, color: 'text-sky-400', badge: 'HD Videos' },
    { id: 'facebook', name: 'Facebook', icon: ThumbsUp, color: 'text-blue-500', badge: 'Reels & Watch' },
  ];

  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 -z-10 h-[500px] w-full max-w-5xl bg-gradient-to-b from-blue-600/15 via-indigo-600/5 to-transparent blur-3xl pointer-events-none" />

      {/* Hero Section */}
      <section className="mx-auto w-full max-w-4xl px-4 pt-12 pb-16 sm:pt-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3.5 py-1 text-xs font-medium text-blue-400 mb-6">
          <Zap className="h-3.5 w-3.5 text-blue-400" />
          <span>High-Speed Direct Media Extraction</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-4">
          Download Any Video <br />
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            Without Limitations
          </span>
        </h1>

        <p className="mx-auto max-w-2xl text-sm sm:text-lg text-slate-400 mb-8 leading-relaxed">
          The ultimate downloader for YouTube, Instagram Reels, TikTok, and Twitter.
          Save in crystal clear 1080p, 4K, or extract crystal clear MP3 audio instantly.
        </p>

        {/* Input Box */}
        <div className="mx-auto max-w-2xl">
          <UrlInput onSubmit={(url) => fetchInfo(url)} isLoading={loadingInfo} />
        </div>

        {/* Error notification */}
        {error && (
          <div className="mx-auto mt-4 max-w-2xl flex items-start gap-3 rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-left text-sm text-red-400">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Analysis Failed</div>
              <div className="text-xs text-red-300/90 mt-0.5">{error}</div>
            </div>
          </div>
        )}

        {/* Video Card Results */}
        {metadata && (
          <div className="mx-auto mt-8 max-w-3xl text-left">
            <VideoCard
              metadata={metadata}
              downloading={downloading}
              progress={progress}
              onDownload={(formatId, outputFormat) =>
                startDownload(metadata.url, formatId, outputFormat)
              }
            />
          </div>
        )}

        {/* Supported Platforms Grid */}
        <div className="mt-14 pt-8 border-t border-slate-800/60">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-6">
            Supported Sources & Formats
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {platforms.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.id}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#0f172a]/60 border border-slate-800 hover:border-slate-700 transition-all group"
                >
                  <Icon className={`h-7 w-7 ${p.color} transition-transform group-hover:scale-110`} />
                  <span className="mt-2 text-sm font-semibold text-white">{p.name}</span>
                  <span className="text-[11px] text-slate-400">{p.badge}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section id="features" className="w-full border-t border-slate-800/80 bg-[#070b14] py-16">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Engineered For Reliability</h2>
            <p className="mt-2 text-sm text-slate-400">Built on modern protocols for smooth and safe downloads.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-slate-800 bg-[#0d1322] p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Sliders className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Multi-Resolution Selection</h3>
              <p className="text-xs leading-relaxed text-slate-400">
                Pick your preferred quality from 360p up to full 4K UHD, or extract pristine 320kbps MP3 audio with one click.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#0d1322] p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Live SSE Progress Stream</h3>
              <p className="text-xs leading-relaxed text-slate-400">
                Real-time Server-Sent Events transmit download percentage, transfer speeds, and exact ETA directly to your browser.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#0d1322] p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Zero Third-Party Ads</h3>
              <p className="text-xs leading-relaxed text-slate-400">
                Clean, safe, open-source experience without popups, redirects, or malicious trackers. Your data remains private.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

