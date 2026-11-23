import { NextRequest, NextResponse } from 'next/server';
import { fetchVideoMetadata, fetchPlaylistMetadata } from '@/lib/ytdlp';
import { validateVideoUrl } from '@/lib/validators';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let requestedUrl: string | undefined;

  try {
    const body = await req.json();
    requestedUrl = body?.url;

    logger.request('info', 'POST', { url: requestedUrl });

    if (!requestedUrl || typeof requestedUrl !== 'string') {
      const errRes = { success: false, error: 'Valid URL is required' };
      logger.response('info', 400, errRes, Date.now() - startTime);
      return NextResponse.json(errRes, { status: 400 });
    }

    const validation = validateVideoUrl(requestedUrl);
    if (!validation.valid) {
      const errRes = { success: false, error: validation.error || 'Invalid or unsupported URL' };
      logger.response('info', 400, errRes, Date.now() - startTime);
      return NextResponse.json(errRes, { status: 400 });
    }

    if (validation.isPlaylist) {
      logger.info('API:INFO', `Processing playlist metadata probe for: ${validation.cleanUrl}`);
      const playlistData = await fetchPlaylistMetadata(validation.cleanUrl);
      const playlistSummary = {
        id: playlistData.id,
        title: playlistData.title,
        platform: playlistData.platform,
        videoCount: playlistData.videoCount,
        isPlaylist: true,
      };

      logger.response('info', 200, playlistSummary, Date.now() - startTime);
      return NextResponse.json({ success: true, isPlaylist: true, data: playlistData });
    }

    const data = await fetchVideoMetadata(validation.cleanUrl);

    const successSummary = {
      id: data.id,
      title: data.title,
      platform: data.platform,
      duration: data.duration,
      formatsCount: data.formats.length,
      isPlaylist: false,
    };

    logger.response('info', 200, successSummary, Date.now() - startTime);
    return NextResponse.json({ success: true, isPlaylist: false, data });
  } catch (error: any) {
    logger.error('API:INFO', 'Failed to retrieve video metadata', error, { url: requestedUrl });

    const errRes = {
      success: false,
      error: error.message || 'Failed to retrieve video information. Ensure yt-dlp is installed on your system.',
    };

    logger.response('info', 500, errRes, Date.now() - startTime);
    return NextResponse.json(errRes, { status: 500 });
  }
}
