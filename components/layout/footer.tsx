export default function Footer() {
  return (
    <footer className="border-t border-neutral-800/80 bg-[#09090b] py-8 text-center text-xs text-neutral-500">
      <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-neutral-400">
          © {new Date().getFullYear()} <span className="text-neutral-200 font-medium">StreamFetch</span>. High-speed media extraction for personal & backup use.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 text-neutral-400 font-mono text-[11px]">
          <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">yt-dlp v2026.10</span>
          <span>•</span>
          <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">HTTP 206 Resume</span>
          <span>•</span>
          <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">IDM Native</span>
          <span>•</span>
          <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">Zero Disk Storage</span>
        </div>
      </div>
    </footer>
  );
}
