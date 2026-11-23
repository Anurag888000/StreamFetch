'use client';

import { ProgressPayload } from '@/types/download';
import { Loader2, CheckCircle2, AlertCircle, ArrowDown } from 'lucide-react';

interface ProgressBarProps {
  progress: ProgressPayload | null;
}

export default function ProgressBar({ progress }: ProgressBarProps) {
  if (!progress) return null;

  const { percent = 0, speed, eta, status, message, filename } = progress;

  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0a0f1d] p-4 space-y-3">
      <div className="flex items-center justify-between text-xs sm:text-sm">
        <div className="flex items-center gap-2 font-medium">
          {isCompleted ? (
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Download Complete! File saved.</span>
            </div>
          ) : isFailed ? (
            <div className="flex items-center gap-1.5 text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span>{message || 'Download encountered an error'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
              <span>
                {percent > 0 ? `Downloading media... ${percent.toFixed(1)}%` : 'Preparing stream...'}
              </span>
            </div>
          )}
        </div>

        {speed && !isCompleted && !isFailed && (
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="font-mono text-slate-300">{speed}</span>
            {eta && (
              <span>
                ETA: <span className="font-mono text-slate-300">{eta}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar Track */}
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full transition-all duration-300 ease-out ${
            isCompleted
              ? 'bg-emerald-500'
              : isFailed
              ? 'bg-red-500'
              : 'bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse'
          }`}
          style={{ width: `${Math.min(Math.max(percent, isCompleted ? 100 : 3), 100)}%` }}
        />
      </div>

      {filename && (
        <div className="truncate text-[11px] text-slate-500 font-mono">
          Saved: {filename}
        </div>
      )}
    </div>
  );
}

