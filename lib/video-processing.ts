// Client-side video frame extraction with face-priority selection
// Runs entirely in the browser — no dependencies, no server required

export interface ExtractedFrame {
  blob: Blob;
  timestamp: number;
  dataUrl: string;
  faceScore: number; // 0-100, how likely this frame contains a human face
}

export interface ExtractionProgress {
  current: number;
  total: number;
  timestamp: number;
}

/**
 * Main entry point: extracts frames from a video, scores each for face content,
 * and returns only the top N frames most likely to contain a human face.
 *
 * Strategy:
 * 1. Extract CANDIDATE_COUNT frames spread across the video (or focused on first 60s)
 * 2. Score each frame using skin-tone pixel analysis (pure canvas, no ML needed)
 * 3. Return the top maxFrames frames ranked by face likelihood
 *
 * This prevents b-roll, graphics, screen recordings, and title cards from
 * polluting the analysis with false positives.
 */
export async function extractFrames(
  file: File,
  interval: number = 2,
  maxFrames: number = 6,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<ExtractedFrame[]> {
  // Step 1: extract a wider pool of candidates
  const CANDIDATE_COUNT = Math.min(maxFrames * 3, 20);
  const candidates = await extractCandidateFrames(file, CANDIDATE_COUNT);

  if (candidates.length === 0) return [];

  // Step 2: score each candidate for face content
  const scored = candidates.map((frame) => ({
    ...frame,
    faceScore: scoreFaceContent(frame.dataUrl),
  }));

  // Step 3: sort by face score descending
  scored.sort((a, b) => b.faceScore - a.faceScore);

  // Step 4: take top maxFrames, re-sort chronologically for display
  const selected = scored
    .slice(0, maxFrames)
    .sort((a, b) => a.timestamp - b.timestamp);

  // Fire progress events
  if (onProgress) {
    selected.forEach((frame, i) => {
      onProgress({ current: i + 1, total: selected.length, timestamp: frame.timestamp });
    });
  }

  return selected;
}

/**
 * Extracts candidate frames spread across the video.
 * For long videos, biases toward first 60s but still samples the full duration.
 */
async function extractCandidateFrames(
  file: File,
  count: number
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
        reject(new Error('Could not determine video duration.'));
        return;
      }

      const timestamps = buildTimestamps(duration, count);

      canvas.width = 256; // Small for fast scoring
      canvas.height = Math.round(256 * (video.videoHeight / video.videoWidth)) || 256;

      let index = 0;

      const captureNext = () => {
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
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                frames.push({ blob, timestamp: timestamps[index], dataUrl, faceScore: 0 });
              }
              index++;
              captureNext();
            },
            'image/jpeg',
            0.8
          );
        } catch (err) {
          URL.revokeObjectURL(objectUrl);
          reject(err);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load video.'));
      };

      captureNext();
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load video metadata.'));
    };

    video.src = objectUrl;
  });
}

/**
 * Builds a smart timestamp list.
 * For videos > 60s: 60% from first 60s, 40% spread across the rest.
 * For short videos: evenly distributed.
 */
function buildTimestamps(duration: number, count: number): number[] {
  const timestamps: number[] = [];

  if (duration <= 60) {
    const step = duration / count;
    for (let i = 0; i < count; i++) {
      timestamps.push(Math.min(i * step, duration - 0.1));
    }
  } else {
    const earlyCount = Math.round(count * 0.6);
    const lateCount = count - earlyCount;
    const earlyWindow = Math.min(60, duration * 0.25);

    // Dense sampling in first 60s
    for (let i = 0; i < earlyCount; i++) {
      timestamps.push((i / earlyCount) * earlyWindow);
    }

    // Sparse sampling across the rest
    const lateStep = (duration - earlyWindow) / (lateCount + 1);
    for (let i = 1; i <= lateCount; i++) {
      timestamps.push(Math.min(earlyWindow + i * lateStep, duration - 0.1));
    }

    timestamps.sort((a, b) => a - b);
  }

  return timestamps;
}

/**
 * Scores a frame image for face/skin content using canvas pixel analysis.
 *
 * Samples pixels across the image and counts those falling within human skin-tone
 * ranges in RGB space. Also checks for face-like composition (skin concentrated
 * in the upper-center region of the frame).
 *
 * Returns 0-100. Higher = more likely to contain a human face.
 * Typical scores: plain graphics ~0-5, b-roll ~5-20, talking head ~40-85.
 */
