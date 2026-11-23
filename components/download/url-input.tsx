'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Clipboard,
  Loader2,
  X,
  PlaySquare,
  Camera,
  ThumbsUp,
  ListMusic,
  Link as LinkIcon,
  Layers,
  Sparkles,
  Tv,
} from 'lucide-react';
import { validateVideoUrl } from '@/lib/validators';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  onBatchSubmit?: (urls: string[]) => void;
  isLoading: boolean;
}

export default function UrlInput({ onSubmit, onBatchSubmit, isLoading }: UrlInputProps) {
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [url, setUrl] = useState('');
  const [batchText, setBatchText] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Auto-detect platform for dynamic live badge
  const detectedPlatform = useMemo(() => {
    const trimmed = url.trim().toLowerCase();
    if (!trimmed) return null;
    if (trimmed.includes('youtube.com/@') || trimmed.includes('/channel/') || trimmed.includes('/c/')) {
      return { name: 'Channel', icon: Tv, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    }
    if (trimmed.includes('list=') || trimmed.includes('/playlist')) {
      return { name: 'Playlist', icon: ListMusic, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
    }
    if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
      return { name: 'YouTube', icon: PlaySquare, color: 'text-red-400 bg-red-500/10 border-red-500/20' };
    }
    if (trimmed.includes('instagram.com')) {
      return { name: 'Instagram', icon: Camera, color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' };
    }
    if (trimmed.includes('facebook.com') || trimmed.includes('fb.watch')) {
      return { name: 'Facebook', icon: ThumbsUp, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
    }
    return { name: 'Media Link', icon: LinkIcon, color: 'text-neutral-400 bg-neutral-800 border-neutral-700' };
  }, [url]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        if (mode === 'single') {
          setUrl(text.trim());
        } else {
          setBatchText((prev) => (prev ? `${prev}\n${text.trim()}` : text.trim()));
        }
        setValidationError(null);
      }
    } catch {
      // Permission denied or unsupported
    }
  };

  const handleClear = () => {
    if (mode === 'single') {
      setUrl('');
    } else {
      setBatchText('');
    }
    setValidationError(null);
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setValidationError('Please enter a video or playlist URL');
      return;
    }

    const validation = validateVideoUrl(url);
    if (!validation.valid) {
      setValidationError(validation.error || 'Please enter a valid video link');
      return;
    }

    setValidationError(null);
    onSubmit(validation.cleanUrl);
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = batchText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      setValidationError('Please enter at least 2 URLs (one per line)');
      return;
    }

    const validUrls: string[] = [];
    for (const line of lines) {
      const v = validateVideoUrl(line);
      if (v.valid) {
        validUrls.push(v.cleanUrl);
      }
    }

    if (validUrls.length === 0) {
      setValidationError('No valid URLs found in the batch input');
      return;
    }

    setValidationError(null);
    onBatchSubmit?.(validUrls);
  };

  return (
    <div className="w-full space-y-3">
      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-center">
        <div className="inline-flex rounded-xl bg-neutral-900/90 border border-neutral-800 p-1 text-xs">
          <button
            type="button"
            onClick={() => {
              setMode('single');
              setValidationError(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              mode === 'single'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Single / Playlist</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('batch');
              setValidationError(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              mode === 'batch'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Multi-URL Batch</span>
          </button>
        </div>
      </div>

      {mode === 'single' ? (
        <form
          onSubmit={handleSingleSubmit}
          className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-2 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-2xl backdrop-blur-xl focus-within:border-neutral-600 transition-all"
        >
          {/* Left detected platform indicator icon */}
          <div className="hidden sm:flex items-center pl-3">
            {detectedPlatform ? (
              <span
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${detectedPlatform.color}`}
              >
                <detectedPlatform.icon className="h-3.5 w-3.5" />
                <span>{detectedPlatform.name}</span>
              </span>
            ) : (
              <Search className="h-4 w-4 text-neutral-500" />
            )}
          </div>

          {/* Input field */}
          <div className="relative flex-1">
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="Paste YouTube video, playlist, channel (@name), or reels link..."
              disabled={isLoading}
              className="w-full h-12 px-3 sm:px-2 rounded-xl bg-transparent text-white placeholder-neutral-500 focus:outline-none text-sm sm:text-base font-normal disabled:opacity-60"
            />

            {/* Quick Clear Button (if url entered) */}
            {url.trim() && !isLoading && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-white rounded-md transition-colors"
                title="Clear input"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Actions inside command bar */}
          <div className="flex items-center gap-2">
            {!url.trim() && (
              <button
                type="button"
                onClick={handlePaste}
                disabled={isLoading}
                className="hidden sm:flex items-center gap-1.5 px-3 h-11 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-700/80 rounded-xl border border-neutral-700/60 transition-colors"
                title="Paste from clipboard"
              >
                <Clipboard className="h-3.5 w-3.5 text-neutral-400" />
                <span>Paste</span>
              </button>
            )}

            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="w-full sm:w-auto h-11 px-6 rounded-xl bg-white text-black hover:bg-neutral-200 active:scale-[0.98] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-neutral-700" />
                  <span>Extracting...</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span>Inspect Media</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={handleBatchSubmit}
          className="relative flex flex-col gap-3 p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-2xl backdrop-blur-xl focus-within:border-neutral-600 transition-all text-left"
        >
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="font-medium text-neutral-300">Paste Multiple Video Links (One Per Line)</span>
            <button
              type="button"
              onClick={handlePaste}
              className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white"
            >
              <Clipboard className="h-3 w-3" />
              <span>Paste Clipboard</span>
            </button>
          </div>

          <textarea
            value={batchText}
            onChange={(e) => {
              setBatchText(e.target.value);
              if (validationError) setValidationError(null);
            }}
            rows={4}
            placeholder="https://www.youtube.com/watch?v=...&#10;https://www.youtube.com/watch?v=...&#10;https://www.instagram.com/reel/..."
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs sm:text-sm font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 resize-none"
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-mono text-neutral-500">
              {batchText.split('\n').filter((l) => l.trim().length > 0).length} links detected
            </span>

            <div className="flex items-center gap-2">
              {batchText.trim() && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-2 text-xs text-neutral-400 hover:text-white"
                >
                  Clear
                </button>
              )}
              <button
                type="submit"
                disabled={!batchText.trim()}
                className="h-10 px-5 rounded-xl bg-white text-black hover:bg-neutral-200 active:scale-[0.98] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-40"
              >
                <Layers className="h-4 w-4" />
                <span>Queue Batch ZIP</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {validationError && (
        <div className="mt-2 text-left text-xs font-medium text-red-400 flex items-center gap-1.5 px-3">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
}
