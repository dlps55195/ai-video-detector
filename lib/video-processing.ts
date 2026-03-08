// Client-side video frame extraction utility
// Runs entirely in the browser using HTMLVideoElement + Canvas API

export interface ExtractedFrame {
  blob: Blob;
  timestamp: number; // in seconds
  dataUrl: string;   // for preview
}

export interface ExtractionProgress {
  current: number;
  total: number;
  timestamp: number;
}

/**
 * Video metadata captured during extraction.
 * Used downstream to apply resolution/bitrate-aware confidence dampening —
 * professional stock footage at 4K looks "too perfect" to free HF models
 * and triggers false positives. This metadata lets us correct for that.
 */
export interface VideoMetadata {
  width: number;         // native video width in pixels
  height: number;        // native video height in pixels
  durationSeconds: number;
  bitrateMbps: number;   // estimated from file size / duration
}

/**
 * Reads video resolution and estimates bitrate from a File.
 * Call this before or alongside extractFrames — it loads metadata only,
 * no frame extraction happens here.
 */
export function getVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);

    video.preload = 'metadata';
    video.muted = true;

    video.onloadedmetadata = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      const durationSeconds = video.duration;

      // Estimate bitrate: fileSize(bytes) * 8 bits / duration(s) / 1,000,000 = Mbps
      const bitrateMbps =
        isFinite(durationSeconds) && durationSeconds > 0
          ? (file.size * 8) / durationSeconds / 1_000_000
          : 0;

      URL.revokeObjectURL(objectUrl);
      resolve({ width, height, durationSeconds, bitrateMbps });
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // Don't hard-fail — return zeroes so the rest of the pipeline continues
      resolve({ width: 0, height: 0, durationSeconds: 0, bitrateMbps: 0 });
    };

    video.src = objectUrl;
  });
}

/**
 * Extracts frames from a video file at the specified interval.
 * Runs client-side — no server required, no FFmpeg.
 *
 * @param file       - The video File object
 * @param interval   - Seconds between frames (default: 2)
 * @param maxFrames  - Max number of frames to extract (default: 8)
 * @param onProgress - Optional progress callback
 */
export async function extractFrames(
  file: File,
  interval: number = 2,
  maxFrames: number = 8,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<ExtractedFrame[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas 2D context not available'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const frames: ExtractedFrame[] = [];

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      const duration = video.duration;

      if (!isFinite(duration) || duration === 0) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Could not determine video duration. File may be corrupted.'));
        return;
      }

      // Calculate timestamps to extract
      const timestamps: number[] = [];
      const step = Math.max(interval, duration / maxFrames);

      for (let t = 0; t < duration && timestamps.length < maxFrames; t += step) {
        timestamps.push(Math.min(t, duration - 0.1));
      }

      // Ensure we have at least 1 frame
      if (timestamps.length === 0) {
        timestamps.push(0);
      }

      canvas.width = 512;
      canvas.height = Math.round(512 * (video.videoHeight / video.videoWidth)) || 512;

      let index = 0;

      const captureNextFrame = () => {
        if (index >= timestamps.length) {
          URL.revokeObjectURL(objectUrl);
          resolve(frames);
          return;
        }

        video.currentTime = timestamps[index];
      };

      video.onseeked = () => {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                frames.push({
                  blob,
                  timestamp: timestamps[index],
                  dataUrl: canvas.toDataURL('image/jpeg', 0.85),
                });
              }

              if (onProgress) {
                onProgress({
                  current: index + 1,
                  total: timestamps.length,
                  timestamp: timestamps[index],
                });
              }

              index++;
              captureNextFrame();
            },
            'image/jpeg',
            0.85
          );
        } catch (err) {
          URL.revokeObjectURL(objectUrl);
          reject(err);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load video for frame extraction.'));
      };

      captureNextFrame();
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load video metadata. Unsupported format?'));
    };

    video.src = objectUrl;
  });
}

/**
 * Validates a video file before processing
 */
export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi', 'video/x-msvideo'];
  const maxSizeBytes = 100 * 1024 * 1024; // 100MB

  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp4|webm|mov|avi)$/i)) {
    return {
      valid: false,
      error: `Unsupported format. Accepted: MP4, WebM, MOV, AVI`,
    };
  }

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File too large. Maximum size is 100MB (yours: ${(file.size / 1024 / 1024).toFixed(1)}MB)`,
    };
  }

  return { valid: true };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Format seconds as MM:SS
 */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}