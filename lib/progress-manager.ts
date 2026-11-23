import { DownloadJob, ProgressPayload } from '@/types/download';

type Listener = (payload: ProgressPayload) => void;

class ProgressManager {
  private jobs: Map<string, DownloadJob> = new Map();
  private listeners: Map<string, Set<Listener>> = new Map();

  createJob(id: string, url: string, formatId: string, outputFormat?: string): DownloadJob {
    const job: DownloadJob = {
      id,
      url,
      formatId,
      outputFormat,
      status: 'queued',
      percent: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.jobs.set(id, job);
    return job;
  }

  getJob(id: string): DownloadJob | undefined {
    return this.jobs.get(id);
  }

  updateProgress(id: string, update: Partial<DownloadJob>): void {
    const job = this.jobs.get(id);
    if (!job) return;

    Object.assign(job, update, { updatedAt: Date.now() });

    const payload: ProgressPayload = {
      jobId: id,
      percent: job.percent,
      speed: job.speed,
      eta: job.eta,
      status: job.status,
      message: job.error,
      filename: job.filename,
      downloadUrl: job.status === 'completed' ? `/api/file/${id}` : undefined,
    };

    const jobListeners = this.listeners.get(id);
    if (jobListeners) {
      jobListeners.forEach((listener) => listener(payload));
    }
  }

  subscribe(jobId: string, listener: Listener): () => void {
    if (!this.listeners.has(jobId)) {
      this.listeners.set(jobId, new Set());
    }
    const set = this.listeners.get(jobId)!;
    set.add(listener);

    // Emit initial status if job already exists
    const job = this.jobs.get(jobId);
    if (job) {
      listener({
        jobId,
        percent: job.percent,
        speed: job.speed,
        eta: job.eta,
        status: job.status,
        message: job.error,
        filename: job.filename,
        downloadUrl: job.status === 'completed' ? `/api/file/${jobId}` : undefined,
      });
    }

    return () => {
      set.delete(listener);
      if (set.size === 0) {
        this.listeners.delete(jobId);
      }
    };
  }

  cleanupOldJobs(ttlMs: number = 3600 * 1000): void {
    const now = Date.now();
    for (const [id, job] of this.jobs.entries()) {
      if (now - job.updatedAt > ttlMs) {
        this.jobs.delete(id);
        this.listeners.delete(id);
      }
    }
  }
}

// Global singleton for Next.js API route handling
const globalForProgress = globalThis as unknown as { progressManager?: ProgressManager };
export const progressManager = globalForProgress.progressManager ?? new ProgressManager();
if (process.env.NODE_ENV !== 'production') globalForProgress.progressManager = progressManager;

