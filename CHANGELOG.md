# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Structured File & Console Logging System**:
  - `lib/logger.ts`: Centralized logger writing formatted console outputs and persisting to daily rotating log files in `/logs` (`api-YYYY-MM-DD.log`, `error-YYYY-MM-DD.log`, `engine-YYYY-MM-DD.log`, `combined-YYYY-MM-DD.log`).
  - Gated strictly by `ENABLE_LOGGING=true` in `.env.local` to prevent log noise or disk bloat when disabled.
  - Instrumented `POST /api/info` with request payload, execution duration, and metadata parsing failure logging.
  - Instrumented `POST /api/download` with job registration, background process progress, and error logging.
  - Instrumented `GET /api/progress/[jobId]` with SSE lifecycle events (connect, heartbeat, disconnect, job completion).
  - Instrumented `GET /api/file/[id]` with file streaming metrics, missing/expired file alerts, and HTTP response tracking.
  - Instrumented `lib/ytdlp.ts` with subprocess arguments, runtime stopwatch, exit codes, and stderr capture.
  - Added `/logs/` and `*.log` to `.gitignore`.
- **Project Scaffolding & Configuration**: Next.js 14 App Router, TypeScript, Tailwind CSS, PostCSS, `.gitignore`, `.env.example`, and `package.json`.
- **Project Memory & Documentation**: Initialized [BRAIN.md](file:///c:/Users/Anurag/Downloads/Project/Self%20Helping%20Tool/Video%20Downloder/BRAIN.md), [brain/index.md](file:///c:/Users/Anurag/Downloads/Project/Self%20Helping%20Tool/Video%20Downloder/brain/index.md), and [brain/architecture.md](file:///c:/Users/Anurag/Downloads/Project/Self%20Helping%20Tool/Video%20Downloder/brain/architecture.md).
- **Core Engine & Libraries**:
  - `lib/validators.ts`: Regex-based URL validation for YouTube, Instagram, Twitter/X, TikTok, and Facebook.
  - `lib/progress-manager.ts`: In-memory Server-Sent Events (SSE) job state tracker.
  - `lib/ytdlp.ts`: Process runner for `yt-dlp` metadata extraction and real-time download streaming with FFmpeg muxing.
  - `lib/utils.ts`: Duration, byte size formatting, and filename sanitization.
- **API Route Handlers**:
  - `POST /api/info`: Fetches video title, thumbnail, duration, and format options.
  - `POST /api/download`: Initializes asynchronous download subprocess.
  - `GET /api/progress/[jobId]`: Streams real-time download percentage, speed, and ETA via SSE.
  - `GET /api/file/[id]`: Serves completed video or audio binaries to the browser.
- **Frontend Components & Pages**:
  - `app/layout.tsx` & `app/globals.css`: Dark mode layout with navigation bar and footer.
  - `app/page.tsx`: Landing page with hero banner, supported platform cards, and feature highlights.
  - `components/download/url-input.tsx`: Input field with clipboard paste and format validation.
  - `components/download/video-card.tsx`: Video details preview and format selector.
  - `components/download/quality-selector.tsx`: Resolution (1080p, 720p, etc.) and MP3 audio picker.
  - `components/download/progress-bar.tsx`: Real-time download progress bar with speed and ETA.
  - `hooks/use-download.ts`: Client hook orchestrating metadata fetching, SSE subscription, and download triggers.
