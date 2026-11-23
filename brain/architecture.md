# Technical Architecture & Data Flow

## 1. Subsystem Architecture
```
[Client Browser]
       │
       ▼
[Next.js App Router UI]
  ├── URL Input & Validation
  ├── Video Metadata Card & Format Picker
  └── Real-time SSE Progress Bar
       │
       ▼ (HTTP / SSE)
[Next.js Route Handlers]
  ├── POST /api/info (Query metadata via yt-dlp --dump-json)
  ├── GET /api/stream (Direct HTTP stream to Chrome via yt-dlp -o -)
  ├── GET /api/stream-playlist-zip (Direct ZIP stream to Chrome via PKZip streaming)
  ├── POST /api/download (Spawn background download job)
  ├── GET /api/progress/:jobId (Stream SSE progress events)
  └── GET /api/file/:id (Stream finalized binary to client)
       │
       ▼
[Subprocess Engine: yt-dlp + ffmpeg]
       │
       ▼
[Temporary Storage: .tmp/downloads]
```

## 2. Security & Sanitization
- URLs are strictly validated using platform-specific regex whitelist prior to invoking `yt-dlp`.
- Subprocesses are spawned with argument arrays (`spawn('yt-dlp', [...])`) to prevent shell injection.
- Video titles are sanitized to ASCII-safe filenames before creating files on disk.
- Completed files are tracked with TTL timestamps and automatically purged.

## 3. Observability & Logging
- **Gate**: Enabled if `process.env.ENABLE_LOGGING === 'true'` (configured in `.env.local`).
- **Outputs**:
  - Console: Timestamped ANSI colored output with route and engine tags (`[API:INFO]`, `[API:DOWNLOAD]`, `[API:PROGRESS]`, `[API:FILE]`, `[ENGINE:YTDLP]`).
  - Disk: Automatically creates `logs/` directory and writes daily rotated files:
    - `logs/api-YYYY-MM-DD.log`: All HTTP request/response payloads and durations.
    - `logs/engine-YYYY-MM-DD.log`: CLI subprocess arguments, execution durations, and exit codes.
    - `logs/error-YYYY-MM-DD.log`: Error logs with stack traces and request context.
    - `logs/combined-YYYY-MM-DD.log`: Unified chronological log stream.
- Log directory `/logs/` and `*.log` are ignored in `.gitignore`.

