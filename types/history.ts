export interface HistoryItem {
  id: string;
  title: string;
  thumbnail?: string;
  duration?: number;
  platform: string;
  format: string;
  outputFormat: string;
  size?: number | string;
  timestamp: number;
  downloadUrl: string;
}

