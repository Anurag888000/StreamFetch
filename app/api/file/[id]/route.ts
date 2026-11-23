import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDownloadDirectory } from '@/lib/ytdlp';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;

  logger.request('file', 'GET', { id });

  if (!id) {
    const errRes = { error: 'File ID missing' };
    logger.response('file', 400, errRes, Date.now() - startTime);
    return NextResponse.json(errRes, { status: 400 });
  }

  const outDir = getDownloadDirectory();
  const files = fs.readdirSync(outDir);
  const targetFile = files.find((f) => f.startsWith(id));

  if (!targetFile) {
    logger.error('API:FILE', `File not found or expired on disk for id: ${id}`, null, {
      searchedDir: outDir,
    });
    const errRes = { error: 'File not found or expired' };
    logger.response('file', 404, errRes, Date.now() - startTime);
    return NextResponse.json(errRes, { status: 404 });
  }

  const filePath = path.join(outDir, targetFile);
  const stat = fs.statSync(filePath);
  const cleanFilename = targetFile.replace(`${id}_`, '');
  const ext = path.extname(cleanFilename).toLowerCase();

  const contentTypeMap: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mkv': 'video/x-matroska',
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
  };

  const contentType = contentTypeMap[ext] || 'application/octet-stream';

  logger.info('API:FILE', `Streaming file ${cleanFilename} (${stat.size} bytes) to client`);
  logger.response('file', 200, { filename: cleanFilename, bytes: stat.size, contentType }, Date.now() - startTime);

  const fileStream = fs.createReadStream(filePath);
  const readable = new ReadableStream({
    start(controller) {
      fileStream.on('data', (chunk) => controller.enqueue(chunk));
      fileStream.on('end', () => controller.close());
      fileStream.on('error', (err) => {
        logger.error('API:FILE', `Stream error reading ${cleanFilename}`, err);
        controller.error(err);
      });
    },
    cancel() {
      fileStream.destroy();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': stat.size.toString(),
      'Content-Disposition': `attachment; filename="${encodeURIComponent(cleanFilename)}"`,
      'Cache-Control': 'no-cache',
    },
  });
}
