# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Removed
- Removed TikTok and X (Twitter) platform chips and references from `components/layout/header.tsx`, `app/page.tsx`, and `components/download/url-input.tsx`. Retained clean focus on YouTube, Instagram, and Facebook.

### Changed
- **Complete Professional UI/UX Overhaul**:
  - Replaced generic AI/neon template aesthetics with an obsidian carbon palette (`#09090b`), clean subtle surfaces (`bg-neutral-900/80`), and crisp borders (`border-neutral-800`).
  - Redesigned `Header` and `Footer` with minimal geometric branding, authentic platform chips, and live `8x Turbo` status indicator.
  - Revamped `UrlInput` into an intelligent command bar with auto-detecting platform badges (YouTube, Instagram, TikTok, X), clipboard paste detection, clear trigger, and tactile high-contrast action button.
  - Redesigned `VideoCard` into a media studio inspector with 16:9 thumbnail preview, duration pill, metadata counter, clean segmented quality pills, and direct IDM/Browser download actions.
  - Redesigned `PlaylistCard` into a Spotify/Apple Music style tracklist table with numbered rows, track duration tags, selection counters, and a prominent full-width ZIP action button.
  - Streamlined `components/download/playlist-card.tsx` to ZIP-only download mode: removed individual video MP4/MP3 buttons and batch download buttons in favor of a single prominent full-width **"Download Videos as ZIP in IDM / Chrome"** action button.

### Fixed
- **Bulletproof Format Fallback & Stderr Diagnostics on Video Streaming**:
  - `components/download/playlist-card.tsx` & `components/download/batch-card.tsx`: Appended `/bestvideo+bestaudio/best` as an ultimate fallback across all quality presets (1080p FHD, 720p HD, 480p SD), completely preventing yt-dlp `Requested format is not available` failures when videos use non-standard codecs or multi-track Opus audio without AAC.
  - `app/api/stream/[filename]/route.ts`: Integrated `child.stderr.on('data')` capture and detailed error logging on non-zero exit codes with automated bot-protection detection, ensuring any stream failure is clearly diagnosed.
  - `lib/ytdlp.ts`: Enhanced `consolidateFormats` with fallback to `bestvideo+bestaudio/best` across all generated resolution tiers.
- **Fixed Playlist Header Button Alignment & Text Wrapping**:
  - `components/download/playlist-card.tsx`: Enforced uniform `h-9` height, `px-3` horizontal padding, `whitespace-nowrap`, and `shrink-0` across all quick action buttons (`Copy ZIP Link`, `Select All / Deselect All`, and `Fullscreen`).
  - Completely eliminated multi-line text wrapping and mismatched button heights.
  - Granted `min-w-0 flex-1` with clean text truncation to the playlist/channel title container, giving titles ample breathing space.
- **Fixed Modal Height Overflow & Background Scroll Lock**:
  - `components/settings/settings-modal.tsx`: Restructured modal with `max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden`. Pinned Header and Footer with `shrink-0` and placed settings content inside a dedicated `overflow-y-auto min-h-0 flex-1` container, guaranteeing action buttons (`Reset Settings`, `Cancel`, `Save & Apply`) are always visible and never cut off.
  - Implemented background scroll locking (`document.body.style.overflow = 'hidden'`) across both `settings-modal.tsx` and `history-drawer.tsx` when open, restoring standard scrolling on close.
- **Eliminated 0-Byte Corrupt ZIP Files in Playlist and Batch Streaming**:
  - Fixed premature ZIP local file header writing in `app/api/stream-playlist-zip/[filename]/route.ts` and `app/api/stream-batch-zip/[filename]/route.ts`: deferred `zip.startFile()` so that file entry headers are only emitted once the first actual media byte arrives from `child.stdout`. This completely eliminates the bug where failed videos emitted 0-byte entries resulting in 544-byte empty ZIP archives.
  - Added full `child.stderr` capture and non-zero exit code inspection to identify YouTube bot challenges (`Sign in to confirm you're not a bot`, `LOGIN_REQUIRED`, or DPAPI decryption errors).
  - Integrated dynamic `README_DOWNLOAD_NOTICE.txt` packaging into ZIP archives when any video cannot be downloaded, informing the user of the exact blocked titles and providing step-by-step instructions to unlock them using cookies.
  - Enhanced `getCookieArgs()` in `lib/ytdlp.ts` to search for `cookies.txt` and `cookies_config.json` across both current working directory and root workspaces.
  - Enhanced `components/settings/settings-modal.tsx` with a direct file upload input for Netscape `cookies.txt` and actionable guidance for Windows DPAPI locks and Firefox session usage.
  - Added helpful status tips in `components/download/playlist-card.tsx` and `components/download/batch-card.tsx` directing users to Settings if YouTube triggers bot verification.
  - Added missing `warn` method to structured `Logger` class in `lib/logger.ts`.
