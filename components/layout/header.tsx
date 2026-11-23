'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowDownToLine, History, ShieldCheck } from 'lucide-react';
import HistoryDrawer, { getHistoryCount } from '@/components/history/history-drawer';
import SettingsModal from '@/components/settings/settings-modal';

export default function Header() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);

  useEffect(() => {
    setHistoryCount(getHistoryCount());
    const handleUpdate = () => setHistoryCount(getHistoryCount());
    window.addEventListener('streamfetch_history_updated', handleUpdate);
    return () => window.removeEventListener('streamfetch_history_updated', handleUpdate);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-neutral-800/80 bg-[#09090b]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black shadow-sm font-bold">
              <ArrowDownToLine className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-semibold tracking-tight text-white">StreamFetch</span>
              <span className="rounded-md bg-neutral-800 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-neutral-400 border border-neutral-700/60">
                v2.5
              </span>
            </div>
          </Link>

          {/* Platform Quick Supported Badges */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-neutral-400">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              YouTube
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="h-1.5 w-1.5 rounded-full bg-pink-500" />
              Instagram
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              Facebook
            </span>
          </div>

          {/* Controls: Engine Status, History & Settings */}
          <div className="flex items-center gap-2">
            {/* Turbo Engine Status */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-neutral-300 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-xl">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
              <span>8x Turbo</span>
            </div>

            {/* History Button */}
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-850 text-neutral-300 hover:text-white text-xs font-medium transition-all"
              title="Open Download History"
            >
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">History</span>
              {historyCount > 0 && (
                <span className="ml-0.5 rounded-full bg-white text-black font-mono font-bold text-[10px] h-4 w-4 flex items-center justify-center">
                  {historyCount > 99 ? '99+' : historyCount}
                </span>
              )}
            </button>

            {/* Anti-Bot & Cookies Settings Button */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-850 text-neutral-400 hover:text-white transition-all"
              title="Engine & Anti-Bot Cookie Settings"
            >
              <ShieldCheck className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Slide-over History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onItemCountChange={(count) => setHistoryCount(count)}
      />

      {/* Settings & Cookie Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
