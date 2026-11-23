export type Platform = 'youtube' | 'instagram' | 'twitter' | 'facebook' | 'tiktok' | 'generic';

export interface VideoFormat {
  formatId: string;
  ext: string;
  resolution?: string;
  qualityLabel?: string;
  filesize?: number;
  filesizeApprox?: number;
  hasVideo: boolean;
  hasAudio: boolean;
  fps?: number;
  vcodec?: string;
  acodec?: string;
}

export interface VideoMetadata {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  duration?: number;
  uploader?: string;
  uploaderUrl?: string;
  viewCount?: number;
  platform: Platform;
  url: string;
  formats: VideoFormat[];
}

export interface PlaylistVideoSummary {
  id: string;
  title: string;
  url: string;
  duration?: number;
  thumbnail?: string;
}

export interface PlaylistMetadata {
  id: string;
  title: string;
  platform: Platform;
  url: string;
  videoCount: number;
  videos: PlaylistVideoSummary[];
}

