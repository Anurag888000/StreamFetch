# Video Downloader — AI Memory & Context

## Project Overview
A modern, universal video downloader web application built with **Next.js 14+ (App Router)**, **TypeScript**, and **Tailwind CSS**. It is powered by `yt-dlp` and `ffmpeg` under the hood for reliable extraction and streaming of media from multiple platforms, starting with YouTube single video, multi-batch, and playlists, followed by Instagram Reels, Twitter/X, Facebook, and TikTok.

## Architecture Patterns & Conventions
- **Framework**: Next.js 14+ App Router (`app/` directory).
- **Backend**: Next.js Route Handlers (`app/api/`) using Node.js child processes to interface with `yt-dlp`.
- **Real-Time Streaming**: Server-Sent Events (SSE) via `/api/progress/[jobId]` providing live download percentage, transfer speed, and ETA.
- **Engine**: `yt-dlp` CLI executable with JSON metadata dumping (`--dump-json`) and newline progress parsing (`--newline`). Merging/muxing via `ffmpeg`.
- **Validation**: Strict URL regex validators per platform (`lib/validators.ts`) preventing command injection and shell escapement.
- **Logging & Diagnostics**: Centralized structured logger (`lib/logger.ts`) emitting colorized console logs and persisting to daily files in `/logs/`. Controlled dynamically via `ENABLE_LOGGING=true` in `.env.local`. Zero overhead when disabled.
- **Styling**: Tailwind CSS with custom dark/light theme, modern cards, and responsive layouts.
- **State Management**: React hooks & Zustand for state coordination between URL input, video preview card, format selection, and progress bars.

## Platform Support Matrix
- **YouTube**: Single video, Playlist extraction, Batch URLs, Shorts.
- **Instagram**: Reels, Post videos.
- **Twitter/X**: Video tweets.
- **Facebook**: Public videos and Reels.
- **TikTok**: Watermark-free downloads.

## Environment & Prerequisites
- Node.js 18.x or 20.x+
- `ffmpeg` (Installed on system)
- `yt-dlp` (Executable accessible in system PATH or configured via `YTDLP_PATH`)

For index and navigation of architectural documents, see [brain/index.md](file:///c:/Users/Anurag/Downloads/Project/Self%20Helping%20Tool/Video%20Downloder/brain/index.md).

