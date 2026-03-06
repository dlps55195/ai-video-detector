// Hugging Face API wrapper for deepfake/AI detection
// Uses the free inference API with the dima806/deepfake_vs_real_image_detection model

const HF_API_URL = 'https://api-inference.huggingface.co/models/dima806/deepfake_vs_real_image_detection';
const FALLBACK_API_URL = 'https://api-inference.huggingface.co/models/prithivMLmods/Deep-Fake-Detector-v2-Model';

export interface HFPrediction {
  label: string;
  score: number;
}

export interface FrameAnalysisResult {
  isAI: boolean;
  confidenceScore: number; // 0-100
  rawPredictions: HFPrediction[];
  error?: string;
}

/**
 * Analyzes a single image frame (as base64 blob) for AI/deepfake detection
 */
export async function analyzeFrame(imageBlob: Blob): Promise<FrameAnalysisResult> {
  const token = process.env.HUGGINGFACE_API_TOKEN;

  if (!token) {
    throw new Error('HUGGINGFACE_API_TOKEN is not set in environment variables.');
  }

  const arrayBuffer = await imageBlob.arrayBuffer();

  // Try primary model first, then fallback
  for (const apiUrl of [HF_API_URL, FALLBACK_API_URL]) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
        },
        body: arrayBuffer,
      });

      if (response.status === 503) {
        // Model is loading, wait and retry once
        await new Promise((res) => setTimeout(res, 8000));
        const retryResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/octet-stream',
          },
          body: arrayBuffer,
        });
        if (!retryResponse.ok) continue;
        const retryData: HFPrediction[] = await retryResponse.json();
        return parseHFResponse(retryData);
      }

      if (response.status === 429) {
        // Rate limited — return a neutral result with note
        return {
          isAI: false,
          confidenceScore: 50,
          rawPredictions: [],
          error: 'Rate limited by Hugging Face. Using neutral score.',
        };
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HF API error ${response.status}: ${errorText}`);
      }

      const data: HFPrediction[] = await response.json();
      return parseHFResponse(data);
    } catch (err) {
      if (apiUrl === FALLBACK_API_URL) {
        // Both models failed — return neutral with error
        return {
          isAI: false,
          confidenceScore: 50,
          rawPredictions: [],
          error: err instanceof Error ? err.message : 'Unknown HF API error',
        };
      }
      // Try fallback
      continue;
    }
  }

  return {
    isAI: false,
    confidenceScore: 50,
    rawPredictions: [],
    error: 'All models failed',
  };
}

function parseHFResponse(predictions: HFPrediction[]): FrameAnalysisResult {
  if (!Array.isArray(predictions) || predictions.length === 0) {
    return { isAI: false, confidenceScore: 50, rawPredictions: [] };
  }

  // Find the "fake" / "AI" label prediction
  // Common label patterns from HF deepfake models
  const fakeLabels = ['fake', 'deepfake', 'ai', 'artificial', 'generated', 'FAKE', 'Fake'];
  const realLabels = ['real', 'authentic', 'genuine', 'REAL', 'Real'];

  let fakeScore = 0;
  let realScore = 0;

  for (const pred of predictions) {
    const labelLower = pred.label.toLowerCase();
    if (fakeLabels.some((l) => labelLower.includes(l.toLowerCase()))) {
      fakeScore = Math.max(fakeScore, pred.score);
    } else if (realLabels.some((l) => labelLower.includes(l.toLowerCase()))) {
      realScore = Math.max(realScore, pred.score);
    }
  }

  // If we couldn't identify labels, use position (first is usually top prediction)
  if (fakeScore === 0 && realScore === 0 && predictions.length >= 2) {
    // Assume binary classification: label 0 = real, label 1 = fake (common pattern)
    const first = predictions[0];
    if (first.label.includes('1') || first.label.includes('fake')) {
      fakeScore = first.score;
    } else {
      realScore = first.score;
      fakeScore = 1 - first.score;
    }
  }

  const confidenceScore = Math.round(fakeScore * 100);
  const isAI = fakeScore > 0.5;

  return {
    isAI,
    confidenceScore,
    rawPredictions: predictions,
  };
}

/**
 * Aggregate multiple frame results into a single verdict
 */
export function aggregateResults(frameResults: FrameAnalysisResult[]): {
  isAI: boolean;
  confidenceScore: number;
} {
  const validResults = frameResults.filter((r) => !r.error);

  if (validResults.length === 0) {
    return { isAI: false, confidenceScore: 50 };
  }

  const avgScore =
    validResults.reduce((sum, r) => sum + r.confidenceScore, 0) / validResults.length;

  return {
    isAI: avgScore > 50,
    confidenceScore: Math.round(avgScore),
  };
}