'use client';

import { useState } from 'react';
import {
  FolderArchive,
  Video,
  Music,
  ArrowDownToLine,
  Copy,
  Check,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { saveToHistory } from '@/components/history/history-drawer';

interface BatchCardProps {
  urls: string[];
  onReset: () => void;
}

export default function BatchCard({ urls, onReset }: BatchCardProps) {
  const [outputFormat, setOutputFormat] = useState<'mp4' | 'mp3'>('mp4');
  const [formatQuality, setFormatQuality] = useState(
    'bestvideo[height<=1080][vcodec^=avc1]+bestaudio[acodec^=mp4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/bestvideo+bestaudio/best'
  );
  const [copied, setCopied] = useState(false);

  const zipName = `Batch_${urls.length}_Videos.zip`;
  const streamUrl = `/api/stream-batch-zip/${encodeURIComponent(zipName)}?urls=${encodeURIComponent(
    JSON.stringify(urls)
  )}&formatId=${encodeURIComponent(formatQuality)}&outputFormat=${outputFormat}`;

  const copyZipLink = () => {
    const fullUrl = `${window.location.origin}${streamUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    saveToHistory({
      id: `batch_${Date.now()}`,
      title: `Batch Package (${urls.length} Videos)`,
      platform: 'generic',
      format: outputFormat === 'mp3' ? '320kbps MP3' : '1080p FHD',
      outputFormat: 'zip',
      downloadUrl: streamUrl,
    });
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
                Multi-URL Batch
              </span>
              <span className="text-xs font-mono text-neutral-400">
                {urls.length} {urls.length === 1 ? 'URL' : 'URLs'} queued
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-white mt-1">
              Batch Media Archive
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
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-white bg-neutral-800/80 hover:bg-neutral-700/80 px-3 py-2 rounded-xl border border-neutral-700/60 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>New Batch</span>
          </button>
        </div>
      </div>

      {/* Format & Quality Presets for ZIP Archive */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="font-medium tracking-wide text-neutral-300">Output Format for ZIP Archive</span>
          <span className="text-[11px] font-mono text-neutral-500">All batch items will be packaged in this format</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => {
              setOutputFormat('mp4');
              setFormatQuality(
                'bestvideo[height<=1080][vcodec^=avc1]+bestaudio[acodec^=mp4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/bestvideo+bestaudio/best'
              );
            }}
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
              outputFormat === 'mp4' && formatQuality.includes('1080')
                ? 'border-neutral-400 bg-neutral-800 text-white ring-1 ring-white/10'
                : 'border-neutral-800 bg-neutral-900/60 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800/40'
            }`}
          >
            <div className={`p-1.5 rounded-lg border ${outputFormat === 'mp4' && formatQuality.includes('1080') ? 'bg-white text-black border-white' : 'bg-neutral-800 text-neutral-300 border-neutral-700/60'}`}>
              <Video className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-xs font-medium">Best Video</div>
              <div className="text-[10px] font-mono text-neutral-400">1080p FHD MP4</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setOutputFormat('mp4');
              setFormatQuality(
                'bestvideo[height<=720][vcodec^=avc1]+bestaudio[acodec^=mp4a]/bestvideo[height<=720]+bestaudio/best[height<=720]/bestvideo+bestaudio/best'
              );
            }}
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
              outputFormat === 'mp4' && formatQuality.includes('720')
                ? 'border-neutral-400 bg-neutral-800 text-white ring-1 ring-white/10'
                : 'border-neutral-800 bg-neutral-900/60 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800/40'
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
            onClick={() => {
              setOutputFormat('mp4');
              setFormatQuality(
                'bestvideo[height<=480][vcodec^=avc1]+bestaudio[acodec^=mp4a]/bestvideo[height<=480]+bestaudio/best[height<=480]/bestvideo+bestaudio/best'
              );
            }}
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
              outputFormat === 'mp4' && formatQuality.includes('480')
                ? 'border-neutral-400 bg-neutral-800 text-white ring-1 ring-white/10'
                : 'border-neutral-800 bg-neutral-900/60 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800/40'
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
            onClick={() => {
              setOutputFormat('mp3');
              setFormatQuality('bestaudio/best');
            }}
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
              outputFormat === 'mp3'
                ? 'border-neutral-400 bg-neutral-800 text-white ring-1 ring-white/10'
                : 'border-neutral-800 bg-neutral-900/60 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800/40'
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

      {/* Queued URLs List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="font-medium tracking-wide text-neutral-300">Queued URLs ({urls.length})</span>
          <span className="text-[11px] font-mono text-neutral-500">Will stream sequentially into ZIP</span>
        </div>

        <div className="max-h-56 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-950/60 p-2 space-y-1.5 divide-y divide-neutral-800/30">
          {urls.map((url, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-2 rounded-lg text-xs font-mono text-neutral-300 pt-2"
            >
              <div className="flex items-center justify-center w-6 text-neutral-500 shrink-0">
                {String(index + 1).padStart(2, '0')}
              </div>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <div className="truncate flex-1 text-neutral-300">{url}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Primary Action Button: Single Streaming ZIP Download */}
      <div className="pt-2 space-y-2">
        <a
          href={streamUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleDownload}
          className="w-full h-12 sm:h-14 rounded-xl bg-white text-black hover:bg-neutral-200 active:scale-[0.98] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-sm transition-all"
        >
          <ArrowDownToLine className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.2]" />
          <span>
            Download {urls.length} Videos as ZIP in IDM / Chrome ({outputFormat.toUpperCase()})
          </span>
        </a>
        <p className="text-[11px] text-center text-neutral-400 font-mono">
          💡 If YouTube triggers bot verification, open <span className="text-neutral-300 font-medium">Settings (top right)</span> to connect cookies.
        </p>
      </div>
    </div>
  );
}

