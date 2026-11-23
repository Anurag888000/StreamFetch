'use client';

import { VideoFormat } from '@/types/video';
import { formatBytes } from '@/lib/utils';
import { Check, Music, Video } from 'lucide-react';

interface QualitySelectorProps {
  formats: VideoFormat[];
  selectedFormatId: string;
  onSelectFormat: (formatId: string, ext: string) => void;
  disabled?: boolean;
}

export default function QualitySelector({
  formats,
  selectedFormatId,
  onSelectFormat,
  disabled,
}: QualitySelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-neutral-400">
        <span className="font-medium tracking-wide text-neutral-300">Available Quality Formats</span>
        <span className="text-[11px] font-mono text-neutral-500">Pick format to stream</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {formats.map((fmt) => {
          const isSelected = selectedFormatId === fmt.formatId;
          const isAudioOnly = !fmt.hasVideo && fmt.hasAudio;

          return (
            <button
              key={fmt.formatId}
              type="button"
              disabled={disabled}
              onClick={() => onSelectFormat(fmt.formatId, fmt.ext)}
              className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'border-neutral-400 bg-neutral-800 text-white shadow-sm ring-1 ring-white/10'
                  : 'border-neutral-800/80 bg-neutral-900/60 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800/40'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                    isSelected
                      ? 'bg-white text-black border-white'
                      : isAudioOnly
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-neutral-800 text-neutral-300 border-neutral-700/60'
                  }`}
                >
                  {isAudioOnly ? <Music className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                </div>
                <div>
                  <div className="text-xs font-medium text-white">
                    {fmt.resolution || fmt.qualityLabel || 'Standard'}
                  </div>
                  <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                    {fmt.ext.toUpperCase()} {fmt.filesize ? `• ${formatBytes(fmt.filesize)}` : ''}
                  </div>
                </div>
              </div>

              {isSelected && <Check className="h-4 w-4 text-white" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
