# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Complete Professional UI/UX Overhaul**:
  - Replaced generic AI/neon template aesthetics with an obsidian carbon palette (`#09090b`), clean subtle surfaces (`bg-neutral-900/80`), and crisp borders (`border-neutral-800`).
  - Redesigned `Header` and `Footer` with minimal geometric branding, authentic platform chips, and live `8x Turbo` status indicator.
  - Revamped `UrlInput` into an intelligent command bar with auto-detecting platform badges (YouTube, Instagram, TikTok, X), clipboard paste detection, clear trigger, and tactile high-contrast action button.
  - Redesigned `VideoCard` into a media studio inspector with 16:9 thumbnail preview, duration pill, metadata counter, clean segmented quality pills, and direct IDM/Browser download actions.
  - Redesigned `PlaylistCard` into a Spotify/Apple Music style tracklist table with numbered rows, track duration tags, selection counters, and a prominent full-width ZIP action button.
  - Streamlined `components/download/playlist-card.tsx` to ZIP-only download mode: removed individual video MP4/MP3 buttons and batch download buttons in favor of a single prominent full-width **"Download Videos as ZIP in IDM / Chrome"** action button.

### Fixed
- Fixed logger to use static, clean filenames without dates (`api.log`, `error.log`, `engine.log`, `combined.log`) and formatted in-log timestamps as `[DD-MM-YYYY HH:MM:SS]`.
- Fixed uncaught exception `TypeError: Invalid state: Controller is already closed` (`ERR_INVALID_STATE`) across all stream endpoints by implementing stream lifecycle state trackers (`isClosed`) and safe `safeEnqueue`, `safeClose`, and `safeError` wrappers.
- Fixed duplicate trailing return block in `hooks/use-download.ts` that caused compilation failure.
- Fixed `darkMode: "class"` configuration in `tailwind.config.ts` satisfying `DarkModeStrategy` TypeScript definition.
- Fixed IDM `Resume capability: (unknown)` by implementing HTTP `HEAD` handlers, `Range` headers, `ETag`, `Last-Modified`, and `206 Partial Content` responses across single video (`/api/stream/[filename]`) and playlist ZIP (`/api/stream-playlist-zip/[filename]`) endpoints.

### Added
- **yt-dlp High-Speed Engine Optimizations (`YTDLP_SPEED_ARGS`)**:
  - Injected `--concurrent-fragments 8` across all single video and playlist streams, enabling 8 parallel fragment downloads concurrently.
  - Configured `--http-chunk-size 10M` and `--buffer-size 1024K` to bypass YouTube rate-limiting and buffer throttling.
  - Added `--extractor-args "youtube:player_client=android,web"` to spoof the mobile client and unlock uncapped Google Video CDN ratebypass.
- **IDM Resume Capability & Partial Content Support (`HTTP 206`)**:
  - `app/api/stream-playlist-zip/[filename]/route.ts`: Added `HEAD` endpoint returning `Accept-Ranges: bytes`, `ETag`, `Last-Modified`, and `Content-Disposition`. Added Range request handler responding with `HTTP 206 Partial Content` and stream byte-skipping logic to enable pause/resume in IDM.
  - `app/api/stream/[filename]/route.ts`: Added Range request handler returning `HTTP 206 Partial Content`, `Content-Range: bytes ${startByte}-${endByte}/${totalFileSize}`, exact or estimated `Content-Length`, `ETag`, and `Last-Modified`. Added byte-skipping logic for resumed chunks.
  - `components/download/video-card.tsx` & `components/download/playlist-card.tsx`: Passed format `size` and video `duration` query parameters to stream endpoints so IDM receives known file sizes and displays accurate file size and completion estimates.
- **IDM (Internet Download Manager) Native Integration**:
  - `app/api/stream/[filename]/route.ts`: Extension-based stream endpoint (`/api/stream/<title>.mp4` and `.mp3`) with `Accept-Ranges: bytes` allowing IDM to immediately detect supported file extensions and launch its native download dialog.
  - `app/api/stream-playlist-zip/[filename]/route.ts`: Extension-based ZIP stream endpoint (`/api/stream-playlist-zip/<title>.zip`) triggering IDM for playlist archives.
  - `components/download/video-card.tsx` & `components/download/playlist-card.tsx`: Converted download triggers to direct `<a>` link elements with explicit extensions so IDM's Chrome extension intercepts clicks directly.
- **Direct Chrome Streaming ZIP (`/api/stream-playlist-zip`)**:
  - `lib/zip-stream.ts`: Zero-dependency native ZIP stream engine implementing standard PKZip STORE specification and `zlib.crc32`.
  - `app/api/stream-playlist-zip/route.ts`: Streams entire YouTube playlists into a live `.zip` archive directly to Chrome's download manager without disk accumulation or in-page progress waits.
  - `components/download/playlist-card.tsx`: Updated "Download as Single ZIP in Chrome" to trigger direct browser stream.
- **Direct Chrome Browser Streaming (`/api/stream`)**:
  - `app/api/stream/route.ts`: Instant streaming endpoint that pipes `yt-dlp -o -` directly to Chrome's native download manager with `Content-Disposition: attachment; filename="..."`. Eliminates long waits on server disk.
  - `components/download/playlist-card.tsx`:
    - Added instant **"MP4"** and **"MP3"** Chrome download buttons alongside every video in the playlist.
    - Added **"Download Selected Videos Directly in Chrome"** batch runner to queue selected playlist tracks into Chrome's download shelf.
    - Added **"Copy Links"** to clipboard for external download managers.
  - `components/download/video-card.tsx`:
    - Added primary **"Download in Chrome"** button triggering instant browser stream.
- **YouTube Playlist Download Support (Phase 2)**:
  - `lib/ytdlp.ts`: Added `fetchPlaylistMetadata` using `yt-dlp --flat-playlist --dump-single-json` to parse entire playlists in seconds without full video streams.
  - `lib/ytdlp.ts`: Added `downloadPlaylist` executing `yt-dlp --yes-playlist`, saving files into a job-specific folder with sequential track indexes (`%(playlist_index)02d - %(title).50s.%(ext)s`), and packaging into a `.zip` archive.
  - `app/api/info/route.ts`: Detects playlist URLs via regex and delegates to playlist probe.
  - `app/api/download/route.ts`: Handles playlist download jobs with multi-item progress tracking (`video X of Y`).
  - `components/download/playlist-card.tsx`: Playlist overview card showing total count, scrollable video checklist with individual toggles, "Select All/Deselect All", quality picker (Best Video, 720p, 480p, MP3 Audio), and "Download Playlist as ZIP".
  - `hooks/use-download.ts`: Extended with playlist state and batch ZIP triggers.
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
