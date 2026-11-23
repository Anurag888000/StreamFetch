'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Settings,
  ShieldCheck,
  Globe,
  FileText,
  Check,
  RefreshCw,
  AlertCircle,
  Trash2,
  Upload,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [selectedBrowser, setSelectedBrowser] = useState('none');
  const [hasCookieFile, setHasCookieFile] = useState(false);
  const [cookieFileSize, setCookieFileSize] = useState(0);
  const [cookiesTxt, setCookiesTxt] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/cookies');
      const data = await res.json();
      if (data.success) {
        setSelectedBrowser(data.browser || 'none');
        setHasCookieFile(Boolean(data.hasCookieFile));
        setCookieFileSize(data.cookieFileSize || 0);
      }
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
      setStatusMessage(null);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSave = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/settings/cookies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          browser: selectedBrowser,
          cookiesTxt: cookiesTxt.trim() ? cookiesTxt.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: 'Anti-bot settings saved successfully.' });
        setHasCookieFile(Boolean(data.hasCookieFile));
        setCookiesTxt('');
        setTimeout(() => {
          setStatusMessage(null);
          onClose();
        }, 1500);
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to save settings' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error saving settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all cookie and anti-bot settings?')) return;
    setLoading(true);
    try {
      await fetch('/api/settings/cookies', { method: 'DELETE' });
      setSelectedBrowser('none');
      setHasCookieFile(false);
      setCookieFileSize(0);
      setCookiesTxt('');
      setStatusMessage({ type: 'success', text: 'Settings reset to default.' });
      setTimeout(() => setStatusMessage(null), 2000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Reset failed' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const browsers = [
    { id: 'none', name: 'None (Default)', desc: 'Standard extraction without browser sessions' },
    { id: 'chrome', name: 'Google Chrome', desc: 'Sync cookies from installed Chrome profiles' },
    { id: 'edge', name: 'Microsoft Edge', desc: 'Sync cookies from installed Edge browser' },
    { id: 'brave', name: 'Brave Browser', desc: 'Sync cookies from Brave privacy browser' },
    { id: 'firefox', name: 'Mozilla Firefox', desc: 'Sync cookies from Firefox profiles' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] rounded-2xl border border-neutral-800 bg-[#09090b] shadow-2xl flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="flex items-center justify-between border-b border-neutral-800/80 px-6 py-4 shrink-0 bg-[#09090b]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Engine & Anti-Bot Settings</h2>
              <p className="text-[11px] font-mono text-neutral-400">
                Bypass rate-limits, age restrictions, and bot verification
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1 min-h-0">
          {/* Status Alert */}
          {statusMessage && (
            <div
              className={`flex items-center gap-2 rounded-xl p-3 text-xs ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-300'
                  : 'bg-red-950/40 border border-red-800/50 text-red-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Browser Cookies Selector */}
          <div className="space-y-2.5">
            <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-neutral-400" />
              <span>Automatic Browser Cookies Session</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              {browsers.map((b) => {
                const isSelected = selectedBrowser === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBrowser(b.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-neutral-400 bg-neutral-800 text-white ring-1 ring-white/10'
                        : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-neutral-700 hover:bg-neutral-800/40'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-medium text-white">{b.name}</div>
                      <div className="text-[10px] text-neutral-400 font-mono">{b.desc}</div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-white shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Windows Browser Lock Notice */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-3 text-[11px] text-neutral-400 space-y-1">
            <div className="font-medium text-neutral-300">💡 Anti-Bot Tip for Windows Users:</div>
            <p>
              Chrome & Edge encrypt/lock cookie files while open. For guaranteed 100% bypass of YouTube bot challenges, export cookies via the free <span className="text-white font-medium">Get cookies.txt LOCALLY</span> extension and paste/upload below, or use <span className="text-white font-medium">Mozilla Firefox</span> (signed into YouTube).
            </p>
          </div>

          {/* Custom cookies.txt Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-neutral-400" />
                <span>Import Netscape cookies.txt</span>
              </label>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer flex items-center gap-1 text-[11px] text-neutral-300 hover:text-white bg-neutral-800/80 px-2.5 py-1 rounded-lg border border-neutral-700/60 transition-colors">
                  <Upload className="h-3 w-3" />
                  <span>Choose File</span>
                  <input
                    type="file"
                    accept=".txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const content = event.target?.result as string;
                          if (content) setCookiesTxt(content);
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                </label>
                {hasCookieFile && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-md">
                    Active ({cookieFileSize} bytes)
                  </span>
                )}
              </div>
            </div>
            <textarea
              value={cookiesTxt}
              onChange={(e) => setCookiesTxt(e.target.value)}
              placeholder="# Netscape HTTP Cookie File&#10;.youtube.com  TRUE  /  FALSE  ...  SID  ..."
              rows={3}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-2.5 text-[11px] font-mono text-neutral-200 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Fixed Footer Actions */}
        <div className="flex items-center justify-between border-t border-neutral-800/80 px-6 py-4 shrink-0 bg-[#09090b]/95 backdrop-blur-sm">
          <button
            type="button"
            onClick={handleReset}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Reset Settings</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              <span>Save & Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

