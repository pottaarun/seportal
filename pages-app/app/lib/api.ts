const API_BASE_URL = 'https://seportal-api.arunpotta1024.workers.dev';

// ---------------------------------------------------------------------------
// R2 multipart upload helper
// ---------------------------------------------------------------------------
// Uploads files of ANY size to R2 by splitting into ~10MB chunks that each
// fit comfortably under the Worker request-body limit. Parallel, retryable,
// resilient to corporate-proxy timeouts / flaky Wi-Fi.
//
// Flow:
//   1. POST /api/uploads/multipart/create   -> {uploadId, key, partSize}
//   2. For each chunk: PUT /api/uploads/multipart/part?key=...&uploadId=...&partNumber=N
//      (with up to MAX_CONCURRENT parts in flight at once)
//   3. POST /api/uploads/multipart/complete -> commits the object in R2
//   4. On failure: POST /api/uploads/multipart/abort
// ---------------------------------------------------------------------------

interface MultipartUploadOptions {
  file: File;
  prefix?: 'uploads/' | 'files/' | 'assets/' | 'employee-photos/' | 'archives/';
  id?: string;
  // Called whenever overall progress changes (0-100)
  onProgress?: (pct: number) => void;
  // Concurrent parts in flight. 3 gives good throughput without overwhelming the Worker.
  concurrency?: number;
  // Per-part retry attempts
  maxRetries?: number;
}

interface MultipartUploadResult {
  key: string;
  size: number;
  etag: string;
}

