'use client';

import { useState } from 'react';
import { VideoMetadata } from '@/types/video';
import { formatDuration, sanitizeFilename } from '@/lib/utils';
import { Download, Film, Clock, Eye, User, ArrowDownToLine, Copy, Check, Subtitles, ChevronDown } from 'lucide-react';
import QualitySelector from './quality-selector';
import ProgressBar from './progress-bar';
import { ProgressPayload } from '@/types/download';
import { saveToHistory } from '@/components/history/history-drawer';

interface VideoCardProps {
  metadata: VideoMetadata;
  downloading: boolean;
  progress: ProgressPayload | null;
  onDownload: (formatId: string, outputFormat: string) => void;
}

export default function VideoCard({ metadata, downloading, progress, onDownload }: VideoCardProps) {
  const [selectedFormatId, setSelectedFormatId] = useState(metadata.formats[0]?.formatId || 'bestvideo+bestaudio/best');
  const [outputFormat, setOutputFormat] = useState('mp4');
  const [copied, setCopied] = useState(false);

  const selectedFormat = metadata.formats.find((f) => f.formatId === selectedFormatId);
  const sizeParam = selectedFormat?.filesize || selectedFormat?.filesizeApprox || '';
  const durationParam = metadata.duration ? String(metadata.duration) : '';
  const safeTitle = sanitizeFilename(metadata.title || 'video');
  const directStreamUrl = `/api/stream/${encodeURIComponent(`${safeTitle}.${outputFormat}`)}?url=${encodeURIComponent(metadata.url)}&formatId=${encodeURIComponent(selectedFormatId)}&outputFormat=${encodeURIComponent(outputFormat)}${sizeParam ? `&size=${sizeParam}` : ''}${durationParam ? `&duration=${durationParam}` : ''}`;

  const [showSubs, setShowSubs] = useState(false);

  const recordDownload = () => {
    saveToHistory({
      id: metadata.id || `video_${Date.now()}`,
      title: metadata.title,
      thumbnail: metadata.thumbnail,
      duration: metadata.duration,
      platform: metadata.platform,
      format: selectedFormat?.resolution || selectedFormat?.qualityLabel || outputFormat.toUpperCase(),
      outputFormat,
      size: sizeParam || undefined,
      downloadUrl: directStreamUrl,
    });
  };

  const copyDirectLink = () => {
    recordDownload();
    const fullUrl = `${window.location.origin}${directStreamUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadClick = () => {
    recordDownload();
    onDownload(selectedFormatId, outputFormat);
  };

  return (
    <div className="w-full rounded-2xl bg-neutral-900/90 border border-neutral-800 p-5 sm:p-6 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Thumbnail Preview with Duration Overlay */}
        <div className="relative aspect-video w-full md:w-80 shrink-0 overflow-hidden rounded-xl bg-neutral-950 border border-neutral-800">
          {metadata.thumbnail ? (
            <img
              src={metadata.thumbnail}
              alt={metadata.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-600">
              <Film className="h-10 w-10" />
            </div>
          )}

          {metadata.duration ? (
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 rounded-lg bg-black/85 backdrop-blur-md px-2.5 py-1 text-xs font-mono font-medium text-white border border-white/10">
              <Clock className="h-3 w-3 text-neutral-400" />
              {formatDuration(metadata.duration)}
            </div>
          ) : null}

          <div className="absolute top-2.5 left-2.5 rounded-md bg-neutral-900/90 border border-neutral-700/60 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider text-neutral-300">
            {metadata.platform}
          </div>
        </div>

        {/* Video Info Details */}
        <div className="flex flex-1 flex-col justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-white line-clamp-2 leading-snug">
              {metadata.title}
            </h2>

            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-neutral-400">
              {metadata.uploader && (
                <div className="flex items-center gap-1.5 font-medium text-neutral-300">
                  <User className="h-3.5 w-3.5 text-neutral-400" />
                  <span>{metadata.uploader}</span>
                </div>
              )}
              {metadata.viewCount ? (
                <div className="flex items-center gap-1.5 text-neutral-500 font-mono">
                  <Eye className="h-3.5 w-3.5" />
                  <span>{metadata.viewCount.toLocaleString()} views</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Format / Quality Selector */}
          <div className="pt-2">
            <QualitySelector
              formats={metadata.formats}
              selectedFormatId={selectedFormatId}
              onSelectFormat={(fId, ext) => {
                setSelectedFormatId(fId);
                setOutputFormat(ext);
              }}
              disabled={downloading}
            />
          </div>

          {/* Action Triggers */}
          <div className="pt-2">
            {downloading || progress ? (
              <ProgressBar progress={progress} />
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={directStreamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={recordDownload}
                  className="w-full sm:w-auto h-12 px-6 rounded-xl bg-white text-black hover:bg-neutral-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
                >
                  <ArrowDownToLine className="h-4 w-4 stroke-[2.5]" />
                  <span>Download in IDM / Chrome ({outputFormat.toUpperCase()})</span>
                </a>

                <button
                  type="button"
                  onClick={copyDirectLink}
                  className="h-12 px-4 rounded-xl bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700/60 text-neutral-300 hover:text-white font-medium text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  title="Copy direct download link for IDM or external tools"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-neutral-400" />}
                  <span>{copied ? 'Copied' : 'Copy Link'}</span>
                </button>

                {/* Subtitles Button if available */}
                {metadata.subtitles && metadata.subtitles.length > 0 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowSubs(!showSubs)}
                      className="h-12 px-3.5 rounded-xl bg-neutral-850 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-300 hover:text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all"
                      title="Download subtitles track"
                    >
                      <Subtitles className="h-3.5 w-3.5" />
                      <span>Subtitles</span>
                      <ChevronDown className="h-3 w-3 text-neutral-400" />
                    </button>

                    {showSubs && (
                      <div className="absolute left-0 bottom-full mb-2 z-20 w-52 max-h-48 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900/95 backdrop-blur-xl p-1.5 shadow-2xl space-y-1">
                        <div className="text-[10px] font-mono text-neutral-400 px-2 py-1 uppercase tracking-wider border-b border-neutral-800">
                          Available Subtitles
                        </div>
                        {metadata.subtitles.map((sub) => (
                          <a
                            key={sub.code}
                            href={`/api/subtitles?url=${encodeURIComponent(metadata.url)}&lang=${sub.code}&title=${encodeURIComponent(safeTitle)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setShowSubs(false)}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                          >
                            <span className="truncate">{sub.name || sub.code.toUpperCase()}</span>
                            <span className="text-[10px] font-mono text-neutral-500 uppercase">.SRT</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleDownloadClick}
                  className="h-12 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-neutral-200 font-medium text-xs flex items-center justify-center gap-1.5 transition-all"
                  title="Process and package on server disk"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Server Job</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
