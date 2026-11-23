import { VideoMetadata, PlaylistMetadata } from './video';

export type JobStatus = 'queued' | 'downloading' | 'processing' | 'completed' | 'failed';

export interface ProgressPayload {
  jobId: string;
  percent: number;
  speed?: string;
  eta?: string;
  totalSize?: string;
  status: JobStatus;
  message?: string;
  downloadUrl?: string;
  filename?: string;
  isPlaylist?: boolean;
  currentVideoIndex?: number;
  totalVideos?: number;
  currentVideoTitle?: string;
}

export interface DownloadJob {
  id: string;
  url: string;
  formatId: string;
  outputFormat?: string;
  status: JobStatus;
  percent: number;
  speed?: string;
  eta?: string;
  filename?: string;
  filePath?: string;
  fileSize?: number;
  error?: string;
  isPlaylist?: boolean;
  currentVideoIndex?: number;
  totalVideos?: number;
  currentVideoTitle?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DownloadRequestPayload {
  url: string;
  formatId?: string;
  outputFormat?: 'mp4' | 'mp3' | 'webm' | 'mkv';
  title?: string;
  isPlaylist?: boolean;
  selectedVideoUrls?: string[];
}

export interface InfoResponse {
  success: boolean;
  isPlaylist?: boolean;
  data?: VideoMetadata | PlaylistMetadata;
  error?: string;
}

export interface DownloadResponse {
  success: boolean;
  jobId?: string;
  error?: string;
}