async function multipartUploadToR2(opts: MultipartUploadOptions): Promise<MultipartUploadResult> {
  const {
    file, prefix = 'uploads/', id,
    onProgress, concurrency = 3, maxRetries = 4,
  } = opts;

  // Step 1: create the multipart upload session on R2
  const createRes = await fetch(`${API_BASE_URL}/api/uploads/multipart/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prefix,
      id,
      name: file.name,
      contentType: file.type || 'application/octet-stream',
    }),
  });
  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({})) as any;
    throw new Error(err.error || `Failed to start multipart upload: ${createRes.status}`);
  }
  const { uploadId, key, partSize } = (await createRes.json()) as { uploadId: string; key: string; partSize: number };

  // Step 2: build the chunk list
  const totalSize = file.size;
  const totalParts = Math.max(1, Math.ceil(totalSize / partSize));
  const partProgress = new Array<number>(totalParts).fill(0);

  const emitProgress = () => {
    if (!onProgress) return;
    const uploaded = partProgress.reduce((a, b) => a + b, 0);
    onProgress(Math.min(100, Math.round((uploaded / totalSize) * 100)));
  };

  const uploadOnePart = async (partNumber: number): Promise<{ partNumber: number; etag: string }> => {
    const start = (partNumber - 1) * partSize;
    const end = Math.min(start + partSize, totalSize);
    const slice = file.slice(start, end);
    const sliceSize = end - start;

    let lastErr: any = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Use XHR so we can report upload progress per-part
        const result = await new Promise<{ partNumber: number; etag: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const url = `${API_BASE_URL}/api/uploads/multipart/part?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}&partNumber=${partNumber}`;
          xhr.open('PUT', url);
          xhr.upload.addEventListener('progress', (ev) => {
            if (ev.lengthComputable) {
              partProgress[partNumber - 1] = ev.loaded;
              emitProgress();
            }
          });
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const res = JSON.parse(xhr.responseText);
                partProgress[partNumber - 1] = sliceSize;
                emitProgress();
                resolve({ partNumber: res.partNumber, etag: res.etag });
              } catch (e) { reject(new Error('Bad server response')); }
            } else {
              reject(new Error(`Part ${partNumber} failed: HTTP ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error(`Part ${partNumber} network error`));
          xhr.ontimeout = () => reject(new Error(`Part ${partNumber} timed out`));
          xhr.send(slice);
        });
        return result;
      } catch (err: any) {
        lastErr = err;
        // Reset progress on retry so we don't double-count
        partProgress[partNumber - 1] = 0;
        emitProgress();
        if (attempt < maxRetries) {
          const backoff = Math.min(30_000, 500 * Math.pow(2, attempt));
          await new Promise(r => setTimeout(r, backoff));
        }
      }
    }
    throw lastErr || new Error(`Part ${partNumber} failed after ${maxRetries + 1} attempts`);
  };

  // Step 2b: upload parts with bounded concurrency
  const completedParts: Array<{ partNumber: number; etag: string }> = [];
  try {
    const queue: number[] = [];
    for (let i = 1; i <= totalParts; i++) queue.push(i);
    const workers = Array.from({ length: Math.min(concurrency, totalParts) }, async () => {
      while (queue.length > 0) {
        const partNumber = queue.shift();
        if (!partNumber) return;
        const res = await uploadOnePart(partNumber);
        completedParts.push(res);
      }
    });
    await Promise.all(workers);

    // R2 requires parts in ascending order on complete
    completedParts.sort((a, b) => a.partNumber - b.partNumber);

    // Step 3: complete
    const completeRes = await fetch(`${API_BASE_URL}/api/uploads/multipart/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, uploadId, parts: completedParts }),
    });
    if (!completeRes.ok) {
      const err = await completeRes.json().catch(() => ({})) as any;
      throw new Error(err.error || `Failed to finalize upload: ${completeRes.status}`);
    }
    const done = (await completeRes.json()) as { key: string; etag: string; size: number };
    if (onProgress) onProgress(100);
    return { key: done.key, etag: done.etag, size: done.size };
  } catch (err) {
    // Step 4: abort on any failure so R2 doesn't keep half-uploaded parts around
    try {
      await fetch(`${API_BASE_URL}/api/uploads/multipart/abort`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, uploadId }),
      });
    } catch {}
    throw err;
  }
}

export const api = {
  // Generic large-file uploader (used by fileAssets and anywhere else that needs it)
  uploads: {
    multipart: multipartUploadToR2,
  },
  // URL Assets
  urlAssets: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/url-assets`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/url-assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/url-assets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/url-assets/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
    bulkDelete: async (ids: string[]): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/url-assets/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      return res.json();
    },
    like: async (id: string, userEmail: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/url-assets/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    getUserLikes: async (userEmail: string): Promise<string[]> => {
      const res = await fetch(`${API_BASE_URL}/api/url-assets/user-likes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    incrementUses: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/url-assets/${id}/use`, {
        method: 'POST',
      });
      return res.json();
    },
  },

  // File Assets
  fileAssets: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/file-assets`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/file-assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    // Upload a file asset to R2 + create the DB metadata row.
    //
    // Small files (<25MB) go through the original single-POST endpoint for speed.
    // Larger files transparently switch to R2 multipart (chunked, retryable, robust
    // against network interruptions and corporate proxies).
    //
    // `onProgress(pct)` is called 0..100 during the upload.
    upload: async (file: File, metadata: any, onProgress?: (pct: number) => void): Promise<any> => {
      const SINGLE_POST_LIMIT = 25 * 1024 * 1024; // 25MB

      if (file.size <= SINGLE_POST_LIMIT) {
        // Small file — use the original single-POST path (simpler, 1 RTT)
        return new Promise((resolve, reject) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('metadata', JSON.stringify(metadata));
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${API_BASE_URL}/api/file-assets/upload`);
          if (onProgress) {
            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
            });
          }
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try { resolve(JSON.parse(xhr.responseText)); }
              catch { resolve({ success: true }); }
            } else {
              reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`));
            }
          };
          xhr.onerror = () => reject(new Error('Network error during upload'));
          xhr.send(formData);
        });
      }

      // Large file — use multipart upload to bypass the Worker 100MB body limit.
      // Step 1 + 2 + 3: multipart chunked upload to R2
      const { key, size } = await multipartUploadToR2({
        file,
        prefix: 'files/',
        id: metadata.id,
        onProgress,
      });

      // Step 4: create the file_assets DB row pointing at the uploaded R2 key.
      // This uses the existing POST /api/file-assets endpoint which already accepts file_key.
      const dbRes = await fetch(`${API_BASE_URL}/api/file-assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: metadata.id,
          name: metadata.name || file.name,
          type: file.type,
          category: metadata.category,
          size: metadata.size || `${(size / (1024 * 1024)).toFixed(1)} MB`,
          downloads: 0,
          date: metadata.date,
          icon: metadata.icon,
          description: metadata.description || '',
          file_key: key,
        }),
      });
      return dbRes.json();
    },
    download: async (id: string): Promise<Response> => {
      const res = await fetch(`${API_BASE_URL}/api/file-assets/${id}/download`);
      return res;
    },
    update: async (id: string, data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/file-assets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/file-assets/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
    bulkDelete: async (ids: string[]): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/file-assets/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      return res.json();
    },
  },

  // Scripts
  scripts: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/scripts`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/scripts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    like: async (id: string, userEmail: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/scripts/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    getUserLikes: async (userEmail: string): Promise<string[]> => {
      const res = await fetch(`${API_BASE_URL}/api/scripts/user-likes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    incrementUses: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/scripts/${id}/use`, {
        method: 'POST',
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/scripts/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Events
  events: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/events`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/events/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Shoutouts
  shoutouts: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/shoutouts`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/shoutouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    like: async (id: string, userEmail: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/shoutouts/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    getUserLikes: async (userEmail: string): Promise<string[]> => {
      const res = await fetch(`${API_BASE_URL}/api/shoutouts/user-likes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/shoutouts/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Users
  users: {
    getByEmail: async (email: string): Promise<any | null> => {
      const res = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(email)}`);
      if (res.status === 404) {
        return null;
      }
      return res.json();
    },
    createOrUpdate: async (email: string, name: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      return res.json();
    },
  },

  // Learning Hub - Video Library
  // Videos are stored and streamed via Cloudflare Stream.
  // Every uploaded video is auto-transcribed (Whisper) and vectorized (bge-base-en-v1.5 -> VIDEO_VECTORIZE)
  // so users can do semantic search across spoken content and get similar-video recommendations.
  videos: {
    // Step 1 of upload: request a one-time upload URL from Cloudflare Stream.
    // We send `upload_length` so the server creates a tus (resumable, chunked) session,
    // which survives network hiccups and handles multi-GB files reliably.
    // The browser uploads file bytes DIRECTLY to Stream (no request passes through our Worker).
    getUploadUrl: async (data: {
      title: string;
      description?: string;
      category?: string;
      uploader_email: string;
      uploader_name?: string;
      max_duration_seconds?: number;
      upload_length?: number; // file size in bytes — triggers tus session
    }): Promise<{ uploadURL: string; uid: string; video_id: string; method?: 'tus' | 'direct' }> => {
      const res = await fetch(`${API_BASE_URL}/api/videos/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error || 'Failed to get upload URL');
      }
      return res.json();
    },

    // Upload file to Cloudflare Stream via tus resumable protocol.
    //
    // IMPORTANT: Upload throughput is bandwidth-bound. A 1 GB file on a 10 Mbps upload
    // will take ~14 minutes minimum regardless of chunking — that's the physics, not
    // our code. What chunking helps with is RESILIENCE (if a chunk fails, we retry
    // just that chunk instead of restarting), and PROGRESS GRANULARITY (smaller chunks
    // = more frequent updates so the user doesn't feel stuck).
    //
    // We use 16 MB chunks (instead of the old 50 MB) because:
    //   - Progress updates every ~1-2s on a 10 Mbps link (vs every ~40s with 50 MB)
    //   - A dropped chunk loses at most 16 MB of retransmit work
    //   - TLS inspection / corporate proxies often timeout on very long requests;
    //     16 MB stays comfortably under those timeouts.
    //
    // Note on parallel uploads: Cloudflare Stream doesn't currently support the tus
    // concatenation extension, so `parallelUploads > 1` cannot be used against Stream.
    // The upload is strictly bandwidth-bound per the underlying TCP connection.
    uploadToStream: async (
      uploadURL: string,
      file: File,
      onProgress?: (pct: number, stats?: { speedBps: number; etaSeconds: number; bytesUploaded: number; bytesTotal: number }) => void,
      method: 'tus' | 'direct' = 'tus',
      abortSignal?: AbortSignal
    ): Promise<void> => {
      if (method === 'direct') {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', uploadURL);
          if (abortSignal) abortSignal.addEventListener('abort', () => { try { xhr.abort(); } catch {} });
          const startTime = Date.now();
          if (onProgress) {
            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable) {
                const elapsed = (Date.now() - startTime) / 1000;
                const speed = elapsed > 0 ? e.loaded / elapsed : 0;
                const remaining = e.total - e.loaded;
                const eta = speed > 0 ? remaining / speed : 0;
                onProgress(Math.round((e.loaded / e.total) * 100), {
                  speedBps: speed, etaSeconds: eta, bytesUploaded: e.loaded, bytesTotal: e.total,
                });
              }
            });
          }
          xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
          xhr.onerror = () => reject(new Error('Network error during upload'));
          const formData = new FormData();
          formData.append('file', file);
          xhr.send(formData);
        });
      }

      // tus path
      const tus = await import('tus-js-client');
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        // Keep a rolling window of the last 10s of progress samples for a smoother speed readout
        const speedWindow: Array<{ t: number; bytes: number }> = [];

        const upload = new tus.Upload(file, {
          uploadUrl: uploadURL,
          // 16 MB chunks — better progress granularity + shorter retry cycles on flaky links
          chunkSize: 16 * 1024 * 1024,
          // Faster retries: 0s, 1s, 3s, 5s, 10s (was 0,3,5,10,20,30)
          retryDelays: [0, 1_000, 3_000, 5_000, 10_000],
          // Clean up the localStorage fingerprint once done so subsequent uploads don't confuse it
          removeFingerprintOnSuccess: true,
          metadata: { filename: file.name, filetype: file.type },
          onError: (err) => {
            console.error('tus upload error:', err);
            reject(new Error(`Upload failed: ${err?.message || String(err)}`));
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            if (!onProgress) return;
            const now = Date.now();
            speedWindow.push({ t: now, bytes: bytesUploaded });
            // Keep only samples within the last 10s
            while (speedWindow.length > 1 && now - speedWindow[0].t > 10_000) speedWindow.shift();
            let speed = 0;
            if (speedWindow.length >= 2) {
              const first = speedWindow[0];
              const last = speedWindow[speedWindow.length - 1];
              const dtSec = (last.t - first.t) / 1000;
              if (dtSec > 0) speed = (last.bytes - first.bytes) / dtSec;
            } else {
              const elapsed = (now - startTime) / 1000;
              speed = elapsed > 0 ? bytesUploaded / elapsed : 0;
            }
            const remaining = bytesTotal - bytesUploaded;
            const eta = speed > 0 ? remaining / speed : 0;
            onProgress(bytesTotal > 0 ? Math.round((bytesUploaded / bytesTotal) * 100) : 0, {
              speedBps: speed, etaSeconds: eta, bytesUploaded, bytesTotal,
            });
          },
          onSuccess: () => resolve(),
        });

        // Expose abort so the UI can cancel the upload cleanly
        if (abortSignal) {
          abortSignal.addEventListener('abort', () => {
            try {
              upload.abort(true).catch(() => {});
              reject(new Error('Upload cancelled'));
            } catch {}
          });
        }

        upload.start();
      });
    },

    // Step 3: Notify the API that the upload is complete; transcription + vectorization runs in the background.
    finalizeUpload: async (video_id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/videos/${video_id}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return res.json();
    },

    // Library listing
    getAll: async (category?: string): Promise<any[]> => {
      const qs = category ? `?category=${encodeURIComponent(category)}` : '';
      const res = await fetch(`${API_BASE_URL}/api/videos${qs}`);
      return res.json();
    },

    getOne: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/videos/${id}`);
      return res.json();
    },

    update: async (id: string, data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/videos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },

    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/videos/${id}`, { method: 'DELETE' });
      return res.json();
    },

    // Track a view
    recordView: async (id: string, userEmail?: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/videos/${id}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },

    // Semantic search over transcripts
    search: async (query: string, limit = 10): Promise<{
      results: Array<{
        video_id: string;
        title: string;
        description?: string;
        category?: string;
        score: number;
        snippet: string;
        timestamp?: number;
        stream_uid: string;
        thumbnail_url?: string;
      }>;
    }> => {
      const res = await fetch(`${API_BASE_URL}/api/videos/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit }),
      });
      return res.json();
    },

    // Similar-video recommendations based on transcript vectors
    getRecommendations: async (id: string, limit = 5): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/videos/${id}/recommendations?limit=${limit}`);
      return res.json();
    },

    // Poll transcription progress (for the UI "Processing..." state)
    getStatus: async (id: string): Promise<{
      transcription_status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
      transcription_progress?: number; // 0-100
      transcription_stage?: string;    // e.g. "Transcoding video (45%)", "Indexing transcript (12 of 68 chunks)"
      stream_ready: boolean;
      transcript_length?: number;
      error?: string;
      retry_count?: number;            // 0 on first try, increments on failure (max 10)
      last_retry_at?: string;
    }> => {
      const res = await fetch(`${API_BASE_URL}/api/videos/${id}/status`);
      return res.json();
    },

    // Admin: force reprocess (re-transcribe + re-vectorize)
    reprocess: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/videos/${id}/reprocess`, { method: 'POST' });
      return res.json();
    },

    // Ask a question about a specific video.
    // Backend does RAG over the video's transcript chunks and returns an LLM answer
    // plus citations {start_seconds, end_seconds, snippet} that the UI uses to
    // render clickable "jump to this moment" buttons.
    ask: async (id: string, question: string): Promise<{
      answer: string;
      citations: Array<{ start_seconds: number; end_seconds: number; snippet: string; score: number }>;
      video_id?: string;
    }> => {
      const res = await fetch(`${API_BASE_URL}/api/videos/${id}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as any;
        throw new Error(err.error || `Ask failed: ${res.status}`);
      }
      return res.json();
    },
  },

  // Groups
  groups: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/groups`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/groups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/groups/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
    addMember: async (groupId: string, userEmail: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    removeMember: async (groupId: string, userEmail: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/groups/${groupId}/members/${encodeURIComponent(userEmail)}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Announcements
  announcements: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/announcements`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/announcements/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
    generateEmail: async (data: { title: string; message: string; products?: string[]; tone?: string; customerName?: string }): Promise<{ subject: string; body: string }> => {
      const res = await fetch(`${API_BASE_URL}/api/announcements/generate-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
  },

  // Competitions
  competitions: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/competitions`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/competitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/competitions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/competitions/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
    join: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/competitions/${id}/join`, {
        method: 'POST',
      });
      return res.json();
    },
  },

  // Products
  products: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/products`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Employees
  employees: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/employees`);
      return res.json();
    },
    getByEmail: async (email: string): Promise<any | null> => {
      const res = await fetch(`${API_BASE_URL}/api/employees/by-email/${encodeURIComponent(email)}`);
      if (res.status === 404) return null;
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/employees/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
    uploadPhoto: async (id: string, photo: File): Promise<any> => {
      const formData = new FormData();
      formData.append('photo', photo);
      const res = await fetch(`${API_BASE_URL}/api/employees/${id}/photo`, {
        method: 'POST',
        body: formData,
      });
      return res.json();
    },
    getPhoto: async (id: string): Promise<Response> => {
      const res = await fetch(`${API_BASE_URL}/api/employees/${id}/photo`);
      return res;
    },
  },

  // Skills Matrix
  skillCategories: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/skill-categories`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/skill-categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/skill-categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/skill-categories/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  skills: {
    getAll: async (categoryId?: string): Promise<any[]> => {
      const url = categoryId
        ? `${API_BASE_URL}/api/skills?category_id=${encodeURIComponent(categoryId)}`
        : `${API_BASE_URL}/api/skills`;
      const res = await fetch(url);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/skills/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/skills/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  skillAssessments: {
    getForUser: async (userEmail: string): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/skill-assessments?user_email=${encodeURIComponent(userEmail)}`);
      return res.json();
    },
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/skill-assessments/all`);
      return res.json();
    },
    save: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/skill-assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    saveBulk: async (userEmail: string, userName: string, assessments: { skill_id: string; level: number }[]): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/skill-assessments/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: userEmail, user_name: userName, assessments }),
      });
      return res.json();
    },
  },

  universityCourses: {
    getAll: async (skillId?: string): Promise<any[]> => {
      const url = skillId
        ? `${API_BASE_URL}/api/university-courses?skill_id=${encodeURIComponent(skillId)}`
        : `${API_BASE_URL}/api/university-courses`;
      const res = await fetch(url);
      return res.json();
    },
    getRecommended: async (userEmail: string): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/university-courses/recommended?user_email=${encodeURIComponent(userEmail)}`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/university-courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/university-courses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/university-courses/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Course Completions (tracking status for library courses)
  courseCompletions: {
    getByUser: async (userEmail: string): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/course-completions?user_email=${encodeURIComponent(userEmail)}`);
      return res.json();
    },
    updateStatus: async (userEmail: string, courseId: string, status: 'not_started' | 'in_progress' | 'completed'): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/course-completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: userEmail, course_id: courseId, status }),
      });
      return res.json();
    },
    remove: async (userEmail: string, courseId: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/course-completions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: userEmail, course_id: courseId }),
      });
      return res.json();
    },
  },

  // Personal Courses (user-added custom courses)
  personalCourses: {
    getByUser: async (userEmail: string): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/personal-courses?user_email=${encodeURIComponent(userEmail)}`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/personal-courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/personal-courses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/personal-courses/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Feature Requests
  featureRequests: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/feature-requests`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/feature-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    upvote: async (id: string, userEmail: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/feature-requests/${id}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    getUserUpvotes: async (userEmail: string): Promise<string[]> => {
      const res = await fetch(`${API_BASE_URL}/api/feature-requests/user-upvotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    addOpportunity: async (id: string, userEmail: string, userName: string, opportunityValue: number, customerName?: string, sfdcLink?: string, description?: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/feature-requests/${id}/add-opportunity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, userName, opportunityValue, customerName, sfdcLink, description }),
      });
      return res.json();
    },
    deleteOpportunity: async (featureRequestId: string, opportunityId: string, userEmail: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/feature-requests/${featureRequestId}/opportunities/${opportunityId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/feature-requests/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Workday Integration
  workday: {
    getConfig: async (): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/admin/workday-config`);
      return res.json();
    },
    saveConfig: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/admin/workday-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    triggerSync: async (): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/admin/workday-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggered_by: 'manual' }),
      });
      return res.json();
    },
    getSyncStatus: async (): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/admin/workday-sync-status`);
      return res.json();
    },
    getSyncLogs: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/admin/sync-logs`);
      return res.json();
    },
  },

  // Reports
  reports: {
    skillsByTeam: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/reports/skills-by-team`);
      return res.json();
    },
    courseCompletionByManager: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/reports/course-completion-by-manager`);
      return res.json();
    },
    onboardingProgress: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/reports/onboarding-progress`);
      return res.json();
    },
    headcount: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/reports/headcount`);
      return res.json();
    },
    skillsGapSummary: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/reports/skills-gap-summary`);
      return res.json();
    },
  },

  // AI Curriculum Analyzer
  ai: {
    analyzeCurriculum: async (): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/ai/analyze-curriculum`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return res.json();
    },
  },

  // Course Assignments
  courseAssignments: {
    getForUser: async (userEmail: string): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/course-assignments?user_email=${encodeURIComponent(userEmail)}`);
      return res.json();
    },
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/course-assignments/all`);
      return res.json();
    },
    assign: async (data: { user_emails: string | string[]; course_ids: string | string[]; assigned_by: string; assigned_by_name?: string; due_date?: string; notes?: string; source?: string }): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/course-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/course-assignments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/course-assignments/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
    autoAssign: async (userEmail: string, assignedBy?: string, assignedByName?: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/course-assignments/auto-assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: userEmail, assigned_by: assignedBy || 'system', assigned_by_name: assignedByName || 'System' }),
      });
      return res.json();
    },
  },

  // Page Views (tab visit tracking)
  pageViews: {
    track: async (data: { user_email?: string; user_name?: string; page_path: string; page_label?: string }): Promise<any> => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/page-views`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        return res.json();
      } catch {
        // Silently fail – tracking should never break the app
        return null;
      }
    },
    getStats: async (days = 30): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/page-views/stats?days=${days}`);
      return res.json();
    },
    getUserStats: async (email: string, days = 30): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/page-views/user/${encodeURIComponent(email)}?days=${days}`);
      return res.json();
    },
  },

  // Error Logs
  errorLogs: {
    report: async (data: { user_email?: string; user_name?: string; error_type: string; error_message: string; error_context?: string; stack_trace?: string }): Promise<any> => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/error-logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        return res.json();
      } catch {
        return null; // Never break the app due to error reporting
      }
    },
    getAll: async (limit = 100, resolved?: number): Promise<any[]> => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (resolved !== undefined) params.set('resolved', String(resolved));
      const res = await fetch(`${API_BASE_URL}/api/error-logs?${params}`);
      return res.json();
    },
    resolve: async (id: number): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/error-logs/${id}/resolve`, { method: 'POST' });
      return res.json();
    },
  },

  // Workday Learning
  workdayLearning: {
    syncCourses: async (): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/admin/workday-sync-courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return res.json();
    },
    pushEnrollment: async (userEmail: string, courseTitle: string, workdayCourseId?: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/admin/workday-push-enrollment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: userEmail, course_title: courseTitle, workday_course_id: workdayCourseId }),
      });
      return res.json();
    },
  },

  // AI Hub: stage-aware solutions library + Cloudflare GitHub skills RAG
  aiHub: {
    // Solution library
    listSolutions: async (params: {
      stage?: string;
      type?: string;
      starter?: '0' | '1';
      sort?: 'upvotes' | 'recent' | 'uses' | 'alpha';
      q?: string;
      // Comma-separated tag filter (e.g. "playbook" or "playbook,playbook:discovery").
      // A solution matches if its tags array contains every supplied tag.
      tag?: string;
    } = {}): Promise<any[]> => {
      const qp = new URLSearchParams();
      if (params.stage) qp.set('stage', params.stage);
      if (params.type) qp.set('type', params.type);
      if (params.starter !== undefined) qp.set('starter', params.starter);
      if (params.sort) qp.set('sort', params.sort);
      if (params.q) qp.set('q', params.q);
      if (params.tag) qp.set('tag', params.tag);
      const res = await fetch(`${API_BASE_URL}/api/ai-hub/solutions?${qp.toString()}`);
      return res.json();
    },
    getSolution: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/ai-hub/solutions/${id}`);
      return res.json();
    },
    createSolution: async (data: {
      type: string; title: string; description?: string; content: string;
      sales_stage?: string; product?: string; tags?: string[]; icon?: string;
      author_email: string; author_name: string;
      is_starter?: boolean; is_pinned?: boolean; source_url?: string;
    }): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/ai-hub/solutions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    updateSolution: async (id: string, data: any): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/ai-hub/solutions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    deleteSolution: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/ai-hub/solutions/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
    toggleUpvote: async (id: string, userEmail: string): Promise<{ success: boolean; upvoted: boolean; upvotes: number }> => {
      const res = await fetch(`${API_BASE_URL}/api/ai-hub/solutions/${id}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: userEmail }),
      });
      return res.json();
    },
    getMyUpvotes: async (userEmail: string): Promise<string[]> => {
      const res = await fetch(`${API_BASE_URL}/api/ai-hub/upvotes?user_email=${encodeURIComponent(userEmail)}`);
      return res.json();
    },
    trackUse: async (id: string, action: 'view' | 'copy' | 'apply', userEmail?: string, userName?: string): Promise<any> => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/ai-hub/solutions/${id}/use`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, user_email: userEmail, user_name: userName }),
        });
        return res.json();
      } catch {
        return null;
      }
    },
    stats: async (): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/ai-hub/stats`);
      return res.json();
    },

    // Cloudflare GitHub skills (knowledge base)
    listSkills: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/ai-hub/skills`);
      return res.json();
    },
    getSkill: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/ai-hub/skills/${id}`);
      return res.json();
    },
    discoverSkills: async (params: { repo?: string; branch?: string; path?: string } = {}): Promise<{ skills: any[]; count: number }> => {
      const res = await fetch(`${API_BASE_URL}/api/ai-hub/skills/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      return res.json();
    },
    ingestSkills: async (params: { repo?: string; branch?: string; skills?: string[] } = {}): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/ai-hub/skills/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      return res.json();
    },
    deleteSkill: async (id: string): Promise<any> => {
      const res = await fetch(`${API_BASE_URL}/api/ai-hub/skills/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },

    // Chat
    chat: async (data: {
      message: string;
      sales_stage?: string;
      session_id?: string;
      user_email?: string;
      user_name?: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      context_solution_ids?: string[];
    }): Promise<{
      reply: string;
      session_id: string;
      citations: Array<{ skill_id: string; skill_name: string; snippet: string; score: number; source_url: string }>;
      stage: string;
      latency_ms: number;
      retrieved_skills: number;
    }> => {
      const res = await fetch(`${API_BASE_URL}/api/ai-hub/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    listSessions: async (userEmail: string): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/ai-hub/chat/sessions?user_email=${encodeURIComponent(userEmail)}`);
      return res.json();
    },
    getSession: async (sessionId: string): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}/api/ai-hub/chat/sessions/${sessionId}`);
      return res.json();
    },
  },
};