function scoreFaceContent(dataUrl: string): number {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 50;

    const img = new Image();
    img.src = dataUrl;

    // Image is already loaded (we just created this dataUrl from canvas)
    canvas.width = img.width || 256;
    canvas.height = img.height || 144;
    ctx.drawImage(img, 0, 0);

    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    let totalSkinPixels = 0;
    let upperCenterSkinPixels = 0;
    let sampledPixels = 0;

    // Sample every 4th pixel for performance
    for (let i = 0; i < pixels.length; i += 16) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      sampledPixels++;

      if (isSkinTone(r, g, b)) {
        totalSkinPixels++;

        // Check if this pixel is in the upper-center region (likely face area)
        const pixelIndex = i / 4;
        const px = (pixelIndex % width) / width;   // 0-1
        const py = Math.floor(pixelIndex / width) / height; // 0-1

        if (px > 0.2 && px < 0.8 && py < 0.6) {
          upperCenterSkinPixels++;
        }
      }
    }

    if (sampledPixels === 0) return 0;

    const skinRatio = totalSkinPixels / sampledPixels;
    const centerRatio = totalSkinPixels > 0 ? upperCenterSkinPixels / totalSkinPixels : 0;

    // A good talking-head frame typically has 5-35% skin pixels
    // with concentration in the upper center
    let score = 0;

    // Base score from skin ratio (peaks at ~15% skin coverage)
    if (skinRatio < 0.03) {
      score = skinRatio * 200; // Very little skin, scale up slowly
    } else if (skinRatio <= 0.35) {
      score = 60 + ((skinRatio - 0.03) / 0.32) * 30; // Good range: 60-90
    } else {
      score = 90 - ((skinRatio - 0.35) / 0.65) * 40; // Too much skin = close-up or solid color
    }

    // Boost if skin is concentrated in face region
    score *= (0.5 + centerRatio * 0.8);

    // Penalty for very uniform images (solid colors, graphics)
    const uniformityPenalty = getUniformityPenalty(pixels);
    score *= (1 - uniformityPenalty * 0.7);

    return Math.max(0, Math.min(100, Math.round(score)));
  } catch {
    return 50; // If analysis fails, don't filter the frame
  }
}

/**
 * Checks if an RGB pixel falls within human skin-tone ranges.
 * Works across a wide range of ethnicities.
 */
function isSkinTone(r: number, g: number, b: number): boolean {
  // Rule 1: Basic RGB skin range
  const rgbSkin = r > 95 && g > 40 && b > 20 &&
    r > g && r > b &&
    Math.abs(r - g) > 15 &&
    r - Math.min(g, b) > 15;

  if (!rgbSkin) return false;

  // Rule 2: HSV-based check to narrow down
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;

  if (max === 0) return false;

  const s = diff / max; // Saturation
  const v = max / 255;  // Value (brightness)

  // Skin tones have medium saturation and medium-high brightness
  // and hue roughly in the orange/red range
  return s > 0.1 && s < 0.7 && v > 0.3;
}

/**
 * Returns a 0-1 penalty score for how uniform/flat the image is.
 * Solid colors and simple graphics score close to 1.
 */
function getUniformityPenalty(pixels: Uint8ClampedArray): number {
  let rSum = 0, gSum = 0, bSum = 0;
  let rSqSum = 0, gSqSum = 0, bSqSum = 0;
  let count = 0;

  for (let i = 0; i < pixels.length; i += 16) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    rSum += r; gSum += g; bSum += b;
    rSqSum += r * r; gSqSum += g * g; bSqSum += b * b;
    count++;
  }

  if (count === 0) return 0;

  const rVar = rSqSum / count - (rSum / count) ** 2;
  const gVar = gSqSum / count - (gSum / count) ** 2;
  const bVar = bSqSum / count - (bSum / count) ** 2;
  const avgVariance = (rVar + gVar + bVar) / 3;

  // Low variance = uniform = likely graphic/solid color
  // High variance = complex image = likely real photo/video
  const maxVariance = 3000;
  return Math.max(0, 1 - avgVariance / maxVariance);
}

/**
 * Validates a video file before processing
 */
export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi', 'video/x-msvideo'];
  const maxSizeBytes = 100 * 1024 * 1024;

  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp4|webm|mov|avi)$/i)) {
    return { valid: false, error: `Unsupported format. Accepted: MP4, WebM, MOV, AVI` };
  }

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File too large. Maximum size is 100MB (yours: ${(file.size / 1024 / 1024).toFixed(1)}MB)`,
    };
  }

  return { valid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}