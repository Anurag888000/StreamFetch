import Link from 'next/link';
import { DownloadCloud, PlaySquare, Film, ListMusic, Sparkles } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#090d16]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md shadow-blue-500/20">
            <DownloadCloud className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white">StreamFetch</span>
            <span className="ml-1.5 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400 border border-blue-500/20">
              Pro
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
          >
            <PlaySquare className="h-4 w-4 text-red-400" />
            YouTube
          </Link>
          <Link
            href="/#instagram"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
          >
            <Film className="h-4 w-4 text-pink-400" />
            Reels
          </Link>
          <Link
            href="/#features"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            Features
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Engine Online
          </div>
        </div>
      </div>
    </header>
  );
}

