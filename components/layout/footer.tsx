export default function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-[#070a12] py-8 text-center text-xs text-slate-500">
      <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>© {new Date().getFullYear()} StreamFetch Downloader. Built for personal, educational, and backup use.</p>
        <div className="flex items-center gap-4">
          <span className="text-slate-400">Powered by Next.js & yt-dlp</span>
          <span>•</span>
          <span className="text-slate-400">FFmpeg Muxing</span>
        </div>
      </div>
    </footer>
  );
}

