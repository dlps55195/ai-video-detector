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
 * Extracts frames from a video file using a smart sampling strategy:
 *
 * - For videos under 60s: spread frames evenly across the whole video
 * - For videos over 60s: sample the first 45 seconds DENSELY (where faces/subjects
 *   appear most consistently), then take a few samples from later in the video.
 *
 * This avoids the problem of long edited videos where frames at the 3:00, 6:00 etc.
 * mark are graphics, b-roll, or screen recordings rather than the main subject.
 *
 * @param file       - The video File object
 * @param interval   - Seconds between frames (used for short videos only)
 * @param maxFrames  - Max number of frames to extract (default: 6)
 * @param onProgress - Optional progress callback
 */
export async function extractFrames(
  file: File,
  interval: number = 2,
  maxFrames: number = 6,
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

      // --- Smart sampling strategy ---
      const timestamps: number[] = [];

      if (duration <= 60) {
        // Short video: spread evenly
        const step = Math.max(interval, duration / maxFrames);
        for (let t = 0; t < duration && timestamps.length < maxFrames; t += step) {
          timestamps.push(Math.min(t, duration - 0.1));
        }
      } else {
        // Long video: focus heavily on first 45 seconds
        // This is where the primary subject (face/content) is most consistently present
        // before editing cuts to b-roll, graphics, screen recordings etc.

        // 70% of frames from the first 45 seconds
        const earlyFrameCount = Math.round(maxFrames * 0.7);
        const earlyWindow = Math.min(45, duration * 0.3);
        const earlyStep = earlyWindow / earlyFrameCount;

        for (let i = 0; i < earlyFrameCount; i++) {
          timestamps.push(Math.min(i * earlyStep, duration - 0.1));
        }

        // 30% of frames spread across the rest of the video
        const lateFrameCount = maxFrames - earlyFrameCount;
        const lateStart = earlyWindow;
        const lateStep = (duration - lateStart) / (lateFrameCount + 1);

        for (let i = 1; i <= lateFrameCount; i++) {
          timestamps.push(Math.min(lateStart + i * lateStep, duration - 0.1));
        }

        // Sort chronologically
        timestamps.sort((a, b) => a - b);
      }

      // Ensure at least 1 frame
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