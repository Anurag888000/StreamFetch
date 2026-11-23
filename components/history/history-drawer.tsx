'use client';

import { useState, useEffect } from 'react';
import { HistoryItem } from '@/types/history';
import { formatDuration } from '@/lib/utils';
import {
  X,
  History,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  ArrowDownToLine,
  Film,
  Music,
  FolderArchive,
  Clock,
} from 'lucide-react';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onItemCountChange?: (count: number) => void;
}

export function saveToHistory(item: Omit<HistoryItem, 'timestamp'>) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('streamfetch_history');
    const list: HistoryItem[] = raw ? JSON.parse(raw) : [];
    // Deduplicate if same downloadUrl or id
    const filtered = list.filter((i) => i.downloadUrl !== item.downloadUrl && i.id !== item.id);
    const updated = [{ ...item, timestamp: Date.now() }, ...filtered].slice(0, 50);
    localStorage.setItem('streamfetch_history', JSON.stringify(updated));
    window.dispatchEvent(new Event('streamfetch_history_updated'));
  } catch {}
}

export function getHistoryCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem('streamfetch_history');
    return raw ? JSON.parse(raw).length : 0;
  } catch {
    return 0;
  }
}

export default function HistoryDrawer({ isOpen, onClose, onItemCountChange }: HistoryDrawerProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadHistory = () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('streamfetch_history');
      const parsed = raw ? JSON.parse(raw) : [];
      setItems(parsed);
      onItemCountChange?.(parsed.length);
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    loadHistory();
    const handleUpdate = () => loadHistory();
    window.addEventListener('streamfetch_history_updated', handleUpdate);
    return () => window.removeEventListener('streamfetch_history_updated', handleUpdate);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClearAll = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('streamfetch_history');
    setItems([]);
    onItemCountChange?.(0);
  };

  const handleRemoveItem = (id: string) => {
    if (typeof window === 'undefined') return;
    const updated = items.filter((i) => i.id !== id);
    localStorage.setItem('streamfetch_history', JSON.stringify(updated));
    setItems(updated);
    onItemCountChange?.(updated.length);
  };

  const handleCopy = (id: string, url: string) => {
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatRelativeTime = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md border-l border-neutral-800 bg-[#09090b] shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-neutral-800/80 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-800 text-neutral-200 border border-neutral-700/60">
                <History className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Download History</h2>
                <p className="text-[11px] font-mono text-neutral-400">
                  {items.length} {items.length === 1 ? 'record' : 'records'} saved locally
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-800/80 transition-colors"
                  title="Clear history"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center text-neutral-500 space-y-2">
                <Clock className="h-8 w-8 stroke-[1.5] text-neutral-600" />
                <p className="text-xs">No downloads recorded yet.</p>
                <p className="text-[11px] text-neutral-600">
                  Any media you stream or download will appear here for fast re-access.
                </p>
              </div>
            ) : (
              items.map((item) => {
                const isAudio = item.outputFormat === 'mp3';
                const isZip = item.outputFormat === 'zip';

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 hover:border-neutral-700 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      {/* Thumbnail / Icon */}
                      <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center">
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : isZip ? (
                          <FolderArchive className="h-6 w-6 text-neutral-400" />
                        ) : isAudio ? (
                          <Music className="h-6 w-6 text-amber-400" />
                        ) : (
                          <Film className="h-6 w-6 text-neutral-400" />
                        )}

                        {item.duration ? (
                          <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.2 text-[9px] font-mono text-white">
                            {formatDuration(item.duration)}
                          </span>
                        ) : null}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-medium text-white line-clamp-1">
                          {item.title}
                        </h4>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="rounded bg-neutral-800 border border-neutral-700/60 px-1.5 py-0.2 text-[10px] font-mono uppercase text-neutral-300">
                            {item.format || item.outputFormat.toUpperCase()}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-500">
                            {formatRelativeTime(item.timestamp)}
                          </span>
                        </div>
                      </div>

                      {/* Remove item */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-neutral-500 hover:text-red-400 p-1"
                        title="Remove"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Actions row */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-800/40">
                      <button
                        type="button"
                        onClick={() => handleCopy(item.id, item.downloadUrl)}
                        className="flex items-center gap-1 text-[11px] font-mono text-neutral-400 hover:text-white bg-neutral-800/60 hover:bg-neutral-800 px-2 py-1 rounded-md border border-neutral-700/40 transition-colors"
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>

                      <a
                        href={item.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] font-medium text-black bg-white hover:bg-neutral-200 px-2.5 py-1 rounded-md transition-colors"
                      >
                        <ArrowDownToLine className="h-3 w-3" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

