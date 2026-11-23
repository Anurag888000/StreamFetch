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
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Choose Quality & Format
      </label>

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
                  ? 'border-blue-500 bg-blue-600/15 text-white shadow-sm'
                  : 'border-slate-800 bg-[#0d131f] text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    isAudioOnly ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'
                  }`}
                >
                  {isAudioOnly ? <Music className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">
                    {fmt.resolution || fmt.qualityLabel || 'Standard'}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                    {fmt.ext.toUpperCase()} {fmt.filesize ? `• ${formatBytes(fmt.filesize)}` : ''}
                  </div>
                </div>
              </div>

              {isSelected && <Check className="h-4 w-4 text-blue-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

