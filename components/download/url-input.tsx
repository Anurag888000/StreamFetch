'use client';

import { useState } from 'react';
import { Search, Clipboard, Loader2, AlertCircle } from 'lucide-react';
import { validateVideoUrl } from '@/lib/validators';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export default function UrlInput({ onSubmit, isLoading }: UrlInputProps) {
  const [url, setUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        setValidationError(null);
      }
    } catch {
      // Clipboard permission denied or unsupported
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setValidationError('Please enter a video URL');
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

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="relative flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="Paste YouTube, Instagram Reels, TikTok or Twitter link..."
            disabled={isLoading}
            className="w-full h-14 pl-5 pr-24 rounded-2xl bg-[#111827] border border-slate-700/80 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base shadow-inner transition-all disabled:opacity-60"
          />
          <button
            type="button"
            onClick={handlePaste}
            disabled={isLoading}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700/60 transition-colors"
          >
            <Clipboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Paste</span>
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="h-14 px-8 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-blue-600/40 active:scale-[0.98]"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Search className="h-5 w-5" />
              <span>Fetch Video</span>
            </>
          )}
        </button>
      </form>

      {validationError && (
        <div className="mt-3 flex items-center gap-2 text-xs sm:text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
}

