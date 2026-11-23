import { Platform } from '@/types/video';

export interface ValidationResult {
  valid: boolean;
  platform: Platform;
  isPlaylist: boolean;
  cleanUrl: string;
  error?: string;
}

const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\/.+$/;
const YOUTUBE_PLAYLIST_REGEX = /[?&]list=([a-zA-Z0-9_-]+)/;
const INSTAGRAM_REGEX = /^(https?:\/\/)?(www\.)?instagram\.com\/(p|reel|tv)\/([a-zA-Z0-9_-]+)/;
const TWITTER_REGEX = /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/status\/[0-9]+/;
const FACEBOOK_REGEX = /^(https?:\/\/)?(www\.|web\.|m\.)?(facebook\.com|fb\.watch)\/.+$/;
const TIKTOK_REGEX = /^(https?:\/\/)?(www\.|vm\.|vt\.)?tiktok\.com\/.+$/;

export function validateVideoUrl(inputUrl: string): ValidationResult {
  const trimmed = inputUrl.trim();
  if (!trimmed) {
    return { valid: false, platform: 'generic', isPlaylist: false, cleanUrl: '', error: 'URL is required' };
  }

  // Ensure protocol
  let url = trimmed;
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  try {
    const parsed = new URL(url);

    if (YOUTUBE_REGEX.test(url)) {
      const isPlaylist = YOUTUBE_PLAYLIST_REGEX.test(url) && !parsed.searchParams.has('v');
      return { valid: true, platform: 'youtube', isPlaylist, cleanUrl: url };
    }

    if (INSTAGRAM_REGEX.test(url)) {
      return { valid: true, platform: 'instagram', isPlaylist: false, cleanUrl: url };
    }

    if (TWITTER_REGEX.test(url)) {
      return { valid: true, platform: 'twitter', isPlaylist: false, cleanUrl: url };
    }

    if (FACEBOOK_REGEX.test(url)) {
      return { valid: true, platform: 'facebook', isPlaylist: false, cleanUrl: url };
    }

    if (TIKTOK_REGEX.test(url)) {
      return { valid: true, platform: 'tiktok', isPlaylist: false, cleanUrl: url };
    }

    // Generic fallback for any other supported yt-dlp source
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return { valid: true, platform: 'generic', isPlaylist: false, cleanUrl: url };
    }

    return { valid: false, platform: 'generic', isPlaylist: false, cleanUrl: '', error: 'Invalid URL scheme' };
  } catch {
    return { valid: false, platform: 'generic', isPlaylist: false, cleanUrl: '', error: 'Malformed URL' };
  }
}

