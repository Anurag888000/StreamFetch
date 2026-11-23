import Link from 'next/link';
import { ArrowDownToLine, Cpu } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-800/80 bg-[#09090b]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black shadow-sm font-bold">
            <ArrowDownToLine className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold tracking-tight text-white">StreamFetch</span>
            <span className="rounded-md bg-neutral-800 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-neutral-400 border border-neutral-700/60">
              v2.4
            </span>
          </div>
        </Link>

        {/* Platform Quick Supported Badges */}
        <div className="hidden md:flex items-center gap-2 text-xs text-neutral-400">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            YouTube
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800">
            <span className="h-1.5 w-1.5 rounded-full bg-pink-500" />
            Instagram
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            X / Twitter
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            TikTok
          </span>
        </div>

        {/* Engine Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-300 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-xl">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
            <span className="hidden sm:inline">Engine Active</span>
            <span className="text-neutral-500 hidden sm:inline">•</span>
            <span className="text-neutral-400 text-[11px]">8x Turbo</span>
          </div>
        </div>
      </div>
    </header>
  );
}
