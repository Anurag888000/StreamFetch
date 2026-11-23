'use client';

import { useState } from 'react';
import Image from 'next/image';
import { VideoMetadata } from '@/types/video';
import { formatDuration, formatBytes } from '@/lib/utils';
import { Download, CheckCircle, Music, Film, Clock, Eye, User } from 'lucide-react';
import QualitySelector from './quality-selector';
import ProgressBar from './progress-bar';
import { ProgressPayload } from '@/types/download';

interface VideoCardProps {
  metadata: VideoMetadata;
  downloading: boolean;
  progress: ProgressPayload | null;
  onDownload: (formatId: string, outputFormat: string) => void;
}

export default function VideoCard({ metadata, downloading, progress, onDownload }: VideoCardProps) {
  const [selectedFormatId, setSelectedFormatId] = useState(metadata.formats[0]?.formatId || 'bestvideo+bestaudio/best');
  const [outputFormat, setOutputFormat] = useState('mp4');

  const handleDownloadClick = () => {
    onDownload(selectedFormatId, outputFormat);
  };

  return (
    <div className="w-full rounded-3xl bg-[#111827] border border-slate-800 p-5 sm:p-6 shadow-2xl shadow-black/50">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Thumbnail Preview */}
        <div className="relative aspect-video w-full md:w-80 shrink-0 overflow-hidden rounded-2xl bg-slate-900 border border-slate-800">
          {metadata.thumbnail ? (
            <img
              src={metadata.thumbnail}
              alt={metadata.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-600">
              <Film className="h-12 w-12" />
            </div>
          )}

          {metadata.duration ? (
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-md bg-black/80 backdrop-blur-sm px-2 py-1 text-xs font-medium text-white">
              <Clock className="h-3 w-3" />
              {formatDuration(metadata.duration)}
            </div>
          ) : null}

          <div className="absolute top-2.5 left-2.5 rounded-md bg-blue-600/90 backdrop-blur-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white">
            {metadata.platform}
          </div>
        </div>

        {/* Video Info Details */}
        <div className="flex flex-1 flex-col justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white line-clamp-2 leading-snug">
              {metadata.title}
            </h2>

            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-400">
              {metadata.uploader && (
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-blue-400" />
                  <span className="font-medium text-slate-300">{metadata.uploader}</span>
                </div>
              )}
              {metadata.viewCount ? (
                <div className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-slate-500" />
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

          {/* Action Trigger or Progress */}
          <div className="pt-2">
            {downloading || progress ? (
              <ProgressBar progress={progress} />
            ) : (
              <button
                type="button"
                onClick={handleDownloadClick}
                className="w-full sm:w-auto h-12 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
              >
                <Download className="h-4 w-4" />
                <span>Start Download ({outputFormat.toUpperCase()})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

