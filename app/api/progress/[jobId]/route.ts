import { NextRequest } from 'next/server';
import { progressManager } from '@/lib/progress-manager';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  if (!jobId) {
    logger.error('API:PROGRESS', 'SSE request received without jobId parameter');
    return new Response('Missing jobId parameter', { status: 400 });
  }

  logger.info('API:PROGRESS', `Client connected to SSE progress stream for job ${jobId}`);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (event: string, data: any) => {
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Stream might be closed by client
        }
      };

      // Subscribe to progress manager
      const unsubscribe = progressManager.subscribe(jobId, (payload) => {
        sendEvent('progress', payload);

        if (payload.status === 'completed' || payload.status === 'failed') {
          logger.info(
            'API:PROGRESS',
            `Job ${jobId} finished with status "${payload.status}". Closing SSE stream.`
          );
          setTimeout(() => {
            try {
              controller.close();
            } catch {}
            unsubscribe();
          }, 1000);
        }
      });

      // Heartbeat ping every 15s to keep connection alive
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(interval);
          unsubscribe();
        }
      }, 15000);

      req.signal.addEventListener('abort', () => {
        logger.info('API:PROGRESS', `Client disconnected from SSE stream for job ${jobId}`);
        clearInterval(interval);
        unsubscribe();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
