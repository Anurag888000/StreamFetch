'use client';

import { useState, useEffect } from 'react';
import { VideoMetadata } from '@/types/video';
import { ProgressPayload } from '@/types/download';

export function useDownload() {
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressPayload | null>(null);

  const fetchInfo = async (url: string) => {
    setLoadingInfo(true);
    setError(null);
    setMetadata(null);
    setProgress(null);

    try {
      const res = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch video information');
      }

      setMetadata(json.data);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while analyzing URL.');
    } finally {
      setLoadingInfo(false);
    }
  };

  const startDownload = async (url: string, formatId: string, outputFormat: string = 'mp4') => {
    setDownloading(true);
    setError(null);
    setProgress({
      jobId: '',
      percent: 0,
      status: 'queued',
      message: 'Initializing download...',
    });

    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, formatId, outputFormat }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to start download job');
      }

      const jobId = json.jobId;

      // Connect to SSE stream
      const eventSource = new EventSource(`/api/progress/${jobId}`);

      eventSource.addEventListener('progress', (e) => {
        try {
          const data: ProgressPayload = JSON.parse(e.data);
          setProgress(data);

          if (data.status === 'completed') {
            eventSource.close();
            setDownloading(false);
            if (data.downloadUrl) {
              // Trigger browser download
              const a = document.createElement('a');
              a.href = data.downloadUrl;
              a.download = data.filename || 'downloaded-video.mp4';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }
          } else if (data.status === 'failed') {
            eventSource.close();
            setDownloading(false);
            setError(data.message || 'Download failed');
          }
        } catch {
          // Ignore JSON parse errors from heartbeat
        }
      });

      eventSource.onerror = () => {
        eventSource.close();
        setDownloading(false);
      };
    } catch (err: any) {
      setDownloading(false);
      setError(err.message || 'Failed to process download.');
    }
  };

  const reset = () => {
    setMetadata(null);
    setProgress(null);
    setError(null);
  };

  return {
    loadingInfo,
    downloading,
    metadata,
    progress,
    error,
    fetchInfo,
    startDownload,
    reset,
  };
}