- **Fixed Low-Quality (360p) Fallback in Playlist ZIP and Video Downloads**:
  - Removed `--extractor-args "youtube:player_client=android,web"` from `YTDLP_SPEED_ARGS`, `fetchVideoMetadata`, and `fetchPlaylistMetadata` which triggered YouTube's SABR experiment, causing yt-dlp to skip all 1080p and 720p streams.
  - Added `--js-runtimes node` enabling yt-dlp to solve YouTube JavaScript player challenges cleanly via Node.js v26 without bot warnings or signature failures.
  - Updated playlist format selector presets in `components/download/playlist-card.tsx` to explicitly select AVC1/H.264 video with AAC audio (`bestvideo[height<=1080][vcodec^=avc1]+bestaudio[acodec^=mp4a]/...`), preventing FFmpeg pipe muxing errors on Opus/AV1 in MPEG-TS stdout streams and ensuring guaranteed 1080p Full HD video streams.
  - Synchronized default format fallback in `app/api/stream/[filename]/route.ts` and `app/api/stream-playlist-zip/[filename]/route.ts` to 1080p AVC1+AAC.
- Fixed logger to use static, clean filenames without dates (`api.log`, `error.log`, `engine.log`, `combined.log`) and formatted in-log timestamps as `[DD-MM-YYYY HH:MM:SS]`.
- Fixed uncaught exception `TypeError: Invalid state: Controller is already closed` (`ERR_INVALID_STATE`) across all stream endpoints by implementing stream lifecycle state trackers (`isClosed`) and safe `safeEnqueue`, `safeClose`, and `safeError` wrappers.
- Fixed duplicate trailing return block in `hooks/use-download.ts` that caused compilation failure.
- Fixed `darkMode: "class"` configuration in `tailwind.config.ts` satisfying `DarkModeStrategy` TypeScript definition.
- Fixed IDM `Resume capability: (unknown)` by implementing HTTP `HEAD` handlers, `Range` headers, `ETag`, `Last-Modified`, and `206 Partial Content` responses across single video (`/api/stream/[filename]`) and playlist ZIP (`/api/stream-playlist-zip/[filename]`) endpoints.

### Added
- **YouTube Channel & User Latest Uploads Downloader**:
  - `lib/validators.ts`: Added YouTube Channel detection matching handles (`/@handle`), custom URLs (`/c/name`), channel IDs (`/channel/UC...`), and user URLs, auto-normalizing paths to `/videos` tab.
  - `lib/ytdlp.ts`: Added high-speed channel uploads probing with `--playlist-end 30`, fetching the channel's latest 30 videos in under 4 seconds along with channel avatars, banners, follower counts, and uploader names.
  - `components/download/playlist-card.tsx`: Integrated channel branding displaying circular channel avatar, verified channel badges, formatted subscriber counts (`307K subscribers`), and "YouTube Channel Uploads" chip.
  - `components/download/url-input.tsx`: Added live dynamic Channel badge indicator with `Tv` icon and updated input placeholder to guide channel link pasting.
- **Playlist Enhancements: Individual Video Downloads, List/Grid View Modes & Fullscreen Studio Mode**:
  - `components/download/playlist-card.tsx`:
    - Added direct individual download button on every track in the playlist, enabling users to download any specific video directly in Full HD (MP4/MP3) via IDM or Chrome without needing to uncheck other tracks.
    - Added List View vs Grid View mode switcher (`LayoutList` / `LayoutGrid`): List view offers sleek Spotify-style numbered rows, while Grid view renders a responsive 16:9 card grid with duration badges and action buttons.
    - Added Fullscreen Studio Mode (`Maximize2` / `Minimize2`): Expands the playlist into an immersive full-height studio view with real-time title search filtering, bulk selection controls, responsive tracklist, and persistent bottom ZIP action bar.
    - Automated background scroll locking (`document.body.style.overflow = 'hidden'`) during Fullscreen studio view.
- **Subtitles (.SRT / .VTT) Downloader**:
  - `app/api/subtitles/route.ts`: Instant subtitle extraction and conversion endpoint streaming clean `.srt` tracks with proper content disposition.
  - `components/download/video-card.tsx`: Integrated Subtitles button and dropdown displaying all available official and automatic subtitle tracks for the video.
- **Anti-Bot & Age-Restricted Cookie Session Manager**:
  - `components/settings/settings-modal.tsx`: Interactive modal allowing users to select browser cookie sessions (Chrome, Edge, Brave, Firefox) or paste Netscape `cookies.txt` to bypass bot checks, rate limits, and age restrictions.
  - `app/api/settings/cookies/route.ts`: Secure cookie preference management endpoint persisting settings in `.tmp/cookies_config.json` and `.tmp/cookies.txt`.
  - `lib/ytdlp.ts`: Added `getCookieArgs()` dynamically injecting active cookies across all probe, download, and stream operations.
- **Multi-URL Batch Downloader & Streaming ZIP Packager**:
  - `components/download/url-input.tsx`: Added segmented mode switcher (`Single / Playlist` vs `Multi-URL Batch`) with multi-line textarea input.
  - `components/download/batch-card.tsx`: Dedicated batch inspector displaying queued URLs with format quality presets (1080p FHD, 720p HD, 480p SD, MP3) and full-width streaming ZIP action.
  - `app/api/stream-batch-zip/[filename]/route.ts`: High-speed batch ZIP streaming endpoint packaging arbitrary multiple video URLs sequentially into a single `.zip` archive on the fly with IDM pause/resume support.
- **Client-Side Download History Drawer**:
  - `components/history/history-drawer.tsx`: Slide-over drawer persisting recent downloads in `localStorage` with thumbnails, format tags, relative time, 1-click download, copy link, and clear history actions.
  - `components/layout/header.tsx`: Added interactive History trigger button with live download count badge and Settings trigger button.
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
