import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { downloadMedia } from '@/lib/ytdlp';
import { progressManager } from '@/lib/progress-manager';
import { validateVideoUrl } from '@/lib/validators';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let requestPayload: any = null;

  try {
    requestPayload = await req.json();
    const { url, formatId = 'bestvideo+bestaudio/best', outputFormat = 'mp4' } = requestPayload;

    logger.request('download', 'POST', { url, formatId, outputFormat });

    if (!url || typeof url !== 'string') {
      const errRes = { success: false, error: 'URL is required' };
      logger.response('download', 400, errRes, Date.now() - startTime);
      return NextResponse.json(errRes, { status: 400 });
    }

    const validation = validateVideoUrl(url);
    if (!validation.valid) {
      const errRes = { success: false, error: validation.error || 'Invalid URL' };
      logger.response('download', 400, errRes, Date.now() - startTime);
      return NextResponse.json(errRes, { status: 400 });
    }

    const jobId = uuidv4();
    progressManager.createJob(jobId, validation.cleanUrl, formatId, outputFormat);

    logger.info('API:DOWNLOAD', `Job ${jobId} registered for ${validation.cleanUrl} [${outputFormat}]`);

    // Start background download
    downloadMedia({
      jobId,
      url: validation.cleanUrl,
      formatId,
      outputFormat,
      onProgress: (percent, speed, eta) => {
        progressManager.updateProgress(jobId, {
          status: 'downloading',
          percent,
          speed,
          eta,
        });
      },
      onComplete: (filePath, filename, fileSize) => {
        logger.info('API:DOWNLOAD', `Job ${jobId} download finished`, {
          filename,
          filePath,
          fileSize,
        });
        progressManager.updateProgress(jobId, {
          status: 'completed',
          percent: 100,
          filePath,
          filename,
          fileSize,
        });
      },
      onError: (errorMessage) => {
        logger.error('API:DOWNLOAD', `Job ${jobId} download failed`, errorMessage, {
          url: validation.cleanUrl,
          formatId,
        });
        progressManager.updateProgress(jobId, {
          status: 'failed',
          error: errorMessage,
        });
      },
    });

    const successRes = { success: true, jobId };
    logger.response('download', 200, successRes, Date.now() - startTime);
    return NextResponse.json(successRes);
  } catch (error: any) {
    logger.error('API:DOWNLOAD', 'Unhandled error in download route', error, requestPayload);

    const errRes = { success: false, error: error.message || 'Failed to start download job' };
    logger.response('download', 500, errRes, Date.now() - startTime);
    return NextResponse.json(errRes, { status: 500 });
  }
}
